import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#neckFeedbackStatus')).toContainText('Noch keine Rückmeldung');
}

test('Nackentest-Hinweis und Feedbackstatus überlappen mobil nicht', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const guidance = page.locator('[data-testid="neck-check"] p').filter({ hasText:'Warm & trocken' }).first();
  const status = page.locator('#neckFeedbackStatus');
  await expect(guidance).toBeVisible();
  await expect(status).toBeVisible();

  const [guidanceBox, statusBox] = await Promise.all([guidance.boundingBox(), status.boundingBox()]);
  expect(guidanceBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  expect(statusBox.y).toBeGreaterThanOrEqual(guidanceBox.y + guidanceBox.height - 0.5);
});

test('Outfit zeigt alle Teile ohne horizontales Scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const grid = page.locator('#outfitGrid');
  const cards = grid.locator('.clothing-card');
  await expect(grid).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);

  const layout = await grid.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.overflowX).not.toBe('auto');
  expect(layout.overflowX).not.toBe('scroll');

  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();
  for (const card of await cards.all()) {
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox.x).toBeGreaterThanOrEqual(gridBox.x - 0.5);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(gridBox.x + gridBox.width + 0.5);
  }
});
