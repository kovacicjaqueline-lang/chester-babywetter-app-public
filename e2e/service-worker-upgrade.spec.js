import { test, expect } from '@playwright/test';

const OLD_CACHE = 'babywetter-shell-v0.2.0-assets3';
const NEW_CACHE = 'babywetter-shell-v0.2.0-assets4';

test('Service-Worker-Upgrade ersetzt den vorherigen App-Shell-Cache', async ({ page }) => {
  let serveOldWorker = true;

  await page.route('**/sw.js', async (route) => {
    if (!serveOldWorker) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        const CACHE_NAME = '${OLD_CACHE}';
        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put('/old-cache-marker', new Response('old')))
              .then(() => self.skipWaiting())
          );
        });
        self.addEventListener('activate', (event) => {
          event.waitUntil(self.clients.claim());
        });
      `
    });
  });

  await page.goto('/?demo=1');

  await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active))).toBe(true);
  await expect.poll(() => page.evaluate((name) => caches.has(name), OLD_CACHE)).toBe(true);

  serveOldWorker = false;
  const controllerChanged = page.evaluate(() => new Promise((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), { once: true });
  }));
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('service worker registration missing');
    await registration.update();
  });
  await controllerChanged;

  await expect.poll(() => page.evaluate((name) => caches.has(name), NEW_CACHE)).toBe(true);
  await expect.poll(() => page.evaluate((name) => caches.has(name), OLD_CACHE)).toBe(false);
});
