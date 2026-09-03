import { test, expect } from '@playwright/test';

const UI_STATE_KEY = 'babyweather.v1.uiState';

test('new stroller context defaults sun exposure and wind protection to unknown', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog')).toBeVisible();
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
  await expect(page.locator('#situationDialog [data-context-field="sunExposure"]')).toHaveValue('unknown');
  await expect(page.locator('#situationDialog [data-context-field="windProtection"]')).toHaveValue('unknown');
});

test('legacy implicit shade and partial wind defaults migrate once while later explicit choices persist', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.evaluate(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      mode:'stroller',
      visualSeed:0,
      contexts:{
        outdoor:{ mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' },
        stroller:{ mode:'stroller', plannedMinutes:60, strollerState:'awake', activity:'normal', activitySource:'user', sunExposure:'shade', windProtection:'partial' },
        carrier:{ mode:'carrier', plannedMinutes:60, sunExposure:'shade', placement:'over_wearer_outerwear' }
      }
    }));
  }, { key:UI_STATE_KEY });
  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.locator('[data-open-dialog="situationDialog"]').first().click();

  const sun = page.locator('#situationDialog [data-context-field="sunExposure"]');
  const wind = page.locator('#situationDialog [data-context-field="windProtection"]');
  await expect(sun).toHaveValue('unknown');
  await expect(wind).toHaveValue('unknown');

  const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), UI_STATE_KEY);
  expect(migrated.uiStateVersion).toBe(2);
  expect(migrated.contexts.outdoor.sunExposure).toBe('unknown');
  expect(migrated.contexts.stroller.sunExposure).toBe('unknown');
  expect(migrated.contexts.stroller.windProtection).toBe('unknown');
  expect(migrated.contexts.carrier.sunExposure).toBe('unknown');

  await sun.selectOption('shade');
  await wind.selectOption('partial');
  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog [data-context-field="sunExposure"]')).toHaveValue('shade');
  await expect(page.locator('#situationDialog [data-context-field="windProtection"]')).toHaveValue('partial');

  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), UI_STATE_KEY);
  expect(persisted.uiStateVersion).toBe(2);
});
