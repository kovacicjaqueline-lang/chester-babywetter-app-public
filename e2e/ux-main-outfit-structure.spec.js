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
  await expect(page.locator('#situationLabel')).toHaveText({
    outdoor: 'Draußen', stroller: 'Kinderwagen', carrier: 'Trage', car: 'Autositz', indoor: 'Drinnen', sleep: 'Schlafen'
  }[mode]);
}

test('Outfit-Hierarchie zeigt Aufgabe, Situation und Körperrollen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  await expect(page.locator('#outfitHeading')).toHaveText('Jetzt anziehen');
  await expect(page.locator('#outfitHeading')).toBeVisible();
  await expect(page.locator('#outfitContextLabel')).toHaveText('Kinderwagen · wach');
  await expect(page.locator('#outfitGrid [data-outfit-group="body"] .outfit-group-heading')).toHaveText('Am Körper');
  await expect(page.locator('#outfitGrid [data-outfit-group="body"] .clothing-role').first()).toBeVisible();
  await expect(page.locator('#outfitGrid [data-outfit-group="extremities"] .outfit-group-heading')).toHaveText('Kopf, Hände & Füße');
});

test('Manuelles Schnee-Wetter verwendet dieselbe Niederschlagsart in der UI', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);

  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await page.locator('#manualAirTempC').fill('5');
  await page.locator('input[name="manualWindPreset"][value="strong"]').check();
  await page.locator('input[name="manualPrecipitationPreset"][value="snow"]').check();
  await page.locator('input[name="manualSunPreset"][value="cloudy"]').check();
  await page.locator('#applyWeatherOverrideButton').click();

  await expect(page.locator('#weatherFacts .weather-fact').nth(2)).toContainText('Schnee');
  await expect(page.getByRole('button', { name: /Schnee 70%/ }).first()).toBeVisible();
  await expect(page.locator('#weatherFacts')).not.toContainText('Regen');
});

test('Toast-Feedback bleibt oberhalb der fixierten mobilen Navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  await page.locator('#outfitGrid [data-open-alternatives="true"]').first().click();
  await page.locator('#alternativeDialog [data-alternative-item-id]').first().click();

  const positions = await page.evaluate(() => {
    const toast = document.querySelector('.toast');
    const nav = document.querySelector('.bottom-nav');
    const toastBox = toast?.getBoundingClientRect();
    const navBox = nav?.getBoundingClientRect();
    return { toastBottom: toastBox?.bottom, navTop: navBox?.top };
  });
  expect(positions.toastBottom).toBeLessThanOrEqual(positions.navTop);
});

test('Autositz zeigt genau eine gurtsichere Fahrtphase', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'car');

  const inCar = page.locator('[data-outfit-phase="in_car"]');
  await expect(page.locator('[data-outfit-phase="outdoor_transition"]')).toHaveCount(0);
  await expect(inCar.locator('.outfit-phase-heading')).toHaveText('Im Autositz');
  const inCarNames = await inCar.locator('[data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  expect(inCarNames.every((name) => name?.includes('Im Autositz'))).toBe(true);
  await expect(page.locator('[data-notice-code="CAR_SEAT_SAFETY"]')).toBeVisible();
  await expect(page.locator('[data-notice-code="CAR_SEAT_SAFETY"]')).toContainText('Unter dem Gurt');
  await expect(page.locator('[data-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toHaveCount(0);
});

test('Trageposition bleibt als primäre Entscheidung im Haupt-Outfit sichtbar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await chooseSituation(page, 'carrier');

  const control = page.locator('#primarySituationControl');
  await expect(control).toBeVisible();
  await expect(control).toContainText('Unter meiner Jacke');
  await expect(control).toContainText('Über meiner Jacke');
  await expect(control.locator('[aria-pressed="true"]')).toHaveText('Über meiner Jacke');
  await control.locator('[data-carrier-placement="under_wearer_outerwear"]').click();
  await expect(control.locator('[aria-pressed="true"]')).toHaveText('Unter meiner Jacke');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.uiState') || '{}').contexts?.carrier?.placement)).toBe('under_wearer_outerwear');
});

test('Alternativen trennen Einzelteil, Gesamtoutfit und Definition', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await page.locator('#outfitGrid [data-open-alternatives="true"]').first().click();
  const option = page.locator('#alternativeDialog [data-alternative-item-id]').first();
  await expect(option).toContainText('Einzelteil:');
  await expect(option).toContainText('Gesamtoutfit:');
  await expect(option.locator('.alternative-description')).toBeVisible();
  await expect(option.locator('.alternative-changes')).toBeVisible();
});

test('Autositz zeigt jedes empfohlene Teil nur einmal', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'car');

  const itemIds = await page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));
  expect(new Set(itemIds).size).toBe(itemIds.length);
  await expect(page.locator('[data-outfit-phase="in_car"] [data-item-id="long_sleeve_bodysuit"]')).toHaveCount(1);
});

test('Nur tatsächlich austauschbare Teile kündigen Alternativen an', async ({ page }) => {
  await openDemo(page);
  const cards = page.locator('#outfitGrid [data-item-id]');
  const semantics = await cards.evaluateAll((nodes) => nodes.map((node) => ({
    interactive: node.dataset.openAlternatives === 'true',
    name: node.getAttribute('aria-label')
  })));
  expect(semantics.some((entry) => entry.interactive)).toBe(true);
  expect(semantics.filter((entry) => entry.interactive).every((entry) => entry.name?.includes('Alternativen anzeigen'))).toBe(true);
  expect(semantics.filter((entry) => !entry.interactive).every((entry) => !entry.name?.includes('Alternativen anzeigen'))).toBe(true);
});

test('Status steht im Kontext der Outfit-Überschrift', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await page.locator('#manualAirTempC').fill('18');
  await page.locator('input[name="manualWindPreset"][value="unknown"]').check();
  await page.locator('input[name="manualPrecipitationPreset"][value="unknown"]').check();
  await page.locator('input[name="manualSunPreset"][value="unknown"]').check();
  await page.locator('#applyWeatherOverrideButton').click();

  await expect(page.locator('#confidencePill')).toHaveText('Teilweise');
  await expect(page.locator('#outfitStatusText')).toContainText('Winddaten fehlen');
  await expect(page.locator('#outfitStatusText')).not.toContainText('Teilweise');
  await expect(page.locator('#outfitStatusText')).toContainText('UV-Wert fehlt');
});

test('Drinnen und Schlafen zeigen Raumtemperatur primär und Außenwetter sekundär', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  await chooseSituation(page, 'indoor');
  await expect(page.locator('#temperatureValue')).toHaveText('20°');
  await expect(page.locator('#weatherHeading')).toHaveText('Drinnen');
  await expect(page.locator('#weatherDescription')).toHaveText('Raumtemperatur für drinnen');
  await expect(page.locator('#weatherFactsLabel')).toHaveText('Außenwetter · sekundär');
  await expect(page.locator('#weatherAdjustRow')).toBeHidden();

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="sleep"]').click();
  await page.locator('#situationDialog [data-context-field="roomTempC"]').fill('19');
  await page.locator('#applySituationButton').click();

  await expect(page.locator('#temperatureValue')).toHaveText('19°');
  await expect(page.locator('#weatherHeading')).toHaveText('Schlafraum');
  await expect(page.locator('#weatherDescription')).toHaveText('Raumtemperatur für Schlafen');
  await expect(page.locator('#weatherFactsLabel')).toHaveText('Außenwetter · sekundär');
  await expect(page.locator('#weatherAdjustRow')).toBeHidden();
  const sleepTemperatureFontSize = await page.locator('#temperatureValue').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(sleepTemperatureFontSize).toBeGreaterThan(40);
  await expect(page.locator('#weatherFacts')).toContainText('Außenwetter');
  await expect(page.locator('#weatherFacts')).not.toContainText('19°');
  await expect(page.locator('#outfitContextLabel')).toHaveText('Schlafen · Raumtemperatur + TOG');

  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#situationLabel')).toHaveText('Schlafen');
  await expect(page.locator('#weatherHeading')).toHaveText('Schlafraum');
  await expect(page.locator('#temperatureValue')).toHaveText('19°');
  await expect(page.locator('#weatherDescription')).toHaveText('Raumtemperatur für Schlafen');
});
