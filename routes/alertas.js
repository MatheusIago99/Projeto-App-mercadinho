const express = require('express');
const db = require('../db/database');

const router = express.Router();

const DIAS_ALERTA_VALIDADE = 7;

router.get('/', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos').all();

  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + DIAS_ALERTA_VALIDADE);

  const estoqueBaixo = produtos.filter((p) => p.quantidade <= p.estoque_minimo);
  const vencidos = produtos.filter((p) => p.validade && new Date(p.validade) < hoje);
  const proximosDaValidade = produtos.filter(
    (p) => p.validade && new Date(p.validade) >= hoje && new Date(p.validade) <= limite
  );

  res.json({ estoqueBaixo, vencidos, proximosDaValidade });
});

module.exports = router;
