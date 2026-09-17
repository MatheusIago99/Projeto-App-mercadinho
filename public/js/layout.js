(function () {
  'use strict';

  // Ícones SVG (stroke, 24x24, currentColor) usados na casca do sistema
  // (sidebar, cabeçalho, menu do usuário). Centralizados aqui para não
  // duplicar markup nas 4 páginas.
  const ICONES = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>',
    caixa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    carrinho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none"/></svg>',
    grafico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12.5" y="8" width="3" height="10"/><rect x="18" y="5" width="3" height="13"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    baixar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  };

  const PAGINAS = [
    { id: 'index', href: '/index.html', rotulo: 'Início', icone: 'home' },
    { id: 'produtos', href: '/produtos.html', rotulo: 'Produtos', icone: 'caixa' },
    { id: 'vendas', href: '/vendas.html', rotulo: 'Vendas', icone: 'carrinho' },
    { id: 'relatorios', href: '/relatorios.html', rotulo: 'Relatórios', icone: 'grafico' },
  ];

  function paginaAtual() {
    const arquivo = location.pathname.split('/').pop() || 'index.html';
    return arquivo.replace('.html', '') || 'index';
  }

  function montarSidebar(atual) {
    const paginaAtiva = PAGINAS.find((p) => p.id === atual) || PAGINAS[0];

    const itens = PAGINAS.map((p) => {
      const ativo = p.id === atual;
      return `
        <a href="${p.href}" class="sidebar-link${ativo ? ' ativo' : ''}"${ativo ? ' aria-current="page"' : ''}>
          <span class="sidebar-icone" aria-hidden="true">${ICONES[p.icone]}</span>
          <span>${p.rotulo}</span>
        </a>`;
    }).join('');

    const nav = document.createElement('nav');
    nav.className = 'sidebar';
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.innerHTML = `
      <div class="sidebar-marca">
        <span class="sidebar-logo" aria-hidden="true">${ICONES.carrinho}</span>
        <div class="sidebar-marca-texto">
          <strong>SmartEstoque</strong>
          <span>Mini Mercado Bom Gosto</span>
        </div>
      </div>
      <div class="sidebar-menu">${itens}</div>
      <p class="sidebar-rodape">Seu negócio mais organizado todos os dias.</p>
    `;

    document.body.insertBefore(nav, document.body.firstChild);
    return paginaAtiva;
  }

  function montarIconeCabecalho(paginaAtiva) {
    const alvo = document.querySelector('.logo-icone');
    if (!alvo) return;
    alvo.innerHTML = ICONES[paginaAtiva.icone];
  }

  function montarMenuUsuario() {
    const header = document.querySelector('header.topo');
    if (!header) return;

    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
      <button type="button" class="user-menu-toggle" id="btn-user-menu" aria-haspopup="true" aria-expanded="false">
        <span class="avatar" aria-hidden="true">A</span>
        <span class="user-menu-texto">
          <strong>Administrador</strong>
          <small>Mini Mercado Bom Gosto</small>
        </span>
        <span class="chevron" aria-hidden="true">${ICONES.seta}</span>
      </button>
      <div class="user-menu-dropdown" id="user-menu-dropdown" hidden>
        <div class="user-menu-info">
          <strong>Mini Mercado Bom Gosto</strong>
          <span>Administrador</span>
        </div>
        <button type="button" id="btn-instalar" class="user-menu-item" hidden>
          <span class="icone" aria-hidden="true">${ICONES.baixar}</span>
          <span>Instalar app</span>
        </button>
      </div>
    `;
    header.appendChild(menu);

    const botao = menu.querySelector('#btn-user-menu');
    const dropdown = menu.querySelector('#user-menu-dropdown');

    function fechar() {
      dropdown.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
    }

    botao.addEventListener('click', (evento) => {
      evento.stopPropagation();
      const estaAberto = !dropdown.hidden;
      dropdown.hidden = estaAberto;
      botao.setAttribute('aria-expanded', String(!estaAberto));
    });

    document.addEventListener('click', (evento) => {
      if (!menu.contains(evento.target)) fechar();
    });

    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') fechar();
    });
  }

  const atual = paginaAtual();
  const paginaAtiva = montarSidebar(atual);
  montarIconeCabecalho(paginaAtiva);
  montarMenuUsuario();
})();
