(function () {
  'use strict';

  const ICONES = {
    vendas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none"/></svg>',
    caixa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M10.3 3.9 2.5 17.5A1.5 1.5 0 0 0 3.8 20h16.4a1.5 1.5 0 0 0 1.3-2.5L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z"/><circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none"/></svg>',
    calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    reciclagem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H5.5A2.5 2.5 0 0 1 3 16.5v0a2.5 2.5 0 0 1 .4-1.4L6 11"/><path d="M10 4h4l3 5"/><path d="M13.5 19H18a2.5 2.5 0 0 0 2.5-2.5v0a2.5 2.5 0 0 0-.4-1.4L18 11"/><path d="m9 16 2 3-2 3M15 19h-4"/></svg>',
    retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  function el(id) {
    return document.getElementById(id);
  }

  function skeletonLinha(altura) {
    return `<div class="skeleton" style="height:${altura}"></div>`;
  }

  function renderizarSkeletons() {
    el('kpi-grid').innerHTML = Array.from({ length: 4 })
      .map(() => '<div class="kpi-card">' + skeletonLinha('16px') + skeletonLinha('28px') + skeletonLinha('12px') + '</div>')
      .join('');
    el('atencao-necessaria').innerHTML = `<div class="card">${skeletonLinha('48px')}</div>`;
    el('grafico-vendas-7d').innerHTML = skeletonLinha('130px');
    el('ranking-mais-vendidos').innerHTML = Array.from({ length: 3 }).map(() => skeletonLinha('34px')).join('');
    el('lista-movimentacoes').innerHTML = Array.from({ length: 3 }).map(() => skeletonLinha('40px')).join('');
  }

  function blocoErro(mensagem, aoTentarNovamente) {
    const div = document.createElement('div');
    div.className = 'bloco-erro';
    div.innerHTML = `<p>${mensagem}</p><button type="button" class="btn secundario btn-tentar-novamente">Tentar novamente</button>`;
    div.querySelector('.btn-tentar-novamente').addEventListener('click', aoTentarNovamente);
    return div;
  }

  function kpiCard({ icone, cor, rotulo, valor, detalhe }) {
    return `
      <div class="kpi-card">
        <div class="kpi-topo">
          <span class="kpi-icone kpi-icone-${cor}" aria-hidden="true">${ICONES[icone]}</span>
          <span class="kpi-rotulo">${rotulo}</span>
        </div>
        <strong class="kpi-valor">${valor}</strong>
        <span class="kpi-detalhe kpi-detalhe-${cor}">${detalhe}</span>
      </div>`;
  }

  function renderizarKPIs(alertas, produtos, relatorio) {
    const { estoqueBaixo, vencidos, proximosDaValidade } = alertas;

    let vendasHojeValor = 0;
    let detalheVendasHoje = 'Nenhuma venda hoje';
    if (relatorio && relatorio.porDia.length > 0) {
      const hoje = relatorio.porDia[relatorio.porDia.length - 1];
      const ontem = relatorio.porDia.length > 1 ? relatorio.porDia[relatorio.porDia.length - 2] : null;
      vendasHojeValor = hoje.faturamento;
      if (vendasHojeValor > 0 && ontem && ontem.faturamento > 0) {
        const variacao = Math.round(((hoje.faturamento - ontem.faturamento) / ontem.faturamento) * 100);
        detalheVendasHoje = `${variacao >= 0 ? '+' : ''}${variacao}% em relação a ontem`;
      } else if (vendasHojeValor > 0) {
        detalheVendasHoje = 'Primeira venda registrada hoje';
      }
    }

    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const novosEsteMes = produtos.filter((p) => p.criado_em && new Date(p.criado_em.replace(' ', 'T')) >= inicioDoMes).length;

    const totalValidade = vencidos.length + proximosDaValidade.length;
    let detalheValidade = 'Nenhum problema de validade';
    if (vencidos.length > 0 && proximosDaValidade.length > 0) {
      detalheValidade = `${vencidos.length} vencidos · ${proximosDaValidade.length} vencendo`;
    } else if (vencidos.length > 0) {
      detalheValidade = `${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}`;
    } else if (proximosDaValidade.length > 0) {
      detalheValidade = `Nos próximos 7 dias`;
    }

    el('kpi-grid').innerHTML = [
      kpiCard({
        icone: 'vendas',
        cor: 'verde',
        rotulo: 'Vendas hoje',
        valor: formatarMoeda(vendasHojeValor),
        detalhe: detalheVendasHoje,
      }),
      kpiCard({
        icone: 'caixa',
        cor: 'neutro',
        rotulo: 'Produtos cadastrados',
        valor: String(produtos.length),
        detalhe: novosEsteMes > 0 ? `+${novosEsteMes} novo${novosEsteMes > 1 ? 's' : ''} este mês` : 'Catálogo atual',
      }),
      kpiCard({
        icone: 'alerta',
        cor: estoqueBaixo.length > 0 ? 'amarelo' : 'verde',
        rotulo: 'Estoque baixo',
        valor: String(estoqueBaixo.length),
        detalhe: estoqueBaixo.length > 0 ? 'Precisa de reposição' : 'Estoque saudável',
      }),
      kpiCard({
        icone: 'calendario',
        cor: vencidos.length > 0 ? 'vermelho' : proximosDaValidade.length > 0 ? 'amarelo' : 'verde',
        rotulo: 'Validade',
        valor: String(totalValidade),
        detalhe: detalheValidade,
      }),
    ].join('');
  }

  function renderizarAtencao(alertas) {
    const { estoqueBaixo, vencidos, proximosDaValidade } = alertas;
    const total = estoqueBaixo.length + vencidos.length + proximosDaValidade.length;
    const container = el('atencao-necessaria');

    if (total === 0) {
      container.innerHTML = `
        <div class="card atencao atencao-ok">
          <p><strong>Está tudo certo por aqui.</strong><br>Nenhuma atenção necessária no momento.</p>
        </div>`;
      return;
    }

    const linhas = [];
    if (estoqueBaixo.length > 0) linhas.push(`${estoqueBaixo.length} produto${estoqueBaixo.length > 1 ? 's' : ''} com estoque baixo`);
    if (vencidos.length > 0) linhas.push(`${vencidos.length} produto${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''}`);
    if (proximosDaValidade.length > 0) linhas.push(`${proximosDaValidade.length} vence${proximosDaValidade.length > 1 ? 'm' : ''} nos próximos 7 dias`);

    container.innerHTML = `
      <div class="card atencao">
        <span class="atencao-icone" aria-hidden="true">${ICONES.alerta}</span>
        <div class="atencao-corpo">
          <strong>Atenção necessária</strong>
          <p>${linhas.join(' · ')}</p>
        </div>
        <a href="/produtos.html" class="atencao-link">Ver detalhes <span aria-hidden="true">${ICONES.seta}</span></a>
      </div>`;
  }

  function renderizarGrafico(relatorio) {
    el('stat-faturamento-7d').textContent = formatarMoeda(relatorio.totalFaturamento);
    el('grafico-vendas-7d').innerHTML = graficoFaturamento(relatorio.porDia);
  }

  function renderizarRanking(maisVendidos) {
    const container = el('ranking-mais-vendidos');

    if (maisVendidos.length === 0) {
      container.innerHTML = '<div class="vazio">Nenhuma venda registrada no período.</div>';
      return;
    }

    container.innerHTML = `
      <div class="ranking-lista">
        ${maisVendidos
          .map(
            (p, i) => `
          <div class="ranking-linha">
            <span class="ranking-pos">${i + 1}</span>
            <span class="ranking-nome">${escapeHtml(p.nome)}</span>
            <span class="ranking-numeros">
              <strong>${p.quantidade} un</strong>
              <small>${formatarMoeda(p.receita)}</small>
            </span>
          </div>`
          )
          .join('')}
      </div>`;
  }

  function iconeMovimentacao(tipo) {
    if (tipo === 'venda') return { icone: 'vendas', cor: 'verde' };
    if (tipo === 'descarte') return { icone: 'reciclagem', cor: 'amarelo' };
    if (tipo === 'validade') return { icone: 'calendario', cor: 'amarelo' };
    return { icone: 'alerta', cor: 'vermelho' };
  }

  function renderizarMovimentacoes(eventos) {
    const container = el('lista-movimentacoes');

    if (eventos.length === 0) {
      container.innerHTML = '<div class="vazio">Nenhuma movimentação recente.</div>';
      return;
    }

    container.innerHTML = `
      <div class="movimentacoes-lista">
        ${eventos
          .map((ev) => {
            const { icone, cor } = iconeMovimentacao(ev.tipo);
            const dataTexto = ev.data ? new Date(ev.data.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            return `
            <div class="movimentacao-item">
              <span class="movimentacao-icone kpi-icone-${cor}" aria-hidden="true">${ICONES[icone]}</span>
              <div class="movimentacao-corpo">
                <strong>${escapeHtml(ev.titulo)}</strong>
                <span>${escapeHtml(ev.descricao)}</span>
              </div>
              ${dataTexto ? `<span class="movimentacao-data">${dataTexto}</span>` : ''}
            </div>`;
          })
          .join('')}
      </div>`;
  }

  async function carregarDashboard() {
    renderizarSkeletons();

    const [alertasRes, produtosRes, relatorioRes, movimentacoesRes] = await Promise.allSettled([
      api.listarAlertas(),
      api.listarProdutos(),
      api.relatorioVendas(7),
      api.listarMovimentacoes(),
    ]);

    const alertasOk = alertasRes.status === 'fulfilled';
    const produtosOk = produtosRes.status === 'fulfilled';
    const relatorioOk = relatorioRes.status === 'fulfilled';

    if (alertasOk && produtosOk) {
      renderizarKPIs(alertasRes.value, produtosRes.value, relatorioOk ? relatorioRes.value : null);
      renderizarAtencao(alertasRes.value);
    } else {
      el('kpi-grid').innerHTML = '';
      el('kpi-grid').appendChild(blocoErro('Não foi possível carregar os indicadores.', carregarDashboard));
      el('atencao-necessaria').innerHTML = '';
      el('atencao-necessaria').appendChild(blocoErro('Não foi possível carregar os alertas.', carregarDashboard));
    }

    if (relatorioOk) {
      renderizarGrafico(relatorioRes.value);
      renderizarRanking(relatorioRes.value.maisVendidos);
    } else {
      el('grafico-vendas-7d').innerHTML = '';
      el('grafico-vendas-7d').appendChild(blocoErro('Não foi possível carregar o gráfico de vendas.', carregarDashboard));
      el('ranking-mais-vendidos').innerHTML = '';
      el('ranking-mais-vendidos').appendChild(blocoErro('Não foi possível carregar o ranking.', carregarDashboard));
    }

    if (movimentacoesRes.status === 'fulfilled') {
      renderizarMovimentacoes(movimentacoesRes.value.eventos);
    } else {
      el('lista-movimentacoes').innerHTML = '';
      el('lista-movimentacoes').appendChild(blocoErro('Não foi possível carregar as movimentações.', carregarDashboard));
    }
  }

  carregarDashboard();
})();
