const mensagens = document.getElementById('mensagens');
const scannerInput = document.getElementById('scanner-input');
const sugestoesEl = document.getElementById('sugestoes-produtos');
const carrinhoContainer = document.getElementById('carrinho-container');
const resumoItensEl = document.getElementById('resumo-itens');
const resumoSubtotalEl = document.getElementById('resumo-subtotal');
const pagamentoBotoes = document.querySelectorAll('.pdv-pag-btn');
const dinheiroCampos = document.getElementById('pdv-dinheiro-campos');
const valorRecebidoInput = document.getElementById('valor-recebido');
const trocoEl = document.getElementById('pdv-troco');
const trocoAvisoEl = document.getElementById('pdv-troco-aviso');
const totalEl = document.getElementById('pdv-total');
const btnFinalizar = document.getElementById('btn-finalizar');
const btnLimpar = document.getElementById('btn-limpar-carrinho');
const pdvConteudo = document.getElementById('pdv-conteudo');
const pdvSemProdutos = document.getElementById('pdv-sem-produtos');
const listaVendasEl = document.getElementById('lista-vendas');

const modalVenda = document.getElementById('modal-venda-detalhe');
const vendaDetalheItens = document.getElementById('venda-detalhe-itens');
const vendaDetalhePagamento = document.getElementById('venda-detalhe-pagamento');
const vendaDetalheTotal = document.getElementById('venda-detalhe-total');

const PAGAMENTO_ROTULOS = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
};

const DESKTOP_MEDIA = window.matchMedia('(min-width: 860px)');

let produtosCache = [];
let carrinho = [];
let formaPagamento = null;
let enviando = false;

let timeoutMensagem = null;

function mostrarMensagem(texto, tipo) {
  clearTimeout(timeoutMensagem);
  mensagens.innerHTML = `<div class="msg ${tipo}">${escapeHtml(texto)}</div>`;
  timeoutMensagem = setTimeout(() => (mensagens.innerHTML = ''), 3000);
}

function ehDesktop() {
  return DESKTOP_MEDIA.matches;
}

function refocarScanner() {
  if (ehDesktop()) scannerInput.focus();
}

// --- Carregamento do catálogo -------------------------------------------

async function carregarProdutos() {
  produtosCache = await api.listarProdutos();

  const semProdutos = produtosCache.length === 0;
  pdvSemProdutos.hidden = !semProdutos;
  pdvConteudo.hidden = semProdutos;

  // Sincroniza o estoque conhecido dos itens já no carrinho com os dados
  // atualizados do servidor (o backend continua sendo a fonte definitiva
  // na finalização, isto é só para manter a UI coerente).
  carrinho = carrinho
    .map((item) => {
      const produto = produtosCache.find((p) => p.id === item.produto_id);
      if (!produto) return null;
      const quantidade = Math.min(item.quantidade, Math.max(produto.quantidade, 0));
      return quantidade > 0 ? { ...item, estoqueDisponivel: produto.quantidade, quantidade } : null;
    })
    .filter(Boolean);
}

// --- Busca / scanner ------------------------------------------------------

function normalizarCodigo(valor) {
  return String(valor || '').trim();
}

function buscarSugestoes(texto) {
  const termo = texto.trim().toLowerCase();
  if (!termo) return [];
  return produtosCache
    .filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo_barras && String(p.codigo_barras).toLowerCase().includes(termo))
    )
    .slice(0, 8);
}

function renderSugestoes(lista) {
  if (lista.length === 0) {
    sugestoesEl.hidden = true;
    sugestoesEl.innerHTML = '';
    return;
  }

  sugestoesEl.hidden = false;
  sugestoesEl.innerHTML = lista
    .map(
      (p) => `
      <li class="pdv-sugestao-item" role="option" tabindex="0" data-id="${p.id}">
        <span>${escapeHtml(p.nome)}</span>
        <span class="pdv-sugestao-info">${formatarMoeda(p.preco)} · Estoque: ${p.quantidade}</span>
      </li>`
    )
    .join('');

  sugestoesEl.querySelectorAll('.pdv-sugestao-item').forEach((item) => {
    const ativar = () => {
      const produto = produtosCache.find((p) => p.id === Number(item.dataset.id));
      if (produto) selecionarProdutoDaSugestao(produto);
    };
    item.addEventListener('click', ativar);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ativar();
      }
    });
  });
}

function selecionarProdutoDaSugestao(produto) {
  adicionarProduto(produto, 1);
  scannerInput.value = '';
  renderSugestoes([]);
  refocarScanner();
}

function processarCodigoDigitado(codigo) {
  const alvo = normalizarCodigo(codigo);
  if (!alvo) return;

  const produto = produtosCache.find((p) => normalizarCodigo(p.codigo_barras) === alvo);

  if (!produto) {
    mostrarMensagem('Produto não encontrado.', 'erro');
    return;
  }

  adicionarProduto(produto, 1);
  scannerInput.value = '';
  renderSugestoes([]);
  refocarScanner();
}

scannerInput.addEventListener('input', () => {
  renderSugestoes(buscarSugestoes(scannerInput.value));
});

scannerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    processarCodigoDigitado(scannerInput.value);
  } else if (e.key === 'Escape') {
    renderSugestoes([]);
  }
});

document.addEventListener('click', (e) => {
  if (!sugestoesEl.contains(e.target) && e.target !== scannerInput) {
    renderSugestoes([]);
  }
});

// --- Carrinho ---------------------------------------------------------------

function adicionarProduto(produto, quantidadeAdicional) {
  const existente = carrinho.find((item) => item.produto_id === produto.id);

  if (existente) {
    if (existente.quantidade + quantidadeAdicional > produto.quantidade) {
      mostrarMensagem('Quantidade máxima disponível atingida.', 'erro');
      return;
    }
    existente.quantidade += quantidadeAdicional;
  } else {
    if (produto.quantidade <= 0) {
      mostrarMensagem('Produto sem estoque.', 'erro');
      return;
    }
    carrinho.push({
      produto_id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      estoqueDisponivel: produto.quantidade,
      quantidade: quantidadeAdicional,
    });
  }

  mostrarMensagem('Produto adicionado.', 'sucesso');
  renderCarrinho();
  renderResumo();
}

function alterarQuantidade(produtoId, delta) {
  const item = carrinho.find((i) => i.produto_id === produtoId);
  if (!item) return;

  const novaQuantidade = item.quantidade + delta;

  if (delta > 0 && novaQuantidade > item.estoqueDisponivel) {
    mostrarMensagem('Quantidade máxima disponível atingida.', 'erro');
    return;
  }

  if (novaQuantidade <= 0) {
    carrinho = carrinho.filter((i) => i.produto_id !== produtoId);
  } else {
    item.quantidade = novaQuantidade;
  }

  renderCarrinho();
  renderResumo();
}

function removerItem(produtoId) {
  carrinho = carrinho.filter((i) => i.produto_id !== produtoId);
  renderCarrinho();
  renderResumo();
}

function calcularTotal() {
  return carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}

function renderCarrinho() {
  if (carrinho.length === 0) {
    carrinhoContainer.innerHTML = `
      <div class="estado-vazio pdv-carrinho-vazio">
        <div class="estado-vazio-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <h3>Seu carrinho está vazio.</h3>
        <p>Busque ou escaneie um produto para começar.</p>
      </div>`;
    return;
  }

  const linhas = carrinho
    .map(
      (item) => `
      <tr>
        <td class="col-produto"><strong>${escapeHtml(item.nome)}</strong></td>
        <td class="col-quantidade">
          <div class="stepper">
            <button type="button" class="stepper-btn" data-acao="menos" data-id="${item.produto_id}" aria-label="Diminuir quantidade de ${escapeHtml(item.nome)}">−</button>
            <span class="stepper-valor">${item.quantidade}</span>
            <button type="button" class="stepper-btn" data-acao="mais" data-id="${item.produto_id}" aria-label="Aumentar quantidade de ${escapeHtml(item.nome)}">+</button>
          </div>
        </td>
        <td class="col-unitario">${formatarMoeda(item.preco)}</td>
        <td class="col-total-item">${formatarMoeda(item.preco * item.quantidade)}</td>
        <td class="col-acoes-carrinho">
          <div class="acoes">
            <button type="button" class="excluir remover-item" data-id="${item.produto_id}" aria-label="Remover ${escapeHtml(item.nome)} do carrinho" title="Remover">✕</button>
          </div>
        </td>
      </tr>`
    )
    .join('');

  carrinhoContainer.innerHTML = `
    <div class="tabela-carrinho-container">
      <table class="tabela-carrinho">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Unitário</th>
            <th>Total</th>
            <th class="col-acoes-carrinho"></th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  carrinhoContainer.querySelectorAll('.stepper-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const delta = btn.dataset.acao === 'mais' ? 1 : -1;
      alterarQuantidade(id, delta);
    });
  });

  carrinhoContainer.querySelectorAll('.remover-item').forEach((btn) => {
    btn.addEventListener('click', () => removerItem(Number(btn.dataset.id)));
  });
}

function renderResumo() {
  const totalUnidades = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  const total = calcularTotal();

  resumoItensEl.textContent = `${totalUnidades} ${totalUnidades === 1 ? 'item' : 'itens'}`;
  resumoSubtotalEl.textContent = formatarMoeda(total);
  totalEl.textContent = formatarMoeda(total);

  atualizarTroco();
  atualizarBotaoFinalizar();
}

// --- Pagamento --------------------------------------------------------------

function selecionarFormaPagamento(forma) {
  formaPagamento = forma;

  pagamentoBotoes.forEach((btn) => {
    const selecionado = btn.dataset.forma === forma;
    btn.classList.toggle('selecionado', selecionado);
    btn.setAttribute('aria-pressed', String(selecionado));
  });

  dinheiroCampos.hidden = forma !== 'DINHEIRO';
  if (forma !== 'DINHEIRO') {
    valorRecebidoInput.value = '';
  }

  atualizarTroco();
  atualizarBotaoFinalizar();
}

pagamentoBotoes.forEach((btn) => {
  btn.addEventListener('click', () => selecionarFormaPagamento(btn.dataset.forma));
});

function trocoValido() {
  if (formaPagamento !== 'DINHEIRO') return true;
  const valor = Number(valorRecebidoInput.value);
  const total = calcularTotal();
  return Number.isFinite(valor) && valor >= total;
}

function atualizarTroco() {
  if (formaPagamento !== 'DINHEIRO') return;

  const valor = Number(valorRecebidoInput.value);
  const total = calcularTotal();

  if (!Number.isFinite(valor) || valorRecebidoInput.value === '' || valor < total) {
    trocoEl.textContent = '—';
    trocoAvisoEl.hidden = valorRecebidoInput.value === '';
  } else {
    trocoEl.textContent = formatarMoeda(valor - total);
    trocoAvisoEl.hidden = true;
  }
}

valorRecebidoInput.addEventListener('input', () => {
  atualizarTroco();
  atualizarBotaoFinalizar();
});

function atualizarBotaoFinalizar() {
  const carrinhoVazio = carrinho.length === 0;
  const semPagamento = !formaPagamento;
  const dinheiroInvalido = formaPagamento === 'DINHEIRO' && !trocoValido();

  btnFinalizar.disabled = enviando || carrinhoVazio || semPagamento || dinheiroInvalido;
}

// --- Finalizar / limpar -----------------------------------------------------

function resetarVenda() {
  carrinho = [];
  formaPagamento = null;
  valorRecebidoInput.value = '';
  dinheiroCampos.hidden = true;
  pagamentoBotoes.forEach((btn) => {
    btn.classList.remove('selecionado');
    btn.setAttribute('aria-pressed', 'false');
  });
  renderCarrinho();
  renderResumo();
}

btnLimpar.addEventListener('click', () => {
  if (carrinho.length === 0) return;
  if (window.confirm('Deseja limpar a venda atual?')) {
    resetarVenda();
    refocarScanner();
  }
});

btnFinalizar.addEventListener('click', async () => {
  if (enviando || btnFinalizar.disabled) return;

  enviando = true;
  btnFinalizar.disabled = true;

  const payload = {
    itens: carrinho.map((item) => ({ produto_id: item.produto_id, quantidade: item.quantidade })),
    forma_pagamento: formaPagamento,
    valor_recebido: formaPagamento === 'DINHEIRO' ? Number(valorRecebidoInput.value) : undefined,
  };

  try {
    await api.registrarVenda(payload);
    mostrarMensagem('Venda registrada com sucesso.', 'sucesso');
    resetarVenda();
    await carregarProdutos();
    await carregarVendas();
  } catch (err) {
    mostrarMensagem(err.message, 'erro');
  } finally {
    enviando = false;
    atualizarBotaoFinalizar();
    refocarScanner();
  }
});

// --- Últimas vendas -----------------------------------------------------

function formatarDataHora(iso) {
  const data = new Date(iso.replace(' ', 'T'));
  const dataTexto = data.toLocaleDateString('pt-BR');
  const horaTexto = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataTexto} · ${horaTexto}`;
}

async function carregarVendas() {
  const vendas = await api.listarVendas();

  if (vendas.length === 0) {
    listaVendasEl.className = 'vazio';
    listaVendasEl.textContent = 'Nenhuma venda registrada ainda.';
    return;
  }

  listaVendasEl.className = '';
  listaVendasEl.innerHTML = vendas
    .map((v) => {
      const totalUnidades = v.itens.reduce((soma, i) => soma + i.quantidade, 0);
      const pagamento = v.forma_pagamento ? PAGAMENTO_ROTULOS[v.forma_pagamento] || v.forma_pagamento : 'Não informado';
      return `
      <button type="button" class="lista-item lista-item-venda" data-id="${v.id}">
        <div class="info">
          <strong>#${v.id} · ${formatarMoeda(v.total)}</strong>
          <small>${formatarDataHora(v.data)} · ${totalUnidades} ${totalUnidades === 1 ? 'item' : 'itens'} · ${escapeHtml(pagamento)}</small>
        </div>
      </button>`;
    })
    .join('');

  listaVendasEl.querySelectorAll('.lista-item-venda').forEach((btn) => {
    btn.addEventListener('click', () => {
      const venda = vendas.find((v) => v.id === Number(btn.dataset.id));
      if (venda) abrirDetalheVenda(venda);
    });
  });
}

function abrirDetalheVenda(venda) {
  const pagamento = venda.forma_pagamento ? PAGAMENTO_ROTULOS[venda.forma_pagamento] || venda.forma_pagamento : 'Não informado';

  document.getElementById('modal-venda-titulo').textContent = `Venda #${venda.id}`;
  vendaDetalhePagamento.textContent = pagamento;
  vendaDetalheTotal.textContent = formatarMoeda(venda.total);

  vendaDetalheItens.innerHTML = venda.itens
    .map(
      (i) => `
      <div class="resumo-linha">
        <span>${i.quantidade}x ${escapeHtml(i.produto_nome)}</span>
        <strong>${formatarMoeda(i.preco_unitario * i.quantidade)}</strong>
      </div>`
    )
    .join('');

  modalVenda.showModal();
}

document.getElementById('fechar-modal-venda').addEventListener('click', () => modalVenda.close());

// --- Inicialização -----------------------------------------------------

async function inicializar() {
  await carregarProdutos();
  await carregarVendas();
  refocarScanner();
}

inicializar();
