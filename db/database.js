// Camada de acesso ao PostgreSQL (Neon), via `pg` — driver puro em
// JavaScript, sem binding nativo (mesma preocupação que já levou o projeto
// a evitar better-sqlite3/sqlite3: nada de dependência compilada).
//
// Mantém a mesma "forma" de API usada em todo o projeto desde a versão
// SQLite — db.prepare(sql).get(...)/.all(...)/.run(...), db.exec(...) —
// só que agora assíncrona (Postgres é uma rede, não um arquivo local), e
// aceita "?" como placeholder posicional (convertido para $1, $2... por
// baixo), para não precisar reescrever cada string SQL do projeto.
const path = require('node:path');
const fs = require('node:fs');
const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const { hashSenha } = require('../utils/senha');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Configure a connection string do Postgres (Neon).');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Guarda o client "emprestado" da pool durante uma transação (BEGIN..COMMIT/
// ROLLBACK), para que todas as queries dentro dela usem a MESMA conexão —
// necessário porque pool.query() sozinho pode pegar uma conexão diferente
// a cada chamada. Escopado por requisição via AsyncLocalStorage (cada
// requisição HTTP roda em sua própria cadeia assíncrona), então
// transações concorrentes de requisições diferentes nunca se cruzam.
const contextoTransacao = new AsyncLocalStorage();

function clienteAtual() {
  return contextoTransacao.getStore() || pool;
}

function paraPlaceholdersPg(sql) {
  let indice = 0;
  return sql.replace(/\?/g, () => `$${++indice}`);
}

function prepare(sqlOriginal) {
  const sql = paraPlaceholdersPg(sqlOriginal);
  // "sessoes" não tem coluna id (chave primária é sid) — nunca anexa
  // RETURNING id para essa tabela, senão o INSERT ... ON CONFLICT do
  // session store quebraria ("column id does not exist").
  const ehInsert = /^\s*insert\s+into\s+(?!sessoes\b)/i.test(sqlOriginal);
  const sqlComRetorno = ehInsert && !/returning/i.test(sqlOriginal) ? `${sql} RETURNING id` : sql;

  return {
    async get(...params) {
      const resultado = await clienteAtual().query(sql, params);
      return resultado.rows[0];
    },
    async all(...params) {
      const resultado = await clienteAtual().query(sql, params);
      return resultado.rows;
    },
    async run(...params) {
      const resultado = await clienteAtual().query(sqlComRetorno, params);
      return {
        changes: resultado.rowCount,
        lastInsertRowid: resultado.rows[0] ? resultado.rows[0].id : undefined,
      };
    },
  };
}

// BEGIN/COMMIT/ROLLBACK (transações) e comandos multi-statement (schema).
async function exec(sqlOuComando) {
  const comando = sqlOuComando.trim().toUpperCase();

  if (comando === 'BEGIN') {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
    } catch (err) {
      cliente.release();
      throw err;
    }
    contextoTransacao.enterWith(cliente);
    return;
  }

  if (comando === 'COMMIT' || comando === 'ROLLBACK') {
    const cliente = contextoTransacao.getStore();
    if (!cliente) return;
    try {
      await cliente.query(comando);
    } finally {
      cliente.release();
      contextoTransacao.enterWith(undefined);
    }
    return;
  }

  await pool.query(sqlOuComando);
}

async function criarAdministrador(email, senha, nome) {
  const emailNormalizado = email.trim().toLowerCase();
  const hash = hashSenha(senha);
  await prepare(
    "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, 'ADMINISTRADOR', 1)"
  ).run(nome, emailNormalizado, hash);
  return emailNormalizado;
}

// Bootstrap do administrador inicial: só roda se NENHUM usuário existir
// ainda. Depois disso, nunca recria/sobrescreve automaticamente — mesmo
// que ADMIN_EMAIL/ADMIN_PASSWORD continuem definidos em boots futuros.
async function bootstrapAdministrador() {
  const { total } = await prepare('SELECT COUNT(*)::int AS total FROM usuarios').get();
  if (total > 0) return;

  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NAME || 'Administrador';

  if (!email || !senha) {
    console.warn(
      'Nenhum administrador cadastrado ainda. Defina ADMIN_EMAIL e ADMIN_PASSWORD (e opcionalmente ADMIN_NAME) e reinicie o servidor para criar o primeiro administrador.'
    );
    return;
  }

  console.log(`Administrador inicial criado: ${await criarAdministrador(email, senha, nome)}`);
}

// Bootstrap de um administrador adicional (opcional): existe para ambientes
// sem acesso a shell/console (ex.: plano gratuito do Render), onde não é
// possível inserir o usuário diretamente no banco. Só cria se ADMIN2_EMAIL/
// ADMIN2_PASSWORD estiverem definidas E esse e-mail específico ainda não
// existir — nunca sobrescreve um usuário já criado.
async function bootstrapAdministradorAdicional() {
  const email = process.env.ADMIN2_EMAIL;
  const senha = process.env.ADMIN2_PASSWORD;
  const nome = process.env.ADMIN2_NAME || 'Administrador';

  if (!email || !senha) return;

  const emailNormalizado = email.trim().toLowerCase();
  const existente = await prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNormalizado);
  if (existente) return;

  console.log(`Administrador adicional criado: ${await criarAdministrador(email, senha, nome)}`);
}

// Cria o schema (idempotente, CREATE TABLE IF NOT EXISTS) e roda o
// bootstrap dos administradores. Precisa ser chamado e aguardado (await)
// antes do servidor começar a aceitar requisições — diferente do SQLite
// antigo, que rodava tudo isso de forma síncrona no require().
let iniciado = null;
function iniciar() {
  if (!iniciado) {
    iniciado = (async () => {
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await pool.query(schema);
      await bootstrapAdministrador();
      await bootstrapAdministradorAdicional();
    })();
  }
  return iniciado;
}

module.exports = { prepare, exec, iniciar };
