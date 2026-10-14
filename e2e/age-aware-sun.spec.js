import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function setBirthMonthsAgo(page,months) {
  const date = await page.evaluate((monthsAgo) => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth() - monthsAgo,1)).toISOString().slice(0,10);
  },months);
  await page.locator('[data-open-dialog="profileDialog"]').click();
  await page.locator('#profileBirthDate').fill(date);
  await page.locator('#saveProfileButton').click();
  await expect(page.locator('#profileDialog')).toBeHidden();
}

test('Altershinweise bei direkter Sonne wechseln mit sechs Monaten',async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="outdoor"]').click();
  await page.locator('#situationDialog [data-context-field="sunExposure"]').selectOption('direct');
  await page.locator('#applySituationButton').click();

  await setBirthMonthsAgo(page,4);
  await expect(page.locator('[data-notice-code="INFANT_UNDER_6M_AVOID_DIRECT_SUN"]')).toBeVisible();
  await expect(page.locator('[data-notice-code="INFANT_UNDER_6M_AVOID_DIRECT_SUN"]')).toContainText('nicht direkter Sonne aussetzen');
  await expect(page.locator('[data-notice-code="CHILD_FROM_6M_SUN_PROTECTION"]')).toHaveCount(0);

  await setBirthMonthsAgo(page,9);
  await expect(page.locator('[data-notice-code="CHILD_FROM_6M_SUN_PROTECTION"]')).toBeVisible();
  await expect(page.locator('[data-notice-code="CHILD_FROM_6M_SUN_PROTECTION"]')).toContainText('LSF 30');
  await expect(page.locator('[data-notice-code="INFANT_UNDER_6M_AVOID_DIRECT_SUN"]')).toHaveCount(0);
});
