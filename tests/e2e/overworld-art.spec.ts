import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { decodePng, cropPixels } from '../helpers/png';

test.setTimeout(120_000);
const output = 'artifacts/phase-b';
const gameState = (page: Page) => page.getByRole('status', { name: 'Game state' });
async function startWorld(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled();
  await page.getByRole('button', { name: 'PRESS START' }).click();
  for (let i = 0; i < 30; i++) {
    if ((await gameState(page).innerText()).includes('Flow OVERWORLD')) return;
    const reveal = page.getByRole('button', { name: 'Reveal dialogue' });
    if (await reveal.isVisible()) await reveal.click();
    const advance = page.getByRole('button', { name: 'Continue dialogue' });
    if (await advance.isVisible()) await advance.click();
    else await page.waitForTimeout(100);
  }
  await expect(gameState(page)).toContainText('Flow OVERWORLD');
}
async function walk(page: Page, key: string, target: string) {
  await page.keyboard.down(key);
  await expect(gameState(page)).toContainText(`movement ${target}`);
  await page.keyboard.up(key);
  await expect(gameState(page)).toContainText(`player tile ${target}`);
}

test('original world atlases load, show native silhouettes, and render at integer scales', async ({ browser }) => {
  fs.mkdirSync(output, { recursive: true });
  const metadata: object[] = [];
  const context = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.url().includes('/assets/world/') && !response.ok()) failures.push(response.url()); });
  await startWorld(page);
  const canvas = page.locator('canvas:not([data-bitmap])');
  await expect(canvas).toHaveAttribute('data-world-art', 'original-pokefolio');
  await expect(canvas).toHaveAttribute('data-frameplayer', 'player-right-idle');
  async function capture(filename: string, scale: number) {
    const frame = page.getByRole('region', { name: 'Game frame' });
    await expect(frame).toHaveAttribute('data-scale', String(scale));
    const box = (await frame.boundingBox())!;
    const screenshot = await page.screenshot({ path: `${output}/${filename}` });
    const image = decodePng(screenshot);
    metadata.push({ filename, viewport: page.viewportSize(), dpr: await page.evaluate(() => devicePixelRatio), integerScale: scale, native: { width: 240, height: 160 }, physicalScreenshot: { width: image.width, height: image.height }, gameFrame: box, state: await gameState(page).innerText() });
    if (await page.evaluate(() => devicePixelRatio) === 1) {
      const pixels = cropPixels(image, box.x, box.y, 240 * scale, 160 * scale);
      // Every native art pixel must expand into one uniform n×n physical block.
      let mismatches = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
        const origin = ((y * scale) * pixels.width + x * scale) * 4;
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          const i = ((y * scale + dy) * pixels.width + x * scale + dx) * 4;
          if ([0, 1, 2, 3].some(c => pixels.data[i + c] !== pixels.data[origin + c])) mismatches++;
        }
      }
      expect(mismatches, `${filename}: crisp native pixel blocks`).toBe(0);
    }
  }
  for (const scale of [1, 3, 4]) {
    await page.setViewportSize({ width: 240 * scale, height: 160 * scale });
    await capture(`overworld-west-${scale}x.png`, scale);
  }
  await walk(page, 'ArrowDown', '7,6'); await capture('player-down-4x.png', 4);
  await walk(page, 'ArrowLeft', '6,6'); await expect(canvas).toHaveAttribute('data-frameplayer', 'player-left-idle');
  await walk(page, 'ArrowUp', '6,5'); await expect(canvas).toHaveAttribute('data-frameplayer', 'player-up-idle');
  await walk(page, 'ArrowRight', '7,5');
  await walk(page, 'ArrowUp', '7,4');
  for (let x = 8; x <= 19; x++) await walk(page, 'ArrowRight', `${x},4`);
  await capture('overworld-home-challenger-4x.png', 4);
  await page.setViewportSize({ width: 720, height: 480 }); await capture('overworld-home-challenger-3x.png', 3);
  await page.setViewportSize({ width: 240, height: 160 }); await capture('overworld-home-challenger-1x.png', 1);
  await page.setViewportSize({ width: 1440, height: 900 }); await capture('overworld-largest-fit-desktop.png', 5);
  await page.setViewportSize({ width: 960, height: 640 });
  await walk(page, 'ArrowRight', '20,4'); await walk(page, 'ArrowRight', '21,4');
  await walk(page, 'ArrowDown', '21,5');
  await page.keyboard.down('ArrowRight');
  await expect(gameState(page)).toContainText('movement 22,5');
  await page.keyboard.up('ArrowRight');
  await expect(gameState(page)).toContainText('Map m1-interior-test');
  await expect(page.locator('[data-transition="door"]')).toHaveCount(0);
  await capture('interior-arrival-4x.png', 4);
  await page.keyboard.press('Backspace');
  await expect(gameState(page)).toContainText('Map m1-town');
  await expect(gameState(page)).toContainText('player tile 21,5');
  await expect(page.locator('[data-transition="door"]')).toHaveCount(0);
  expect(failures).toEqual([]);
  fs.writeFileSync(`${output}/captures.json`, JSON.stringify(metadata, null, 2));
  await context.close();
});
