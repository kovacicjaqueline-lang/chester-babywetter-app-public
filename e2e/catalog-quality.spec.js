import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await page.getByRole('button', { name: /Kleidungskatalog/ }).first().click();
  await expect(page.locator('#catalogDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#catalogGrid .clothing-card').first()).toBeVisible();
}

test('Katalog begrenzt alte Bildassets auf eine sinnvolle Darstellungsgröße', async ({ page }) => {
  await openCatalog(page);
  const widths = await page.locator('#catalogGrid .clothing-image-shell').evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().width)
  );
  expect(widths.length).toBeGreaterThan(20);
  expect(Math.max(...widths)).toBeLessThanOrEqual(120.5);
});

test('Katalog verwendet vorhandene hochwertige Visual-Varianten und lesbare Rollen', async ({ page }) => {
  await openCatalog(page);

  const leggings = page.locator('#catalogGrid [data-item-id="leggings"]');
  const leggingsImage = leggings.locator('img[data-clothing-image="true"]');
  await expect(leggingsImage).toHaveAttribute('src', /leggings\/sage-rib-01\.webp$/);
  expect(await leggingsImage.evaluate((image) => image.naturalWidth)).toBeGreaterThanOrEqual(256);

  await expect(page.locator('#catalogGrid [data-item-id="short_sleeve_bodysuit"] .clothing-role')).toHaveText('Basisschicht');
  await expect(page.locator('#catalogGrid')).not.toContainText('base_torso');
  await expect(page.locator('#catalogGrid')).not.toContainText('legs');
});

test('häufige Mädchen-Outfitbilder haben Retina-taugliche Auflösung', async ({ page }) => {
  await page.goto('/?demo=1');
  const paths = [
    '/assets/clothing/short_sleeve_bodysuit/girl.webp',
    '/assets/clothing/light_trousers/girl.webp',
    '/assets/clothing/socks/girl.webp',
    '/assets/clothing/softshell_jacket/girl.webp'
  ];
  const dimensions = await page.evaluate(async (urls) => Promise.all(urls.map((src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ src, width:image.naturalWidth, height:image.naturalHeight });
    image.onerror = () => reject(new Error(`image failed: ${src}`));
    image.src = src;
  }))), paths);
  for (const image of dimensions) {
    expect(image.width, image.src).toBeGreaterThanOrEqual(256);
    expect(image.height, image.src).toBeGreaterThanOrEqual(256);
  }
});

test('Alternativen verwenden vorhandene hochwertige Visual-Varianten', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  await page.evaluate(async () => {
    const [{ ClothingAssetStore }, { renderAlternatives }] = await Promise.all([
      import('/ui/asset-store.js'),
      import('/ui/render.js')
    ]);
    const store = await new ClothingAssetStore().load();
    renderAlternatives({
      phase: 'main',
      slot: 'legs',
      selected: { itemId: 'light_trousers' },
      alternatives: [{ itemId: 'leggings', relation: 'equivalent', projectedChanges: [] }]
    }, store, 'neutral');
  });

  const image = page.locator('#alternativeOptions [data-alternative-item-id="leggings"] img[data-clothing-image="true"]');
  await expect(image).toHaveAttribute('src', /leggings\/sage-rib-01\.webp$/);
  await expect.poll(() => image.evaluate((node) => node.naturalWidth)).toBeGreaterThanOrEqual(256);
});

test('Alternative behält nach echter Auswahl dieselbe Visual-Variante', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');

  const outfitCard = page.locator('#outfitGrid [data-open-alternatives="true"]').first();
  await expect(outfitCard).toBeVisible();
  await outfitCard.click();
  await expect(page.locator('#alternativeDialog')).toHaveAttribute('open', '');

  const option = page.locator('#alternativeOptions [data-alternative-item-id]').first();
  await expect(option).toBeVisible();
  const itemId = await option.getAttribute('data-alternative-item-id');
  const slot = await option.getAttribute('data-alternative-slot');
  const phase = await option.getAttribute('data-alternative-phase');
  const previewImage = option.locator('img[data-clothing-image="true"]');
  await expect(previewImage).toBeVisible();
  const previewSrc = await previewImage.getAttribute('src');
  expect(itemId).toBeTruthy();
  expect(slot).toBeTruthy();
  expect(phase).toBeTruthy();
  expect(previewSrc).toBeTruthy();

  await option.click();
  await expect(page.locator('#alternativeDialog')).not.toHaveAttribute('open', '');

  const selectedCard = page.locator(`#outfitGrid [data-phase="${phase}"][data-slot="${slot}"][data-item-id="${itemId}"]`);
  await expect(selectedCard).toBeVisible();
  await expect(selectedCard.locator('img[data-clothing-image="true"]')).toHaveAttribute('src', previewSrc);
});
