const CACHE_NAME = 'smartestoque-v3';

const ASSETS = [
  '/index.html',
  '/produtos.html',
  '/vendas.html',
  '/relatorios.html',
  '/css/style.css',
  '/js/api.js',
  '/js/dashboard.js',
  '/js/produtos.js',
  '/js/vendas.js',
  '/js/relatorios.js',
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

  // Arquivos estáticos: cache-first, com atualização em segundo plano.
  event.respondWith(
    caches.match(request).then((doCache) => {
      if (doCache) return doCache;

      return fetch(request)
        .then((daRede) => {
          const copia = daRede.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          return daRede;
        })
        .catch(
          () =>
            new Response('Sem conexão e este arquivo ainda não foi salvo para uso offline.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        );
    })
  );
});
