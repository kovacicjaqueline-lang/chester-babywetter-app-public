import { test, expect } from '@playwright/test';

test('Kleiderschrank lässt sich lokal anlegen, bearbeiten und nach Reload weiterverwenden', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.getByRole('button', { name: /Kleidungskatalog/ }).first().click();
  await expect(page.locator('#catalogDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#wardrobeNewItemId option[value="sleep_bag_1_0"]')).toHaveCount(0);

  await page.locator('#wardrobeNewItemId').selectOption('light_transition_jacket');
  await page.locator('#wardrobeAddForm [name="label"]').fill('Leichte Jacke');
  await page.locator('#wardrobeAddForm [name="sizeLabel"]').fill('68');
  await page.locator('#wardrobeAddForm [name="fitStatus"]').selectOption('fits');
  await page.locator('#wardrobeAddForm [name="availability"]').selectOption('available');
  await page.locator('#wardrobeAddForm [name="condition"]').selectOption('clean');
  await page.locator('#wardrobeAddForm [name="warmthLevel"]').selectOption('light');
  await page.locator('#wardrobeAddForm [name="windProtection"]').selectOption('partial');
  await page.locator('#wardrobeAddForm [name="waterProtection"]').selectOption('none');
  await page.locator('#wardrobeAddForm button[type="submit"]').click();

  const entry = page.locator('#wardrobeList .wardrobe-item');
  await expect(entry).toHaveCount(1);
  await expect(entry.locator('.wardrobe-item-heading strong')).toHaveText('Leichte Jacke');
  await expect(page.locator('#wardrobeEmpty')).toBeHidden();
  await expect(page.locator('#outfitGrid .wardrobe-gap').first()).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Kleidungskatalog/ }).first().click();
  await expect(page.locator('#wardrobeList .wardrobe-item')).toHaveCount(1);
  await expect(page.locator('#wardrobeList .wardrobe-item-heading strong')).toHaveText('Leichte Jacke');

  await page.locator('#wardrobeList [data-wardrobe-edit] [name="warmthLevel"]').selectOption('medium');
  await page.locator('#wardrobeList [data-wardrobe-edit] button[type="submit"]').click();
  await expect(page.locator('#wardrobeList [data-wardrobe-edit] [name="warmthLevel"]')).toHaveValue('medium');
  await page.locator('#wardrobeList [data-remove-wardrobe]').click();
  await expect(page.locator('#wardrobeList .wardrobe-item')).toHaveCount(0);
  await expect(page.locator('#wardrobeEmpty')).toBeVisible();
});
