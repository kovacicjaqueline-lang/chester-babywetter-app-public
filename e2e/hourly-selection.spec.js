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

async function selectedIds(page) {
  return page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));
}

test('Stundenauswahl berechnet das Outfit sofort für den gewählten Prognosezeitpunkt neu', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');

  const nowChoice = page.locator('#hourlyForecast [data-hourly-choice="now"]');
  await expect(nowChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#outfitTimeLabel')).toHaveText('Für jetzt');
  const before = await selectedIds(page);

  const futureChoices = page.locator('#hourlyForecast [data-hourly-start-time]');
  expect(await futureChoices.count()).toBeGreaterThan(0);
  const futureTime = await futureChoices.last().getAttribute('data-hourly-start-time');
  await futureChoices.last().click();

  const selected = page.locator(`#hourlyForecast [data-hourly-start-time="${futureTime}"]`);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#outfitTimeLabel')).toContainText('Für ');
  const after = await selectedIds(page);
  expect(after).not.toEqual(before);
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

test('Drinnen und Schlafen bleiben unabhängig von der Außenwetter-Stundenauswahl', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'indoor');
  await expect(page.locator('#outfitTimeLabel')).toBeHidden();
  await expect(page.locator('#hourlyForecast [data-hourly-choice]').first()).toBeDisabled();
  await expect(page.locator('#outfitReason')).toContainText('Raumtemperatur');

  await chooseSituation(page, 'sleep');
  await expect(page.locator('#outfitTimeLabel')).toBeHidden();
  await expect(page.locator('#hourlyForecast [data-hourly-choice]').first()).toBeDisabled();
  await expect(page.locator('#outfitReason')).toContainText('Raumtemperatur');
});
