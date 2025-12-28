// NO INÍCIO DO service-worker.js
self.addEventListener('install', event => {
  console.log('⚠️ Service Worker: INSTALL - SKIPPING WAITING');
  self.skipWaiting(); // Ativa imediatamente
});

self.addEventListener('activate', event => {
  console.log('⚠️ Service Worker: ACTIVATE - CLEARING CACHE');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deletando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ Todos os caches foram limpos');
      return self.clients.claim();
    })
  );
});

// DESABILITE O CACHE PARA ARQUIVOS .JS
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Se for arquivo JS, NÃO use cache
  if (url.pathname.endsWith('.js')) {
    console.log('🔁 JS sem cache:', url.pathname);
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se falhar, tenta buscar online
        return fetch(event.request);
      })
    );
    return;
  }
  
  // Para outros arquivos, mantenha a lógica normal
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});


const CACHE_NAME = "vemcomigo-v1";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/splash.html",
  "/favicon.svg",
  "/logo-vc-3d.svg",
  "/manifest.json",
  "/public/css/style.css",
  "/public/js/app.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
