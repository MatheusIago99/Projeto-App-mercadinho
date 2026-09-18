const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

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

module.exports = db;
