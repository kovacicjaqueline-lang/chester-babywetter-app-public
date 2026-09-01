import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toBeVisible();
  await expect(page.locator('#dayTripPlannerButton')).toBeVisible();
  await expect(page.locator('#changeLookButton')).toBeEnabled();
}

async function openPlanner(page) {
  await page.locator('#dayTripPlannerButton').click();
  await expect(page.locator('#dayTripDialog')).toBeVisible();
  await expect(page.locator('#tripStartTime')).toBeVisible();
  await expect(page.locator('#tripEndTime')).toBeVisible();
}

async function chooseFullForecastWindow(page, { moveStartForward = false } = {}) {
  const startValues = await page.locator('#tripStartTime option').evaluateAll((options) => options.map((option) => option.value));
  const endValues = await page.locator('#tripEndTime option').evaluateAll((options) => options.map((option) => option.value));
  expect(startValues.length).toBeGreaterThan(1);
  expect(endValues.length).toBeGreaterThan(1);
  if (moveStartForward) await page.locator('#tripStartTime').selectOption(startValues[1]);
  const refreshedEndValues = await page.locator('#tripEndTime option').evaluateAll((options) => options.map((option) => option.value));
  await page.locator('#tripEndTime').selectOption(refreshedEndValues.at(-1));
}

test('Tagesausflug lässt Zeitraum und Segment wählen und zeigt Start-Outfit, Packliste und relevante Wechsel', async ({ page }) => {
  await openDemo(page);
  await openPlanner(page);
  await chooseFullForecastWindow(page, { moveStartForward: true });

  await page.locator('#tripAddSegmentButton').click();
  await expect(page.locator('[data-trip-segment-id]').filter({ has: page.locator('.trip-segment-top') })).toHaveCount(2);
  const secondSegment = page.locator('.trip-segment-card').nth(1);
  await secondSegment.locator('[data-trip-segment-mode="carrier"]').click();
  await expect(page.locator('.trip-segment-card').nth(1).locator('[data-trip-segment-mode="carrier"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#tripGenerateButton').click();
  await expect(page.locator('#tripResultView')).toBeVisible();
  await expect(page.getByTestId('trip-start-outfit').locator('[data-trip-item-id]').first()).toBeVisible();
  await expect(page.getByTestId('trip-start-outfit').locator('img').first()).toBeVisible();
  expect(await page.getByTestId('trip-pack-list').locator('[data-trip-pack-item]').count()).toBeGreaterThan(0);
  expect(await page.getByTestId('trip-timeline').locator('[data-trip-action]').count()).toBeGreaterThan(0);
  await expect(page.getByTestId('trip-timeline')).toContainText('Regenverdeck');
});

test('Planner übernimmt Kinderwagen-Zustand vollständig und lässt Details touchfreundlich ändern', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  await openPlanner(page);

  const firstSegment = page.locator('.trip-segment-card').first();
  await firstSegment.locator('summary').click();
  const veryActive = firstSegment.locator('[data-trip-context-choice="strollerBehavior"][data-trip-context-value="very_active"]');
  await veryActive.click();
  await page.locator('.trip-segment-card').first().locator('summary').click();
  await expect(page.locator('.trip-segment-card').first().locator('[data-trip-context-choice="strollerBehavior"][data-trip-context-value="very_active"]')).toHaveAttribute('aria-pressed', 'true');

  const controls = page.locator('#dayTripDialog button:visible, #dayTripDialog select:visible');
  const heights = await controls.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
  const sheetMetrics = await page.locator('.trip-sheet').evaluate((node) => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
  expect(sheetMetrics.scrollWidth).toBeLessThanOrEqual(sheetMetrics.clientWidth + 1);
});

test('Autositz-Segment hält Gurt-Safety und geschätzte Innenraumtemperatur sichtbar', async ({ page }) => {
  await openDemo(page);
  await openPlanner(page);
  await chooseFullForecastWindow(page);

  await page.locator('#tripAddSegmentButton').click();
  const carSegment = page.locator('.trip-segment-card').nth(1);
  await carSegment.locator('[data-trip-segment-mode="car"]').click();
  await expect(page.locator('.trip-segment-card').nth(1).locator('.trip-inline-safety')).toContainText('keine voluminöse Jacke');

  await page.locator('#tripGenerateButton').click();
  await expect(page.locator('#tripResultView')).toBeVisible();
  await expect(page.locator('[data-trip-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toBeVisible();
  await expect(page.locator('[data-trip-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toContainText('keine dicken Schichten');
  await expect(page.locator('[data-trip-notice-code="CAR_CABIN_TEMPERATURE_ESTIMATED"]')).toBeVisible();
  expect(await page.locator('[data-trip-action][data-safety-critical="true"]').count()).toBeGreaterThan(0);
});

test('Tagesausflug verändert die normale Einzelzeit-Auswahl nicht', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const future = page.locator('#hourlyForecast [data-hourly-start-time]').first();
  const selectedTime = await future.getAttribute('data-hourly-start-time');
  await future.click();
  await expect(page.locator(`#hourlyForecast [data-hourly-start-time="${selectedTime}"]`)).toHaveAttribute('aria-pressed', 'true');
  const beforeLabel = await page.locator('#outfitTimeLabel').textContent();

  await openPlanner(page);
  await page.locator('#dayTripCloseButton').click();
  await expect(page.locator('#dayTripDialog')).not.toBeVisible();
  await expect(page.locator(`#hourlyForecast [data-hourly-start-time="${selectedTime}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#outfitTimeLabel')).toHaveText(beforeLabel ?? '');
});
