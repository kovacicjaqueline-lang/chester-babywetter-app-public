import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#neckFeedbackStatus')).toBeHidden();
}

test('Nackentest bleibt mobil dezent; Rückmeldestatus erscheint erst nach Auswahl', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const neckCheck = page.getByTestId('neck-check');
  const status = page.locator('#neckFeedbackStatus');
  await expect(neckCheck).not.toContainText('Warm & trocken');
  await expect(status).toBeHidden();

  await page.getByRole('button', { name:'Nackentest anwenden' }).click();
  await page.locator('[data-neck-feedback="warm_dry"]').click();
  await expect(status).toContainText('Warm & trocken');

  const [buttonBox, statusBox] = await Promise.all([
    neckCheck.getByRole('button', { name:'Nackentest anwenden' }).boundingBox(),
    status.boundingBox()
  ]);
  expect(buttonBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  expect(statusBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height - 0.5);
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

test('Outfit-Karte zeigt die Kernaufgabe und blendet dauerhaften Kinderwagenhinweis aus', async ({ page }) => {
  await openDemo(page);

  await expect(page.locator('#outfitHeading')).toHaveText('Jetzt anziehen');
  await expect(page.locator('#outfitCard')).toHaveAttribute('aria-labelledby', 'outfitHeading');

  const airflowNotice = page.locator('[data-notice-code="STROLLER_DO_NOT_COVER_AIRFLOW"]');
  await expect(airflowNotice).toHaveCount(1);
  await expect(airflowNotice).not.toBeVisible();

  await page.locator('[data-open-dialog="helpDialog"]').click();
  await expect(page.locator('#helpDialog')).toBeVisible();
  await expect(page.locator('#helpDialog')).toContainText('Wagen nicht luftstromhemmend abdecken');
});
