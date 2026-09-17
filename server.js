const path = require('node:path');
const express = require('express');
const cors = require('cors');

const produtosRouter = require('./routes/produtos');
const vendasRouter = require('./routes/vendas');
const comprasRouter = require('./routes/compras');
const alertasRouter = require('./routes/alertas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/produtos', produtosRouter);
app.use('/api/vendas', vendasRouter);
app.use('/api/compras', comprasRouter);
app.use('/api/alertas', alertasRouter);

app.listen(PORT, () => {
  console.log(`SmartEstoque rodando em http://localhost:${PORT}`);
});
