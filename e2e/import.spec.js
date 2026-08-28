import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.locator('[data-open-dialog="settingsDialog"]').first().click();
}

function validEnvelope(overrides = {}) {
  return {
    schemaVersion: 1,
    exportedAt: '2026-08-27T10:00:00.000Z',
    appVersion: '0.2.0',
    payload: {
      profile: {
        profileId: 'baby_import', displayName: 'Import Baby', birthDate: '2026-01-24',
        warmthBias: 'neutral', styleTheme: 'boy', defaultMode: 'outdoor',
        createdAt: '2026-01-24T08:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z',
        injected: 'must-not-persist',
        ...overrides.profile
      },
      settings: {
        defaultMode: 'outdoor', temperatureUnit: 'celsius', weatherMode: 'auto_with_override',
        allowLocation: null, weatherCacheMaxAgeMinutes: null,
        injected: 'must-not-persist',
        ...overrides.settings
      },
      feedback: []
    }
  };
}

async function uploadJson(page, value) {
  await page.locator('#importSettingsInput').setInputFiles({
    name: 'babywetter.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(value))
  });
}

test('gültiger Import wird vollständig validiert und unbekannte Felder werden nicht persistiert', async ({ page }) => {
  await openDemo(page);
  await uploadJson(page, validEnvelope());
  await expect(page.locator('#toast')).toContainText('Einstellungen importiert');
  await expect(page.locator('body')).toHaveAttribute('data-style-theme', 'boy');
  await expect(page.locator('#situationLabel')).toHaveText('Draußen');

  const stored = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem('babyweather.v1.profile')),
    settings: JSON.parse(localStorage.getItem('babyweather.v1.settings'))
  }));
  expect(stored.profile.displayName).toBe('Import Baby');
  expect(stored.profile.injected).toBeUndefined();
  expect(stored.settings.injected).toBeUndefined();
  expect(stored.settings.weatherMode).toBe('auto_with_override');
  expect(stored.settings.weatherCacheMaxAgeMinutes).toBe(120);
});

test('Import ohne Profil behält das lokale Profil und übernimmt validierte Einstellungen', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-close-dialog="settingsDialog"]').click();
  await page.locator('[data-open-dialog="profileDialog"]').first().click();
  await page.locator('#profileName').fill('Bestehendes Baby');
  await page.locator('#profileBirthDate').fill('2026-01-24');
  await page.locator('input[name="warmthBias"][value="runs_warm"]').check();
  await page.locator('#saveProfileButton').click();
  await expect(page.locator('#profileDialog')).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('babyweather.v1.profile'))).not.toBeNull();

  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.profile')));
  await page.locator('[data-open-dialog="settingsDialog"]').first().click();
  const envelope = validEnvelope();
  envelope.payload.profile = null;
  await uploadJson(page, envelope);
  await expect(page.locator('#toast')).toContainText('Einstellungen importiert');
  await expect(page.locator('#situationLabel')).toHaveText('Draußen');

  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('babyweather.v1.profile')));
  expect(after.profileId).toBe(before.profileId);
  expect(after.displayName).toBe('Bestehendes Baby');
  expect(after.birthDate).toBe('2026-01-24');
  expect(after.warmthBias).toBe('runs_warm');
  expect(after.styleTheme).toBe(before.styleTheme);
  expect(after.defaultMode).toBe('outdoor');
});

test('ungültiger Import überschreibt lokale Daten nicht teilweise', async ({ page }) => {
  await openDemo(page);
  const before = await page.evaluate(() => ({
    profile: localStorage.getItem('babyweather.v1.profile'),
    settings: localStorage.getItem('babyweather.v1.settings'),
    ui: localStorage.getItem('babyweather.v1.uiState')
  }));

  const invalid = validEnvelope({ profile: { styleTheme: 'pink' } });
  await uploadJson(page, invalid);
  await expect(page.locator('#toast')).toContainText('konnte nicht importiert werden');

  const after = await page.evaluate(() => ({
    profile: localStorage.getItem('babyweather.v1.profile'),
    settings: localStorage.getItem('babyweather.v1.settings'),
    ui: localStorage.getItem('babyweather.v1.uiState')
  }));
  expect(after).toEqual(before);
});
