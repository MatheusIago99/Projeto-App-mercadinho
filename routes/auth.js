const express = require('express');
const crypto = require('node:crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { verificarSenha, hashSenha } = require('../utils/senha');
const { buscarUsuarioAtivoDaSessao } = require('../middleware/autenticacao');

const router = express.Router();

// Hash "chamariz" com a mesma função usada para senhas reais: quando o
// e-mail não existe, ainda rodamos scrypt contra ele para que o tempo de
// resposta não denuncie "e-mail existe" vs "e-mail não existe".
const HASH_CHAMARIZ = hashSenha(crypto.randomBytes(24).toString('hex'));

const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

router.post('/login', limitadorLogin, (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({ erro: 'Login ou senha inválidos.' });
  }

  const emailNormalizado = email.trim().toLowerCase();
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(emailNormalizado);

  // Sempre roda a verificação de senha (contra o hash real OU o chamariz),
  // nunca decide se autentica com base só em "usuario existe" antes disso.
  const senhaOk = verificarSenha(senha, usuario ? usuario.senha_hash : HASH_CHAMARIZ);

  if (!usuario || !usuario.ativo || !senhaOk) {
    return res.status(401).json({ erro: 'Login ou senha inválidos.' });
  }

  // Regenera o id de sessão no login (evita session fixation): a sessão
  // anterior (anônima, se existia) é descartada e uma nova é criada.
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ erro: 'Não foi possível entrar. Tente novamente.' });
    }
    req.session.usuarioId = usuario.id;
    req.session.criadoEm = Date.now();
    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
  });
});

router.post('/logout', (req, res) => {
  if (!req.session) return res.status(204).end();
  req.session.destroy(() => {
    res.clearCookie('smartestoque.sid');
    res.status(204).end();
  });
});

router.get('/me', (req, res) => {
  const usuario = buscarUsuarioAtivoDaSessao(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
});

module.exports = router;
