import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function chooseSleep(page) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('[data-situation="sleep"]').click();
  await page.locator('#applySituationButton').click();
  await expect(page.locator('#situationLabel')).toHaveText('Schlafen');
}

test('Sleep-Safety warnt allgemein vor loser Bettware auch ohne Schlafsack', async ({ page }) => {
  await openDemo(page);
  await chooseSleep(page);

  const notice = page.locator('[data-notice-code="SLEEP_NO_LOOSE_BEDDING"]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Keine lose Bettware im Schlafbereich');
  await expect(notice).toContainText('auch wenn kein Schlafsack gewählt ist');
  await expect(page.locator('[data-notice-code="SLEEP_NO_LOOSE_BLANKET_OVER_BAG"]')).toHaveCount(0);

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  const room = page.locator('#situationDialog [data-context-field="roomTempC"]');
  await room.fill('28');
  await room.blur();
  await page.locator('#applySituationButton').click();

  await expect(page.locator('[data-notice-code="SLEEP_NO_LOOSE_BEDDING"]')).toBeVisible();
  await expect(page.locator('[data-notice-code="SLEEP_NO_LOOSE_BEDDING"]')).toContainText('auch wenn kein Schlafsack gewählt ist');
});
