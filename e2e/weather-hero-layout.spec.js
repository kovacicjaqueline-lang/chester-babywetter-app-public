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

test('Wetter-Hero zentriert Temperatur und Wetterfakten ohne redundantes Hauptsymbol', async ({ page }) => {
  await openDemo(page);

  await expect(page.locator('.weather-hero')).not.toHaveClass(/weather-hero--room/);
  await expect(page.locator('#weatherSymbol')).toBeHidden();

  const heroBox = await page.locator('.weather-hero').boundingBox();
  const temperatureBox = await page.locator('#temperatureValue').boundingBox();
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

test('Raummodus behält sein Kontextsymbol ohne die Temperatur zu verschieben', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="sleep"]').click();
  await page.locator('#applySituationButton').click();

  await expect(page.locator('.weather-hero')).toHaveClass(/weather-hero--room/);
  await expect(page.locator('#weatherSymbol')).toBeVisible();

  const heroBox = await page.locator('.weather-hero').boundingBox();
  const temperatureBox = await page.locator('#temperatureValue').boundingBox();
  expect(heroBox).not.toBeNull();
  expect(temperatureBox).not.toBeNull();
  expect(Math.abs(centerX(temperatureBox) - centerX(heroBox))).toBeLessThanOrEqual(1);
});
