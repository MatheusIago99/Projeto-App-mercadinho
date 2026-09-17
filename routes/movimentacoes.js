const express = require('express');
const db = require('../db/database');

const router = express.Router();

const DIAS_ALERTA_VALIDADE = 7;
const LIMITE_EVENTOS = 5;

// Endpoint somente leitura: nao existe tabela de log de movimentacoes no
// schema. Este endpoint apenas DERIVA uma lista curta de eventos recentes
// a partir de vendas e descartes reais (com data/hora) e, se ainda houver
// espaco, complementa com fatos atuais (estoque baixo / validade proxima)
// sem inventar timestamp para eles.
router.get('/', (req, res) => {
  const vendas = db
    .prepare(
      `SELECT v.id, v.data, v.total, COUNT(vi.id) AS itens
       FROM vendas v
       LEFT JOIN venda_itens vi ON vi.venda_id = v.id
       GROUP BY v.id
       ORDER BY v.data DESC
       LIMIT 3`
    )
    .all();

  const descartes = db
    .prepare(
      `SELECT d.id, d.data, d.quantidade, p.nome AS produto_nome
       FROM descartes d
       JOIN produtos p ON p.id = d.produto_id
       ORDER BY d.data DESC
       LIMIT 3`
    )
    .all();

  const eventos = [];

  for (const v of vendas) {
    eventos.push({
      tipo: 'venda',
      titulo: 'Venda realizada',
      descricao: `${v.itens} ${v.itens === 1 ? 'item' : 'itens'} · R$ ${v.total.toFixed(2).replace('.', ',')}`,
      data: v.data,
    });
  }

  for (const d of descartes) {
    eventos.push({
      tipo: 'descarte',
      titulo: 'Descarte registrado',
      descricao: `${d.quantidade} un · ${d.produto_nome}`,
      data: d.data,
    });
  }

  eventos.sort((a, b) => new Date(b.data) - new Date(a.data));

  let resultado = eventos.slice(0, LIMITE_EVENTOS);

  if (resultado.length < LIMITE_EVENTOS) {
    const produtos = db.prepare('SELECT nome, quantidade, estoque_minimo, validade FROM produtos').all();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const baixos = produtos.filter((p) => p.quantidade <= p.estoque_minimo);
    const vencendo = produtos.filter((p) => {
      if (!p.validade) return false;
      const dias = Math.round((new Date(p.validade + 'T00:00:00') - hoje) / 86400000);
      return dias >= 0 && dias <= DIAS_ALERTA_VALIDADE;
    });

    const extras = [];
    if (baixos.length > 0) {
      extras.push({
        tipo: 'estoque_baixo',
        titulo: 'Produto com estoque baixo',
        descricao: baixos[0].nome + (baixos.length > 1 ? ` e mais ${baixos.length - 1}` : ''),
        data: null,
      });
    }
    if (vencendo.length > 0) {
      extras.push({
        tipo: 'validade',
        titulo: 'Produto próximo da validade',
        descricao: vencendo[0].nome + (vencendo.length > 1 ? ` e mais ${vencendo.length - 1}` : ''),
        data: null,
      });
    }

    resultado = resultado.concat(extras).slice(0, LIMITE_EVENTOS);
  }

  res.json({ eventos: resultado });
});

module.exports = router;
