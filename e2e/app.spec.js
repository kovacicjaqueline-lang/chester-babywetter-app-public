import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
}
async function chooseSituation(page, mode) {
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator(`[data-situation="${mode}"]`).click();
  await page.locator('#applySituationButton').click();
  await expect(page.locator('#situationLabel')).toHaveText({ outdoor:'Draußen', stroller:'Kinderwagen', carrier:'Trage', car:'Autositz', sleep:'Schlafen' }[mode]);
}
async function selectedIds(page) { return page.locator('#outfitGrid [data-item-id]').evaluateAll((nodes) => nodes.map((node) => node.dataset.itemId)); }

test('App startet ohne Console-Fehler und zeigt ein Standard-Outfit', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await openDemo(page);
  expect(await page.locator('#outfitGrid [data-item-id]').count()).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('Kinderwagen verändert die Empfehlung', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');
  const outdoor = await selectedIds(page);
  await chooseSituation(page, 'stroller');
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  await page.locator('#situationDialog [data-context-field="strollerState"]').selectOption('asleep');
  await page.locator('#applySituationButton').click();
  const stroller = await selectedIds(page);
  expect(stroller).not.toEqual(outdoor);
  await expect(page.locator('#outfitReason')).toContainText('Schlafen im Kinderwagen');
});

test('Trage berücksichtigt Körperwärme', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'outdoor');
  const outdoor = await selectedIds(page);
  await chooseSituation(page, 'carrier');
  const carrier = await selectedIds(page);
  expect(carrier).not.toEqual(outdoor);
  await expect(page.locator('#outfitReason')).toContainText('Körperkontakt');
});

test('Autositz zeigt Warnung vor dicker Kleidung', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'car');
  await expect(page.locator('[data-notice-code="CAR_SEAT_NO_BULKY_LAYERS"]')).toBeVisible();
  await expect(page.locator('#safetyNotice')).toContainText('keine dicke Kleidung');
});

test('Kleidung besitzt echte Bilder und sinnvolle Alt-Texte', async ({ page }) => {
  await openDemo(page);
  const images = page.locator('#outfitGrid img[data-clothing-image="true"]');
  expect(await images.count()).toBeGreaterThan(1);
  const checks = await images.evaluateAll((nodes) => nodes.map((image) => ({ alt:image.alt, complete:image.complete, naturalWidth:image.naturalWidth, src:image.currentSrc })));
  for (const item of checks) { expect(item.complete).toBe(true); expect(item.naturalWidth).toBeGreaterThan(0); expect(item.alt.trim().length).toBeGreaterThan(3); expect(item.src).toContain('/assets/clothing/'); }
});

test('Anderer Look ändert nur den Visual-Seed und nicht die fachlichen Items', async ({ page }) => {
  await openDemo(page);
  const beforeItems = await selectedIds(page);
  const beforeSeed = await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.uiState') || '{}').visualSeed ?? 0);
  await expect(page.locator('#changeLookButton')).toBeEnabled();
  await page.locator('#changeLookButton').click();
  const afterItems = await selectedIds(page);
  const afterSeed = await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.uiState') || '{}').visualSeed);
  expect(afterItems).toEqual(beforeItems);
  expect(afterSeed).toBe(beforeSeed + 1);
});

test('Standort kann gewechselt werden', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="locationDialog"]').first().click();
  await page.locator('#locationInput').fill('Wien');
  await page.locator('#saveLocationButton').click();
  await expect(page.locator('#locationLabel')).toContainText('Wien');
});

test('Offline-Zustand bleibt verständlich und verwendet Cache', async ({ page, context }) => {
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await expect(page.locator('#connectionBanner')).toBeVisible();
  await expect(page.locator('#connectionBanner')).toContainText('Offline');
  await expect(page.locator('#weatherDescription')).toContainText('gespeichert');
  await expect(page.locator('#outfitGrid [data-item-id]').first()).toBeVisible();
  await context.setOffline(false);
});

test('Einstellungen bleiben nach Reload erhalten', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-open-dialog="settingsDialog"]').first().click();
  await page.locator('input[name="styleTheme"][value="boy"]').check();
  await expect(page.locator('body')).toHaveAttribute('data-style-theme', 'boy');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-style-theme', 'boy');
  await page.locator('[data-open-dialog="settingsDialog"]').first().click();
  await expect(page.locator('input[name="styleTheme"][value="boy"]')).toBeChecked();
});

test('Layout funktioniert bei 375 x 812 und erzeugt Screenshot', async ({ page }, testInfo) => {
  await page.setViewportSize({ width:375, height:812 });
  await openDemo(page);
  const layout = await page.evaluate(() => { const outfit = document.querySelector('.outfit-card').getBoundingClientRect(); return { viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth, outfitLeft:outfit.left, outfitRight:outfit.right }; });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.outfitLeft).toBeGreaterThanOrEqual(0);
  expect(layout.outfitRight).toBeLessThanOrEqual(layout.viewport);
  const screenshotPath = testInfo.outputPath('mobile-375x812.jpg');
  await page.screenshot({ path:screenshotPath, type:'jpeg', quality:55, fullPage:false });
  console.log(`VISUAL_SCREENSHOT_BASE64:${readFileSync(screenshotPath).toString('base64')}`);
});

test('Kleidungsbilder werden nicht abgeschnitten', async ({ page }) => {
  await openDemo(page);
  const checks = await page.locator('#outfitGrid img[data-clothing-image="true"]').evaluateAll((nodes) => nodes.map((image) => { const style=getComputedStyle(image); const imageRect=image.getBoundingClientRect(); const shellRect=image.parentElement.getBoundingClientRect(); return { objectFit:style.objectFit, withinShell:imageRect.left>=shellRect.left-.5 && imageRect.right<=shellRect.right+.5 && imageRect.top>=shellRect.top-.5 && imageRect.bottom<=shellRect.bottom+.5 }; }));
  expect(checks.length).toBeGreaterThan(1);
  for (const item of checks) { expect(item.objectFit).toBe('contain'); expect(item.withinShell).toBe(true); }
});

test('Kleidungsbilder sind im Bildfeld korrekt zentriert', async ({ page }) => {
  await openDemo(page);
  const offsets = await page.locator('#outfitGrid img[data-clothing-image="true"]').evaluateAll((nodes) => nodes.map((image) => { const imageRect=image.getBoundingClientRect(); const shellRect=image.parentElement.getBoundingClientRect(); return { dx:Math.abs((imageRect.left+imageRect.width/2)-(shellRect.left+shellRect.width/2)), dy:Math.abs((imageRect.top+imageRect.height/2)-(shellRect.top+shellRect.height/2)), objectPosition:getComputedStyle(image).objectPosition }; }));
  for (const item of offsets) { expect(item.dx).toBeLessThanOrEqual(1); expect(item.dy).toBeLessThanOrEqual(1); expect(item.objectPosition).toContain('50%'); }
});

test('Schlafmodus verwendet Raumtemperatur', async ({ page }) => {
  await openDemo(page);
  await chooseSituation(page, 'sleep');
  const at185 = await selectedIds(page);
  await page.locator('[data-open-dialog="situationDialog"]').first().click();
  const room = page.locator('#situationDialog [data-context-field="roomTempC"]');
  await room.fill('24'); await room.blur(); await page.locator('#applySituationButton').click();
  const at24 = await selectedIds(page);
  expect(at24).not.toEqual(at185);
  await expect(page.locator('#outfitReason')).toContainText('24 °C Raumtemperatur');
  await expect(page.locator('[data-notice-code="SLEEP_USE_ROOM_TEMPERATURE"]')).toBeVisible();
});

test('Nackentest-Hinweis ist sichtbar', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByTestId('neck-check')).toBeVisible();
  await expect(page.getByTestId('neck-check')).toContainText('Warm & trocken');
  await expect(page.getByTestId('neck-check')).toContainText('Kalte Hände oder Füße');
});

test('thermisch andere Kleidungsalternative löst Neubewertung aus', async ({ page }) => {
  await openDemo(page);
  await page.locator('#outfitGrid [data-open-alternatives="true"]').first().click();
  await expect(page.locator('#alternativeDialog')).toBeVisible();
  const option = page.locator('[data-alternative-item-id]').first(); const itemId = await option.getAttribute('data-alternative-item-id'); await option.click();
  await expect(page.locator(`#outfitGrid [data-item-id="${itemId}"]`)).toBeVisible();
});
