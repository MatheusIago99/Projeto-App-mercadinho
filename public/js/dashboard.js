function renderizarListaProdutos(container, produtos, mensagemVazia, classeAlerta) {
  if (produtos.length === 0) {
    container.className = 'vazio';
    container.textContent = mensagemVazia;
    return;
  }

  container.className = '';
  container.innerHTML = produtos
    .map(
      (p) => `
      <div class="lista-item alerta ${classeAlerta}">
        <div class="info">
          <strong>${p.nome}</strong>
          <small>Qtd: ${p.quantidade} | Mín: ${p.estoque_minimo}${
        p.validade ? ` | Validade: ${formatarData(p.validade)}` : ''
      }</small>
        </div>
      </div>`
    )
    .join('');
}

async function carregarDashboard() {
  try {
    const { estoqueBaixo, vencidos, proximosDaValidade } = await api.listarAlertas();

    renderizarListaProdutos(
      document.getElementById('lista-estoque-baixo'),
      estoqueBaixo,
      'Nenhum produto com estoque baixo.',
      'estoque-baixo'
    );
    renderizarListaProdutos(
      document.getElementById('lista-vencidos'),
      vencidos,
      'Nenhum produto vencido.',
      'vencido'
    );
    renderizarListaProdutos(
      document.getElementById('lista-proximos'),
      proximosDaValidade,
      'Nenhum produto próximo da validade.',
      ''
    );
  } catch (err) {
    document.getElementById('mensagens').innerHTML =
      '<div class="msg erro">Não foi possível carregar os alertas.</div>';
  }
}

carregarDashboard();
