import { expect, test, type Page } from '@playwright/test';

async function expectViewportGeometry(page: Page, width: number, height: number, scale: number) {
  await page.setViewportSize({ width, height });
  const frame = page.getByRole('region', { name: 'Game frame' });
  await expect.poll(async () => (await frame.boundingBox())?.width).toBe(240 * scale);
  const frameBox = await frame.boundingBox();
  const canvasBox = await page.locator('canvas:not([data-bitmap])').evaluate((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const worldBox = await page.getByRole('img', { name: 'Overworld scene' }).boundingBox();
  expect(frameBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(worldBox).not.toBeNull();
  expect(frameBox!.width).toBe(240 * scale);
  expect(frameBox!.height).toBe(160 * scale);
  expect(frameBox!.width / frameBox!.height).toBe(3 / 2);
  expect(worldBox!.x).toBe((width - 240 * scale) / 2);
  expect(worldBox!.y).toBe((height - 160 * scale) / 2);
  expect(canvasBox!.x).toBe(worldBox!.x);
  expect(canvasBox!.y).toBe(worldBox!.y);
  expect(canvasBox!.width).toBe(240 * scale);
  expect(canvasBox!.height).toBe(160 * scale);
  expect(worldBox!.width).toBe(240 * scale);
  expect(worldBox!.height).toBe(160 * scale);
  expect(await page.locator('canvas:not([data-bitmap])').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([240, 160]);
  expect(await page.locator('canvas:not([data-bitmap])').evaluate((canvas: HTMLCanvasElement) => getComputedStyle(canvas).imageRendering)).toBe('pixelated');
  expect(await page.getByRole('img', { name: 'Overworld scene' }).evaluate((node) => getComputedStyle(node).transform)).toBe('none');
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    vertical: document.documentElement.scrollHeight > window.innerHeight,
  }));
  expect(overflow).toEqual({ horizontal: false, vertical: false });

  const title = page.getByRole('main', { name: 'Game title' });
  if (await title.count()) expect(await title.boundingBox()).toEqual(frameBox);
}

test('desktop and small/mobile viewports use centered integer 3:2 scaling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main', { name: 'Game title' })).toBeVisible();

  await expectViewportGeometry(page, 1280, 720, 4);
  await expectViewportGeometry(page, 640, 360, 2);
  await expectViewportGeometry(page, 390, 844, 1);
  await expectViewportGeometry(page, 844, 390, 2);
});
