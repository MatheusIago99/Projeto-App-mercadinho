let produtosDisponiveis = [];
const itensContainer = document.getElementById('itens-venda');
const mensagens = document.getElementById('mensagens');

function mostrarMensagem(texto, tipo) {
  mensagens.innerHTML = `<div class="msg ${tipo}">${texto}</div>`;
  setTimeout(() => (mensagens.innerHTML = ''), 3000);
}

function criarLinhaItem() {
  const linha = document.createElement('div');
  linha.className = 'item-venda';

  const opcoes = produtosDisponiveis
    .map((p) => `<option value="${p.id}">${p.nome} (${p.quantidade} em estoque)</option>`)
    .join('');

  linha.innerHTML = `
    <select class="produto-select">${opcoes}</select>
    <input type="number" class="quantidade-input" min="1" value="1" />
    <button type="button" class="acoes excluir remover-item" title="Remover">✕</button>
  `;

  linha.querySelector('.remover-item').addEventListener('click', () => {
    linha.remove();
    atualizarTotal();
  });
  linha.querySelector('.produto-select').addEventListener('change', atualizarTotal);
  linha.querySelector('.quantidade-input').addEventListener('input', atualizarTotal);

  itensContainer.appendChild(linha);
  atualizarTotal();
}

function atualizarTotal() {
  let total = 0;
  itensContainer.querySelectorAll('.item-venda').forEach((linha) => {
    const produtoId = Number(linha.querySelector('.produto-select').value);
    const quantidade = Number(linha.querySelector('.quantidade-input').value) || 0;
    const produto = produtosDisponiveis.find((p) => p.id === produtoId);
    if (produto) total += produto.preco * quantidade;
  });
  document.getElementById('total-venda').textContent = `Total: ${formatarMoeda(total)}`;
}

async function carregarVendas() {
  const vendas = await api.listarVendas();
  const container = document.getElementById('lista-vendas');

  if (vendas.length === 0) {
    container.className = 'vazio';
    container.textContent = 'Nenhuma venda registrada ainda.';
    return;
  }

  container.className = '';
  container.innerHTML = vendas
    .map((v) => {
      const itens = v.itens.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
      return `
      <div class="lista-item">
        <div class="info">
          <strong>${formatarMoeda(v.total)}</strong>
          <small>${new Date(v.data).toLocaleString('pt-BR')} — ${itens}</small>
        </div>
      </div>`;
    })
    .join('');
}

document.getElementById('btn-add-item').addEventListener('click', criarLinhaItem);

document.getElementById('btn-finalizar').addEventListener('click', async () => {
  const linhas = itensContainer.querySelectorAll('.item-venda');
  if (linhas.length === 0) {
    mostrarMensagem('Adicione ao menos um item para vender.', 'erro');
    return;
  }

  const itens = Array.from(linhas).map((linha) => ({
    produto_id: Number(linha.querySelector('.produto-select').value),
    quantidade: Number(linha.querySelector('.quantidade-input').value),
  }));

  try {
    await api.registrarVenda(itens);
    mostrarMensagem('Venda registrada com sucesso!', 'sucesso');
    itensContainer.innerHTML = '';
    atualizarTotal();
    await inicializar();
  } catch (err) {
    mostrarMensagem(err.message, 'erro');
  }
});

async function inicializar() {
  produtosDisponiveis = await api.listarProdutos();
  await carregarVendas();
}

inicializar();
