import { test, expect } from '@playwright/test';

test('base-test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Willkommen bei AudiTim' }).click();
  await page.getByRole('link', { name: '⚙️ Admin' }).click();
  // // alle Online-Status prüfen (Geht nur lokal aufgrund der Struktur der API um Online fest zu stellen)
  // const onlineTexts = page.getByText('Online');
  // await expect(onlineTexts).toHaveCount(3);
  // for (const online of await onlineTexts.all()) {
  //   await expect(online).toBeVisible();
  // }
  await page.getByRole('link', { name: '🛰️ 2D Sensoren' }).click();
  //await expect(page.getByText('Daten verfügbar', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: '📊 Heatmap' }).click();
  //await expect(page.getByText('Daten verfügbar', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: '📍 Peekmap' }).click();
  //await expect(page.getByText('Daten verfügbar', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: '📚 Dokumentation' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('link', { name: '🌐 Homepage' }).click();
});

test('heatmap-test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Zur Heatmap' }).click();
  await page.getByRole('button', { name: 'Live Mode' }).click();
  await expect(page.locator('#plotly-heatmap')).toBeVisible();
});

test('peekmap-test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '📍 Peekmap' }).click();
  await page.getByRole('button', { name: 'Live Mode' }).click();
  await expect(page.locator('.plot-wrapper')).toBeVisible();
});

test('zeid-test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '🛰️ 2D Sensoren' }).click();
  await page.getByRole('button', { name: 'Live Mode' }).click();
});

