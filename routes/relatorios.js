const express = require('express');
const db = require('../db/database');

const router = express.Router();

const DIAS_PADRAO = 14;

router.get('/vendas', (req, res) => {
  const dias = Math.min(Math.max(Number(req.query.dias) || DIAS_PADRAO, 1), 90);

  const porDiaBanco = db
    .prepare(
      `SELECT date(data) AS dia, SUM(total) AS faturamento
       FROM vendas
       WHERE date(data) >= date('now', ?)
       GROUP BY dia`
    )
    .all(`-${dias - 1} days`);

  const mapaFaturamento = new Map(porDiaBanco.map((linha) => [linha.dia, linha.faturamento]));

  // Preenche os dias sem venda com 0, para o gráfico ficar contínuo.
  const porDia = [];
  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date();
    data.setDate(data.getDate() - i);
    const chave = data.toISOString().slice(0, 10);
    porDia.push({ dia: chave, faturamento: mapaFaturamento.get(chave) || 0 });
  }

  const maisVendidos = db
    .prepare(
      `SELECT p.id, p.nome, SUM(vi.quantidade) AS quantidade, SUM(vi.quantidade * vi.preco_unitario) AS receita
       FROM venda_itens vi
       JOIN produtos p ON p.id = vi.produto_id
       JOIN vendas v ON v.id = vi.venda_id
       WHERE date(v.data) >= date('now', ?)
       GROUP BY vi.produto_id
       ORDER BY quantidade DESC
       LIMIT 5`
    )
    .all(`-${dias - 1} days`);

  const totalFaturamento = porDia.reduce((soma, item) => soma + item.faturamento, 0);

  res.json({ dias, porDia, maisVendidos, totalFaturamento });
});

module.exports = router;
