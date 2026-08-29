import { test, expect } from '@playwright/test';

const OLD_CACHE = 'babywetter-shell-v0.2.0-assets9';
const NEW_CACHE = 'babywetter-shell-v0.2.0-assets10';

test('Service-Worker-Upgrade ersetzt den vorherigen App-Shell-Cache', async ({ page, context }) => {
  await page.goto('/?demo=1');
  await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active))).toBe(true);

  await page.evaluate(async (oldCache) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('service worker registration missing');
    await registration.unregister();
    const cache = await caches.open(oldCache);
    await cache.put('/old-cache-marker', new Response('old'));
  }, OLD_CACHE);
  await expect.poll(() => page.evaluate((name) => caches.has(name), OLD_CACHE)).toBe(true);

  await page.close();
  const upgradePage = await context.newPage();
  await upgradePage.goto('/?demo=1');
  await expect.poll(() => upgradePage.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active))).toBe(true);

  await expect.poll(() => upgradePage.evaluate((name) => caches.has(name), NEW_CACHE)).toBe(true);
  await expect.poll(() => upgradePage.evaluate((name) => caches.has(name), OLD_CACHE)).toBe(false);
});
