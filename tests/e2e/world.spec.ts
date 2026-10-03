import { expect, test } from '@playwright/test';

async function walkOneTile(page: import('@playwright/test').Page, key: string, from: string, tile: string) {
  const state = page.getByRole('region', { name: 'World controls' });
  await expect(state).toContainText(`Player tile: ${from}`);
  await page.keyboard.down(key);
  await expect(state).toContainText(`Movement: ${tile}`);
  await page.keyboard.up(key);
  await expect(state).toContainText(`Player tile: ${tile}`);
}

test('original overworld matches the fixed 240×160 logical screen at 1x, 2x, and 3x', async ({ page }) => {
  await page.goto('/dev/world');
  const viewport = page.getByRole('region', { name: 'World viewport' });
  const canvas = viewport.locator('canvas');
  await expect(canvas).toBeVisible();

  for (const scale of [1, 2, 3]) {
    await page.getByRole('button', { name: `${scale}x logical scale` }).click();
    await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(240 * scale);
    await expect.poll(async () => (await canvas.boundingBox())?.height).toBe(160 * scale);
  }
});

test('paused test room keeps a fixed pixel-render baseline', async ({ page }) => {
  await page.goto('/dev/world');
  await expect(page.getByRole('status')).toContainText('Map test-town');
  await page.getByRole('button', { name: 'Pause world' }).click();
  await expect(page.getByRole('button', { name: 'Resume world' })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'World viewport' }).locator('canvas')).toHaveScreenshot('paused-world-test-room.png');
});

test('world room supports walk, NPC Enter interaction, automatic doorway, interior return, and pause/resume', async ({ page }) => {
  await page.goto('/dev/world');
  const status = page.getByRole('status');
  const state = page.getByRole('region', { name: 'World controls' });
  await expect(page.locator('canvas:not([data-bitmap])')).toBeVisible();
  await expect(status).toContainText('Map test-town');
  await expect(state).toContainText('Player tile: 7,5');

  await walkOneTile(page, 'ArrowRight', '7,5', '8,5');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Talking to route-guide. Press Enter to continue.')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Talking to route-guide. Press Enter to continue.')).toHaveCount(0);

  await walkOneTile(page, 'ArrowLeft', '8,5', '7,5');
  await walkOneTile(page, 'ArrowDown', '7,5', '7,6');
  await walkOneTile(page, 'ArrowDown', '7,6', '7,7');
  for (let x = 7; x < 15; x += 1) await walkOneTile(page, 'ArrowRight', `${x},7`, `${x + 1},7`);
  await expect(state).toContainText('Room: east-room');
  await expect(page.locator('canvas:not([data-bitmap])')).toHaveAttribute('data-camera-room', 'east-room');
  for (let x = 15; x < 21; x += 1) await walkOneTile(page, 'ArrowRight', `${x},7`, `${x + 1},7`);
  await walkOneTile(page, 'ArrowUp', '21,7', '21,6');
  await walkOneTile(page, 'ArrowUp', '21,6', '21,5');
  await expect(page.locator('canvas:not([data-bitmap])')).toHaveAttribute('data-camera-room', 'east-room');
  await page.keyboard.down('ArrowRight');
  await expect(state).toContainText('Movement: 22,5');
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-transition="door"]'));
  await expect(status).toContainText('Map interior-test');
  await expect(state).toContainText('Map: interior-test');
  await expect(state).toContainText('Map stack: 1');
  await expect(state).toContainText('Transition: ready');

  await page.keyboard.press('Backspace');
  await expect(status).toContainText('Map test-town');
  await expect(state).toContainText('Player tile: 21,5');
  await expect(state).toContainText('Room: east-room');
  await expect(state).toContainText('Map stack: 0');

  await page.getByRole('button', { name: 'Pause world' }).click();
  await expect(page.getByRole('button', { name: 'Resume world' })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume world' }).click();
  await expect(page.getByRole('button', { name: 'Pause world' })).toBeEnabled();
  await expect(state).toContainText('Player tile: 21,5');
});

test('touch controls send the same movement and interaction intents to WorldSim', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();const cdp=await context.newCDPSession(page);
  await page.goto('/dev/world');
  const state = page.getByRole('region', { name: 'World controls' });
  const moveRight = page.getByRole('button', { name: 'Move right' });
  await expect(state).toContainText('Player tile: 7,5');
  const right=await moveRight.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:right!.x+right!.width/2,y:right!.y+right!.height/2}]});
  await expect(state).toContainText('Movement: 8,5');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(state).toContainText('Player tile: 8,5');
  const confirm = page.getByRole('button', { name: 'A confirm' });
  await confirm.tap();
  await expect(page.getByText('Talking to route-guide. Press Enter to continue.')).toBeVisible();
  await context.close();
});

test('non-world routes do not request the dynamically loaded Phaser module', async ({ page }) => {
  const scriptRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scriptRequests.push(request.url());
  });
  await page.goto('/dev/battle');
  await expect(page.getByRole('button', { name: 'Start battle' })).toBeVisible();
  await expect.poll(() => scriptRequests.length).toBeGreaterThan(0);
  expect(scriptRequests.some((url) => /phaser|worldscene/i.test(url))).toBe(false);
});
