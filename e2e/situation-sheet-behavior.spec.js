import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}

async function openSituationSheet(page) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await expect(page.locator('#situationDialog')).toBeVisible();
}

test('Situation und Details werden erst mit Übernehmen committed', async ({ page }) => {
  await openDemo(page);
  const before = await page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));

  await openSituationSheet(page);
  await page.locator('[data-situation="indoor"]').click();
  await page.locator('[data-context-field="activity"]').selectOption('active');

  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
  const stillBefore = await page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId));
  expect(stillBefore).toEqual(before);
  await expect(page.locator('#situationDialog [data-situation="indoor"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#applySituationButton').click();
  await expect(page.locator('#situationDialog')).not.toBeVisible();
  await expect(page.locator('#situationLabel')).toHaveText('Drinnen');
  await expect(page.locator('#situationDialog')).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('babyweather.v1.uiState') || '{}');
    return stored.mode;
  })).toBe('indoor');
  await page.reload();
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#situationLabel')).toHaveText('Drinnen');
});

test('Schließen, Abbrechen und Escape verwerfen einen Situation-Draft und stellen den Fokus zurück', async ({ page }) => {
  await openDemo(page);
  const trigger = page.locator('[data-open-dialog="situationDialog"]').first();

  await trigger.click();
  await expect(page.locator('#situationDialog .sheet-header .icon-button')).toBeFocused();
  await page.locator('[data-situation="sleep"]').click();
  await page.locator('#situationDialog .sheet-header .icon-button').click();
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator('[data-situation="car"]').click();
  await page.locator('#cancelSituationButton').click();
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');

  await trigger.click();
  await page.locator('[data-situation="indoor"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#situationDialog')).not.toBeVisible();
  await expect(page.locator('#situationLabel')).toHaveText('Kinderwagen');
  await expect(trigger).toBeFocused();
});

test('Situation-Action-Leiste bleibt auf schmalem Viewport beim Scrollen erreichbar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openDemo(page);
  await openSituationSheet(page);
  await page.locator('[data-situation="car"]').click();

  const metrics = await page.locator('#situationSheetScroll').evaluate((scroll) => {
    scroll.scrollTop = scroll.scrollHeight;
    const action = document.querySelector('.situation-actions').getBoundingClientRect();
    const dialog = document.querySelector('#situationDialog').getBoundingClientRect();
    return { scrollable: scroll.scrollHeight > scroll.clientHeight, actionTop: action.top, actionBottom: action.bottom, dialogTop: dialog.top, dialogBottom: dialog.bottom };
  });

  expect(metrics.scrollable).toBe(true);
  expect(metrics.actionTop).toBeGreaterThanOrEqual(metrics.dialogTop);
  expect(metrics.actionBottom).toBeLessThanOrEqual(metrics.dialogBottom + 1);
  await expect(page.locator('#applySituationButton')).toBeVisible();
  await expect(page.locator('#cancelSituationButton')).toBeVisible();
});

test('Alle Situationen können im Draft gewählt und committed werden', async ({ page }) => {
  await openDemo(page);
  for (const [mode, label] of Object.entries({ outdoor:'Draußen', stroller:'Kinderwagen', carrier:'Trage', car:'Autositz', indoor:'Drinnen', sleep:'Schlafen' })) {
    await openSituationSheet(page);
    await page.locator(`[data-situation="${mode}"]`).click();
    await expect(page.locator(`#situationDialog [data-situation="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#applySituationButton').click();
    await expect(page.locator('#situationLabel')).toHaveText(label);
  }
});

test('Trage zeigt verständliche Radio-Auswahl und bewahrt beide Placement-Werte', async ({ page }) => {
  await openDemo(page);
  await openSituationSheet(page);
  await page.locator('[data-situation="carrier"]').click();

  await expect(page.locator('#situationContextFields legend')).toHaveText('Baby wird getragen …');
  await expect(page.locator('#situationContextFields')).not.toContainText('Position');
  const placement = page.locator('#situationContextFields input[type="radio"][data-context-field="placement"]');
  await expect(placement).toHaveCount(2);
  await expect(placement.nth(0)).toHaveAttribute('value', 'under_wearer_outerwear');
  await expect(placement.nth(1)).toHaveAttribute('value', 'over_wearer_outerwear');
  await expect(placement.nth(0)).toHaveAccessibleName('Unter meiner Jacke');
  await expect(placement.nth(1)).toHaveAccessibleName('Über meiner Jacke');
  await expect(placement.nth(1)).toBeChecked();
  await expect(placement.nth(0)).not.toBeChecked();

  await placement.nth(0).check();
  await expect(placement.nth(0)).toBeChecked();
  await expect(placement.nth(1)).not.toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(placement.nth(1)).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await expect(placement.nth(0)).toBeChecked();

  await page.locator('#applySituationButton').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.uiState') || '{}').contexts?.carrier?.placement)).toBe('under_wearer_outerwear');
});
