const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Registra uma compra/reposição, somando ao estoque atual do produto.
router.post('/', (req, res) => {
  const { produto_id, quantidade } = req.body;

  if (!produto_id || !quantidade || quantidade <= 0) {
    return res.status(400).json({ erro: 'Produto e quantidade (maior que zero) são obrigatórios' });
  }

  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

  db.prepare('UPDATE produtos SET quantidade = ? WHERE id = ?').run(
    produto.quantidade + quantidade,
    produto_id
  );

  const atualizado = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  res.status(201).json(atualizado);
});

module.exports = router;
