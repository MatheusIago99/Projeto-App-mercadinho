const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { hashSenha } = require('../utils/senha');

const dbPath = path.join(__dirname, 'smartestoque.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations aditivas e idempotentes: cobrem bancos ja existentes criados
// antes destas colunas existirem em schema.sql. Nunca remove/renomeia
// coluna, nunca define valor para linhas existentes (ficam NULL).
function colunaExiste(tabela, coluna) {
  return db
    .prepare(`PRAGMA table_info(${tabela})`)
    .all()
    .some((c) => c.name === coluna);
}

function migrar() {
  if (!colunaExiste('produtos', 'preco_custo')) {
    db.exec('ALTER TABLE produtos ADD COLUMN preco_custo REAL');
  }
  if (!colunaExiste('produtos', 'codigo_barras')) {
    db.exec('ALTER TABLE produtos ADD COLUMN codigo_barras TEXT');
  }
  if (!colunaExiste('vendas', 'forma_pagamento')) {
    db.exec('ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT');
  }
  if (!colunaExiste('vendas', 'valor_recebido')) {
    db.exec('ALTER TABLE vendas ADD COLUMN valor_recebido REAL');
  }
}

migrar();

// Nunca loga a senha recebida, só o e-mail criado.
function criarAdministrador(email, senha, nome) {
  const emailNormalizado = email.trim().toLowerCase();
  const hash = hashSenha(senha);
  db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)').run(
    nome,
    emailNormalizado,
    hash,
    'ADMINISTRADOR'
  );
  return emailNormalizado;
}

// Bootstrap do administrador inicial: só roda se NENHUM usuário existir
// ainda. Depois disso, nunca recria/sobrescreve automaticamente — mesmo
// que ADMIN_EMAIL/ADMIN_PASSWORD continuem definidos em boots futuros.
function bootstrapAdministrador() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get();
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

  console.log(`Administrador inicial criado: ${criarAdministrador(email, senha, nome)}`);
}

// Bootstrap de um administrador adicional (opcional): existe para ambientes
// sem acesso a shell/console (ex.: plano gratuito do Render), onde não é
// possível inserir o usuário diretamente no banco. Só cria se ADMIN2_EMAIL/
// ADMIN2_PASSWORD estiverem definidas E esse e-mail específico ainda não
// existir — nunca sobrescreve um usuário já criado, mesmo com as variáveis
// continuando definidas em boots futuros.
function bootstrapAdministradorAdicional() {
  const email = process.env.ADMIN2_EMAIL;
  const senha = process.env.ADMIN2_PASSWORD;
  const nome = process.env.ADMIN2_NAME || 'Administrador';

  if (!email || !senha) return;

  const emailNormalizado = email.trim().toLowerCase();
  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNormalizado);
  if (existente) return;

  console.log(`Administrador adicional criado: ${criarAdministrador(email, senha, nome)}`);
}

bootstrapAdministrador();
bootstrapAdministradorAdicional();

module.exports = db;
