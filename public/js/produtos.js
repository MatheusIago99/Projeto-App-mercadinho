(function () {
  'use strict';

  const ICONES = {
    editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    repor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    descartar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H5.5A2.5 2.5 0 0 1 3 16.5v0a2.5 2.5 0 0 1 .4-1.4L6 11"/><path d="M10 4h4l3 5"/><path d="M13.5 19H18a2.5 2.5 0 0 0 2.5-2.5v0a2.5 2.5 0 0 0-.4-1.4L18 11"/><path d="m9 16 2 3-2 3M15 19h-4"/></svg>',
    excluir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    caixaVazia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  };

  let todosProdutos = [];
  let produtoAlvo = null;

  const mensagens = document.getElementById('mensagens');
  const filtroBusca = document.getElementById('filtro-busca');
  const filtroCategoria = document.getElementById('filtro-categoria');
  const filtroStatus = document.getElementById('filtro-status');
  const filtroValidade = document.getElementById('filtro-validade');
  const produtosContainer = document.getElementById('produtos-container');

  const modalProduto = document.getElementById('modal-produto');
  const formProduto = document.getElementById('form-produto');
  const modalProdutoErro = document.getElementById('form-produto-erro');
  const campoQuantidade = document.getElementById('campo-quantidade');
  const inputQuantidade = document.getElementById('quantidade');
  const controlarValidade = document.getElementById('controlar_validade');
  const campoValidade = document.getElementById('campo-validade');
  const inputValidade = document.getElementById('validade');

  const modalReposicao = document.getElementById('modal-reposicao');
  const modalDescarte = document.getElementById('modal-descarte');

  function mostrarMensagem(texto, tipo) {
    mensagens.innerHTML = `<div class="msg ${tipo}">${escapeHtml(texto)}</div>`;
    setTimeout(() => (mensagens.innerHTML = ''), 3000);
  }

  // ---------- carregamento e filtros ----------

  async function carregarProdutos() {
    todosProdutos = await api.listarProdutos();
    atualizarOpcoesCategoria();
    renderizar();
  }

  function atualizarOpcoesCategoria() {
    const categorias = [...new Set(todosProdutos.map((p) => p.categoria).filter(Boolean))].sort();
    const selecionada = filtroCategoria.value;

    filtroCategoria.innerHTML =
      '<option value="">Todas categorias</option>' + categorias.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (categorias.includes(selecionada)) filtroCategoria.value = selecionada;

    document.getElementById('lista-categorias').innerHTML = categorias.map((c) => `<option value="${escapeHtml(c)}"></option>`).join('');
  }

  function statusValidadeBruto(p) {
    // 'com_validade' / 'sem_validade' independem da prioridade de status geral.
    return p.validade ? 'com_validade' : 'sem_validade';
  }

  function produtosFiltrados() {
    const busca = filtroBusca.value.trim().toLowerCase();
    const categoria = filtroCategoria.value;
    const status = filtroStatus.value;
    const validade = filtroValidade.value;

    return todosProdutos.filter((p) => {
      const bateBusca = !busca || p.nome.toLowerCase().includes(busca) || (p.codigo_barras || '').toLowerCase().includes(busca);
      const bateCategoria = !categoria || p.categoria === categoria;
      const bateStatus = !status || calcularStatusProduto(p) === status;

      let bateValidade = true;
      if (validade === 'sem_validade') bateValidade = !p.validade;
      else if (validade === 'com_validade') bateValidade = !!p.validade;
      else if (validade === 'vencidos') bateValidade = calcularStatusProduto(p) === 'vencido';
      else if (validade === 'vencendo') bateValidade = calcularStatusProduto(p) === 'vencendo';

      return bateBusca && bateCategoria && bateStatus && bateValidade;
    });
  }

  function limparFiltros() {
    filtroBusca.value = '';
    filtroCategoria.value = '';
    filtroStatus.value = '';
    filtroValidade.value = '';
    renderizar();
  }

  // ---------- renderização ----------

  function renderizar() {
    if (todosProdutos.length === 0) {
      produtosContainer.innerHTML = `
        <div class="estado-vazio">
          <div class="estado-vazio-icone" aria-hidden="true">${ICONES.caixaVazia}</div>
          <h3>Seu estoque ainda está vazio.</h3>
          <p>Cadastre seu primeiro produto para começar.</p>
          <button type="button" class="btn" id="btn-vazio-cadastrar">+ Cadastrar produto</button>
        </div>`;
      document.getElementById('btn-vazio-cadastrar').addEventListener('click', abrirModalNovoProduto);
      return;
    }

    const lista = produtosFiltrados();

    if (lista.length === 0) {
      produtosContainer.innerHTML = `
        <div class="estado-vazio">
          <div class="estado-vazio-icone" aria-hidden="true">${ICONES.busca}</div>
          <h3>Nenhum produto encontrado.</h3>
          <p>Experimente alterar os filtros ou a busca.</p>
          <button type="button" class="btn secundario" id="btn-limpar-filtros">Limpar filtros</button>
        </div>`;
      document.getElementById('btn-limpar-filtros').addEventListener('click', limparFiltros);
      return;
    }

    produtosContainer.innerHTML = `
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Mínimo</th>
              <th>Validade</th>
              <th>Status</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(linhaProduto).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function linhaProduto(p) {
    const status = calcularStatusProduto(p);
    const classeEstoque = status === 'sem_estoque' ? 'estoque-critico' : status === 'estoque_baixo' ? 'estoque-atencao' : '';
    const textoEstoque = p.quantidade === 0 ? 'Sem estoque' : String(p.quantidade);

    return `
      <tr data-id="${p.id}">
        <td class="col-produto">
          <strong>${escapeHtml(p.nome)}</strong>
          ${p.codigo_barras ? `<small>${escapeHtml(p.codigo_barras)}</small>` : ''}
        </td>
        <td class="col-categoria">${escapeHtml(p.categoria || '—')}</td>
        <td class="col-preco">${formatarMoeda(p.preco)}</td>
        <td class="col-estoque"><span class="valor-estoque ${classeEstoque}">${textoEstoque}</span></td>
        <td class="col-minimo">${p.estoque_minimo}</td>
        <td class="col-validade">${p.validade ? formatarData(p.validade) : '—'}</td>
        <td class="col-status"><span class="status-badge status-badge-${STATUS_CORES[status]}">${STATUS_ROTULOS[status]}</span></td>
        <td class="col-acoes">
          <div class="menu-acoes">
            <button type="button" class="menu-acoes-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Ações de ${escapeHtml(p.nome)}">${ICONES.menu}</button>
            <div class="menu-acoes-dropdown" hidden>
              <button type="button" data-acao="editar">${ICONES.editar}<span>Editar</span></button>
              <button type="button" data-acao="repor">${ICONES.repor}<span>Repor estoque</span></button>
              <button type="button" data-acao="descartar">${ICONES.descartar}<span>Registrar descarte</span></button>
              <button type="button" data-acao="excluir" class="item-perigo">${ICONES.excluir}<span>Excluir</span></button>
            </div>
          </div>
        </td>
      </tr>`;
  }

  function fecharTodosMenus() {
    document.querySelectorAll('.menu-acoes-dropdown').forEach((d) => (d.hidden = true));
    document.querySelectorAll('.menu-acoes-toggle').forEach((t) => t.setAttribute('aria-expanded', 'false'));
  }

  produtosContainer.addEventListener('click', (evento) => {
    const toggle = evento.target.closest('.menu-acoes-toggle');
    if (toggle) {
      evento.stopPropagation();
      const dropdown = toggle.nextElementSibling;
      const estavaAberto = !dropdown.hidden;
      fecharTodosMenus();
      if (!estavaAberto) {
        dropdown.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const botaoAcao = evento.target.closest('[data-acao]');
    if (botaoAcao) {
      const linha = botaoAcao.closest('tr');
      const produto = todosProdutos.find((p) => String(p.id) === linha.dataset.id);
      fecharTodosMenus();
      if (!produto) return;

      const acoes = {
        editar: abrirModalEdicao,
        repor: abrirModalReposicao,
        descartar: abrirModalDescarte,
        excluir: excluirProduto,
      };
      acoes[botaoAcao.dataset.acao](produto);
    }
  });

  document.addEventListener('click', fecharTodosMenus);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharTodosMenus();
  });

  filtroBusca.addEventListener('input', renderizar);
  filtroCategoria.addEventListener('change', renderizar);
  filtroStatus.addEventListener('change', renderizar);
  filtroValidade.addEventListener('change', renderizar);

  // ---------- modal: cadastro / edição ----------

  function limparErroModal() {
    modalProdutoErro.hidden = true;
    modalProdutoErro.textContent = '';
  }

  function mostrarErroModal(texto) {
    modalProdutoErro.textContent = texto;
    modalProdutoErro.hidden = false;
  }

  function abrirModalNovoProduto() {
    formProduto.reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('modal-produto-titulo').textContent = 'Novo produto';
    document.getElementById('btn-salvar-produto').textContent = 'Cadastrar produto';
    campoQuantidade.hidden = false;
    inputQuantidade.required = true;
    inputQuantidade.value = '0';
    document.getElementById('categoria').required = true;
    controlarValidade.checked = false;
    campoValidade.hidden = true;
    inputValidade.required = false;
    limparErroModal();
    modalProduto.showModal();
    document.getElementById('nome').focus();
  }

  function abrirModalEdicao(produto) {
    formProduto.reset();
    document.getElementById('produto-id').value = produto.id;
    document.getElementById('modal-produto-titulo').textContent = `Editar: ${produto.nome}`;
    document.getElementById('btn-salvar-produto').textContent = 'Salvar alterações';

    document.getElementById('nome').value = produto.nome;
    // Nao forca "required" aqui: produtos cadastrados antes desta fase podem
    // ter categoria em branco, e editar outro campo nao pode ficar bloqueado
    // por isso.
    document.getElementById('categoria').required = false;
    document.getElementById('categoria').value = produto.categoria || '';
    document.getElementById('codigo_barras').value = produto.codigo_barras || '';
    document.getElementById('preco_custo').value = produto.preco_custo ?? '';
    document.getElementById('preco').value = produto.preco;
    document.getElementById('estoque_minimo').value = produto.estoque_minimo;

    // Quantidade nao e editavel aqui: mudanca de estoque acontece so via
    // Repor estoque / Registrar descarte, para nao criar um segundo
    // caminho paralelo de movimentacao de estoque.
    campoQuantidade.hidden = true;
    inputQuantidade.required = false;

    const temValidade = !!produto.validade;
    controlarValidade.checked = temValidade;
    campoValidade.hidden = !temValidade;
    inputValidade.required = temValidade;
    inputValidade.value = produto.validade || '';

    limparErroModal();
    modalProduto.showModal();
    document.getElementById('nome').focus();
  }

  function fecharModalProduto() {
    modalProduto.close();
  }

  controlarValidade.addEventListener('change', () => {
    campoValidade.hidden = !controlarValidade.checked;
    inputValidade.required = controlarValidade.checked;
    if (!controlarValidade.checked) inputValidade.value = '';
  });

  document.getElementById('btn-cancelar-produto').addEventListener('click', fecharModalProduto);
  document.getElementById('fechar-modal-produto').addEventListener('click', fecharModalProduto);

  formProduto.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErroModal();

    const id = document.getElementById('produto-id').value;
    const dados = {
      nome: document.getElementById('nome').value.trim(),
      categoria: document.getElementById('categoria').value.trim(),
      codigo_barras: document.getElementById('codigo_barras').value.trim(),
      preco_custo: document.getElementById('preco_custo').value,
      preco: Number(document.getElementById('preco').value),
      estoque_minimo: Number(document.getElementById('estoque_minimo').value),
      validade: controlarValidade.checked ? document.getElementById('validade').value : null,
    };

    if (!id) {
      dados.quantidade = Number(inputQuantidade.value) || 0;
    }

    try {
      let resultado;
      if (id) {
        resultado = await api.atualizarProduto(id, dados);
      } else {
        resultado = await api.criarProduto(dados);
      }

      if (resultado && resultado.erro) {
        mostrarErroModal(resultado.erro);
        return;
      }

      fecharModalProduto();
      mostrarMensagem(id ? 'Produto atualizado com sucesso.' : 'Cadastro realizado com sucesso.', 'sucesso');
      carregarProdutos();
    } catch (err) {
      mostrarErroModal('Não foi possível salvar o produto. Tente novamente.');
    }
  });

  // ---------- modal: reposição ----------

  function abrirModalReposicao(produto) {
    produtoAlvo = produto;
    document.getElementById('reposicao-erro').hidden = true;
    document.getElementById('reposicao-produto-nome').textContent = produto.nome;
    document.getElementById('reposicao-estoque-atual').textContent = produto.quantidade;
    document.getElementById('reposicao-quantidade').value = 1;
    atualizarNovoEstoqueReposicao();
    modalReposicao.showModal();
    document.getElementById('reposicao-quantidade').focus();
  }

  function atualizarNovoEstoqueReposicao() {
    const qtd = Number(document.getElementById('reposicao-quantidade').value) || 0;
    document.getElementById('reposicao-novo-estoque').textContent = produtoAlvo.quantidade + qtd;
  }

  document.getElementById('reposicao-quantidade').addEventListener('input', atualizarNovoEstoqueReposicao);
  document.getElementById('btn-cancelar-reposicao').addEventListener('click', () => modalReposicao.close());
  document.getElementById('fechar-modal-reposicao').addEventListener('click', () => modalReposicao.close());

  document.getElementById('btn-confirmar-reposicao').addEventListener('click', async () => {
    const qtd = Number(document.getElementById('reposicao-quantidade').value);
    const erroEl = document.getElementById('reposicao-erro');

    if (!qtd || qtd <= 0) {
      erroEl.textContent = 'Informe uma quantidade maior que zero.';
      erroEl.hidden = false;
      return;
    }

    try {
      await api.registrarCompra(produtoAlvo.id, qtd);
      modalReposicao.close();
      mostrarMensagem('Estoque reposto com sucesso.', 'sucesso');
      carregarProdutos();
    } catch (err) {
      erroEl.textContent = 'Não foi possível repor o estoque.';
      erroEl.hidden = false;
    }
  });

  // ---------- modal: descarte ----------

  function abrirModalDescarte(produto) {
    produtoAlvo = produto;
    document.getElementById('descarte-erro').hidden = true;
    document.getElementById('descarte-produto-nome').textContent = produto.nome;
    document.getElementById('descarte-estoque-atual').textContent = produto.quantidade;
    document.getElementById('descarte-quantidade').value = 1;
    document.getElementById('descarte-quantidade').max = produto.quantidade;
    document.getElementById('descarte-motivo').value = '';
    atualizarNovoEstoqueDescarte();
    modalDescarte.showModal();
    document.getElementById('descarte-quantidade').focus();
  }

  function atualizarNovoEstoqueDescarte() {
    const qtd = Number(document.getElementById('descarte-quantidade').value) || 0;
    const resultado = produtoAlvo.quantidade - qtd;
    const linha = document.getElementById('resumo-descarte-novo-estoque');
    document.getElementById('descarte-novo-estoque').textContent = Math.max(resultado, 0);
    linha.classList.toggle('erro', resultado < 0);
  }

  document.getElementById('descarte-quantidade').addEventListener('input', atualizarNovoEstoqueDescarte);
  document.getElementById('btn-cancelar-descarte').addEventListener('click', () => modalDescarte.close());
  document.getElementById('fechar-modal-descarte').addEventListener('click', () => modalDescarte.close());

  document.getElementById('btn-confirmar-descarte').addEventListener('click', async () => {
    const qtd = Number(document.getElementById('descarte-quantidade').value);
    const motivo = document.getElementById('descarte-motivo').value.trim() || null;
    const erroEl = document.getElementById('descarte-erro');

    if (!qtd || qtd <= 0) {
      erroEl.textContent = 'Informe uma quantidade maior que zero.';
      erroEl.hidden = false;
      return;
    }
    if (qtd > produtoAlvo.quantidade) {
      erroEl.textContent = 'Quantidade maior que o estoque disponível.';
      erroEl.hidden = false;
      return;
    }

    try {
      await api.registrarDescarte(produtoAlvo.id, qtd, motivo);
      modalDescarte.close();
      mostrarMensagem('Descarte registrado com sucesso.', 'sucesso');
      carregarProdutos();
    } catch (err) {
      erroEl.textContent = err.message || 'Não foi possível registrar o descarte.';
      erroEl.hidden = false;
    }
  });

  // ---------- excluir ----------

  async function excluirProduto(produto) {
    if (!confirm(`Deseja realmente excluir "${produto.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.excluirProduto(produto.id);
      mostrarMensagem('Produto excluído com sucesso.', 'sucesso');
      carregarProdutos();
    } catch (err) {
      mostrarMensagem('Não foi possível excluir o produto.', 'erro');
    }
  }

  // ---------- botão novo produto ----------

  document.getElementById('btn-novo-produto').addEventListener('click', abrirModalNovoProduto);

  carregarProdutos();
})();
