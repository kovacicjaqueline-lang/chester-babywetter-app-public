import { test, expect } from '@playwright/test';

test('frisch geladenes Wetter bleibt offline nutzbar, wenn localStorage-Cache fehlt', async ({ page, context }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();

  const temperatureBefore = await page.locator('#temperatureValue').textContent();
  expect(temperatureBefore).not.toBe('–');
  await page.evaluate(() => localStorage.removeItem('babyweather.v1.weatherCache'));

  await context.setOffline(true);

  await expect(page.locator('#connectionBanner')).toBeVisible();
  await expect(page.locator('#connectionBanner')).toContainText('Offline');
  await expect(page.locator('#weatherDescription')).toContainText('gespeichert');
  await expect(page.locator('#temperatureValue')).toHaveText(temperatureBefore);
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();

  await context.setOffline(false);
});

test('online geöffnetes Wetter wird beim Überschreiten der Freshness-Grenze automatisch aktualisiert', async ({ page }) => {
  const clockStart = Date.parse('2026-08-27T10:00:00.000Z');
  await page.clock.install({ time: new Date(clockStart) });
  await page.goto('/?demo=1');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();

  const initialFetchedAt = await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.weatherCache'))?.fetchedAt);
  const initialFetchedMs = Date.parse(initialFetchedAt);
  expect(initialFetchedMs).toBeGreaterThanOrEqual(clockStart);
  expect(initialFetchedMs).toBeLessThan(clockStart + 1000);

  await page.clock.fastForward(31 * 60 * 1000);

  await expect.poll(() => page.evaluate(() => Date.parse(JSON.parse(localStorage.getItem('babyweather.v1.weatherCache'))?.fetchedAt)))
    .toBeGreaterThan(initialFetchedMs);
  await expect(page.locator('#weatherDescription')).not.toContainText('ältere gespeicherte Daten');
  await expect(page.locator('[data-notice-code="WEATHER_DATA_STALE"]')).toHaveCount(0);
  await expect(page.locator('#confidencePill')).toHaveText('Passend');
});

test('aktives Wetter altert offline auch ohne Reload von fresh zu stale und danach zu abgelaufen', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-08-27T10:00:00.000Z') });
  await page.goto('/?demo=1');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
  await expect(page.locator('#confidencePill')).toHaveText('Passend');

  await context.setOffline(true);
  await page.clock.fastForward(31 * 60 * 1000);
  await expect(page.locator('#weatherDescription')).toContainText('ältere gespeicherte Daten');
  await expect(page.locator('[data-notice-code="WEATHER_DATA_STALE"]')).toBeVisible();
  await expect(page.locator('#confidencePill')).toHaveText('Teilweise');

  await page.clock.fastForward(90 * 60 * 1000);
  await expect(page.locator('#temperatureValue')).toHaveText('–');
  await expect(page.locator('#weatherDescription')).toHaveText('Gespeichertes Wetter zu alt');
  await expect(page.locator('#confidencePill')).toHaveText('Angaben fehlen');
  await expect(page.locator('#outfitGrid [data-item-id]')).toHaveCount(0);

  await context.setOffline(false);
});
