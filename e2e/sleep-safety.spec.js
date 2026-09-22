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

test('18 bis unter 20 Grad deckt die Arme ohne zusätzliches Wärmegewicht ab', async ({ page }) => {
  await openDemo(page);
  await chooseSleep(page);

  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  const room = page.locator('#situationDialog [data-context-field="roomTempC"]');
  await room.fill('19');
  await room.blur();
  await page.locator('#applySituationButton').click();

  await expect(page.locator('#outfitGrid [data-item-id="sleep_bag_1_5"]')).toBeVisible();
  await expect(page.locator('#outfitGrid [data-item-id="sleep_under_light_pajamas"]')).toBeVisible();
  await expect(page.locator('#outfitGrid [data-item-id="sleep_bag_2_5"]')).toHaveCount(0);
  await expect(page.locator('#outfitGrid [data-item-id="sleep_under_short_sleeve_bodysuit"]')).toHaveCount(0);
  await expect(page.getByTestId('neck-check')).toBeVisible();
});

test('kombinierte Schlaf-Unterkleidung wird visuell in Body und Schlafanzug aufgelöst', async ({ page }) => {
  await openDemo(page);
  await chooseSleep(page);

  const underlayer = page.locator('#outfitGrid [data-slot="sleep_underlayer"]').first();
  await expect(underlayer).toBeVisible();
  await underlayer.click();
  const option = page.locator('#alternativeOptions [data-alternative-item-id="sleep_under_short_body_plus_light_pajamas"]');
  await expect(option).toBeVisible();
  await expect(option.locator('img[data-clothing-image="true"]')).toHaveCount(2);
  await option.click();

  const cards = page.locator('#outfitGrid [data-slot="sleep_underlayer"]');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute('data-item-id', 'sleep_under_short_sleeve_bodysuit');
  await expect(cards.nth(1)).toHaveAttribute('data-item-id', 'sleep_under_light_pajamas');
  await expect(cards.nth(0).locator('img')).toHaveAttribute('alt', /Kurzarmbody/);
  await expect(cards.nth(1).locator('img')).toHaveAttribute('alt', /Schlafanzug/);
  await expect(page.locator('#outfitGrid [data-item-id="sleep_under_short_body_plus_light_pajamas"]')).toHaveCount(0);

  const beforeVisuals = await page.locator('#outfitGrid img[data-clothing-image="true"]').evaluateAll((images) => images.map((image) => image.currentSrc));
  await expect(page.locator('#changeLookButton')).toBeEnabled();
  await page.locator('#changeLookButton').click();
  await expect.poll(() => page.locator('#outfitGrid img[data-clothing-image="true"]').evaluateAll((images) => images.map((image) => image.currentSrc))).not.toEqual(beforeVisuals);
});
