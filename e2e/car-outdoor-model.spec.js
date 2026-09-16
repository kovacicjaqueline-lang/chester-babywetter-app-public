import { test, expect } from '@playwright/test';

const UI_STATE_KEY = 'babyweather.v1.uiState';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function chooseCar(page) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="car"]').click();
  await page.locator('#applySituationButton').click();
  await expect(page.locator('#situationLabel')).toHaveText('Autositz');
}

test('Autositz-Details brauchen keine technische Temperatur- oder Übergangseingabe', async ({ page }) => {
  await openDemo(page);
  await chooseCar(page);
  await page.locator('[data-open-dialog="situationDialog"]').first().click();

  const dialog = page.locator('#situationDialog');
  await expect(dialog.locator('.car-context-summary')).toContainText('Keine zusätzlichen Angaben nötig');
  await expect(dialog.locator('.car-context-summary')).toContainText('aktuellen Außenwetter');
  await expect(dialog.locator('.car-context-summary')).toContainText('entfernen');
  await expect(dialog.locator('[data-context-field="cabinTempC"]')).toHaveCount(0);
  await expect(dialog.locator('[data-context-field="cabinTempSource"]')).toHaveCount(0);
  await expect(dialog.locator('[data-context-field="includeOutdoorTransition"]')).toHaveCount(0);
  await expect(dialog.locator('[data-context-field="outsideTransitionMinutes"]')).toHaveCount(0);
});

test('Außentemperatur steuert entfernbare Zusatzwärme über dem Gurt', async ({ page }) => {
  await openDemo(page);
  await chooseCar(page);

  await expect(page.locator('[data-outfit-phase="in_car"]')).toBeVisible();
  await expect(page.locator('[data-outfit-phase="outdoor_transition"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="car_blanket_over_harness"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="car_warm_blanket_over_harness"]')).toHaveCount(0);

  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await page.locator('#manualAirTempC').fill('5');
  await page.locator('#applyWeatherOverrideButton').click();

  const blanket = page.locator('[data-item-id="car_warm_blanket_over_harness"]');
  await expect(blanket).toBeVisible();
  await expect(blanket).toHaveAttribute('data-phase','in_car');
  await expect(page.locator('[data-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toBeVisible();
  await expect(page.locator('[data-notice-code="CAR_SEAT_REMOVE_COVER_WHEN_WARM"]')).toBeVisible();
  await expect(page.locator('#outfitReason')).toContainText('aktuellen Außenwetter');
});

test('alter V2-Autokontext migriert ohne Innenraum- und Übergangsfelder auf V3', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      uiStateVersion:2,
      mode:'car',
      visualSeed:0,
      contexts:{
        car:{ mode:'car', plannedMinutes:30, cabinTempC:20, cabinTempSource:'estimated', includeOutdoorTransition:true, outsideTransitionMinutes:5 }
      }
    }));
  }, { key:UI_STATE_KEY });
  await openDemo(page);

  const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), UI_STATE_KEY);
  expect(migrated.uiStateVersion).toBe(3);
  expect(migrated.contexts.car).toEqual({ mode:'car' });
  await expect(page.locator('[data-outfit-phase="outdoor_transition"]')).toHaveCount(0);
});
