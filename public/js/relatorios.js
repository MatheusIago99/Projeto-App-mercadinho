function graficoMaisVendidos(produtos) {
  if (produtos.length === 0) {
    return '<div class="vazio">Nenhuma venda registrada nesse período.</div>';
  }

  const max = Math.max(...produtos.map((p) => p.quantidade), 1);

  return produtos
    .map((p) => {
      const pct = Math.max((p.quantidade / max) * 100, 4);
      return `
        <div class="barra-ranking">
          <div class="barra-ranking-topo">
            <span>${escapeHtml(p.nome)}</span>
            <strong>${p.quantidade} un</strong>
          </div>
          <div class="barra-ranking-trilho">
            <span style="width:${pct}%"></span>
          </div>
        </div>`;
    })
    .join('');
}

async function carregarRelatorioVendas() {
  try {
    const { porDia, maisVendidos, totalFaturamento } = await api.relatorioVendas(14);
    document.getElementById('stat-faturamento').textContent = formatarMoeda(totalFaturamento);
    document.getElementById('grafico-faturamento').outerHTML = `<div id="grafico-faturamento">${graficoFaturamento(porDia)}</div>`;
    document.getElementById('grafico-mais-vendidos').outerHTML = `<div id="grafico-mais-vendidos">${graficoMaisVendidos(maisVendidos)}</div>`;
  } catch (err) {
    document.getElementById('mensagens').innerHTML = '<div class="msg erro">Não foi possível carregar o relatório de vendas.</div>';
  }
}

async function carregarDesperdicio() {
  try {
    const { itens, resumo } = await api.listarDescartes();

    document.getElementById('resumo-desperdicio').innerHTML = `
      <div class="mini-stat">
        <strong>${resumo.quantidade_total}</strong>
        <span>itens perdidos</span>
      </div>
      <div class="mini-stat critico">
        <strong>${formatarMoeda(resumo.valor_total)}</strong>
        <span>valor perdido</span>
      </div>
    `;

    const container = document.getElementById('lista-descartes');
    if (itens.length === 0) {
      container.className = 'vazio';
      container.textContent = 'Nenhum descarte registrado ainda.';
      return;
    }

    container.className = '';
    container.innerHTML = itens
      .map(
        (d) => `
        <div class="lista-item">
          <div class="info">
            <strong>${escapeHtml(d.produto_nome)}</strong>
            <small>${d.quantidade} un · ${formatarMoeda(d.quantidade * d.preco_unitario)}${d.motivo ? ' · ' + escapeHtml(d.motivo) : ''} · ${new Date(d.data).toLocaleDateString('pt-BR')}</small>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    document.getElementById('mensagens').innerHTML = '<div class="msg erro">Não foi possível carregar o desperdício.</div>';
  }
}

carregarRelatorioVendas();
carregarDesperdicio();
