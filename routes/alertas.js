const express = require('express');
const db = require('../db/database');
const { estaVencido, estaProximoDaValidade } = require('../utils/validade');

const router = express.Router();

const DIAS_ALERTA_VALIDADE = 7;

router.get('/', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos').all();

  const estoqueBaixo = produtos.filter((p) => p.quantidade <= p.estoque_minimo);
  const vencidos = produtos.filter((p) => estaVencido(p.validade));
  const proximosDaValidade = produtos.filter((p) => estaProximoDaValidade(p.validade, DIAS_ALERTA_VALIDADE));

  res.json({ estoqueBaixo, vencidos, proximosDaValidade });
});

module.exports = router;
