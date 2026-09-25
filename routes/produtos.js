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

// Preco/quantidade/estoque_minimo nunca podem aceitar NaN, Infinity ou
// negativo — "quantidade || 0" (padrao antigo) deixava passar negativos,
// pois so 0/NaN/'' sao falsy em JS, nao numeros negativos.
function validarPreco(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    return { ok: false, erro: 'Preço deve ser um número maior ou igual a zero.' };
  }
  return { ok: true, valor: numero };
}

function validarInteiroNaoNegativo(valor, rotulo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero < 0) {
    return { ok: false, erro: `${rotulo} deve ser um número inteiro maior ou igual a zero.` };
  }
  return { ok: true, valor: numero };
}

async function buscarCodigoBarrasDuplicado(codigo, ignorarId) {
  if (!codigo) return null;
  const query = ignorarId
    ? db.prepare('SELECT id FROM produtos WHERE codigo_barras = ? AND id != ?')
    : db.prepare('SELECT id FROM produtos WHERE codigo_barras = ?');
  return ignorarId ? query.get(codigo, ignorarId) : query.get(codigo);
}

router.get('/', async (req, res) => {
  const produtos = await db.prepare('SELECT * FROM produtos ORDER BY nome').all();
  res.json(produtos);
});

router.get('/:id', async (req, res) => {
  const produto = await db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(produto);
});

router.post('/', async (req, res) => {
  const { nome, categoria, validade } = req.body;
  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório.' });
  }
  if (req.body.preco === undefined || req.body.preco === null || req.body.preco === '') {
    return res.status(400).json({ erro: 'Preço é obrigatório.' });
  }

  const preco = validarPreco(req.body.preco);
  if (!preco.ok) return res.status(400).json({ erro: preco.erro });

  const quantidade = validarInteiroNaoNegativo(req.body.quantidade ?? 0, 'Quantidade');
  if (!quantidade.ok) return res.status(400).json({ erro: quantidade.erro });

  const estoqueMinimo = validarInteiroNaoNegativo(req.body.estoque_minimo ?? 0, 'Estoque mínimo');
  if (!estoqueMinimo.ok) return res.status(400).json({ erro: estoqueMinimo.erro });

  const custo = validarPrecoCusto(req.body.preco_custo);
  if (!custo.ok) return res.status(400).json({ erro: custo.erro });

  const codigoBarras = normalizarCodigoBarras(req.body.codigo_barras);
  if (await buscarCodigoBarrasDuplicado(codigoBarras, null)) {
    return res.status(400).json({ erro: 'Já existe um produto cadastrado com este código de barras.' });
  }

  const info = await db
    .prepare(
      `INSERT INTO produtos (nome, categoria, preco, quantidade, estoque_minimo, validade, preco_custo, codigo_barras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(nome, categoria || null, preco.valor, quantidade.valor, estoqueMinimo.valor, validade || null, custo.valor, codigoBarras);

  const produto = await db.prepare('SELECT * FROM produtos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(produto);
});

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Produto não encontrado' });

  const { categoria } = req.body;

  // req.body.validade !== undefined (nao "??"): o frontend manda null
  // explicitamente para LIMPAR a validade (checkbox "controlar validade"
  // desmarcado), e null tambem e nullish, entao "??" nunca deixaria isso
  // vencer sobre o valor existente.
  const validadeValor = req.body.validade !== undefined ? req.body.validade : existente.validade;

  let nomeValor = existente.nome;
  if (req.body.nome !== undefined) {
    if (typeof req.body.nome !== 'string' || !req.body.nome.trim()) {
      return res.status(400).json({ erro: 'Nome é obrigatório.' });
    }
    nomeValor = req.body.nome;
  }

  let precoValor = existente.preco;
  if (req.body.preco !== undefined) {
    const preco = validarPreco(req.body.preco);
    if (!preco.ok) return res.status(400).json({ erro: preco.erro });
    precoValor = preco.valor;
  }

  let quantidadeValor = existente.quantidade;
  if (req.body.quantidade !== undefined) {
    const quantidade = validarInteiroNaoNegativo(req.body.quantidade, 'Quantidade');
    if (!quantidade.ok) return res.status(400).json({ erro: quantidade.erro });
    quantidadeValor = quantidade.valor;
  }

  let estoqueMinimoValor = existente.estoque_minimo;
  if (req.body.estoque_minimo !== undefined) {
    const estoqueMinimo = validarInteiroNaoNegativo(req.body.estoque_minimo, 'Estoque mínimo');
    if (!estoqueMinimo.ok) return res.status(400).json({ erro: estoqueMinimo.erro });
    estoqueMinimoValor = estoqueMinimo.valor;
  }

  let custoValor = existente.preco_custo;
  if (req.body.preco_custo !== undefined) {
    const custo = validarPrecoCusto(req.body.preco_custo);
    if (!custo.ok) return res.status(400).json({ erro: custo.erro });
    custoValor = custo.valor;
  }

  let codigoBarras = existente.codigo_barras;
  if (req.body.codigo_barras !== undefined) {
    codigoBarras = normalizarCodigoBarras(req.body.codigo_barras);
    if (await buscarCodigoBarrasDuplicado(codigoBarras, existente.id)) {
      return res.status(400).json({ erro: 'Já existe um produto cadastrado com este código de barras.' });
    }
  }

  await db.prepare(
    `UPDATE produtos
     SET nome = ?, categoria = ?, preco = ?, quantidade = ?, estoque_minimo = ?, validade = ?, preco_custo = ?, codigo_barras = ?
     WHERE id = ?`
  ).run(
    nomeValor,
    categoria ?? existente.categoria,
    precoValor,
    quantidadeValor,
    estoqueMinimoValor,
    validadeValor,
    custoValor,
    codigoBarras,
    req.params.id
  );

  const produto = await db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  res.json(produto);
});

router.delete('/:id', async (req, res) => {
  const info = await db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.status(204).end();
});

module.exports = router;
