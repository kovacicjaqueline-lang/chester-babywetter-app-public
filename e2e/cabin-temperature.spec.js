import { test, expect } from '@playwright/test';

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

async function openCarDetails(page) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog [data-context-field="cabinTempC"]')).toBeVisible();
}

test('unknown cabin temperature starts with the visibly marked V1 estimate', async ({ page }) => {
  await openDemo(page);
  await chooseCar(page);

  await expect(page.locator('#confidencePill')).toHaveText('Mit Schätzung');
  await expect(page.locator('#outfitReason')).toContainText('20 °C Innenraumtemperatur angenommen');
  await expect(page.locator('[data-notice-code="CAR_CABIN_TEMPERATURE_ESTIMATED"]')).toHaveCount(0);
  await expect(page.locator('[data-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toBeVisible();

  await openCarDetails(page);
  await expect(page.locator('#situationDialog [data-context-field="cabinTempC"]')).toHaveValue('20');
  await expect(page.locator('#situationDialog [data-context-field="cabinTempSource"]')).toHaveValue('estimated');
});

test('editing the cabin temperature is a quick manual correction and clears estimate status', async ({ page }) => {
  await openDemo(page);
  await chooseCar(page);
  await openCarDetails(page);

  const temperature = page.locator('#situationDialog [data-context-field="cabinTempC"]');
  await temperature.fill('23');
  await temperature.press('Tab');
  await expect(page.locator('#situationDialog [data-context-field="cabinTempSource"]')).toHaveValue('manual');
  await page.locator('#applySituationButton').click();

  await expect(page.locator('#confidencePill')).toHaveText('Passend');
  await expect(page.locator('#outfitReason')).toContainText('23 °C Innenraumtemperatur verwendet');
  await expect(page.locator('[data-notice-code="CAR_CABIN_TEMPERATURE_ESTIMATED"]')).toHaveCount(0);
  await expect(page.locator('[data-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toBeVisible();
});

test('measured source stays explicit and switching back to estimated resets to neutral 20 C', async ({ page }) => {
  await openDemo(page);
  await chooseCar(page);
  await openCarDetails(page);

  const temperature = page.locator('#situationDialog [data-context-field="cabinTempC"]');
  const source = page.locator('#situationDialog [data-context-field="cabinTempSource"]');
  await temperature.fill('24');
  await temperature.press('Tab');
  await source.selectOption('measured');
  await expect(page.locator('#situationDialog [data-context-field="cabinTempSource"]')).toHaveValue('measured');

  await page.locator('#situationDialog [data-context-field="cabinTempSource"]').selectOption('estimated');
  await expect(page.locator('#situationDialog [data-context-field="cabinTempC"]')).toHaveValue('20');
  await expect(page.locator('#situationDialog [data-context-field="cabinTempSource"]')).toHaveValue('estimated');
  await page.locator('#applySituationButton').click();

  await expect(page.locator('#confidencePill')).toHaveText('Mit Schätzung');
  await expect(page.locator('#outfitReason')).toContainText('20 °C Innenraumtemperatur angenommen');
  await expect(page.locator('[data-notice-code="CAR_CABIN_TEMPERATURE_ESTIMATED"]')).toHaveCount(0);
  await expect(page.locator('[data-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toBeVisible();
  await expect(page.locator('#outfitGrid [data-phase="outdoor_transition"]').first()).toBeVisible();
  await expect(page.locator('#outfitGrid [data-phase="in_car"]').first()).toBeVisible();
});
