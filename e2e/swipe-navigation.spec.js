import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function swipe(page, selector, { fromX = 280, toX = 80, y = 40 } = {}) {
  const target = page.locator(selector);
  await target.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: fromX, clientY: y, button: 0 });
  await target.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: toX, clientY: y, button: 0 });
}

test('Situation lässt sich auf der Startseite nach links und rechts wischen', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');

  await swipe(page, '.situation-strip');
  await expect(page.locator('#situationLabel')).toHaveText('Trage');

  await swipe(page, '.situation-strip', { fromX: 80, toX: 280 });
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
});

test('Outfit-Steuerung reagiert auf Wischgeste, Kleidungsraster bleibt ohne Horizontal-Scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await expect(page.locator('[data-warmth="balanced"]')).toHaveAttribute('aria-pressed', 'true');

  await swipe(page, '.warmth-control', { y: 18 });
  await expect(page.locator('[data-warmth="warmer"]')).toHaveAttribute('aria-pressed', 'true');

  await swipe(page, '.warmth-control', { fromX: 80, toX: 280, y: 18 });
  await expect(page.locator('[data-warmth="cooler"]')).toHaveAttribute('aria-pressed', 'true');

  const touchActions = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.outfit-card')).touchAction,
    control: getComputedStyle(document.querySelector('.warmth-control')).touchAction,
    grid: getComputedStyle(document.querySelector('#outfitGrid')).touchAction
  }));
  expect(touchActions.card).toBe('auto');
  expect(touchActions.control).toBe('pan-y');
  expect(touchActions.grid).toBe('auto');

  const scrollable = await page.locator('#outfitGrid').evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(scrollable).toBe(false);
});

test('Bottom-Sheet kann über den Kopfbereich nach unten geschlossen werden', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="settingsDialog"]').first().click();
  await expect(page.locator('#settingsDialog')).toBeVisible();

  const header = page.locator('#settingsDialog .sheet-header');
  await header.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 20, button: 0 });
  await header.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 184, clientY: 130, button: 0 });
  await expect(page.locator('#settingsDialog')).not.toBeVisible();
});

test('Herunterziehen am Seitenanfang fragt den Standort ab und lädt aktuelles Wetter', async ({ page }) => {
  const currentEpoch = Math.floor(Date.now() / 1000);
  await page.addInitScript(() => {
    window.__geolocationCalls = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          window.__geolocationCalls += 1;
          success({ coords: { latitude: 48.2082, longitude: 16.3738 } });
        }
      }
    });
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    if (!route.request().url().includes('/v1/forecast')) return route.continue();
    const hourly = {
      time: [currentEpoch],
      temperature_2m: [20],
      apparent_temperature: [19],
      wind_speed_10m: [8],
      wind_gusts_10m: [12],
      precipitation_probability: [10],
      precipitation: [0],
      rain: [0],
      showers: [0],
      snowfall: [0],
      weather_code: [1],
      cloud_cover: [20],
      is_day: [1],
      uv_index: [3]
    };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        timezone: 'Europe/Vienna',
        utc_offset_seconds: 7200,
        current: { ...Object.fromEntries(Object.entries(hourly).map(([key, value]) => [key, value[0]])), time: currentEpoch },
        hourly
      })
    });
  });
  await page.goto('/');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.locator('#main').dispatchEvent('pointerdown', { pointerId: 3, pointerType: 'touch', clientX: 180, clientY: 20, button: 0 });
  await page.locator('#main').dispatchEvent('pointerup', { pointerId: 3, pointerType: 'touch', clientX: 184, clientY: 110, button: 0 });
  await expect.poll(() => page.evaluate(() => window.__geolocationCalls)).toBe(1);
  await expect(page.locator('#toast')).toHaveText('Aktuelles Wetter und Standort geladen.');
  await expect(page.locator('#locationLabel')).toHaveText('Aktueller Standort');
});
