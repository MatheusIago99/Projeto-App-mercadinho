const api = {
  async listarProdutos() {
    const res = await fetch('/api/produtos');
    return res.json();
  },
  async criarProduto(produto) {
    const res = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    });
    return res.json();
  },
  async atualizarProduto(id, produto) {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    });
    return res.json();
  },
  async excluirProduto(id) {
    return fetch(`/api/produtos/${id}`, { method: 'DELETE' });
  },
  async registrarCompra(produto_id, quantidade) {
    const res = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id, quantidade }),
    });
    return res.json();
  },
  async registrarVenda({ itens, forma_pagamento, valor_recebido }) {
    const res = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens, forma_pagamento, valor_recebido }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Erro ao registrar venda');
    return dados;
  },
  async listarVendas() {
    const res = await fetch('/api/vendas');
    return res.json();
  },
  async listarAlertas() {
    const res = await fetch('/api/alertas');
    return res.json();
  },
  async relatorioVendas(dias) {
    const res = await fetch(`/api/relatorios/vendas${dias ? `?dias=${dias}` : ''}`);
    return res.json();
  },
  async listarDescartes() {
    const res = await fetch('/api/descartes');
    return res.json();
  },
  async registrarDescarte(produto_id, quantidade, motivo) {
    const res = await fetch('/api/descartes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id, quantidade, motivo }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Erro ao registrar descarte');
    return dados;
  },
  async listarMovimentacoes() {
    const res = await fetch('/api/movimentacoes');
    return res.json();
  },
};

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function escapeHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Gráfico de barras (SVG inline) reutilizado pelo Início e por Relatórios,
// para não duplicar a mesma lógica de desenho em dois arquivos.
function corMarca() {
  return getComputedStyle(document.documentElement).getPropertyValue('--verde').trim() || '#1f6f46';
}

function formatarDiaCurto(iso) {
  const [, mes, dia] = iso.split('-');
  return { dia, mes };
}

function graficoFaturamento(porDia) {
  const largura = 340;
  const altura = 130;
  const baseY = altura - 20;
  const maxValor = Math.max(...porDia.map((p) => p.faturamento), 1);
  const cor = corMarca();
  const larguraBarra = largura / porDia.length;
  const gap = 4;

  const barras = porDia
    .map((p, i) => {
      const alturaBarra = (p.faturamento / maxValor) * (baseY - 10);
      const x = i * larguraBarra + gap / 2;
      const y = baseY - alturaBarra;
      const w = larguraBarra - gap;
      const { dia } = formatarDiaCurto(p.dia);
      const titulo = `${dia}: ${formatarMoeda(p.faturamento)}`;
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(alturaBarra, 1).toFixed(1)}" rx="3" fill="${cor}">
          <title>${titulo}</title>
        </rect>
        <text x="${(x + w / 2).toFixed(1)}" y="${altura - 6}" text-anchor="middle" class="grafico-eixo">${dia}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Faturamento por dia" class="grafico-svg">
      <line x1="0" y1="${baseY}" x2="${largura}" y2="${baseY}" class="grafico-linha-base" />
      ${barras}
    </svg>`;
}

// Interpretação única de validade usada por todo o frontend (Dashboard,
// Produtos, Vendas): comparação por DATA DE CALENDÁRIO (ano/mes/dia), nunca
// por hora/minuto/segundo. Regra: validade < hoje => vencido; validade ===
// hoje => NÃO vencido (mesma regra aplicada no backend em utils/validade.js).
const DIAS_ALERTA_VALIDADE = 7;

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function hojeDataISO() {
  return formatarDataISO(new Date());
}

function somarDiasISO(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return formatarDataISO(data);
}

function validadeEstaVencida(validade) {
  if (!validade) return false;
  return validade.slice(0, 10) < hojeDataISO();
}

function validadeVenceHoje(validade) {
  if (!validade) return false;
  return validade.slice(0, 10) === hojeDataISO();
}

const STATUS_ROTULOS = {
  normal: 'Normal',
  estoque_baixo: 'Estoque baixo',
  sem_estoque: 'Sem estoque',
  vencendo: 'Vencendo',
  vencendo_hoje: 'Vence hoje',
  vencido: 'Vencido',
};

const STATUS_CORES = {
  normal: 'verde',
  estoque_baixo: 'amarelo',
  sem_estoque: 'vermelho',
  vencendo: 'amarelo',
  vencendo_hoje: 'amarelo',
  vencido: 'vermelho',
};

function calcularStatusProduto(produto) {
  if (validadeEstaVencida(produto.validade)) return 'vencido';
  if (validadeVenceHoje(produto.validade)) return 'vencendo_hoje';
  if (produto.validade && produto.validade.slice(0, 10) <= somarDiasISO(DIAS_ALERTA_VALIDADE)) return 'vencendo';
  if (produto.quantidade === 0) return 'sem_estoque';
  if (produto.quantidade <= produto.estoque_minimo) return 'estoque_baixo';
  return 'normal';
}
