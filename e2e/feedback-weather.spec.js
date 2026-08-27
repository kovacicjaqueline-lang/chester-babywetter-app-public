import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function chooseSituation(page, mode) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator(`[data-situation="${mode}"]`).click();
  await page.locator('#applySituationButton').click();
}

async function selectedIds(page) {
  return page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));
}

test('Wetter kann manuell überschrieben und wieder automatisch geladen werden', async ({ page }) => {
  await openDemo(page);
  const before = await selectedIds(page);
  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await page.locator('#manualAirTempC').fill('5');
  await page.locator('#manualWindSpeedKmh').fill('35');
  await page.locator('#manualWindGustKmh').fill('45');
  await page.locator('#manualPrecipProbabilityPct').fill('70');
  await page.locator('#manualPrecipMm').fill('1');
  await page.locator('#manualPrecipitationType').selectOption('rain');
  await page.locator('#manualUvIndex').fill('1');
  await page.locator('#applyWeatherOverrideButton').click();
  await expect(page.locator('#temperatureValue')).toHaveText('5°');
  await expect(page.locator('#weatherOverrideStatus')).toHaveText('Manuell angepasst');
  await expect(page.locator('#weatherFacts')).toContainText('Gefühlt–');
  expect(await selectedIds(page)).not.toEqual(before);

  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await page.locator('#resetWeatherOverrideButton').click();
  await expect(page.locator('#temperatureValue')).toHaveText('18°');
  await expect(page.locator('#weatherOverrideStatus')).toBeHidden();
});

test('Manuelles Wetter funktioniert ohne API- oder Cache-Wetter', async ({ page, context }) => {
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(() => localStorage.removeItem('babyweather.v1.weatherCache'));

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#connectionBanner')).toBeVisible();
  await expect(page.locator('#connectionBanner')).toContainText('Offline');

  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await expect(page.locator('#applyWeatherOverrideButton')).toBeEnabled();
  await expect(page.locator('#weatherOverrideSource')).toContainText('Keine automatischen Wetterdaten');
  await page.locator('#manualAirTempC').fill('9');
  await page.locator('#manualPrecipitationType').selectOption('none');
  await page.locator('#applyWeatherOverrideButton').click();

  await expect(page.locator('#temperatureValue')).toHaveText('9°');
  await expect(page.locator('#weatherOverrideStatus')).toHaveText('Manuell angepasst');
  await expect(page.locator('#connectionBanner')).toContainText('manuell eingegebene Wetterwerte');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
  await context.setOffline(false);
});

test('Nackentest-Rückmeldung wird nur auf die aktuelle Empfehlung angewendet', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');
  const before = await selectedIds(page);
  await expect(page.getByTestId('neck-check')).toContainText('Kalte Hände oder Füße');
  await page.getByRole('button', { name:'Nackentest anwenden' }).click();
  await page.locator('[data-neck-feedback="cool"]').click();
  await expect(page.locator('#neckFeedbackStatus')).toContainText('Kühl – wärmer angepasst');
  expect(await selectedIds(page)).not.toEqual(before);

  await chooseSituation(page, 'stroller');
  await expect(page.locator('#neckFeedbackStatus')).toContainText('Noch keine Rückmeldung');
});

test('Nackentest behauptet keine Änderung wenn keine sichere Wärmestufe mehr möglich ist', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');
  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await page.locator('#manualAirTempC').fill('-20');
  await page.locator('#manualWindSpeedKmh').fill('0');
  await page.locator('#manualWindGustKmh').fill('0');
  await page.locator('#manualPrecipProbabilityPct').fill('0');
  await page.locator('#manualPrecipMm').fill('0');
  await page.locator('#manualPrecipitationType').selectOption('none');
  await page.locator('#manualUvIndex').fill('0');
  await page.locator('#applyWeatherOverrideButton').click();
  const before = await selectedIds(page);

  await page.getByRole('button', { name:'Nackentest anwenden' }).click();
  await page.locator('[data-neck-feedback="cool"]').click();

  await expect(page.locator('#neckFeedbackStatus')).toContainText('keine weitere sinnvolle oder sichere Schichtänderung möglich');
  expect(await selectedIds(page)).toEqual(before);
});
