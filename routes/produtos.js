const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Nunca converte para numero (zeros a esquerda sao significativos).
function normalizarCodigoBarras(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

// Retorna { ok: true, valor } ou { ok: false, erro }.
function validarPrecoCusto(valor) {
  if (valor === undefined || valor === null || valor === '') return { ok: true, valor: null };
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    return { ok: false, erro: 'Preço de custo deve ser um número maior ou igual a zero' };
  }
  return { ok: true, valor: numero };
}

function buscarCodigoBarrasDuplicado(codigo, ignorarId) {
  if (!codigo) return null;
  const query = ignorarId
    ? db.prepare('SELECT id FROM produtos WHERE codigo_barras = ? AND id != ?')
    : db.prepare('SELECT id FROM produtos WHERE codigo_barras = ?');
  return ignorarId ? query.get(codigo, ignorarId) : query.get(codigo);
}

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

  const custo = validarPrecoCusto(req.body.preco_custo);
  if (!custo.ok) return res.status(400).json({ erro: custo.erro });

  const codigoBarras = normalizarCodigoBarras(req.body.codigo_barras);
  if (buscarCodigoBarrasDuplicado(codigoBarras, null)) {
    return res.status(400).json({ erro: 'Já existe um produto cadastrado com este código de barras.' });
  }

  const info = db
    .prepare(
      `INSERT INTO produtos (nome, categoria, preco, quantidade, estoque_minimo, validade, preco_custo, codigo_barras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(nome, categoria || null, preco, quantidade || 0, estoque_minimo || 0, validade || null, custo.valor, codigoBarras);

  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(produto);
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Produto não encontrado' });

  const { nome, categoria, preco, quantidade, estoque_minimo, validade } = req.body;

  let custoValor = existente.preco_custo;
  if (req.body.preco_custo !== undefined) {
    const custo = validarPrecoCusto(req.body.preco_custo);
    if (!custo.ok) return res.status(400).json({ erro: custo.erro });
    custoValor = custo.valor;
  }

  let codigoBarras = existente.codigo_barras;
  if (req.body.codigo_barras !== undefined) {
    codigoBarras = normalizarCodigoBarras(req.body.codigo_barras);
    if (buscarCodigoBarrasDuplicado(codigoBarras, existente.id)) {
      return res.status(400).json({ erro: 'Já existe um produto cadastrado com este código de barras.' });
    }
  }

  db.prepare(
    `UPDATE produtos
     SET nome = ?, categoria = ?, preco = ?, quantidade = ?, estoque_minimo = ?, validade = ?, preco_custo = ?, codigo_barras = ?
     WHERE id = ?`
  ).run(
    nome ?? existente.nome,
    categoria ?? existente.categoria,
    preco ?? existente.preco,
    quantidade ?? existente.quantidade,
    estoque_minimo ?? existente.estoque_minimo,
    validade ?? existente.validade,
    custoValor,
    codigoBarras,
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
