import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toBeVisible();
}

async function chooseSituation(page, mode) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator(`[data-situation="${mode}"]`).click();
  await page.locator('#applySituationButton').click();
}

async function swipe(page, selector, { fromX = 280, toX = 80, y = 24 } = {}) {
  const target = page.locator(selector);
  await target.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: fromX, clientY: y, button: 0 });
  await target.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: toX, clientY: y, button: 0 });
}

test('Wischen direkt auf der Temperatur wechselt Wetteranzeige und Outfit zur nächsten Stunde', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');

  const nowChoice = page.locator('#hourlyForecast [data-hourly-choice="now"]');
  const firstFuture = page.locator('#hourlyForecast [data-hourly-start-time]').first();
  const futureTime = await firstFuture.getAttribute('data-hourly-start-time');
  const expectedHour = new Date(futureTime).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

  await swipe(page, '.temperature-line');
  await expect(page.locator(`#hourlyForecast [data-hourly-start-time="${futureTime}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#weatherHeading')).toHaveText(expectedHour);
  await expect(page.locator('#outfitTimeLabel')).toHaveText(`Für ${expectedHour}`);
  await expect(page.locator('.temperature-line')).toHaveCSS('touch-action', 'pan-y');

  await swipe(page, '.temperature-line', { fromX: 80, toX: 280 });
  await expect(nowChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#weatherHeading')).toHaveText('Jetzt');
  await expect(page.locator('#outfitTimeLabel')).toHaveText('Für jetzt');
});

test('Stundenauswahl berechnet das Outfit sofort für den gewählten Prognosezeitpunkt neu', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');

  const nowChoice = page.locator('#hourlyForecast [data-hourly-choice="now"]');
  await expect(nowChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#outfitTimeLabel')).toHaveText('Für jetzt');
  await expect(page.locator('#outfitGrid [data-item-id="rain_jacket"]')).toHaveCount(0);

  const futureChoices = page.locator('#hourlyForecast [data-hourly-start-time]');
  expect(await futureChoices.count()).toBeGreaterThan(1);
  const rainyChoice = futureChoices.nth(1);
  const futureTime = await rainyChoice.getAttribute('data-hourly-start-time');
  await rainyChoice.click();

  const selected = page.locator(`#hourlyForecast [data-hourly-start-time="${futureTime}"]`);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(nowChoice).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#outfitTimeLabel')).not.toHaveText('Für jetzt');
  await expect(page.locator('#outfitTimeLabel')).toContainText('Für ');
  await expect(page.locator('#outfitGrid [data-item-id="rain_jacket"]')).toHaveCount(1);
});

test('Stundenleiste bleibt horizontal nutzbar, touchfreundlich und Jetzt ist direkt wieder wählbar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await chooseSituation(page, 'stroller');

  const metrics = await page.locator('#hourlyForecast').evaluate((host) => ({ clientWidth: host.clientWidth, scrollWidth: host.scrollWidth }));
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  const heights = await page.locator('#hourlyForecast [data-hourly-choice]').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  await page.locator('#hourlyForecast [data-hourly-start-time]').first().click();
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#hourlyForecast [data-hourly-choice="now"]').click();
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#outfitTimeLabel')).toHaveText('Für jetzt');
});

test('Drinnen und Schlafen bleiben unabhängig von einer zuvor gewählten Außenwetterstunde', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');
  await page.locator('#hourlyForecast [data-hourly-start-time]').first().click();
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toHaveAttribute('aria-pressed', 'false');

  await chooseSituation(page, 'indoor');
  await expect(page.locator('#outfitTimeLabel')).toBeHidden();
  await expect(page.locator('#hourlyForecast [data-hourly-choice]')).toHaveCount(0);
  await expect(page.locator('#hourlyForecast .hour-card').first()).toBeVisible();

  await chooseSituation(page, 'sleep');
  await expect(page.locator('#outfitTimeLabel')).toBeHidden();
  await expect(page.locator('#hourlyForecast [data-hourly-choice]')).toHaveCount(0);
  await expect(page.locator('#hourlyForecast .hour-card').first()).toBeVisible();
});
