import { test, expect } from '@playwright/test';

test('new stroller context defaults sun exposure to unknown', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog')).toBeVisible();
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
  await expect(page.locator('#situationDialog [data-context-field="sunExposure"]')).toHaveValue('unknown');
});