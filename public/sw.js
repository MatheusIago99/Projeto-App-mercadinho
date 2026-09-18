const CACHE_NAME = 'smartestoque-v6';

// As 4 páginas protegidas (index/produtos/vendas/relatorios) NÃO entram
// aqui: o servidor responde a elas com um redirect para /login.html
// quando não há sessão, e um precache anônimo no "install" seguiria esse
// redirect e guardaria o HTML do login sob a chave errada (ex.:
// "/index.html" -> conteúdo de login.html). Elas continuam sendo cacheadas
// normalmente pelo fluxo network-first abaixo, só que de forma lazy, na
// primeira vez que forem carregadas com sessão válida.
const ASSETS = [
  '/login.html',
  '/css/style.css',
  '/js/layout.js',
  '/js/api.js',
  '/js/dashboard.js',
  '/js/produtos.js',
  '/js/vendas.js',
  '/js/relatorios.js',
  '/js/login.js',
  '/js/pwa.js',
  '/js/splash.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dados (produtos, vendas, alertas) sempre buscados da rede: nunca servir estoque desatualizado do cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ erro: 'Sem conexão com o servidor' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    return;
  }

  // Arquivos estáticos: network-first (sempre pega a versão mais nova quando
  // há conexão), caindo para o cache só quando a rede falha. Assim uma
  // mudança de CSS/JS aparece na hora, sem depender de trocar o nome do
  // cache a cada deploy.
  event.respondWith(
    fetch(request)
      .then((daRede) => {
        // Se a resposta veio de um redirect (ex.: página protegida sem
        // sessão -> /login.html), NUNCA cacheia sob a URL original: isso
        // guardaria o HTML do login como se fosse o conteúdo da página
        // protegida, e um acesso offline futuro serviria o login errado.
        if (!daRede.redirected) {
          const copia = daRede.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
        }
        return daRede;
      })
      .catch(
        () =>
          caches.match(request) ||
          new Response('Sem conexão e este arquivo ainda não foi salvo para uso offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
      )
  );
});
