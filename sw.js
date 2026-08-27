const CACHE_NAME = 'babywetter-shell-v0.2.0-assets2';
const ASSET_MANIFEST_PATH = '/assets/clothing/manifest.json';
const VISUAL_MANIFEST_PATH = '/assets/clothing/visual-manifest.json';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/integration.css',
  '/app.js',
  '/manifest.webmanifest',
  ASSET_MANIFEST_PATH,
  VISUAL_MANIFEST_PATH,
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

function normalizedClothingAssetPath(path) {
  if (typeof path !== 'string') return null;
  const normalized = path.replace(/^\/+/, '');
  if (!normalized.startsWith('assets/clothing/') || !normalized.toLowerCase().endsWith('.webp')) return null;
  return `/${normalized}`;
}

function collectClothingAssetPaths(assetManifest, visualManifest) {
  const paths = new Set();
  const add = (path) => {
    const normalized = normalizedClothingAssetPath(path);
    if (normalized) paths.add(normalized);
  };

  for (const group of assetManifest?.assetGroups ?? []) {
    add(group?.assetPath);
    for (const path of Object.values(group?.variantPaths ?? {})) add(path);
  }

  for (const variants of Object.values(visualManifest?.additionalVariants ?? {})) {
    for (const variant of Array.isArray(variants) ? variants : []) add(variant?.assetPath);
  }

  return [...paths];
}

async function cacheOptionalClothingAsset(cache, path) {
  try {
    const response = await fetch(path);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.toLowerCase().startsWith('image/')) return false;
    await cache.put(path, response);
    return true;
  } catch {
    return false;
  }
}

async function precacheClothingAssets(cache) {
  const [assetResponse, visualResponse] = await Promise.all([
    cache.match(ASSET_MANIFEST_PATH),
    cache.match(VISUAL_MANIFEST_PATH)
  ]);
  if (!assetResponse || !visualResponse) throw new Error('Clothing manifests missing from app shell cache');

  const [assetManifest, visualManifest] = await Promise.all([
    assetResponse.json(),
    visualResponse.json()
  ]);
  const assetPaths = collectClothingAssetPaths(assetManifest, visualManifest);
  await Promise.all(assetPaths.map((path) => cacheOptionalClothingAsset(cache, path)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(SHELL);
        await precacheClothingAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
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
