const express = require('express');
const db = require('../db/database');
const { hojeData, deslocarData, diferencaDias } = require('../utils/validade');

const router = express.Router();

// Mesmo limite ja usado antes desta fase (antigo parametro "dias"): alem
// de evitar consultas custosas, mantem o grafico por dia legivel (uma
// barra por dia).
const LIMITE_DIAS_INTERVALO = 90;
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const TOP_LIMITE = 5;

function validarIntervalo(inicio, fim) {
  if (!REGEX_DATA.test(inicio) || !REGEX_DATA.test(fim)) {
    return 'Datas inválidas.';
  }
  if (inicio > fim) {
    return 'A data inicial não pode ser depois da data final.';
  }
  // diferencaDias e a distancia entre as duas datas; a contagem de dias do
  // periodo (inclusiva) e diferencaDias + 1.
  if (diferencaDias(inicio, fim) + 1 > LIMITE_DIAS_INTERVALO) {
    return `Selecione um período de até ${LIMITE_DIAS_INTERVALO} dias.`;
  }
  return null;
}

// Relatório de vendas do período [inicio, fim] (datas de calendário,
// inclusivas). Quando os parâmetros não são enviados, assume o dia de hoje
// (mesma referência de "hoje" usada no restante do sistema).
router.get('/vendas', (req, res) => {
  const inicio = req.query.inicio || hojeData();
  const fim = req.query.fim || hojeData();

  const erro = validarIntervalo(inicio, fim);
  if (erro) return res.status(400).json({ erro });

  const resumo = db
    .prepare(
      `SELECT COUNT(*) AS quantidadeVendas, COALESCE(SUM(total), 0) AS faturamento
       FROM vendas WHERE date(data) BETWEEN ? AND ?`
    )
    .get(inicio, fim);

  const ticketMedio = resumo.quantidadeVendas > 0 ? resumo.faturamento / resumo.quantidadeVendas : 0;

  // Comparação com o período anterior de MESMA duração, imediatamente
  // anterior ao início do período atual. Só é exibida no frontend quando
  // o período anterior teve faturamento (senão não há base de comparação).
  const duracaoDias = diferencaDias(inicio, fim) + 1;
  const fimAnterior = deslocarData(inicio, -1);
  const inicioAnterior = deslocarData(fimAnterior, -(duracaoDias - 1));
  const resumoAnterior = db
    .prepare(`SELECT COALESCE(SUM(total), 0) AS faturamento FROM vendas WHERE date(data) BETWEEN ? AND ?`)
    .get(inicioAnterior, fimAnterior);

  const variacaoPercentual =
    resumoAnterior.faturamento > 0 ? ((resumo.faturamento - resumoAnterior.faturamento) / resumoAnterior.faturamento) * 100 : null;

  // Gráfico por dia: preenche os dias sem venda com 0 para o gráfico ficar
  // contínuo (mesma técnica já usada antes, agora ancorada no intervalo
  // explícito em vez de "date('now', ...)").
  const porDiaBanco = db
    .prepare(
      `SELECT date(data) AS dia, SUM(total) AS faturamento
       FROM vendas WHERE date(data) BETWEEN ? AND ?
       GROUP BY dia`
    )
    .all(inicio, fim);
  const mapaFaturamento = new Map(porDiaBanco.map((linha) => [linha.dia, linha.faturamento]));

  const porDia = [];
  for (let i = 0; i < duracaoDias; i++) {
    const dia = deslocarData(inicio, i);
    porDia.push({ dia, faturamento: mapaFaturamento.get(dia) || 0 });
  }

  const maisVendidos = db
    .prepare(
      `SELECT p.id, p.nome, SUM(vi.quantidade) AS quantidade, SUM(vi.quantidade * vi.preco_unitario) AS receita
       FROM venda_itens vi
       JOIN produtos p ON p.id = vi.produto_id
       JOIN vendas v ON v.id = vi.venda_id
       WHERE date(v.data) BETWEEN ? AND ?
       GROUP BY vi.produto_id
       ORDER BY quantidade DESC
       LIMIT ?`
    )
    .all(inicio, fim, TOP_LIMITE);

  // Menor saída: todos os produtos, com a quantidade vendida NO PERÍODO
  // (0 quando não vendido), ordenados da menor para a maior. LEFT JOIN
  // evita N+1 (uma query só, sem uma chamada por produto).
  const menorSaida = db
    .prepare(
      `SELECT p.id, p.nome, p.quantidade AS estoque_atual,
              COALESCE(SUM(CASE WHEN date(v.data) BETWEEN ? AND ? THEN vi.quantidade ELSE 0 END), 0) AS quantidade_vendida
       FROM produtos p
       LEFT JOIN venda_itens vi ON vi.produto_id = p.id
       LEFT JOIN vendas v ON v.id = vi.venda_id
       GROUP BY p.id
       ORDER BY quantidade_vendida ASC, p.nome ASC
       LIMIT ?`
    )
    .all(inicio, fim, TOP_LIMITE);

  const formasPagamentoBanco = db
    .prepare(
      `SELECT COALESCE(forma_pagamento, 'NAO_INFORMADO') AS forma, COUNT(*) AS quantidade, SUM(total) AS valor
       FROM vendas WHERE date(data) BETWEEN ? AND ?
       GROUP BY forma`
    )
    .all(inicio, fim);

  const formasPagamento = formasPagamentoBanco.map((linha) => ({
    forma: linha.forma,
    quantidade: linha.quantidade,
    valor: linha.valor,
    percentual: resumo.faturamento > 0 ? (linha.valor / resumo.faturamento) * 100 : 0,
  }));

  // Lucro estimado: usa o preco_custo ATUAL do produto (venda_itens só
  // guarda o preco_unitario de VENDA, nunca o custo histórico). Para itens
  // cujo custo é desconhecido (preco_custo NULL, nunca tratado como 0),
  // não entram no lucro nem na receita "com custo conhecido" usada para a
  // margem — por isso o resultado é sempre rotulado como estimativa, com
  // a cobertura de custo explícita ao lado.
  const lucroBanco = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN p.preco_custo IS NOT NULL THEN (vi.preco_unitario - p.preco_custo) * vi.quantidade ELSE 0 END), 0) AS lucro,
         COALESCE(SUM(CASE WHEN p.preco_custo IS NOT NULL THEN vi.quantidade * vi.preco_unitario ELSE 0 END), 0) AS receitaComCusto,
         COALESCE(SUM(CASE WHEN p.preco_custo IS NOT NULL THEN vi.quantidade ELSE 0 END), 0) AS quantidadeComCusto,
         COALESCE(SUM(vi.quantidade), 0) AS quantidadeTotal
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       JOIN produtos p ON p.id = vi.produto_id
       WHERE date(v.data) BETWEEN ? AND ?`
    )
    .get(inicio, fim);

  const lucroEstimado = {
    valor: lucroBanco.lucro,
    coberturaPercentual: lucroBanco.quantidadeTotal > 0 ? (lucroBanco.quantidadeComCusto / lucroBanco.quantidadeTotal) * 100 : null,
    margemPercentual: lucroBanco.receitaComCusto > 0 ? (lucroBanco.lucro / lucroBanco.receitaComCusto) * 100 : null,
  };

  res.json({
    periodo: { inicio, fim },
    resumo: {
      faturamento: resumo.faturamento,
      quantidadeVendas: resumo.quantidadeVendas,
      ticketMedio,
    },
    comparacaoAnterior: { variacaoPercentual },
    porDia,
    maisVendidos,
    menorSaida,
    formasPagamento,
    lucroEstimado,
  });
});

module.exports = router;
