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
  async registrarVenda(itens) {
    const res = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
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
