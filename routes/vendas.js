const express = require('express');
const db = require('../db/database');
const { estaVencido, formatarDataBR } = require('../utils/validade');

const router = express.Router();

const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO'];

// Marca mensagens de validacao pensadas para o usuario final. Qualquer
// outro erro dentro da transacao (ex.: falha inesperada do banco) nunca
// deve expor texto tecnico cru na resposta.
class ErroValidacao extends Error {}

router.get('/', async (req, res) => {
  const vendas = await db.prepare('SELECT * FROM vendas ORDER BY data DESC').all();
  const itensStmt = db.prepare(
    `SELECT vi.*, p.nome AS produto_nome
     FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id
     WHERE vi.venda_id = ?`
  );
  const resultado = await Promise.all(vendas.map(async (venda) => ({ ...venda, itens: await itensStmt.all(venda.id) })));
  res.json(resultado);
});

// Registra uma venda e dá baixa automática no estoque dos produtos vendidos.
router.post('/', async (req, res) => {
  const { itens, forma_pagamento } = req.body;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'A venda precisa ter ao menos um item' });
  }

  if (!FORMAS_PAGAMENTO.includes(forma_pagamento)) {
    return res.status(400).json({ erro: 'Forma de pagamento inválida.' });
  }

  // valor_recebido so faz sentido para Dinheiro; para as demais formas e
  // sempre armazenado como NULL, mesmo que o cliente envie algo.
  const valorRecebidoBruto = forma_pagamento === 'DINHEIRO' ? Number(req.body.valor_recebido) : null;

  if (forma_pagamento === 'DINHEIRO' && !Number.isFinite(valorRecebidoBruto)) {
    return res.status(400).json({ erro: 'Informe o valor recebido.' });
  }

  const buscarProduto = db.prepare('SELECT * FROM produtos WHERE id = ?');
  const atualizarEstoque = db.prepare('UPDATE produtos SET quantidade = ? WHERE id = ?');
  const criarVenda = db.prepare(
    'INSERT INTO vendas (total, forma_pagamento, valor_recebido) VALUES (?, ?, ?)'
  );
  const criarItem = db.prepare(
    'INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
  );

  await db.exec('BEGIN');
  try {
    let total = 0;
    const detalhes = [];

    // Nunca confia no estoque que o frontend enviou/exibiu: revalida tudo
    // aqui dentro, na mesma transacao, com os dados atuais do banco.
    for (const item of itens) {
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        throw new ErroValidacao('Quantidade inválida para um dos itens da venda.');
      }
      const produto = await buscarProduto.get(item.produto_id);
      if (!produto) throw new ErroValidacao(`Produto ${item.produto_id} não encontrado`);
      if (estaVencido(produto.validade)) {
        throw new ErroValidacao(`Produto vencido: ${produto.nome}. Validade: ${formatarDataBR(produto.validade)}.`);
      }
      if (produto.quantidade < item.quantidade) {
        throw new ErroValidacao(`Estoque insuficiente para o produto "${produto.nome}". Disponível: ${produto.quantidade}.`);
      }
      total += produto.preco * item.quantidade;
      detalhes.push({ produto, quantidade: item.quantidade });
    }

    if (forma_pagamento === 'DINHEIRO' && valorRecebidoBruto < total) {
      throw new ErroValidacao('O valor recebido é menor que o total da venda.');
    }

    const venda = await criarVenda.run(total, forma_pagamento, forma_pagamento === 'DINHEIRO' ? valorRecebidoBruto : null);
    const vendaId = venda.lastInsertRowid;

    for (const { produto, quantidade } of detalhes) {
      await criarItem.run(vendaId, produto.id, quantidade, produto.preco);
      await atualizarEstoque.run(produto.quantidade - quantidade, produto.id);
    }

    await db.exec('COMMIT');
    const vendaCriada = await db.prepare('SELECT * FROM vendas WHERE id = ?').get(vendaId);
    res.status(201).json(vendaCriada);
  } catch (err) {
    await db.exec('ROLLBACK');
    if (err instanceof ErroValidacao) {
      res.status(400).json({ erro: err.message });
    } else {
      console.error('Falha inesperada ao registrar venda:', err);
      res.status(400).json({ erro: 'Não foi possível finalizar a venda.' });
    }
  }
});

module.exports = router;
