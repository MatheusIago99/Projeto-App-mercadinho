-- Schema PostgreSQL (Neon). Datas/horas são guardadas como TEXT no mesmo
-- formato usado historicamente pelo SQLite ("YYYY-MM-DD HH:MM:SS" /
-- "YYYY-MM-DD"), em vez de tipos DATE/TIMESTAMP nativos: o driver do
-- Postgres (pg) devolveria objetos Date para esses tipos, quebrando o
-- código existente que trata datas como string (utils/validade.js e as
-- rotas fazem .slice(0, 10), comparação lexicográfica, etc.).
--
-- Preços/valores usam DOUBLE PRECISION (não NUMERIC): o driver pg devolve
-- NUMERIC como string (para não perder precisão), o que quebraria toda
-- aritmética existente no código (ex.: preco * quantidade). DOUBLE
-- PRECISION é devolvido como number, igual ao REAL do SQLite.

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT,
  preco DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  validade TEXT,
  criado_em TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  preco_custo DOUBLE PRECISION,
  codigo_barras TEXT
);

CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  data TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  total DOUBLE PRECISION NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  valor_recebido DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS descartes (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario DOUBLE PRECISION NOT NULL,
  motivo TEXT,
  data TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
);

-- V1.0.1: autenticação. usuarios/sessoes.
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'ADMINISTRADOR',
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
);

-- Sessões de login (server-side). expira_em em epoch ms — BIGINT porque
-- INTEGER do Postgres é 32 bits e estoura para timestamps em milissegundos
-- (diferente do INTEGER do SQLite, que já era 64 bits).
CREATE TABLE IF NOT EXISTS sessoes (
  sid TEXT PRIMARY KEY,
  dados TEXT NOT NULL,
  expira_em BIGINT NOT NULL
);
