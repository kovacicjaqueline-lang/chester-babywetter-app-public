import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.getByRole('button', { name: /Kleidungskatalog/ }).first().click();
  await expect(page.locator('#catalogDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#catalogGrid .clothing-card').first()).toBeVisible();
}

test('Katalog begrenzt alte Bildassets auf eine sinnvolle Darstellungsgröße', async ({ page }) => {
  await openCatalog(page);
  const widths = await page.locator('#catalogGrid .clothing-image-shell').evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().width)
  );
  expect(widths.length).toBeGreaterThan(20);
  expect(Math.max(...widths)).toBeLessThanOrEqual(120.5);
});

test('Katalog verwendet vorhandene hochwertige Visual-Varianten und lesbare Rollen', async ({ page }) => {
  await openCatalog(page);

  const leggings = page.locator('#catalogGrid [data-item-id="leggings"]');
  const leggingsImage = leggings.locator('img[data-clothing-image="true"]');
  await expect(leggingsImage).toHaveAttribute('src', /leggings\/sage-rib-01\.webp$/);
  expect(await leggingsImage.evaluate((image) => image.naturalWidth)).toBeGreaterThanOrEqual(256);

  await expect(page.locator('#catalogGrid [data-item-id="short_sleeve_bodysuit"] .clothing-role')).toHaveText('Basisschicht');
  await expect(page.locator('#catalogGrid')).not.toContainText('base_torso');
  await expect(page.locator('#catalogGrid')).not.toContainText('legs');
});
