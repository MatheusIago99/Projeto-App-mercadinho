(function () {
  'use strict';

  const mensagens = document.getElementById('mensagens');
  const periodoBotoes = document.querySelectorAll('.periodo-btn');
  const periodoPersonalizado = document.getElementById('periodo-personalizado');
  const inputDataInicial = document.getElementById('data-inicial');
  const inputDataFinal = document.getElementById('data-final');
  const btnAplicarPeriodo = document.getElementById('btn-aplicar-periodo');
  const periodoErroEl = document.getElementById('periodo-erro');
  const btnExportar = document.getElementById('btn-exportar');

  let periodo = { inicio: somarDiasISO(-6), fim: hojeDataISO() };

  function mostrarMensagem(texto, tipo) {
    mensagens.innerHTML = `<div class="msg ${tipo}">${escapeHtml(texto)}</div>`;
    setTimeout(() => (mensagens.innerHTML = ''), 3000);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function skeletonLinha(altura) {
    return `<div class="skeleton" style="height:${altura}"></div>`;
  }

  function blocoErro(mensagem, aoTentarNovamente) {
    const div = document.createElement('div');
    div.className = 'bloco-erro';
    div.innerHTML = `<p>${escapeHtml(mensagem)}</p><button type="button" class="btn secundario btn-tentar-novamente">Tentar novamente</button>`;
    div.querySelector('.btn-tentar-novamente').addEventListener('click', aoTentarNovamente);
    return div;
  }

  // Os containers nascem com class="vazio" (texto cinza centralizado,
  // pulsando) para o estado "Carregando...". Ao trocar para skeleton, dados
  // reais ou erro, a classe precisa ser removida — senão o conteúdo real
  // herda o estilo de estado vazio (ficou pálido/pulsando por engano).
  function renderConteudo(id, html) {
    const container = el(id);
    container.className = '';
    container.innerHTML = html;
  }

  function renderVazio(id, mensagem) {
    const container = el(id);
    container.className = 'vazio';
    container.textContent = mensagem;
  }

  function renderErro(id, mensagem, aoTentarNovamente) {
    const container = el(id);
    container.className = '';
    container.innerHTML = '';
    container.appendChild(blocoErro(mensagem, aoTentarNovamente));
  }

  // ---------- período ----------

  function definirPeriodoAtivo(tipo) {
    periodoBotoes.forEach((btn) => btn.classList.toggle('ativo', btn.dataset.periodo === tipo));
    periodoPersonalizado.hidden = tipo !== 'personalizado';
  }

  function aplicarPeriodo(inicio, fim) {
    periodoErroEl.hidden = true;
    if (inicio > fim) {
      periodoErroEl.textContent = 'A data inicial não pode ser depois da data final.';
      periodoErroEl.hidden = false;
      return;
    }
    periodo = { inicio, fim };
    carregarTudo();
  }

  periodoBotoes.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.periodo;
      definirPeriodoAtivo(tipo);
      if (tipo === 'personalizado') {
        if (!inputDataInicial.value) inputDataInicial.value = periodo.inicio;
        if (!inputDataFinal.value) inputDataFinal.value = periodo.fim;
        return;
      }
      const fim = hojeDataISO();
      const inicio = tipo === 'hoje' ? fim : somarDiasISO(-(Number(tipo) - 1));
      aplicarPeriodo(inicio, fim);
    });
  });

  btnAplicarPeriodo.addEventListener('click', () => {
    if (!inputDataInicial.value || !inputDataFinal.value) {
      periodoErroEl.textContent = 'Informe as duas datas.';
      periodoErroEl.hidden = false;
      return;
    }
    aplicarPeriodo(inputDataInicial.value, inputDataFinal.value);
  });

  btnExportar.addEventListener('click', () => {
    mostrarMensagem('Exportação em desenvolvimento. Em breve você poderá exportar este relatório.', 'sucesso');
  });

  // ---------- KPIs ----------

  function kpiCard({ icone, cor, rotulo, valor, detalhe }) {
    return `
      <div class="kpi-card">
        <div class="kpi-topo">
          <span class="kpi-icone kpi-icone-${cor}" aria-hidden="true">${icone}</span>
          <span class="kpi-rotulo">${rotulo}</span>
        </div>
        <strong class="kpi-valor">${valor}</strong>
        <span class="kpi-detalhe kpi-detalhe-${cor}">${detalhe}</span>
      </div>`;
  }

  const ICONE_FATURAMENTO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const ICONE_LUCRO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 9 11l4 4 8-8"/><path d="M21 7v6h-6"/></svg>';
  const ICONE_VENDAS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none"/></svg>';
  const ICONE_TICKET =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>';

  function renderizarKPIs(relatorio) {
    const { resumo, comparacaoAnterior, lucroEstimado } = relatorio;

    let detalheFaturamento = 'No período selecionado';
    if (comparacaoAnterior.variacaoPercentual !== null) {
      const v = comparacaoAnterior.variacaoPercentual;
      detalheFaturamento = `${v >= 0 ? '+' : ''}${v.toFixed(1)}% vs. período anterior`;
    }

    let detalheLucro = 'Sem vendas no período';
    if (lucroEstimado.coberturaPercentual !== null) {
      detalheLucro = `Cobertura de custo: ${lucroEstimado.coberturaPercentual.toFixed(0)}%`;
      if (lucroEstimado.margemPercentual !== null) {
        detalheLucro += ` · Margem est.: ${lucroEstimado.margemPercentual.toFixed(1)}%`;
      }
    }

    el('kpi-grid-relatorios').innerHTML = [
      kpiCard({
        icone: ICONE_FATURAMENTO,
        cor: 'verde',
        rotulo: 'Faturamento',
        valor: formatarMoeda(resumo.faturamento),
        detalhe: detalheFaturamento,
      }),
      kpiCard({
        icone: ICONE_LUCRO,
        cor: 'neutro',
        rotulo: 'Lucro estimado',
        valor: formatarMoeda(lucroEstimado.valor),
        detalhe: detalheLucro,
      }),
      kpiCard({
        icone: ICONE_VENDAS,
        cor: 'neutro',
        rotulo: 'Vendas',
        valor: String(resumo.quantidadeVendas),
        detalhe: 'No período selecionado',
      }),
      kpiCard({
        icone: ICONE_TICKET,
        cor: 'neutro',
        rotulo: 'Ticket médio',
        valor: formatarMoeda(resumo.ticketMedio),
        detalhe: 'Faturamento ÷ vendas',
      }),
    ].join('');
  }

  // ---------- gráfico + rankings ----------

  function graficoMaisVendidos(produtos) {
    if (produtos.length === 0) {
      return '<div class="vazio">Nenhuma venda registrada neste período.</div>';
    }
    const max = Math.max(...produtos.map((p) => p.quantidade), 1);
    return produtos
      .map(
        (p) => `
        <div class="barra-ranking">
          <div class="barra-ranking-topo">
            <span>${escapeHtml(p.nome)}</span>
            <strong>${p.quantidade} un · ${formatarMoeda(p.receita)}</strong>
          </div>
          <div class="barra-ranking-trilho">
            <span style="width:${Math.max((p.quantidade / max) * 100, 4)}%"></span>
          </div>
        </div>`
      )
      .join('');
  }

  function graficoMenorSaida(produtos) {
    if (produtos.length === 0) {
      return '<div class="vazio">Nenhum produto cadastrado.</div>';
    }
    return produtos
      .map(
        (p) => `
        <div class="lista-item">
          <div class="info">
            <strong>${escapeHtml(p.nome)}</strong>
            <small>Estoque atual: ${p.estoque_atual} · Vendido no período: ${p.quantidade_vendida} un</small>
          </div>
        </div>`
      )
      .join('');
  }

  function graficoFormasPagamento(formas, faturamentoTotal) {
    const relevantes = formas.filter((f) => f.quantidade > 0);
    if (relevantes.length === 0 || faturamentoTotal === 0) {
      return '<div class="vazio">Nenhuma venda registrada neste período.</div>';
    }
    const max = Math.max(...relevantes.map((f) => f.valor), 1);
    return relevantes
      .map(
        (f) => `
        <div class="barra-ranking">
          <div class="barra-ranking-topo">
            <span>${escapeHtml(PAGAMENTO_ROTULOS[f.forma] || f.forma)}</span>
            <strong>${formatarMoeda(f.valor)} · ${f.percentual.toFixed(0)}%</strong>
          </div>
          <div class="barra-ranking-trilho">
            <span style="width:${Math.max((f.valor / max) * 100, 4)}%"></span>
          </div>
        </div>`
      )
      .join('');
  }

  async function carregarRelatorioVendas() {
    renderConteudo('grafico-relatorio', skeletonLinha('160px'));
    renderConteudo('lista-mais-vendidos', skeletonLinha('34px') + skeletonLinha('34px') + skeletonLinha('34px'));
    renderConteudo('lista-pagamentos', skeletonLinha('34px') + skeletonLinha('34px'));
    renderConteudo('lista-menor-saida', skeletonLinha('40px') + skeletonLinha('40px'));
    el('kpi-grid-relatorios').innerHTML = Array.from({ length: 4 })
      .map(() => '<div class="kpi-card">' + skeletonLinha('16px') + skeletonLinha('28px') + skeletonLinha('12px') + '</div>')
      .join('');

    try {
      const relatorio = await api.relatorioVendas(periodo.inicio, periodo.fim);

      renderizarKPIs(relatorio);

      if (relatorio.resumo.quantidadeVendas === 0) {
        renderVazio('grafico-relatorio', 'Nenhuma venda registrada neste período.');
      } else {
        renderConteudo('grafico-relatorio', graficoFaturamento(relatorio.porDia));
      }

      renderConteudo('lista-mais-vendidos', graficoMaisVendidos(relatorio.maisVendidos));
      renderConteudo('lista-menor-saida', graficoMenorSaida(relatorio.menorSaida));
      renderConteudo('lista-pagamentos', graficoFormasPagamento(relatorio.formasPagamento, relatorio.resumo.faturamento));
    } catch (err) {
      const mensagem = err.message || 'Não foi possível carregar o relatório de vendas.';
      el('kpi-grid-relatorios').innerHTML = '';
      el('kpi-grid-relatorios').appendChild(blocoErro(mensagem, carregarRelatorioVendas));
      renderErro('grafico-relatorio', mensagem, carregarRelatorioVendas);
      renderErro('lista-mais-vendidos', mensagem, carregarRelatorioVendas);
      renderErro('lista-pagamentos', mensagem, carregarRelatorioVendas);
      renderErro('lista-menor-saida', mensagem, carregarRelatorioVendas);
    }
  }

  // ---------- descartes ----------

  function graficoMotivosDescarte(porMotivo) {
    if (!porMotivo || porMotivo.length === 0) return '';
    const max = Math.max(...porMotivo.map((m) => m.quantidade), 1);
    return `
      <div class="motivos-descarte">
        ${porMotivo
          .map(
            (m) => `
          <div class="barra-ranking">
            <div class="barra-ranking-topo">
              <span>${escapeHtml(m.motivo)}</span>
              <strong>${m.quantidade} un</strong>
            </div>
            <div class="barra-ranking-trilho">
              <span style="width:${Math.max((m.quantidade / max) * 100, 4)}%"></span>
            </div>
          </div>`
          )
          .join('')}
      </div>`;
  }

  async function carregarDescartes() {
    el('resumo-desperdicio').innerHTML = skeletonLinha('56px');
    el('lista-motivos-descarte').innerHTML = '';

    try {
      const { resumo } = await api.listarDescartes(periodo.inicio, periodo.fim);

      if (resumo.registros === 0) {
        el('resumo-desperdicio').innerHTML = '';
        el('lista-motivos-descarte').innerHTML = '<div class="vazio">Nenhum descarte registrado neste período.</div>';
        return;
      }

      el('resumo-desperdicio').innerHTML = `
        <div class="mini-stat">
          <strong>${resumo.quantidade_total}</strong>
          <span>itens descartados</span>
        </div>
        <div class="mini-stat critico">
          <strong>${formatarMoeda(resumo.valor_total)}</strong>
          <span>valor estimado perdido</span>
        </div>
      `;
      el('lista-motivos-descarte').innerHTML = graficoMotivosDescarte(resumo.porMotivo);
    } catch (err) {
      el('resumo-desperdicio').innerHTML = '';
      el('lista-motivos-descarte').innerHTML = '';
      el('lista-motivos-descarte').appendChild(blocoErro('Não foi possível carregar as perdas por descarte.', carregarDescartes));
    }
  }

  // ---------- situação do estoque ----------

  function estatItem(rotulo, quantidade, cor, href) {
    return `
      <a class="estoque-stat-item estoque-stat-${cor}" href="${href}">
        <strong>${quantidade}</strong>
        <span>${rotulo}</span>
      </a>`;
  }

  async function carregarEstoque() {
    renderConteudo('situacao-estoque', skeletonLinha('60px'));
    try {
      const { estoqueBaixo, semEstoque, vencidos, proximosDaValidade } = await api.listarAlertas();
      renderConteudo(
        'situacao-estoque',
        `<div class="estoque-stats-grid">
          ${estatItem('Estoque baixo', estoqueBaixo.length, 'amarelo', '/produtos.html')}
          ${estatItem('Sem estoque', semEstoque.length, 'vermelho', '/produtos.html')}
          ${estatItem('Vencidos', vencidos.length, 'vermelho', '/produtos.html')}
          ${estatItem('Vencendo (inclui hoje)', proximosDaValidade.length, 'amarelo', '/produtos.html')}
        </div>`
      );
    } catch (err) {
      renderErro('situacao-estoque', 'Não foi possível carregar a situação do estoque.', carregarEstoque);
    }
  }

  function carregarTudo() {
    carregarRelatorioVendas();
    carregarDescartes();
    carregarEstoque();
  }

  definirPeriodoAtivo('7');
  carregarTudo();
})();
