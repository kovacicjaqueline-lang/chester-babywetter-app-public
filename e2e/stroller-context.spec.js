import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function openStrollerDialog(page) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog')).toBeVisible();
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
}

test('Kinderwagen bündelt Zustand und Aktivität in Schläft, Wach und Sehr aktiv', async ({ page }) => {
  await openDemo(page);
  await openStrollerDialog(page);

  const behavior = page.locator('#situationDialog [data-context-field="strollerBehavior"]');
  await expect(behavior).toHaveValue('awake');
  await expect(behavior.locator('option')).toHaveText(['Schläft', 'Wach', 'Sehr aktiv']);
  await expect(page.locator('#situationDialog [data-context-field="strollerState"]')).toHaveCount(0);
  await expect(page.locator('#situationDialog [data-context-field="activity"]')).toHaveCount(0);

  await behavior.selectOption('very_active');
  await expect(page.locator('#outfitReason')).toContainText('sehr aktives Baby');

  await behavior.selectOption('asleep');
  await expect(page.locator('#outfitReason')).toContainText('Schlafen im Kinderwagen');

  await behavior.selectOption('awake');
  await expect(page.locator('#outfitReason')).not.toContainText('sehr aktives Baby');
});

test('Kinderwagen-Dialog zeigt auf Mobile nur einen kompakten Zustandswähler', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await openStrollerDialog(page);

  const behavior = page.locator('#situationDialog [data-context-field="strollerBehavior"]');
  await behavior.selectOption('asleep');
  await expect(behavior).toHaveValue('asleep');
  await expect(page.locator('#situationDialog [data-context-field="activity"]')).toHaveCount(0);

  const screenshotPath = testInfo.outputPath('stroller-asleep-375x812.jpg');
  await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 60, fullPage: false });
  console.log(`VISUAL_STROLLER_DIALOG_BASE64:${readFileSync(screenshotPath).toString('base64')}`);
});
