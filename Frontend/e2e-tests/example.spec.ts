import { test, expect } from '@playwright/test';

test('base-test', async ({ page }) => {
  await page.goto('http://localhost:8081');
  await page.getByRole('heading', { name: 'Willkommen bei AudiTim' }).click();
  await page.getByRole('link', { name: '⚙️ Admin' }).click();
  await page.getByText('Online').first().click();
  await page.getByText('Online').nth(2).click();
  await page.getByText('Online').nth(1).click();
  await page.getByText('Verbunden', { exact: true }).click();
  await page.getByRole('link', { name: '🛰️ 2D Sensoren' }).click();
  await page.getByText('Daten verfügbar von 29.08.').click();
  await page.getByRole('link', { name: '📊 Heatmap' }).click();
  await page.getByText('Daten verfügbar von 29.08.').click();
  await page.getByRole('link', { name: '📍 Peekmap' }).click();
  await page.getByText('Daten verfügbar von 29.08.').click();
  await page.getByRole('link', { name: '📚 Dokumentation' }).click();
  await page.locator('canvas').first().click();
  await page.getByRole('link', { name: '🌐 Homepage' }).click();
});

test('heatmap-test', async ({ page }) => {
  await page.goto('http://localhost:8081');
  await page.getByRole('link', { name: 'Zur Heatmap' }).click();
  await page.getByRole('button', { name: 'Live Mode' }).click();
  await page.locator('canvas').click({
    position: {
      x: 261,
      y: 65
    }
  });
});

test('peekmap-test', async ({ page }) => {
  await page.goto('http://localhost:8081/homepage');
  await page.getByRole('link', { name: '📍 Peekmap' }).click();
  await page.getByRole('button', { name: 'Live Mode' }).click();
  await page.locator('.nsewdrag').click();
});

test('zeid-test', async ({ page }) => {
  await page.goto('http://localhost:8081/homepage');
  await page.getByRole('link', { name: '🛰️ 2D Sensoren' }).click();
  await page.getByRole('button', { name: 'Live Mode' }).click();
  await page.locator('canvas').click({
    position: {
      x: 383,
      y: 368
    }
  });
});
