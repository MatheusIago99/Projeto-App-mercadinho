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
