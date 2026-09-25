const db = require('../db/database');

// Duração máxima absoluta de uma sessão, mesmo com uso contínuo. O cookie
// já usa "rolling" (renova a cada request enquanto o usuário está ativo),
// então sem esse limite uma sessão em uso constante nunca expiraria — este
// teto força um novo login periodicamente.
const SESSAO_MAX_ABSOLUTO_MS = 24 * 60 * 60 * 1000; // 24 horas

// Busca o usuário da sessão fresco no banco a cada request (em vez de
// confiar em dados cacheados na sessão) para que uma desativação de conta
// tenha efeito imediato, mesmo com a sessão ainda "logada". Retorna null se
// não houver sessão válida, o usuário não existir/estiver inativo, ou a
// sessão já ter passado do teto absoluto de duração.
async function buscarUsuarioAtivoDaSessao(req) {
  const usuarioId = req.session && req.session.usuarioId;
  if (!usuarioId) return null;

  const criadoEm = req.session.criadoEm;
  if (!criadoEm || Date.now() - criadoEm > SESSAO_MAX_ABSOLUTO_MS) return null;

  const usuario = await db.prepare('SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id = ?').get(usuarioId);
  if (!usuario || !usuario.ativo) return null;

  return usuario;
}

// Protege rotas de API: exige sessão válida com um usuário ativo.
async function exigirAutenticacao(req, res, next) {
  const usuario = await buscarUsuarioAtivoDaSessao(req);
  if (!usuario) {
    return req.session.destroy(() => res.status(401).json({ erro: 'Não autenticado.' }));
  }

  req.usuario = usuario;
  next();
}

// Protege páginas HTML: mesma checagem de exigirAutenticacao, mas
// redireciona para a tela de login em vez de responder com JSON 401.
async function exigirAutenticacaoPagina(req, res, next) {
  const usuario = await buscarUsuarioAtivoDaSessao(req);
  if (!usuario) {
    return req.session.destroy(() => res.redirect('/login.html'));
  }

  req.usuario = usuario;
  next();
}

module.exports = { exigirAutenticacao, exigirAutenticacaoPagina, buscarUsuarioAtivoDaSessao };
