import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function selectedIds(page) {
  return page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));
}

test('Mobilität ist im Babyprofil ausgeblendet und ein vorhandener Wert bleibt beim Speichern erhalten', async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => {
    const key = 'babyweather.v1.profile';
    const profile = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...profile, mobilityStage: 'walking' }));
  });
  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="outdoor"]').click();
  await page.locator('#situationDialog [data-context-field="activity"]').selectOption('normal');
  await page.locator('#applySituationButton').click();
  const before = await selectedIds(page);

  await page.locator('[data-open-dialog="profileDialog"]').click();
  const dialog = page.locator('#profileDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('Mobilität');
  await expect(dialog.locator('input[name="mobilityStage"]')).toHaveCount(0);
  await expect(dialog.getByRole('group', { name: 'Wärmetendenz' })).toBeVisible();
  await page.locator('#profileName').fill('Chester');
  await page.locator('#saveProfileButton').click();

  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.profile')))).toMatchObject({
    displayName: 'Chester',
    mobilityStage: 'walking'
  });
  expect(await selectedIds(page)).toEqual(before);

  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.locator('[data-open-dialog="profileDialog"]').click();
  await expect(page.locator('#profileDialog')).not.toContainText('Mobilität');
  await expect(page.locator('#profileName')).toHaveValue('Chester');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.profile'))?.mobilityStage)).toBe('walking');
});

test('älteres lokales V1-Profil ohne Mobilitätsfeld erhält beim Speichern den kompatiblen Standardwert', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => {
    localStorage.setItem('babyweather.v1.profile', JSON.stringify({
      profileId: 'legacy_profile',
      displayName: 'Baby',
      birthDate: '2026-01-24',
      warmthBias: 'neutral',
      styleTheme: 'neutral',
      defaultMode: 'stroller',
      createdAt: '2026-01-24T08:00:00.000Z',
      updatedAt: '2026-08-28T10:00:00.000Z'
    }));
  });
  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  await page.locator('[data-open-dialog="profileDialog"]').click();
  await expect(page.locator('#profileDialog')).not.toContainText('Mobilität');
  await page.locator('#saveProfileButton').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.profile'))?.mobilityStage)).toBe('low_mobility');
});
