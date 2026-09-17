const form = document.getElementById('form-produto');
const btnCancelar = document.getElementById('btn-cancelar');
const tituloForm = document.getElementById('titulo-form');
const mensagens = document.getElementById('mensagens');
const filtroBusca = document.getElementById('filtro-busca');
const filtroCategoria = document.getElementById('filtro-categoria');

let todosProdutos = [];

function mostrarMensagem(texto, tipo) {
  mensagens.innerHTML = `<div class="msg ${tipo}">${texto}</div>`;
  setTimeout(() => (mensagens.innerHTML = ''), 3000);
}

function limparFormulario() {
  form.reset();
  document.getElementById('produto-id').value = '';
  tituloForm.textContent = 'Novo produto';
  btnCancelar.style.display = 'none';
}

function atualizarOpcoesCategoria(produtos) {
  const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort();
  const selecionada = filtroCategoria.value;

  filtroCategoria.innerHTML =
    '<option value="">Todas categorias</option>' +
    categorias.map((c) => `<option value="${c}">${c}</option>`).join('');

  if (categorias.includes(selecionada)) filtroCategoria.value = selecionada;
}

function produtosFiltrados() {
  const busca = filtroBusca.value.trim().toLowerCase();
  const categoria = filtroCategoria.value;

  return todosProdutos.filter((p) => {
    const bateBusca = !busca || p.nome.toLowerCase().includes(busca);
    const bateCategoria = !categoria || p.categoria === categoria;
    return bateBusca && bateCategoria;
  });
}

function renderizarProdutos() {
  const container = document.getElementById('lista-produtos');
  const produtos = produtosFiltrados();

  if (todosProdutos.length === 0) {
    container.className = 'vazio';
    container.textContent = 'Nenhum produto cadastrado.';
    return;
  }

  if (produtos.length === 0) {
    container.className = 'vazio';
    container.textContent = 'Nenhum produto encontrado com esse filtro.';
    return;
  }

  container.className = '';
  container.innerHTML = produtos
    .map((p) => {
      const alerta = p.quantidade <= p.estoque_minimo ? 'estoque-baixo' : '';
      return `
      <div class="lista-item ${alerta ? 'alerta ' + alerta : ''}">
        <div class="info">
          <strong>${p.nome}</strong>
          <small>${p.categoria || 'Sem categoria'} | ${formatarMoeda(p.preco)} | Qtd: ${p.quantidade}${
        p.validade ? ` | Val: ${formatarData(p.validade)}` : ''
      }</small>
        </div>
        <div class="acoes">
          <button class="editar" data-id="${p.id}" title="Editar">✏️</button>
          <button class="repor" data-id="${p.id}" title="Repor estoque">➕</button>
          <button class="descartar" data-id="${p.id}" title="Registrar descarte/perda">♻️</button>
          <button class="excluir" data-id="${p.id}" title="Excluir">🗑️</button>
        </div>
      </div>`;
    })
    .join('');

  container.querySelectorAll('.editar').forEach((btn) => {
    btn.addEventListener('click', () => editarProduto(btn.dataset.id, todosProdutos));
  });
  container.querySelectorAll('.excluir').forEach((btn) => {
    btn.addEventListener('click', () => excluirProduto(btn.dataset.id));
  });
  container.querySelectorAll('.repor').forEach((btn) => {
    btn.addEventListener('click', () => reporEstoque(btn.dataset.id));
  });
  container.querySelectorAll('.descartar').forEach((btn) => {
    btn.addEventListener('click', () => descartarProduto(btn.dataset.id, todosProdutos));
  });
}

async function carregarProdutos() {
  todosProdutos = await api.listarProdutos();
  atualizarOpcoesCategoria(todosProdutos);
  renderizarProdutos();
}

async function descartarProduto(id, produtos) {
  const produto = produtos.find((p) => String(p.id) === String(id));
  if (!produto) return;

  const quantidade = prompt(`Quantos "${produto.nome}" foram perdidos/descartados?`, '1');
  const valor = Number(quantidade);
  if (!quantidade || Number.isNaN(valor) || valor <= 0) return;
  if (valor > produto.quantidade) {
    mostrarMensagem('Quantidade maior que o estoque disponível.', 'erro');
    return;
  }

  const motivo = prompt('Motivo (opcional): venceu, avariado, etc.', 'Venceu') || null;

  try {
    await api.registrarDescarte(id, valor, motivo);
    mostrarMensagem('Descarte registrado.', 'sucesso');
    carregarProdutos();
  } catch (err) {
    mostrarMensagem(err.message, 'erro');
  }
}

filtroBusca.addEventListener('input', renderizarProdutos);
filtroCategoria.addEventListener('change', renderizarProdutos);

function editarProduto(id, produtos) {
  const produto = produtos.find((p) => String(p.id) === String(id));
  if (!produto) return;

  document.getElementById('produto-id').value = produto.id;
  document.getElementById('nome').value = produto.nome;
  document.getElementById('categoria').value = produto.categoria || '';
  document.getElementById('preco').value = produto.preco;
  document.getElementById('quantidade').value = produto.quantidade;
  document.getElementById('estoque_minimo').value = produto.estoque_minimo;
  document.getElementById('validade').value = produto.validade || '';

  tituloForm.textContent = `Editando: ${produto.nome}`;
  btnCancelar.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirProduto(id) {
  if (!confirm('Deseja realmente excluir este produto?')) return;
  await api.excluirProduto(id);
  mostrarMensagem('Produto excluído.', 'sucesso');
  carregarProdutos();
}

async function reporEstoque(id) {
  const quantidade = prompt('Quantidade a adicionar ao estoque:');
  const valor = Number(quantidade);
  if (!quantidade || Number.isNaN(valor) || valor <= 0) return;
  await api.registrarCompra(id, valor);
  mostrarMensagem('Estoque atualizado.', 'sucesso');
  carregarProdutos();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('produto-id').value;
  const produto = {
    nome: document.getElementById('nome').value,
    categoria: document.getElementById('categoria').value,
    preco: Number(document.getElementById('preco').value),
    quantidade: Number(document.getElementById('quantidade').value),
    estoque_minimo: Number(document.getElementById('estoque_minimo').value),
    validade: document.getElementById('validade').value || null,
  };

  if (id) {
    await api.atualizarProduto(id, produto);
    mostrarMensagem('Produto atualizado.', 'sucesso');
  } else {
    await api.criarProduto(produto);
    mostrarMensagem('Produto cadastrado.', 'sucesso');
  }

  limparFormulario();
  carregarProdutos();
});

btnCancelar.addEventListener('click', limparFormulario);

carregarProdutos();
