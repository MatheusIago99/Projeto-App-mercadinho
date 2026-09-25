const express = require('express');
const db = require('../db/database');

const router = express.Router();

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

// inicio/fim (opcionais) filtram por data de calendario ("LEFT(data, 10)",
// já que data é guardada como TEXT), mesma tecnica ja usada no restante do
// backend. Sem eles, mantem o comportamento historico: todos os registros.
router.get('/', async (req, res) => {
  const { inicio, fim } = req.query;
  const filtrarPorPeriodo = REGEX_DATA.test(inicio) && REGEX_DATA.test(fim);
  const filtroParams = filtrarPorPeriodo ? [inicio, fim] : [];

  // Quando filtrado por período (uso de Relatórios, que só le "resumo"),
  // não ha necessidade de buscar a lista de itens individuais.
  const itens = filtrarPorPeriodo
    ? []
    : await db
        .prepare(
          `SELECT d.*, p.nome AS produto_nome
           FROM descartes d JOIN produtos p ON p.id = d.produto_id
           ORDER BY d.data DESC
           LIMIT 50`
        )
        .all();

  const filtroResumoSql = filtrarPorPeriodo ? 'WHERE LEFT(data, 10) BETWEEN ? AND ?' : '';

  const resumo = await db
    .prepare(
      `SELECT
         COUNT(*)::int AS registros,
         COALESCE(SUM(quantidade), 0)::int AS quantidade_total,
         COALESCE(SUM(quantidade * preco_unitario), 0) AS valor_total
       FROM descartes
       ${filtroResumoSql}`
    )
    .get(...filtroParams);

  const porMotivo = await db
    .prepare(
      `SELECT COALESCE(motivo, 'Outros') AS motivo, COUNT(*)::int AS registros, COALESCE(SUM(quantidade), 0)::int AS quantidade
       FROM descartes
       ${filtroResumoSql}
       GROUP BY motivo
       ORDER BY quantidade DESC`
    )
    .all(...filtroParams);

  res.json({ itens, resumo: { ...resumo, porMotivo } });
});

// Registra o descarte de um produto (venceu, estragou etc.) e dá baixa no estoque.
router.post('/', async (req, res) => {
  const { produto_id, motivo } = req.body;
  const quantidade = Number(req.body.quantidade);

  if (!produto_id || !Number.isFinite(quantidade) || quantidade <= 0) {
    return res.status(400).json({ erro: 'Produto e quantidade (maior que zero) são obrigatórios' });
  }

  const produto = await db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  if (produto.quantidade < quantidade) {
    return res.status(400).json({ erro: 'Quantidade maior que o estoque disponível' });
  }

  await db.exec('BEGIN');
  try {
    await db.prepare(
      'INSERT INTO descartes (produto_id, quantidade, preco_unitario, motivo) VALUES (?, ?, ?, ?)'
    ).run(produto_id, quantidade, produto.preco, motivo || null);

    await db.prepare('UPDATE produtos SET quantidade = ? WHERE id = ?').run(
      produto.quantidade - quantidade,
      produto_id
    );

    await db.exec('COMMIT');
    res.status(201).json({ ok: true });
  } catch (err) {
    await db.exec('ROLLBACK');
    // Tudo que pode falhar por entrada invalida ja foi validado antes do
    // BEGIN; qualquer erro aqui e inesperado, nunca deve expor texto tecnico.
    console.error('Falha inesperada ao registrar descarte:', err);
    res.status(400).json({ erro: 'Não foi possível registrar o descarte.' });
  }
});

module.exports = router;
