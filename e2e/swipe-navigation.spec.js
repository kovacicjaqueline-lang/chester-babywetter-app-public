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

test('Outfit-Überschrift reagiert auf Wischgeste, Kleidungs-Carousel bleibt horizontal bedienbar', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('[data-warmth="balanced"]')).toHaveAttribute('aria-pressed', 'true');

  await swipe(page, '.outfit-card > .section-heading', { y: 18 });
  await expect(page.locator('[data-warmth="warmer"]')).toHaveAttribute('aria-pressed', 'true');

  await swipe(page, '.outfit-card > .section-heading', { fromX: 80, toX: 280, y: 18 });
  await expect(page.locator('[data-warmth="cooler"]')).toHaveAttribute('aria-pressed', 'true');

  const touchActions = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.outfit-card')).touchAction,
    heading: getComputedStyle(document.querySelector('.outfit-card > .section-heading')).touchAction,
    grid: getComputedStyle(document.querySelector('#outfitGrid')).touchAction
  }));
  expect(touchActions.card).toBe('auto');
  expect(touchActions.heading).toBe('pan-y');
  expect(touchActions.grid).toBe('pan-x');

  const scrollable = await page.locator('#outfitGrid').evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(scrollable).toBe(true);
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
