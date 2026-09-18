// Hash de senha com node:crypto (scrypt) — nenhuma dependência nova, nada
// nativo compilado (mesma preocupação que já levou o projeto a trocar
// better-sqlite3 por node:sqlite). Formato armazenado: "salt:hash", ambos
// hex. Nunca comparar hashes com === (timing attack) — sempre timingSafeEqual.
const crypto = require('node:crypto');

const TAMANHO_CHAVE = 64;

function hashSenha(senhaPura) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivado = crypto.scryptSync(senhaPura, salt, TAMANHO_CHAVE).toString('hex');
  return `${salt}:${derivado}`;
}

function verificarSenha(senhaPura, hashArmazenado) {
  if (typeof hashArmazenado !== 'string' || !hashArmazenado.includes(':')) return false;
  const [salt, derivadoEsperadoHex] = hashArmazenado.split(':');
  if (!salt || !derivadoEsperadoHex) return false;

  const derivado = crypto.scryptSync(senhaPura, salt, TAMANHO_CHAVE);
  const esperado = Buffer.from(derivadoEsperadoHex, 'hex');
  if (derivado.length !== esperado.length) return false;
  return crypto.timingSafeEqual(derivado, esperado);
}

module.exports = { hashSenha, verificarSenha };
