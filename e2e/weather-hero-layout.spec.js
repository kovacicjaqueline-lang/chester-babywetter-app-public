import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#temperatureValue')).not.toHaveText('–');
}

function centerX(box) {
  return box.x + box.width / 2;
}

async function chooseSituation(page, mode) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator(`#situationDialog [data-situation="${mode}"]`).click();
  await page.locator('#applySituationButton').click();
  await expect(page.locator('#situationDialog')).not.toBeVisible();
}

test('Wetter-Hero zentriert Temperatur und Wetterfakten ohne redundantes Hauptsymbol', async ({ page }) => {
  await openDemo(page);

  await expect(page.locator('.weather-hero')).not.toHaveClass(/weather-hero--room/);
  await expect(page.locator('#weatherSymbol')).toBeHidden();

  const temperature = page.locator('#temperatureValue');
  await expect(temperature).toHaveAttribute('type', 'button');
  await expect(temperature).toHaveAttribute('aria-label', 'Wettertemperatur bearbeiten');
  const controlBox = await temperature.boundingBox();
  expect(controlBox).not.toBeNull();
  expect(controlBox.width).toBeGreaterThanOrEqual(44);
  expect(controlBox.height).toBeGreaterThanOrEqual(44);

  const heroBox = await page.locator('.weather-hero').boundingBox();
  const temperatureBox = await temperature.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(temperatureBox).not.toBeNull();
  expect(Math.abs(centerX(temperatureBox) - centerX(heroBox))).toBeLessThanOrEqual(1);

  const facts = page.locator('#weatherFacts .weather-fact');
  await expect(facts).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    const fact = facts.nth(index);
    const factBox = await fact.boundingBox();
    const valueBox = await fact.locator('strong').boundingBox();
    const labelBox = await fact.locator('span').boundingBox();
    expect(factBox).not.toBeNull();
    expect(valueBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    expect(Math.abs(centerX(valueBox) - centerX(factBox))).toBeLessThanOrEqual(1);
    expect(Math.abs(centerX(labelBox) - centerX(factBox))).toBeLessThanOrEqual(1);
  }
});

test('Temperaturtap öffnet den bestehenden Wetterdialog mit aktuellem und manuellem Wert', async ({ page }) => {
  await openDemo(page);

  const expectedAutomatic = await page.evaluate(() => {
    const cached = JSON.parse(localStorage.getItem('babyweather.v1.weatherCache') || 'null');
    return cached?.current?.airTempC == null ? null : Math.round(cached.current.airTempC * 2) / 2;
  });
  expect(expectedAutomatic).not.toBeNull();

  await page.locator('#temperatureValue').click();
  await expect(page.locator('#weatherOverrideDialog')).toBeVisible();
  await expect(page.locator('#manualAirTempC')).toHaveValue(String(expectedAutomatic));

  await page.locator('#manualAirTempC').fill('13.5');
  await page.locator('#applyWeatherOverrideButton').click();
  await expect(page.locator('#weatherOverrideDialog')).not.toBeVisible();

  await page.locator('#temperatureValue').click();
  await expect(page.locator('#weatherOverrideDialog')).toBeVisible();
  await expect(page.locator('#manualAirTempC')).toHaveValue('13.5');
});

test('Drinnen zeigt Raumtemperatur zuerst und übernimmt Änderung in Hero und Empfehlung', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'indoor');

  await expect(page.locator('.weather-hero')).toHaveClass(/weather-hero--room/);
  await expect(page.locator('#weatherDescription')).toBeHidden();
  await expect(page.locator('#temperatureValue')).toHaveAttribute('aria-label', 'Raumtemperatur bearbeiten');
  const initialOutfit = await page.locator('#outfitGrid [data-item-id]').evaluateAll((items) => items.map((item) => item.dataset.itemId).join('|'));

  await page.locator('#temperatureValue').click();
  await expect(page.locator('#situationDialog')).toBeVisible();
  const roomEditor = page.locator('#situationDialog .room-temperature-editor');
  const roomTemp = roomEditor.locator('[data-context-field="roomTempC"]');
  const activity = page.locator('#situationDialog [data-context-field="activity"]');
  await expect(roomEditor).toBeVisible();
  await expect(page.locator('#situationContextFields h3')).toHaveCount(0);
  await expect(roomTemp).toBeFocused();
  await expect(roomTemp).toHaveValue('20');
  await expect(activity).toBeVisible();

  const beforeStep = Number(await roomTemp.inputValue());
  await roomEditor.locator('[data-room-temp-step="up"]').click();
  await expect(roomTemp).toHaveValue(String(beforeStep + 0.5));

  await roomTemp.fill('30');
  await roomTemp.dispatchEvent('change');
  await page.locator('#applySituationButton').click();
  await expect(page.locator('#temperatureValue')).toHaveText('30°');
  const changedOutfit = await page.locator('#outfitGrid [data-item-id]').evaluateAll((items) => items.map((item) => item.dataset.itemId).join('|'));
  expect(changedOutfit).not.toBe(initialOutfit);
});

test('Schlafen macht Raumtemperatur zur zentralen Eingabe und Hero-Tap öffnet sie wieder', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('#situationDialog [data-situation="sleep"]').click();

  const roomEditor = page.locator('#situationDialog .room-temperature-editor');
  const roomTemp = roomEditor.locator('[data-context-field="roomTempC"]');
  await expect(roomEditor).toBeVisible();
  await expect(roomTemp).toHaveValue('18.5');
  await expect(page.locator('#situationContextFields h3')).toHaveCount(0);
  await expect(page.locator('#situationDialog [data-context-field="activity"]')).toHaveCount(0);
  await expect(page.locator('#situationContextFields')).not.toContainText('Details für diese Situation');

  const decreaseBox = await roomEditor.locator('[data-room-temp-step="down"]').boundingBox();
  const increaseBox = await roomEditor.locator('[data-room-temp-step="up"]').boundingBox();
  expect(decreaseBox).not.toBeNull();
  expect(increaseBox).not.toBeNull();
  expect(decreaseBox.width).toBeGreaterThanOrEqual(44);
  expect(decreaseBox.height).toBeGreaterThanOrEqual(44);
  expect(increaseBox.width).toBeGreaterThanOrEqual(44);
  expect(increaseBox.height).toBeGreaterThanOrEqual(44);

  await page.locator('#applySituationButton').click();
  await expect(page.locator('#temperatureValue')).toHaveText('19°');
  await expect(page.locator('#weatherDescription')).toBeHidden();

  await page.locator('#temperatureValue').click();
  await expect(page.locator('#situationDialog')).toBeVisible();
  await expect(page.locator('#situationDialog [data-context-field="roomTempC"]')).toBeFocused();
});

test('Raummodus behält sein Kontextsymbol ohne die Temperatur zu verschieben', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'sleep');

  await expect(page.locator('.weather-hero')).toHaveClass(/weather-hero--room/);
  await expect(page.locator('#weatherSymbol')).toBeVisible();

  const heroBox = await page.locator('.weather-hero').boundingBox();
  const temperatureBox = await page.locator('#temperatureValue').boundingBox();
  expect(heroBox).not.toBeNull();
  expect(temperatureBox).not.toBeNull();
  expect(Math.abs(centerX(temperatureBox) - centerX(heroBox))).toBeLessThanOrEqual(1);
});
