import { test, expect } from '@playwright/test';

test('Hauptinhalt bleibt als Sprungziel fokussierbar ohne Struktur-Rand', async ({ page }) => {
  await page.goto('/?demo=1');

  const main = page.locator('#main');
  await expect(main).toHaveAttribute('tabindex', '-1');

  await main.focus();
  await expect(main).toBeFocused();

  const outlineStyle = await main.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outlineStyle).toBe('none');
});
