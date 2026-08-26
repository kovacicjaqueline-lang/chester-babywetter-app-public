const CACHE_NAME = 'babywetter-shell-v0.2.0';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/integration.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/clothing/manifest.json',
  '/assets/clothing/visual-manifest.json',
  '/src/index.js',
  '/src/version.js',
  '/src/clothing-catalog.js',
  '/src/sleep-tog-rules.js',
  '/src/outfit-engine.js',
  '/src/outfit-engine-contract.js',
  '/src/outfit-engine-support.js',
  '/src/visual-outfit.js',
  '/src/integration/weather-series.js',
  '/src/weather/index.js',
  '/src/weather/errors.js',
  '/src/weather/location.js',
  '/src/weather/mock-weather.js',
  '/src/weather/open-meteo.js',
  '/src/weather/service.js',
  '/ui/asset-store.js',
  '/ui/render.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('babywetter-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', response.clone()));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/clothing/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      }))
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
