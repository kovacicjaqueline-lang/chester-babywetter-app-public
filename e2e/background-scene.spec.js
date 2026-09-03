import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#hourlyForecast [data-hourly-choice="now"]')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-scene-weather', 'partlyCloudy');
}

async function captureEvidence(page, testInfo, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function expectNoHorizontalOverflow(page) {
  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(noHorizontalOverflow).toBe(true);
}

test('dynamic background follows the selected displayed weather hour and captures visual evidence', async ({ page }, testInfo) => {
  await openDemo(page);

  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-scene-time', /^(morning|day|evening|night)$/);
  await expect(body).toHaveAttribute('data-scene-source', 'current');
  const beforeTime = await body.getAttribute('data-scene-point-time');
  await expectNoHorizontalOverflow(page);
  await captureEvidence(page, testInfo, 'scene-01-current-partly-cloudy');

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
  await expectNoHorizontalOverflow(page);
  await captureEvidence(page, testInfo, 'scene-02-selected-rain');
});

test('representative weather and day-phase scenes remain visually inspectable', async ({ page }, testInfo) => {
  await openDemo(page);

  const body = page.locator('body');
  const scenes = [
    { name: 'scene-03-morning-clear', time: 'morning', weather: 'clear' },
    { name: 'scene-04-day-snow', time: 'day', weather: 'snow' },
    { name: 'scene-05-evening-cloudy', time: 'evening', weather: 'cloudy' },
    { name: 'scene-06-night-clear', time: 'night', weather: 'clear' },
    { name: 'scene-07-night-storm', time: 'night', weather: 'storm' }
  ];

  for (const scene of scenes) {
    await body.evaluate((element, nextScene) => {
      element.dataset.sceneTime = nextScene.time;
      element.dataset.sceneWeather = nextScene.weather;
      element.dataset.sceneSource = 'visual-evidence';
      delete element.dataset.scenePointTime;
    }, scene);

    await expect(body).toHaveAttribute('data-scene-time', scene.time);
    await expect(body).toHaveAttribute('data-scene-weather', scene.weather);
    await expectNoHorizontalOverflow(page);
    await captureEvidence(page, testInfo, scene.name);
  }
});
