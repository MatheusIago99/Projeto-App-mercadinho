const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos ORDER BY nome').all();
  res.json(produtos);
});

router.get('/:id', (req, res) => {
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(produto);
});

router.post('/', (req, res) => {
  const { nome, categoria, preco, quantidade, estoque_minimo, validade } = req.body;
  if (!nome || preco === undefined) {
    return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
  }

  const info = db
    .prepare(
      `INSERT INTO produtos (nome, categoria, preco, quantidade, estoque_minimo, validade)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(nome, categoria || null, preco, quantidade || 0, estoque_minimo || 0, validade || null);

  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(produto);
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Produto não encontrado' });

  const { nome, categoria, preco, quantidade, estoque_minimo, validade } = req.body;

  db.prepare(
    `UPDATE produtos
     SET nome = ?, categoria = ?, preco = ?, quantidade = ?, estoque_minimo = ?, validade = ?
     WHERE id = ?`
  ).run(
    nome ?? existente.nome,
    categoria ?? existente.categoria,
    preco ?? existente.preco,
    quantidade ?? existente.quantidade,
    estoque_minimo ?? existente.estoque_minimo,
    validade ?? existente.validade,
    req.params.id
  );

  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  res.json(produto);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.status(204).end();
});

module.exports = router;
