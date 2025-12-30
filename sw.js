
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
  "/icons/icon-512.png",
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




