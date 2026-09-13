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
  await expect(page.locator('#outfitContextLabel')).toHaveText('Kinderwagen · wach');
  await expect(page.locator('#outfitGrid [data-outfit-group="body"] .outfit-group-heading')).toHaveText('Am Körper');
  await expect(page.locator('#outfitGrid [data-outfit-group="body"] .clothing-role').first()).toBeVisible();
  await expect(page.locator('#outfitGrid [data-outfit-group="extremities"] .outfit-group-heading')).toHaveText('Kopf, Hände & Füße');
});

test('Autositz trennt Übergang und Fahrt mit Safety-Aktion dazwischen', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'car');

  const transition = page.locator('[data-outfit-phase="outdoor_transition"]');
  const inCar = page.locator('[data-outfit-phase="in_car"]');
  const bridge = page.locator('[data-safety-bridge="car-harness"]');
  await expect(transition.locator('.outfit-phase-heading')).toHaveText('Zum/vom Auto');
  await expect(inCar.locator('.outfit-phase-heading')).toHaveText('Im Autositz');
  await expect(bridge).toContainText('Vor dem Anschnallen');
  await expect(bridge).toContainText('dicken Overall');

  const [bridgeBox, inCarBox] = await Promise.all([bridge.boundingBox(), inCar.locator('[data-item-id]').first().boundingBox()]);
  expect(bridgeBox).not.toBeNull();
  expect(inCarBox).not.toBeNull();
  expect(bridgeBox.y + bridgeBox.height).toBeLessThanOrEqual(inCarBox.y);

  const transitionNames = await transition.locator('[data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  const inCarNames = await inCar.locator('[data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  expect(transitionNames.every((name) => name?.includes('Zum/vom Auto'))).toBe(true);
  expect(inCarNames.every((name) => name?.includes('Im Autositz'))).toBe(true);
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
  await expect(page.locator('#outfitStatusText')).toContainText('Teilweise');
  await expect(page.locator('#outfitStatusText')).toContainText('UV-Wert fehlt');
});

test('Drinnen und Schlafen zeigen Raumtemperatur primär und Außenwetter sekundär', async ({ page }) => {
  await openDemo(page);

  await chooseSituation(page, 'indoor');
  await expect(page.locator('#temperatureValue')).toHaveText('20°');
  await expect(page.locator('#weatherHeading')).toHaveText('Drinnen');
  await expect(page.locator('#weatherDescription')).toHaveText('Raumtemperatur für drinnen');
  await expect(page.locator('#weatherFactsLabel')).toHaveText('Außenwetter · sekundär');
  await expect(page.locator('#weatherAdjustRow')).toBeHidden();

  await chooseSituation(page, 'sleep');
  await expect(page.locator('#temperatureValue')).toHaveText('18.5°');
  await expect(page.locator('#weatherHeading')).toHaveText('Schlafraum');
  await expect(page.locator('#weatherDescription')).toHaveText('Raumtemperatur für Schlafen');
  await expect(page.locator('#outfitContextLabel')).toHaveText('Schlafen · Raumtemperatur + TOG');
});
