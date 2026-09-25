require('dotenv').config();

// Checado ANTES de qualquer outro require: db/database.js (e tudo que
// depende dele — rotas, middleware, session store) precisa dessa variável
// já no carregamento do módulo. Falhar aqui, com uma mensagem clara, evita
// um stack trace cru caso ela não esteja definida.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Configure a connection string do Postgres (Neon) e reinicie o servidor.');
  process.exit(1);
}

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const db = require('./db/database');
const PgSessionStore = require('./utils/pgSessionStore');
const { exigirAutenticacao, exigirAutenticacaoPagina } = require('./middleware/autenticacao');

const authRouter = require('./routes/auth');
const produtosRouter = require('./routes/produtos');
const vendasRouter = require('./routes/vendas');
const comprasRouter = require('./routes/compras');
const alertasRouter = require('./routes/alertas');
const descartesRouter = require('./routes/descartes');
const relatoriosRouter = require('./routes/relatorios');
const movimentacoesRouter = require('./routes/movimentacoes');

const app = express();
const PORT = process.env.PORT || 3000;
const EM_PRODUCAO = process.env.NODE_ENV === 'production';

// Necessário para o cookie "secure" funcionar corretamente atrás de um
// proxy que termina TLS (Render, etc.) — sem isso, Express nunca
// enxergaria a conexão como segura e o cookie de sessão não seria salvo.
app.set('trust proxy', 1);

if (!process.env.SESSION_SECRET) {
  if (EM_PRODUCAO) {
    console.error('SESSION_SECRET não definida. Encerrando: em produção o segredo de sessão é obrigatório.');
    process.exit(1);
  }
  console.warn(
    'SESSION_SECRET não definida — usando um segredo fixo de desenvolvimento. Defina SESSION_SECRET em produção.'
  );
}

app.use(cors());
app.use(express.json());

// Postgres é uma rede, não um arquivo local: schema/migrations/bootstrap do
// administrador agora são assíncronos, então o servidor só começa a aceitar
// requisições depois que isso terminar (diferente do SQLite antigo, que
// rodava tudo de forma síncrona no require() do módulo).
async function iniciar() {
  await db.iniciar();

  app.use(
    session({
      name: 'smartestoque.sid',
      store: new PgSessionStore(),
      secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-troque-em-producao',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: EM_PRODUCAO,
        maxAge: 8 * 60 * 60 * 1000, // 8 horas, renovada a cada requisição autenticada
      },
    })
  );

  // Páginas que exigem sessão ativa. Precisa rodar ANTES do express.static
  // (que serviria o arquivo direto do disco sem checar nada). Arquivos
  // estáticos (css/js/ícones/manifest/sw.js) e login.html continuam de fora
  // dessa lista — a própria tela de login precisa desses assets para
  // carregar, e o service worker precisa poder buscá-los.
  const PAGINAS_PROTEGIDAS = ['/', '/index.html', '/produtos.html', '/vendas.html', '/relatorios.html'];

  app.get(PAGINAS_PROTEGIDAS, exigirAutenticacaoPagina);

  app.get('/login.html', (req, res, next) => {
    if (req.session && req.session.usuarioId) {
      return res.redirect('/index.html');
    }
    next();
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/auth', authRouter);
  app.use('/api/produtos', exigirAutenticacao, produtosRouter);
  app.use('/api/vendas', exigirAutenticacao, vendasRouter);
  app.use('/api/compras', exigirAutenticacao, comprasRouter);
  app.use('/api/alertas', exigirAutenticacao, alertasRouter);
  app.use('/api/descartes', exigirAutenticacao, descartesRouter);
  app.use('/api/relatorios', exigirAutenticacao, relatoriosRouter);
  app.use('/api/movimentacoes', exigirAutenticacao, movimentacoesRouter);

  app.listen(PORT, () => {
    console.log(`SmartEstoque rodando em http://localhost:${PORT}`);
  });
}

iniciar().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
