import { test, expect } from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=1');
  await expect(page.locator('#confidencePill')).not.toHaveText('Lädt …');
  await expect(page.locator('#outfitGrid .clothing-card').first()).toBeVisible();
}

test('Outfit-Karten zeigen mobil Name und kompakte, untergeordnete Beschreibung', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDemo(page);
  const cards = page.locator('#outfitGrid .clothing-card[data-item-id]');
  expect(await cards.count()).toBeGreaterThan(1);
  for (const card of await cards.all()) {
    await expect(card.locator('.clothing-name')).not.toBeEmpty();
    await expect(card.locator('.clothing-description')).not.toBeEmpty();
    const typography = await card.evaluate((element) => {
      const name = getComputedStyle(element.querySelector('.clothing-name'));
      const description = getComputedStyle(element.querySelector('.clothing-description'));
      return {
        nameSize: Number.parseFloat(name.fontSize),
        descriptionSize: Number.parseFloat(description.fontSize),
        descriptionColor: description.color,
        nameColor: name.color,
        descriptionWidth: element.querySelector('.clothing-description').getBoundingClientRect().width,
        cardWidth: element.getBoundingClientRect().width
      };
    });
    expect(typography.descriptionSize).toBeLessThan(typography.nameSize);
    expect(typography.descriptionColor).not.toBe(typography.nameColor);
    expect(typography.descriptionWidth).toBeLessThanOrEqual(typography.cardWidth + 1);
  }
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
