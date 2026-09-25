const express = require('express');
const db = require('../db/database');
const { estaVencido, estaProximoDaValidade } = require('../utils/validade');

const router = express.Router();

const DIAS_ALERTA_VALIDADE = 7;

router.get('/', async (req, res) => {
  const produtos = await db.prepare('SELECT * FROM produtos').all();

  // estoqueBaixo preservado como estava (inclui produtos sem estoque, que
  // sao um subconjunto dele) para nao alterar o KPI/Dashboard existente.
  // semEstoque e uma lista adicional, so para a secao "Situação do
  // estoque" de Relatórios.
  const estoqueBaixo = produtos.filter((p) => p.quantidade <= p.estoque_minimo);
  const semEstoque = produtos.filter((p) => p.quantidade === 0);
  const vencidos = produtos.filter((p) => estaVencido(p.validade));
  const proximosDaValidade = produtos.filter((p) => estaProximoDaValidade(p.validade, DIAS_ALERTA_VALIDADE));

  res.json({ estoqueBaixo, semEstoque, vencidos, proximosDaValidade });
});

module.exports = router;
