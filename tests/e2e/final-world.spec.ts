import { test, expect, type Page, type Browser } from '@playwright/test';
import fs from 'node:fs';
import { M1_TOWN_MAP_ID, WORLD_TEST_MAPS } from '../../src/content/maps';
import { collisionAt, BLOCKING_COLLISION_FLAGS, type Direction } from '../../src/domain/map';
import { decodePng, cropPixels } from '../helpers/png';

const output = 'artifacts/phase-9';
test.setTimeout(180_000);
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
const canvas = (page: Page) => page.locator('canvas[data-world-art]');
const map = WORLD_TEST_MAPS.get(M1_TOWN_MAP_ID)!;
const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' };
async function start(
  browser: Browser,
  viewport = { width: 960, height: 640 },
  dpr = 1,
  video = false,
) {
  fs.mkdirSync(output, { recursive: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    ...(video ? { recordVideo: { dir: `${output}/recording`, size: viewport } } : {}),
  });
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('uw.progress.v1'))
      sessionStorage.setItem(
        'uw.progress.v1',
        JSON.stringify({
          projectsVisited: [],
          battlesWon: 0,
          introSeen: true,
          firstEncounterDone: true,
        }),
      );
    localStorage.setItem(
      'uw.hints.v1',
      JSON.stringify({
        seenHowToPlay: true,
        seenBattleUI: true,
        seenFirstMove: true,
        seenFirstInteract: true,
        seenPokedex: true,
        seenTrainerCard: true,
      }),
    );
    Reflect.set(window, '__p9Keys', []);
    document.addEventListener('keydown', (event) =>
      (Reflect.get(window, '__p9Keys') as string[]).push(event.key),
    );
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.keyboard.press('Enter');
  await tick(page, 900);
  await expect(state(page)).toContainText('Flow OVERWORLD');
  return { page, context, errors };
}
async function tick(page: Page, ms = 450) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50)
    await page.clock.runFor(Math.min(50, ms - elapsed));
}
async function dismissDialogue(page: Page) {
  for (
    let attempt = 0;
    attempt < 20 && (await page.getByRole('button', { name: /dialogue/ }).count());
    attempt++
  ) {
    await page.keyboard.press('Enter');
    await tick(page, 50);
  }
  await expect(page.getByRole('button', { name: /dialogue/ })).toHaveCount(0);
}
async function move(page: Page, direction: Direction, target: string) {
  await page.keyboard.down(keys[direction]);
  await tick(page, 50);
  await expect(state(page)).toContainText(`movement ${target}`);
  await page.keyboard.up(keys[direction]);
  await tick(page, 400);
  await expect(state(page)).toContainText(`player tile ${target}`);
}
function route(from: { x: number; y: number }, target: { x: number; y: number }) {
  const queue = [{ ...from, steps: [] as Array<{ x: number; y: number; direction: Direction }> }];
  const visited = new Set([`${from.x},${from.y}`]);
  const routes = new Set(
    map.objects
      .filter((object) => object.type === 'npc')
      .flatMap((npc) => [{ x: npc.x, y: npc.y }, ...npc.route.points])
      .map((point) => `${point.x},${point.y}`),
  );
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]!;
    if (point.x === target.x && point.y === target.y) return point.steps;
    for (const [direction, dx, dy] of [
      ['up', 0, -1],
      ['right', 1, 0],
      ['down', 0, 1],
      ['left', -1, 0],
    ] as const) {
      const x = point.x + dx,
        y = point.y + dy,
        key = `${x},${y}`;
      if (visited.has(key) || collisionAt(map, x, y) & BLOCKING_COLLISION_FLAGS || routes.has(key))
        continue;
      visited.add(key);
      queue.push({ x, y, steps: [...point.steps, { x, y, direction }] });
    }
  }
  throw new Error(`No walking route to ${target.x},${target.y}`);
}
async function walkTo(page: Page, x: number, y: number) {
  const match = (await state(page).innerText()).match(/player tile (\d+),(\d+)/)!;
  for (const step of route({ x: Number(match[1]), y: Number(match[2]) }, { x, y }))
    await move(page, step.direction, `${step.x},${step.y}`);
}
async function capture(page: Page, filename: string, metadata: object[]) {
  const frame = page.getByRole('region', { name: 'Game frame' });
  const viewport = page.viewportSize()!;
  const dpr = await page.evaluate(() => devicePixelRatio);
  const expectedScale = Math.floor(Math.min(viewport.width * dpr / 240, viewport.height * dpr / 160));
  await expect.poll(async () => {
    await tick(page, 50);
    return frame.getAttribute('data-scale');
  }).toBe(String(expectedScale));
  await tick(page, 50);
  const scale = Number(await frame.getAttribute('data-scale'));
  const box = (await frame.boundingBox())!;
  const pixels = decodePng(await page.screenshot({ path: `${output}/${filename}` }));
  const viewportPixels = cropPixels(
    pixels,
    Math.round(box.x),
    Math.round(box.y),
    240 * scale,
    160 * scale,
  );
  let mismatches = 0;
  for (let y = 0; y < 160; y++)
    for (let x = 0; x < 240; x++) {
      const origin = (y * scale * viewportPixels.width + x * scale) * 4;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = ((y * scale + dy) * viewportPixels.width + x * scale + dx) * 4;
          if (
            [0, 1, 2, 3].some(
              (channel) =>
                viewportPixels.data[i + channel] !== viewportPixels.data[origin + channel],
            )
          )
            mismatches++;
        }
    }
  expect(mismatches, filename).toBe(0);
  metadata.push({
    filename,
    viewportCSS: page.viewportSize(),
    dpr: await page.evaluate(() => devicePixelRatio),
    integerScale: scale,
    native: '240x160',
    camera: await canvas(page).evaluate((node) => ({
      x: node.getAttribute('data-camera-x'),
      y: node.getAttribute('data-camera-y'),
    })),
    state: await state(page).innerText(),
    pixelBlockMismatches: mismatches,
  });
}

test('P9 continuous camera crosses the former boundary and renders the expanded world crisply', async ({
  browser,
}) => {
  const { page, context, errors } = await start(browser);
  const metadata: object[] = [],
    cameraSamples: object[] = [];
  for (const scale of [1, 3, 4]) {
    await page.setViewportSize({ width: 240 * scale, height: 160 * scale });
    await capture(page, `town-center-${scale}x.png`, metadata);
  }
  await move(page, 'up', '7,4');
  for (let x = 8; x <= 14; x++) await move(page, 'right', `${x},4`);
  await capture(page, 'boundary-before-4x.png', metadata);
  for (let x = 15; x <= 16; x++) {
    await page.keyboard.down('ArrowRight');
    for (let tickIndex = 0; tickIndex < 8; tickIndex++) {
      await tick(page, 50);
      if (tickIndex === 0) await page.keyboard.up('ArrowRight');
      cameraSamples.push(
        await canvas(page).evaluate((node) => ({
          x: Number(node.getAttribute('data-camera-x')),
          y: Number(node.getAttribute('data-camera-y')),
          room: node.getAttribute('data-camera-room'),
          transition: !!document.querySelector('[data-transition]'),
        })),
      );
    }
    await expect(state(page)).toContainText(`player tile ${x},4`);
    await capture(page, `boundary-${x}-4x.png`, metadata);
  }
  const samples = cameraSamples as Array<{ x: number; y: number; transition: boolean }>;
  for (let index = 1; index < samples.length; index++)
    expect(Math.abs(samples[index]!.x - samples[index - 1]!.x)).toBeLessThanOrEqual(2);
  expect(
    samples.every(
      (sample) => Number.isInteger(sample.x) && Number.isInteger(sample.y) && !sample.transition,
    ),
  ).toBe(true);
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(canvas(page)).toHaveAttribute('data-camera-room', 'east-room');
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, 'largest-fit-desktop-5x.png', metadata);
  await page.setViewportSize({ width: 960, height: 640 });
  await walkTo(page, 7, 18);
  await capture(page, 'grand-tree-green-4x.png', metadata);
  await walkTo(page, 12, 15);
  await capture(page, 'pond-workshop-4x.png', metadata);
  await walkTo(page, 30, 10);
  await capture(page, 'forest-grass-4x.png', metadata);
  await walkTo(page, 27, 18);
  await capture(page, 'cottage-neighbor-4x.png', metadata);
  // Actual rendered camera clamps, in addition to exhaustive pure-selector checks.
  for (const [x, y, cameraX, cameraY] of [
    [2, 1, 0, 0],
    [32, 1, 336, 0],
    [32, 20, 336, 192],
    [2, 17, 0, 192],
  ] as const) {
    await walkTo(page, x, y);
    await expect(canvas(page)).toHaveAttribute('data-camera-x', String(cameraX));
    await expect(canvas(page)).toHaveAttribute('data-camera-y', String(cameraY));
    await capture(page, `camera-edge-${cameraX}-${cameraY}-4x.png`, metadata);
  }
  expect(errors).toEqual([]);
  fs.writeFileSync(`${output}/captures.json`, JSON.stringify(metadata, null, 2));
  fs.writeFileSync(`${output}/boundary-camera-ticks.json`, JSON.stringify(cameraSamples, null, 2));
  await context.close();
});

test('P9 three automatic doors, exact return, flavor, discoveries and persistence', async ({
  browser,
}) => {
  const { page, context, errors } = await start(browser);
  const metadata: object[] = [];
  await move(page, 'right', '8,5');
  await page.keyboard.press('Enter');
  await tick(page, 100);
  await page.keyboard.press('Enter');
  await tick(page, 50);
  await expect(
    page.locator('[data-bitmap-text]').filter({ hasText: 'The paths loop around' }),
  ).toBeVisible();
  await capture(page, 'ordinary-npc-dialogue-4x.png', metadata);
  await dismissDialogue(page);
  await page.keyboard.press('Enter');
  await tick(page, 100);
  await page.keyboard.press('Enter');
  await tick(page, 50);
  await expect(
    page.locator('[data-bitmap-text]').filter({ hasText: 'The town is small.' }),
  ).toBeVisible();
  await page.keyboard.press('Backspace');
  await tick(page, 50);
  await expect(page.getByRole('button', { name: /dialogue/ })).toHaveCount(0);
  for (const [id, x, y, facing, target, doorway] of [
    ['home', 21, 5, 'right', 'm1-interior-test', '22,5'],
    ['workshop', 8, 15, 'up', 'm1-workshop', '8,14'],
    ['cottage', 26, 17, 'up', 'm1-cottage', '26,16'],
  ] as const) {
    await walkTo(page, x, y);
    await page.evaluate(() => {
      Reflect.set(window, '__p9Keys', []);
    });
    await page.keyboard.down(keys[facing]);
    await tick(page, 50);
    await expect(state(page)).toContainText(`movement ${doorway}`);
    await page.keyboard.up(keys[facing]);
    await tick(page, 1000);
    await expect(state(page)).toContainText(`Flow INTERIOR; runtime ready; Map ${target}`);
    await expect(state(page)).toContainText('player tile 7,7; facing up');
    const inputs = await page.evaluate(() => Reflect.get(window, '__p9Keys') as string[]);
    expect(inputs).toEqual([keys[facing]]);
    await capture(page, `${id}-interior-4x.png`, metadata);
    await page.keyboard.press('Backspace');
    await tick(page, 900);
    await expect(state(page)).toContainText(`Flow OVERWORLD; runtime ready; Map m1-town`);
    await expect(state(page)).toContainText(`player tile ${x},${y}; facing ${facing}`);
  }
  await walkTo(page, 7, 18);
  await page.keyboard.down('ArrowLeft');
  await tick(page, 50);
  await page.keyboard.up('ArrowLeft');
  await expect(state(page)).toContainText('player tile 7,18; facing left');
  await page.keyboard.press('Enter');
  await tick(page, 100);
  await expect(page.getByRole('button', { name: /dialogue/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await tick(page, 50);
  await capture(page, 'tree-secret-dialogue-4x.png', metadata);
  const stored = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('uw.progress.v1')!).discoveries,
  );
  expect(stored).toEqual(['grand-tree-note']);
  await page.keyboard.press('x');
  await page.keyboard.press('y');
  await tick(page, 100);
  await expect(page.getByRole('navigation', { name: 'Player Menu' })).toHaveCount(0);
  await page.clock.resume();
  await page.reload();
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.keyboard.press('Enter');
  await tick(page, 900);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('uw.progress.v1')!).discoveries),
  ).toEqual(['grand-tree-note']);
  await walkTo(page, 7, 18);
  await page.keyboard.down('ArrowLeft');
  await tick(page, 50);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Enter');
  await tick(page, 100);
  await page.keyboard.press('Enter');
  await tick(page, 50);
  await expect(
    page.locator('[data-bitmap-text]').filter({ hasText: 'The note is still here.' }),
  ).toBeVisible();
  await dismissDialogue(page);
  await walkTo(page, 33, 6);
  await page.keyboard.down('ArrowDown');
  await tick(page, 50);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('Enter');
  await tick(page, 100);
  await page.keyboard.press('Enter');
  await tick(page, 50);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('uw.progress.v1')!).discoveries),
  ).toEqual(['grand-tree-note', 'forest-knight']);
  await capture(page, 'forest-discovery-4x.png', metadata);
  expect(errors).toEqual([]);
  fs.writeFileSync(`${output}/interior-captures.json`, JSON.stringify(metadata, null, 2));
  await context.close();
});

test('P9 real-time visual checkpoint: town center through old boundary without a room transition', async ({
  browser,
}) => {
  fs.mkdirSync(output, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 640 },
    recordVideo: { dir: `${output}/recording`, size: { width: 960, height: 640 } },
  });
  await context.addInitScript(() => {
    sessionStorage.setItem(
      'uw.progress.v1',
      JSON.stringify({
        projectsVisited: [],
        battlesWon: 0,
        introSeen: true,
        firstEncounterDone: true,
      }),
    );
    localStorage.setItem(
      'uw.hints.v1',
      JSON.stringify({
        seenHowToPlay: true,
        seenBattleUI: true,
        seenFirstMove: true,
        seenFirstInteract: true,
        seenPokedex: true,
        seenTrainerCard: true,
      }),
    );
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await page.keyboard.down('ArrowUp');
  await expect(state(page)).toContainText('movement 7,4');
  await page.keyboard.up('ArrowUp');
  await expect(state(page)).toContainText('player tile 7,4');
  await page.evaluate(() => {
    const samples: Array<{
      time: number;
      x: number;
      y: number;
      room: string;
      transition: boolean;
    }> = [];
    Reflect.set(window, '__cameraSamples', samples);
    const sample = () => {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-world-art]');
      if (!canvas) return;
      samples.push({
        time: performance.now(),
        x: Number(canvas.dataset.cameraX),
        y: Number(canvas.dataset.cameraY),
        room: canvas.dataset.cameraRoom!,
        transition: !!document.querySelector('[data-transition]'),
      });
      Reflect.set(window, '__sampleFrame', requestAnimationFrame(sample));
    };
    sample();
  });
  await page.keyboard.down('ArrowRight');
  await expect(state(page)).toContainText('player tile 19,4', { timeout: 15_000 });
  await page.keyboard.up('ArrowRight');
  const samples = await page.evaluate(() => {
    cancelAnimationFrame(Reflect.get(window, '__sampleFrame'));
    return Reflect.get(window, '__cameraSamples') as Array<{
      time: number;
      x: number;
      y: number;
      room: string;
      transition: boolean;
    }>;
  });
  expect(samples.some((sample) => sample.room === 'west-room')).toBe(true);
  expect(samples.some((sample) => sample.room === 'east-room')).toBe(true);
  expect(
    samples.every(
      (sample) => Number.isInteger(sample.x) && Number.isInteger(sample.y) && !sample.transition,
    ),
  ).toBe(true);
  for (let i = 1; i < samples.length; i++)
    expect(Math.abs(samples[i]!.x - samples[i - 1]!.x)).toBeLessThanOrEqual(2);
  await expect(state(page)).toContainText('Flow OVERWORLD');
  fs.writeFileSync(`${output}/real-time-camera-frames.json`, JSON.stringify(samples, null, 2));
  const video = page.video()!;
  await context.close();
  await video.saveAs(`${output}/boundary-real-time-4x.webm`);
});

test('P8 regression: semantic routes, all project pages and actual PDF remain available without JS', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pokefolio Navigation' })).toBeVisible();
  for (const route of ['/projects', '/skills', '/experience', '/about', '/resume']) {
    expect((await page.goto(route))!.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect((await page.getByRole('main').innerText()).length).toBeGreaterThan(100);
  }
  const { getProjectDefinitions } = await import('../../src/content/registry');
  for (const project of getProjectDefinitions()) {
    expect((await page.goto(`/projects/${project.slug}`))!.status()).toBe(200);
    await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
    const question = page.locator('details summary').first();
    if (await question.count()) {
      await question.click();
      await expect(page.locator('details[open]').first()).toBeVisible();
    }
  }
  expect((await request.get('/projects/not-a-project')).status()).toBe(404);
  const pdf = await request.get('/documents/Uttkarsh_Malviya.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  await context.close();
});
