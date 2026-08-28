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

test('Kinderwagen zeigt Aktivität nur im Wachzustand und behält den Wert', async ({ page }) => {
  await openDemo(page);
  await openStrollerDialog(page);

  const state = page.locator('#situationDialog [data-context-field="strollerState"]');
  const activity = page.locator('#situationDialog [data-context-field="activity"]');

  await expect(state).toHaveValue('awake');
  await expect(activity).toBeVisible();
  await activity.selectOption('active');
  await expect(page.locator('#outfitReason')).toContainText('sehr aktives Baby');

  await state.selectOption('asleep');
  await expect(activity).toBeHidden();
  await expect(page.locator('#outfitReason')).toContainText('Schlafen im Kinderwagen');

  await state.selectOption('awake');
  await expect(activity).toBeVisible();
  await expect(activity).toHaveValue('active');
  await expect(page.locator('#outfitReason')).toContainText('sehr aktives Baby');
});

test('Kinderwagen-Schlafzustand bleibt im mobilen Dialog ohne irrelevantes Aktivitätsfeld', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await openStrollerDialog(page);

  const state = page.locator('#situationDialog [data-context-field="strollerState"]');
  const activity = page.locator('#situationDialog [data-context-field="activity"]');
  await state.selectOption('asleep');
  await expect(activity).toBeHidden();

  const screenshotPath = testInfo.outputPath('stroller-asleep-375x812.jpg');
  await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 60, fullPage: false });
  console.log(`VISUAL_STROLLER_DIALOG_BASE64:${readFileSync(screenshotPath).toString('base64')}`);
});
