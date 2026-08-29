import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function selectedIds(page) {
  return page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));
}

test('Mobilitätsstand wird im Babyprofil gespeichert, ohne das aktuelle Aktivitäts-Outfit zu verändern', async ({ page }) => {
  await openDemo(page);

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="outdoor"]').click();
  await page.locator('#situationDialog [data-context-field="activity"]').selectOption('normal');
  await page.locator('#applySituationButton').click();
  const before = await selectedIds(page);

  await page.locator('[data-open-dialog="profileDialog"]').click();
  await expect(page.locator('input[name="mobilityStage"][value="low_mobility"]')).toBeChecked();
  await page.locator('input[name="mobilityStage"][value="walking"]').check();
  await page.locator('#saveProfileButton').click();

  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.profile') || 'null')?.mobilityStage)).toBe('walking');
  expect(await selectedIds(page)).toEqual(before);

  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.locator('[data-open-dialog="profileDialog"]').click();
  await expect(page.locator('input[name="mobilityStage"][value="walking"]')).toBeChecked();
});

test('älteres lokales V1-Profil ohne Mobilitätsfeld startet mit Wenig mobil', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => {
    localStorage.setItem('babyweather.v1.profile', JSON.stringify({
      profileId:'legacy_profile',
      displayName:'Baby',
      birthDate:'2026-01-24',
      warmthBias:'neutral',
      styleTheme:'neutral',
      defaultMode:'stroller',
      createdAt:'2026-01-24T08:00:00.000Z',
      updatedAt:'2026-08-28T10:00:00.000Z'
    }));
  });
  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  await page.locator('[data-open-dialog="profileDialog"]').click();
  await expect(page.locator('input[name="mobilityStage"][value="low_mobility"]')).toBeChecked();
});
