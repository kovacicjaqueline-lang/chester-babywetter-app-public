import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid .clothing-card').first()).toBeVisible();
}

test('Outfit-Übersicht zeigt mobil nur Kleidungsname und Rolle', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);

  const cards = page.locator('#outfitGrid .clothing-card[data-item-id]');
  expect(await cards.count()).toBeGreaterThan(1);
  for (const card of await cards.all()) {
    await expect(card.locator('.clothing-name')).not.toBeEmpty();
    await expect(card.locator('.clothing-role')).not.toBeEmpty();
    await expect(card.locator('.clothing-description')).toHaveCount(0);
    const nameLayout = await card.locator('.clothing-name').evaluate((element) => ({
      overflowWrap: getComputedStyle(element).overflowWrap,
      hyphens: getComputedStyle(element).hyphens,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }));
    expect(nameLayout.overflowWrap).toBe('normal');
    expect(nameLayout.hyphens).toBe('auto');
    expect(nameLayout.scrollWidth).toBeLessThanOrEqual(nameLayout.clientWidth + 1);
  }

  const outfitNameFontSizes = await page.locator('#outfitGrid .clothing-name').evaluateAll((elements) => new Set(elements.map((element) => getComputedStyle(element).fontSize)).size);
  expect(outfitNameFontSizes).toBe(1);

  const addableName = page.locator('#outfitGrid .clothing-card-addable .clothing-name');
  const renderedAddableName = await addableName.evaluate((element) => element.textContent.replaceAll('\u00ad', ''));
  expect(renderedAddableName).toBe('Außenschicht hinzufügen');
  const wrapping = await addableName.evaluate((element) => ({
    overflowWrap: getComputedStyle(element).overflowWrap,
    wordBreak: getComputedStyle(element).wordBreak,
    whiteSpace: getComputedStyle(element).whiteSpace,
    width: element.getBoundingClientRect().width,
    scrollWidth: element.scrollWidth
  }));
  expect(wrapping.overflowWrap).toBe('normal');
  expect(wrapping.wordBreak).toBe('normal');
  expect(wrapping.whiteSpace).toBe('normal');
  expect(wrapping.scrollWidth).toBeLessThanOrEqual(wrapping.width + 1);
});

test('Alternativen zeigen Name, Beschreibung und Wärmebeziehung in dieser Reihenfolge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  const midCard = page.locator('#outfitGrid .clothing-card[data-slot="mid"][data-item-id="thin_sweater"]');
  await expect(midCard).toBeVisible();
  await midCard.click();

  const sweatshirt = page.locator('#alternativeOptions .alternative-option[data-alternative-item-id="sweatshirt"]');
  await expect(sweatshirt).toBeVisible();
  await expect(sweatshirt.locator('strong')).toHaveText('Sweatshirt');
  await expect(sweatshirt.locator('.alternative-description')).toHaveText('Pullover aus normalem Sweatstoff, nicht dick gefüttert oder stark angeraut.');
  await expect(sweatshirt.locator('.alternative-relation')).toHaveText('ähnlich warm');

  const positions = await sweatshirt.evaluate((element) => {
    const rect = (selector) => {
      const box = element.querySelector(selector).getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    };
    return { name: rect('strong'), description: rect('.alternative-description'), relation: rect('.alternative-relation') };
  });
  expect(positions.description.top).toBeGreaterThanOrEqual(positions.name.bottom - 0.5);
  expect(positions.relation.top).toBeGreaterThanOrEqual(positions.description.bottom - 0.5);
});
