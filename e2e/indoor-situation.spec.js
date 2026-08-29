import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

test('Drinnen ist eine eigene Situation mit Raumtemperatur und Aktivität', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog')).toBeVisible();

  const indoor = page.locator('#situationDialog [data-situation="indoor"]');
  await expect(indoor).toContainText('Drinnen');
  await indoor.click();
  await expect(page.locator('#situationLabel')).toHaveText('Drinnen');

  const roomTemp = page.locator('#situationDialog [data-context-field="roomTempC"]');
  const activity = page.locator('#situationDialog [data-context-field="activity"]');
  await expect(roomTemp).toHaveValue('20');
  await expect(activity.locator('option')).toHaveText(['Normal', 'Sehr aktiv']);
  await expect(page.locator('#situationDialog [data-context-field="sunExposure"]')).toHaveCount(0);
  await expect(page.locator('#situationDialog [data-context-field="windProtection"]')).toHaveCount(0);

  await activity.selectOption('active');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
  await expect(page.locator('#outfitGrid [data-slot="outer"]')).toHaveCount(0);
  await expect(page.locator('#outfitGrid [data-slot="head"]')).toHaveCount(0);
});
