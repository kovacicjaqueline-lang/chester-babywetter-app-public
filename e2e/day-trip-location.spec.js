import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#dayTripPlannerButton')).toBeVisible();
}

test('Tagesausflug nutzt einen eigenen Ausflugsort ohne den normalen Wetterort zu ändern', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const normalLocationBefore = await page.locator('#locationInput').inputValue();
  const storedLocationBefore = await page.evaluate(() => localStorage.getItem('babyweather:last-location:v1'));
  expect(normalLocationBefore).toContain('Salzburg');

  await page.locator('#dayTripPlannerButton').click();
  await expect(page.locator('#dayTripDialog')).toBeVisible();
  await expect(page.locator('#tripLocationInput')).toHaveValue(normalLocationBefore);
  await expect(page.locator('#tripLocationHelp')).toContainText('ändert deinen normalen Wetterort nicht');

  const inputHeight = await page.locator('#tripLocationInput').evaluate((node) => node.getBoundingClientRect().height);
  expect(inputHeight).toBeGreaterThanOrEqual(44);

  await page.locator('#tripLocationInput').fill('Wien');
  await expect(page.locator('#tripGenerateButton')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('#tripGenerateButton').click();
  await expect(page.locator('#tripLocationStatus')).toContainText('Bitte zuerst Wetter');
  await expect(page.locator('#tripResultView')).not.toBeVisible();

  await page.locator('#tripLocationApplyButton').click();
  await expect(page.locator('#tripLocationInput')).toHaveValue('Wien, Österreich');
  await expect(page.locator('#tripLocationStatus')).toHaveText('Wetter für Wien, Österreich geladen.');
  await expect(page.locator('#tripGenerateButton')).toHaveAttribute('aria-disabled', 'false');

  await page.locator('#tripGenerateButton').click();
  await expect(page.locator('#tripResultView')).toBeVisible();
  await expect(page.locator('#tripResultLocation')).toHaveText('Ort: Wien, Österreich');

  await expect(page.locator('#locationInput')).toHaveValue(normalLocationBefore);
  const storedLocationAfter = await page.evaluate(() => localStorage.getItem('babyweather:last-location:v1'));
  expect(storedLocationAfter).toBe(storedLocationBefore);
});

test('Tagesausflug kann wieder auf den normalen Wetterort zurückgesetzt werden', async ({ page }) => {
  await openDemo(page);
  await page.locator('#dayTripPlannerButton').click();
  await page.locator('#tripLocationInput').fill('Wien');
  await page.locator('#tripLocationApplyButton').click();
  await expect(page.locator('#tripLocationInput')).toHaveValue('Wien, Österreich');

  await page.locator('#tripLocationCurrentButton').click();
  await expect(page.locator('#tripLocationInput')).toHaveValue('Salzburg, Österreich');
  await expect(page.locator('#tripLocationStatus')).toContainText('Aktueller Wetterort: Salzburg, Österreich');
  await expect(page.locator('#tripGenerateButton')).toHaveAttribute('aria-disabled', 'false');
});
