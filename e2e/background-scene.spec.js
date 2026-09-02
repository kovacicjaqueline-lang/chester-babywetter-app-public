import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-scene-weather', 'partlyCloudy');
}

test('dynamic background follows the selected displayed weather hour', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-scene-time', /^(morning|day|evening|night)$/);
  await expect(body).toHaveAttribute('data-scene-source', 'current');
  const beforeTime = await body.getAttribute('data-scene-point-time');

  const rainChoice = page.getByRole('button', { name: /Regen 70%/ }).first();
  await expect(rainChoice).toBeVisible();
  const selectedTime = await rainChoice.getAttribute('data-hourly-start-time');
  expect(selectedTime).toBeTruthy();
  await rainChoice.click();

  await expect(rainChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(body).toHaveAttribute('data-scene-weather', 'rain');
  await expect(body).toHaveAttribute('data-scene-source', 'selected');
  await expect(body).toHaveAttribute('data-scene-point-time', selectedTime);
  expect(selectedTime).not.toBe(beforeTime);
  await expect(page.locator('#outfitTimeLabel')).toContainText('Für ');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(noHorizontalOverflow).toBe(true);
});
