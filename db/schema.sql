CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT,
  preco REAL NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  validade TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  preco_custo REAL,
  codigo_barras TEXT
);

CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL DEFAULT (datetime('now')),
  total REAL NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  valor_recebido REAL
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS descartes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  motivo TEXT,
  data TEXT NOT NULL DEFAULT (datetime('now'))
);

-- V1.0.1: autenticação. Tabelas novas apenas — nenhuma tabela existente
-- (produtos/vendas/venda_itens/descartes) é alterada.
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'ADMINISTRADOR',
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessões de login (server-side), com expiração em epoch ms para evitar
-- qualquer ambiguidade de fuso/formatação na comparação de datas.
CREATE TABLE IF NOT EXISTS sessoes (
  sid TEXT PRIMARY KEY,
  dados TEXT NOT NULL,
  expira_em INTEGER NOT NULL
);
