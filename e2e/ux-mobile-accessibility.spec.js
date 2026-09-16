import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 520, height: 900 },
  { width: 800, height: 900 }
];

async function openDemo(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function visibleMeasurements(page, selectors) {
  return page.evaluate((requestedSelectors) => requestedSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).display !== 'none';
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selector,
        label: element.getAttribute('aria-label') || element.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
        width: rect.width,
        height: rect.height
      };
    })) , selectors);
}

function expectTouchTargets(measurements, minimum = 44) {
  expect(measurements.length).toBeGreaterThan(0);
  for (const measurement of measurements) {
    expect(measurement.width, `${measurement.selector} ${measurement.label}`).toBeGreaterThanOrEqual(minimum);
    expect(measurement.height, `${measurement.selector} ${measurement.label}`).toBeGreaterThanOrEqual(minimum);
  }
}

async function closeOpenDialog(page) {
  const openDialog = page.locator('dialog[open]');
  if (await openDialog.count()) {
    await page.keyboard.press('Escape');
    await expect(openDialog).toHaveCount(0);
  }
}

test('Häufige Hauptansicht-Aktionen haben robuste Touchflächen ohne horizontalen Überlauf', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await openDemo(page, viewport);
    const layout = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(layout.scrollWidth, `horizontaler Überlauf bei ${viewport.width}px`).toBeLessThanOrEqual(layout.viewport);

    const measurements = await visibleMeasurements(page, [
      '.location-button',
      '.topbar-actions .icon-button',
      '.weather-adjust-row .text-button',
      '.warmth-control button',
      '.situation-button',
      '.neck-action-button',
      '.quick-actions button',
      '#dayTripPlannerButton'
    ]);
    expectTouchTargets(measurements);
  }
});

test('Sheets und Tagesausflug behalten Touchflächen und fokussierbare Aktionen', async ({ page }) => {
  await openDemo(page, { width: 375, height: 812 });

  await page.locator('[data-open-dialog="weatherOverrideDialog"]').click();
  await expect(page.locator('#weatherOverrideDialog')).toBeVisible();
  expectTouchTargets(await visibleMeasurements(page, [
    '#weatherOverrideDialog .icon-button',
    '.temperature-stepper button',
    '.weather-choice-option',
    '#applyWeatherOverrideButton',
    '#resetWeatherOverrideButton'
  ]));
  await closeOpenDialog(page);

  await page.locator('.situation-button[data-open-dialog="situationDialog"]').click();
  await expect(page.locator('#situationDialog')).toBeVisible();
  expectTouchTargets(await visibleMeasurements(page, [
    '#situationDialog .icon-button',
    '.situation-option',
    '#cancelSituationButton',
    '#applySituationButton'
  ]));
  await page.locator('#situationOptions [data-situation="carrier"]').click();
  expectTouchTargets(await visibleMeasurements(page, [
    '.carrier-placement-option',
    '#situationContextFields [data-context-field="sunExposure"]'
  ]));
  await closeOpenDialog(page);

  await page.locator('[data-open-dialog="neckFeedbackDialog"]').click();
  await expect(page.locator('#neckFeedbackDialog')).toBeVisible();
  expectTouchTargets(await visibleMeasurements(page, [
    '#neckFeedbackDialog .icon-button',
    '.feedback-option'
  ]));
  await closeOpenDialog(page);

  await page.locator('#outfitGrid [data-open-alternatives="true"]').first().click();
  await expect(page.locator('#alternativeDialog')).toBeVisible();
  expectTouchTargets(await visibleMeasurements(page, [
    '#alternativeDialog .icon-button',
    '.alternative-option'
  ]));
  await closeOpenDialog(page);

  await page.locator('#dayTripPlannerButton').click();
  await expect(page.locator('#dayTripDialog')).toBeVisible();
  expectTouchTargets(await visibleMeasurements(page, [
    '#dayTripCloseButton',
    '#tripStartTime',
    '#tripEndTime',
    '#tripAddSegmentButton',
    '.trip-mode-button',
    '.trip-segment-details summary',
    '#tripGenerateButton'
  ]));
  await page.locator('#tripGenerateButton').click();
  await expect(page.locator('#tripResultView')).toBeVisible();
  expectTouchTargets(await visibleMeasurements(page, ['#tripEditButton', '#tripDoneButton']));
});

test('Relevante Labels bleiben auf Mobilgeräten lesbar', async ({ page }) => {
  await openDemo(page, { width: 375, height: 812 });
  const sizes = await page.evaluate(() => {
    const firstSize = (selector) => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
    const firstVisibleSize = (selector) => {
      const element = [...document.querySelectorAll(selector)].find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
    };
    return {
      outfitName: firstSize('.clothing-name'),
      warmthControl: firstSize('.warmth-control button'),
      weatherAdjust: firstSize('.weather-adjust-row .text-button'),
      neckHeading: firstSize('.neck-check h2'),
      outfitRole: firstSize('.clothing-role'),
      weatherFactLabel: firstVisibleSize('.weather-fact span'),
      neckDescription: firstSize('.neck-check > div:last-child > p:not(.fine-print)'),
      quickAction: firstSize('.quick-actions button'),
      hourMeta: firstVisibleSize('.hour-card small')
    };
  });

  expect(sizes.outfitName).toBeGreaterThanOrEqual(14);
  expect(sizes.warmthControl).toBeGreaterThanOrEqual(14);
  expect(sizes.weatherAdjust).toBeGreaterThanOrEqual(14);
  expect(sizes.neckHeading).toBeGreaterThanOrEqual(14);
  expect(sizes.quickAction).toBeGreaterThanOrEqual(14);
  for (const [name, size] of Object.entries(sizes)) {
    if (['outfitName', 'warmthControl', 'weatherAdjust', 'neckHeading', 'quickAction'].includes(name)) continue;
    if (size !== null) expect(size, name).toBeGreaterThanOrEqual(12);
  }
});

test('Tastaturfokus bleibt sichtbar und semantische Zustände bleiben erhalten', async ({ page }) => {
  await openDemo(page, { width: 390, height: 844 });
  await page.locator('#changeLookButton').focus();
  await expect(page.locator('#changeLookButton')).toBeFocused();
  await expect.poll(() => page.locator('#changeLookButton').evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');

  await page.locator('.situation-button[data-open-dialog="situationDialog"]').click();
  const selected = page.locator('#situationOptions [aria-pressed="true"]');
  await expect(selected).toHaveCount(1);
  await page.locator('#situationOptions [data-situation="carrier"]').click();
  await expect(page.locator('#situationOptions [data-situation="carrier"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#situationOptions [data-situation="stroller"]')).toHaveAttribute('aria-pressed', 'false');
});
