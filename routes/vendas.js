const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const vendas = db.prepare('SELECT * FROM vendas ORDER BY data DESC').all();
  const itensStmt = db.prepare(
    `SELECT vi.*, p.nome AS produto_nome
     FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id
     WHERE vi.venda_id = ?`
  );
  const resultado = vendas.map((venda) => ({ ...venda, itens: itensStmt.all(venda.id) }));
  res.json(resultado);
});

// Registra uma venda e dá baixa automática no estoque dos produtos vendidos.
router.post('/', (req, res) => {
  const { itens } = req.body; // [{ produto_id, quantidade }]

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'A venda precisa ter ao menos um item' });
  }

  const buscarProduto = db.prepare('SELECT * FROM produtos WHERE id = ?');
  const atualizarEstoque = db.prepare('UPDATE produtos SET quantidade = ? WHERE id = ?');
  const criarVenda = db.prepare('INSERT INTO vendas (total) VALUES (?)');
  const criarItem = db.prepare(
    'INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
  );

  const registrarVenda = db.transaction((itensVenda) => {
    let total = 0;
    const detalhes = [];

    for (const item of itensVenda) {
      const produto = buscarProduto.get(item.produto_id);
      if (!produto) throw new Error(`Produto ${item.produto_id} não encontrado`);
      if (produto.quantidade < item.quantidade) {
        throw new Error(`Estoque insuficiente para o produto "${produto.nome}"`);
      }
      total += produto.preco * item.quantidade;
      detalhes.push({ produto, quantidade: item.quantidade });
    }

    const venda = criarVenda.run(total);
    const vendaId = venda.lastInsertRowid;

    for (const { produto, quantidade } of detalhes) {
      criarItem.run(vendaId, produto.id, quantidade, produto.preco);
      atualizarEstoque.run(produto.quantidade - quantidade, produto.id);
    }

    return vendaId;
  });

  try {
    const vendaId = registrarVenda(itens);
    const venda = db.prepare('SELECT * FROM vendas WHERE id = ?').get(vendaId);
    res.status(201).json(venda);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

module.exports = router;
