const CACHE_NAME = 'leet-planner-v2';
const BASE_PATH = '/leet-planner';
const ASSETS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/css/style.css',
  BASE_PATH + '/css/themes.css',
  BASE_PATH + '/js/storage.js',
  BASE_PATH + '/js/timer.js',
  BASE_PATH + '/js/planner.js',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/icons/icon-192.svg',
  BASE_PATH + '/icons/icon-512.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        // Return cache and update in background
        const fetchPromise = fetch(e.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached;
      }
      return fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => new Response('오프라인 상태입니다.', {
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      }));
    })
  );
});
