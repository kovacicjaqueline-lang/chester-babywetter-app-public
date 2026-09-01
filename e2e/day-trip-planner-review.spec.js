import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#dayTripPlannerButton')).toBeVisible();
}

async function openPlanner(page) {
  await page.locator('#dayTripPlannerButton').click();
  await expect(page.locator('#dayTripDialog')).toBeVisible();
  await expect(page.locator('#tripStartTime')).toBeVisible();
}

test('Tagesausflug verankert die sichtbare Jetzt-Auswahl am tatsächlichen Öffnungszeitpunkt statt am Wetterzeitstempel', async ({ page }) => {
  await openDemo(page);
  const beforeOpen = Date.now();
  await openPlanner(page);
  const afterOpen = Date.now();

  const first = page.locator('#tripStartTime option').first();
  const value = await first.getAttribute('value');
  await expect(first).toContainText('Jetzt');
  const startMs = Date.parse(value ?? '');

  expect(Number.isFinite(startMs)).toBe(true);
  expect(startMs).toBeGreaterThanOrEqual(beforeOpen - 1000);
  expect(startMs).toBeLessThanOrEqual(afterOpen + 1000);
});

test('Situationswechsel bleibt als neutraler Timeline-Marker sichtbar, unabhängig davon ob dabei Kleidung gewechselt werden muss', async ({ page }) => {
  await openDemo(page);
  await openPlanner(page);

  const endValues = await page.locator('#tripEndTime option').evaluateAll((options) => options.map((option) => option.value));
  await page.locator('#tripEndTime').selectOption(endValues.at(-1));
  await page.locator('#tripAddSegmentButton').click();

  const secondSegment = page.locator('.trip-segment-card').nth(1);
  await secondSegment.locator('[data-trip-segment-mode="outdoor"]').click();
  await page.locator('#tripGenerateButton').click();

  await expect(page.locator('#tripResultView')).toBeVisible();
  const marker = page.locator('[data-trip-segment-marker]').first();
  await expect(marker).toBeVisible();
  await expect(marker).toContainText('Situation: Draußen');
  await expect(marker.locator('.trip-action-meta')).not.toBeEmpty();
});
