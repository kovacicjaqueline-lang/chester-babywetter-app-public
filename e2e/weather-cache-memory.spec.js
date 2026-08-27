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
