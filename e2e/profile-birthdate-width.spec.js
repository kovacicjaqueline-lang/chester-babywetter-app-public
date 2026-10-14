import { test, expect } from '@playwright/test';

test('Geburtsdatum ist auf schmalen Displays so breit wie das Namensfeld', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: 'Babyprofil öffnen' }).click();
  await expect(page.locator('#profileBirthDate')).toBeVisible();

  for (const width of [320, 375, 414]) {
    await page.setViewportSize({ width, height: 812 });
    const bounds = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing element: ${selector}`);
        return element.getBoundingClientRect();
      };
      const name = rect('#profileName');
      const date = rect('#profileBirthDate');
      const sheet = rect('#profileDialog .sheet');
      return {
        nameLeft: name.left,
        nameRight: name.right,
        dateLeft: date.left,
        dateRight: date.right,
        sheetRight: sheet.right
      };
    });

    expect(Math.abs(bounds.dateLeft - bounds.nameLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.dateRight - bounds.nameRight)).toBeLessThanOrEqual(1);
    expect(bounds.dateRight).toBeLessThanOrEqual(bounds.sheetRight - 8);
  }
});
