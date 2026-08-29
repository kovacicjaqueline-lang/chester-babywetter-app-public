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
