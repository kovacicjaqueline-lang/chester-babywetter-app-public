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
  const dialog = page.locator('#weatherOverrideDialog');
  await expect(dialog.getByRole('heading', { name:'Wetter anpassen' })).toBeVisible();
  await expect(dialog).not.toContainText('Die aktuellen Wetterwerte werden geladen');
  await expect(dialog).not.toContainText('Weitere Wetterdetails');
  await expect(dialog.getByRole('button', { name:'Übernehmen' })).toBeVisible();
  await expect(dialog.getByRole('button', { name:'Zurücksetzen' })).toBeVisible();
  const initialTemperature = await page.locator('#manualAirTempC').inputValue();
  await dialog.getByRole('button', { name:'Temperatur um ein Grad erhöhen' }).click();
  await expect(page.locator('#manualAirTempC')).toHaveValue(String(Number(initialTemperature) + 1));
  await dialog.getByRole('button', { name:'Temperatur um ein Grad senken' }).click();
  await expect(page.locator('#manualAirTempC')).toHaveValue(initialTemperature);
  await page.locator('#manualAirTempC').fill('5');
  await page.locator('input[name="manualWindPreset"][value="windy"]').check();
  await page.locator('input[name="manualPrecipitationPreset"][value="rain"]').check();
  await page.locator('input[name="manualSunPreset"][value="cloudy"]').check();
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

test('Manuelles Wetter funktioniert ohne API- oder Cache-Wetter', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('#connectionBanner')).toBeVisible();
  await expect(page.locator('#connectionBanner')).toContainText('Wetter nicht verfügbar');

  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await expect(page.locator('#applyWeatherOverrideButton')).toBeEnabled();
  await page.locator('#manualAirTempC').fill('9');
  await page.locator('input[name="manualWindPreset"][value="unknown"]').check();
  await page.locator('input[name="manualPrecipitationPreset"][value="dry"]').check();
  await page.locator('input[name="manualSunPreset"][value="unknown"]').check();
  await page.locator('#applyWeatherOverrideButton').click();

  await expect(page.locator('#temperatureValue')).toHaveText('9°');
  await expect(page.locator('#weatherOverrideStatus')).toHaveText('Manuell angepasst');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.weatherCache')));
  expect(stored.origin).toBe('manual');
  expect(stored.hourly).toEqual([]);
});

test('Nackentest-Rückmeldung wird nur auf die aktuelle Empfehlung angewendet', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');
  const before = await selectedIds(page);
  await expect(page.getByTestId('neck-check')).not.toContainText('Kalte Hände oder Füße');
  await page.getByRole('button', { name:'Nackentest anwenden' }).click();
  await expect(page.locator('#neckFeedbackDialog')).toContainText('Kalte Hände oder Füße');
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
  await page.locator('input[name="manualWindPreset"][value="calm"]').check();
  await page.locator('input[name="manualPrecipitationPreset"][value="dry"]').check();
  await page.locator('input[name="manualSunPreset"][value="cloudy"]').check();
  await page.locator('#applyWeatherOverrideButton').click();
  const before = await selectedIds(page);
  await expect(page.locator('[data-notice-code="EXTREME_COLD_CAUTION"]')).toContainText('Exposition begrenzen');

  await page.getByRole('button', { name:'Nackentest anwenden' }).click();
  await page.locator('[data-neck-feedback="cool"]').click();

  await expect(page.locator('#neckFeedbackStatus')).toContainText('keine weitere sinnvolle oder sichere Schichtänderung möglich');
  expect(await selectedIds(page)).toEqual(before);
});
