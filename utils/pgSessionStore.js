// Store de sessão para express-session usando o MESMO banco Postgres do
// resto do app — evita depender de MemoryStore (perde tudo a cada
// restart/deploy e vaza memória em produção) e evita adicionar um pacote
// com binding nativo.
//
// expira_em é armazenado como epoch ms (inteiro): compara direto contra
// Date.now() em JS, sem depender de formatação de string de data (nunca
// ambíguo entre fusos).
const session = require('express-session');
const db = require('../db/database');

const PADRAO_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 horas, mesmo padrão do cookie
const INTERVALO_LIMPEZA_MS = 60 * 60 * 1000; // varredura periódica, não só no boot

class PgSessionStore extends session.Store {
  constructor() {
    super();
    this._limparExpiradas();
    // Sem isso, linhas expiradas só seriam removidas por um logout explícito
    // ou por um restart do processo — em um deploy de longa duração a
    // tabela `sessoes` cresceria sem limite.
    const intervalo = setInterval(() => this._limparExpiradas(), INTERVALO_LIMPEZA_MS);
    intervalo.unref();
  }

  async _limparExpiradas() {
    try {
      await db.prepare('DELETE FROM sessoes WHERE expira_em <= ?').run(Date.now());
    } catch (err) {
      console.error('Falha ao limpar sessões expiradas:', err);
    }
  }

  async get(sid, callback) {
    try {
      const linha = await db.prepare('SELECT dados FROM sessoes WHERE sid = ? AND expira_em > ?').get(sid, Date.now());
      if (!linha) return callback(null, null);
      callback(null, JSON.parse(linha.dados));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : PADRAO_MAX_AGE_MS;
      const expiraEm = Date.now() + maxAge;
      await db
        .prepare(
          `INSERT INTO sessoes (sid, dados, expira_em) VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET dados = excluded.dados, expira_em = excluded.expira_em`
        )
        .run(sid, JSON.stringify(sessionData), expiraEm);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await db.prepare('DELETE FROM sessoes WHERE sid = ?').run(sid);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : PADRAO_MAX_AGE_MS;
      const expiraEm = Date.now() + maxAge;
      await db.prepare('UPDATE sessoes SET expira_em = ? WHERE sid = ?').run(expiraEm, sid);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }
}

module.exports = PgSessionStore;
