import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function swipe(page, selector, { fromX = 280, toX = 80, y = 40 } = {}) {
  const target = page.locator(selector);
  await target.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: fromX, clientY: y, button: 0 });
  await target.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: toX, clientY: y, button: 0 });
}

test('Situation lässt sich auf der Startseite nach links und rechts wischen', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');

  await swipe(page, '.situation-strip');
  await expect(page.locator('#situationLabel')).toHaveText('Trage');

  await swipe(page, '.situation-strip', { fromX: 80, toX: 280 });
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
});

test('Outfit reagiert auf horizontale Wischgeste mit derselben Wärmeaktion wie die Buttons', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('[data-warmth="balanced"]')).toHaveAttribute('aria-pressed', 'true');

  await swipe(page, '.outfit-card', { y: 18 });
  await expect(page.locator('[data-warmth="warmer"]')).toHaveAttribute('aria-pressed', 'true');

  await swipe(page, '.outfit-card', { fromX: 80, toX: 280, y: 18 });
  await expect(page.locator('[data-warmth="cooler"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Bottom-Sheet kann über den Kopfbereich nach unten geschlossen werden', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="settingsDialog"]').first().click();
  await expect(page.locator('#settingsDialog')).toBeVisible();

  const header = page.locator('#settingsDialog .sheet-header');
  await header.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 20, button: 0 });
  await header.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 184, clientY: 130, button: 0 });
  await expect(page.locator('#settingsDialog')).not.toBeVisible();
});
