import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { decodePng, encodePng } from '../helpers/png';
import { playerSpriteImage } from '../../src/core/emerald/playerGraphics';
import type { EmeraldUi } from '../../src/core/emerald/ui';
const canvas = 'canvas[data-world-art="source-emerald"]';
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
const source = async (page: Page) =>
  JSON.parse((await page.locator(canvas).getAttribute('data-source-state'))!);
const output = `artifacts/emerald-source/phase-p1-3-avatar/${process.env.AVATAR_CAPTURE_MODE ?? 'after'}`;
async function capture(page: Page, name: string) {
  await mkdir(output, { recursive: true });
  const scale = /-([134])x$/.exec(name)?.[1];
  if (scale)
    await expect(page.getByRole('region', { name: 'Game frame' }).first()).toHaveAttribute(
      'data-scale',
      scale,
    );
  // Resize updates the context and canvas in separate commits. Capture settled
  // physical rasters, rather than labelling a previous-size frame as the new size.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  if (await page.locator('[data-bag-switching]').count())
    await expect(page.locator('[data-bag-switching]')).toHaveAttribute(
      'data-bag-switching',
      'false',
    );
  if (scale)
    await expect
      .poll(() =>
        page.locator('[data-source-ui] canvas').evaluateAll(
          (nodes, n) =>
            nodes
              .filter((node) => !(node as HTMLElement).closest('[hidden]'))
              .every((node) => {
                const c = node as HTMLCanvasElement;
                return c.width >= 240 * n && c.width < 240 * n + devicePixelRatio * 2;
              }),
          Number(scale),
        ),
      )
      .toBe(true);
  await page.screenshot({ path: `${output}/${name}.png` });
  await writeFile(
    `${output}/${name}.state.json`,
    JSON.stringify(
      {
        viewportCSS: page.viewportSize(),
        dpr: await page.evaluate(() => devicePixelRatio),
        scale: await page
          .getByRole('region', { name: 'Game frame' })
          .first()
          .getAttribute('data-scale'),
        flow: await state(page).textContent(),
        source: await source(page),
      },
      null,
      2,
    ),
  );
}
async function proveSprite(name: string, kind: 'front' | 'back', x: number, y: number, n: number) {
  if (process.env.AVATAR_CAPTURE_MODE) return;
  const ui = JSON.parse(
    await readFile('artifacts/emerald-source/ui/ui-bundle.json', 'utf8'),
  ) as EmeraldUi;
  const expected = playerSpriteImage(ui.player![kind], n),
    shot = decodePng(await readFile(`${output}/${name}.png`));
  const diff = new Uint8Array(expected.width * expected.height * 4);
  let mismatches = 0,
    opaque = 0;
  for (let by = 0; by < expected.height; by++)
    for (let bx = 0; bx < expected.width; bx++) {
      const i = (by * expected.width + bx) * 4;
      if (!expected.data[i + 3]) continue;
      opaque++;
      const j = ((y * n + by) * shot.width + x * n + bx) * 4;
      const equal = [0, 1, 2, 3].every((c) => expected.data[i + c] === shot.data[j + c]);
      if (!equal) {
        mismatches++;
        diff.set([255, 0, 0, 255], i);
      }
    }
  await writeFile(
    `${output}/${name}.sprite-diff.png`,
    encodePng({ width: expected.width, height: expected.height, data: diff }),
  );
  await writeFile(
    `${output}/${name}.pixels.json`,
    JSON.stringify(
      {
        sourceCommit: ui.sourceCommit,
        source: ui.player![kind].graphicsPath,
        frame: ui.player![kind].idleFrame,
        n,
        x,
        y,
        opaquePixels: opaque,
        mismatches,
        oracle:
          'independent source PNG verified by Python; opaque screenshot pixels vs decoded source; not whole-screen emulator equality',
      },
      null,
      2,
    ),
  );
  expect(mismatches, name).toBe(0);
}
async function start(page: Page, path = '/') {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'uw.progress.v1',
      JSON.stringify({
        projectsVisited: [],
        battlesWon: 0,
        introSeen: true,
        firstEncounterDone: false,
      }),
    ),
  );
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
}
async function step(page: Page, key: string) {
  const s = await source(page),
    d = (
      { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<
        string,
        number[]
      >
    )[key]!;
  await page.keyboard.press(key);
  await expect
    .poll(async () => {
      const v = await source(page);
      return [v.map, v.player.x, v.player.y, v.player.step];
    })
    .toEqual([s.map, s.player.x + d[0]!, s.player.y + d[1]!, 0]);
}
async function route(page: Page) {
  for (let i = 0; i < 10; i++) await step(page, 'ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await source(page)).map).toBe('Route101');
  await expect.poll(async () => (await source(page)).player.step).toBe(0);
  // Walkable source route around the actual cliff; no teleports or dev harness.
  for (const [key, n] of [
    ['ArrowUp', 5],
    ['ArrowLeft', 3],
    ['ArrowUp', 3],
    ['ArrowRight', 9],
  ] as const)
    for (let i = 0; i < n; i++) await step(page, key);
}
async function drain(page: Page, done: () => Promise<boolean>) {
  for (let i = 0; i < 100; i++) {
    if (await done()) return;
    const button = page.getByRole('button', { name: /^(Reveal|Continue) dialogue$/ });
    if (await button.count()) await button.click();
    // Let the next queued line/page mount before a second activation.
    await page.waitForTimeout(120);
  }
  throw new Error(`Speaking surface did not settle: ${await state(page).textContent()}`);
}

for (const audience of ['Recruiter', 'Engineer', 'Friend']) {
  test(`P1.3 actual player slots and preserved ${audience} identity`, async ({ page }) => {
    test.setTimeout(180000);
    await start(page);
    if (audience === 'Recruiter') {
      for (const n of [1, 3, 4]) {
        await page.setViewportSize({ width: 240 * n, height: 160 * n });
        await capture(page, `overworld-${n}x`);
      }
      await page.keyboard.press('x');
      await page
        .getByRole('navigation', { name: 'Player Menu' })
        .getByRole('button', { name: 'UTTKARSH', exact: true })
        .click();
      await page.keyboard.press('Enter');
      await expect(page.getByLabel('Portfolio state')).toContainText('Screen card;');
      await expect(page.locator('[data-transition]')).toHaveCount(0);
      for (const n of [1, 3, 4]) {
        await page.setViewportSize({ width: 240 * n, height: 160 * n });
        await capture(page, `trainer-card-${n}x`);
        await proveSprite(`trainer-card-${n}x`, 'front', 153, 40, n);
      }
      if (!process.env.AVATAR_CAPTURE_MODE)
        await expect(page.locator('[data-source-player="front"]')).toHaveCount(1);
    }
    // Start a fresh normal session after the independent card capture.
    if (audience === 'Recruiter') await start(page);
    await page.setViewportSize({ width: 960, height: 640 });
    await route(page);
    await capture(page, `challenger-${audience.toLowerCase()}-4x`);
    await drain(page, () => page.getByRole('group', { name: 'Audience selection' }).isVisible());
    await capture(page, `encounter-${audience.toLowerCase()}-4x`);
    for (let i = 0; i < ['Recruiter', 'Engineer', 'Friend'].indexOf(audience); i++)
      await page.keyboard.press('ArrowDown');
    const anchor = await source(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-vs-frame]')).toBeVisible();
    await expect
      .poll(async () => Number(await page.locator('[data-vs-frame]').getAttribute('data-vs-frame')))
      .toBeGreaterThanOrEqual(44);
    await capture(page, `vs-${audience.toLowerCase()}-4x`);
    await proveSprite(`vs-${audience.toLowerCase()}-4x`, 'front', 18, 34, 4);
    if (!process.env.AVATAR_CAPTURE_MODE)
      await expect(page.locator('[data-source-player="front"]')).toHaveCount(1);
    await expect(state(page)).toContainText('Flow BATTLE');
    await expect(page.locator(canvas)).toHaveAttribute('data-battle-visitor', '24,48,true');
    await capture(page, `battle-arrival-${audience.toLowerCase()}-4x`);
    await proveSprite(`battle-arrival-${audience.toLowerCase()}-4x`, 'back', 24, 48, 4);
    await drain(
      page,
      async () =>
        (await page.getByRole('group', { name: 'Battle commands' }).isVisible()) &&
        (await page.getByRole('button', { name: /dialogue/ }).count()) === 0,
    );
    if (!process.env.AVATAR_CAPTURE_MODE)
      await expect(page.locator(canvas)).toHaveAttribute(
        'data-battle-player',
        'source-brendan-back-3',
      );
    for (const n of [1, 3, 4]) {
      await page.setViewportSize({ width: 240 * n, height: 160 * n });
      await capture(page, `battle-${audience.toLowerCase()}-${n}x`);
      await proveSprite(`battle-${audience.toLowerCase()}-${n}x`, 'back', 24, 48, n);
    }
    await page
      .getByRole('group', { name: 'Battle commands' })
      .getByRole('button', { name: 'EXIT', exact: true })
      .click();
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('Flow OVERWORLD');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await capture(page, `returned-${audience.toLowerCase()}-4x`);
    const returned = await source(page);
    expect(returned.map).toBe(anchor.map);
    for (const key of ['x', 'y', 'facing', 'elevation'])
      expect(returned.player[key]).toBe(anchor.player[key]);
    await step(page, 'ArrowLeft');
    await step(page, 'ArrowRight');
  });
}

test('P1.3 original portrait pixels survive DPR 1/2/3 and native integer scales 1 through 8', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const ui = JSON.parse(
    await readFile('artifacts/emerald-source/ui/ui-bundle.json', 'utf8'),
  ) as EmeraldUi;
  const proof: object[] = [];
  for (const dpr of [1, 2, 3]) {
    const context = await browser.newContext({
        deviceScaleFactor: dpr,
        viewport: { width: 960, height: 640 },
      }),
      page = await context.newPage();
    await start(page);
    await page.keyboard.press('x');
    await page
      .getByRole('navigation', { name: 'Player Menu' })
      .getByRole('button', { name: 'UTTKARSH', exact: true })
      .click();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Portfolio state')).toContainText('Screen card;');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    for (let n = 1; n <= 8; n++) {
      await page.setViewportSize({
        width: Math.ceil((240 * n) / dpr),
        height: Math.ceil((160 * n) / dpr),
      });
      await page.clock.runFor(100);
      await expect(page.getByRole('region', { name: 'Game frame' }).first()).toHaveAttribute(
        'data-scale',
        String(n),
      );
      const bounds = await page.locator('[data-source-player="front"]').evaluate((node) => {
        const r = node.getBoundingClientRect();
        return {
          x: Math.round(r.left * devicePixelRatio),
          y: Math.round(r.top * devicePixelRatio),
        };
      });
      const name = `portrait-dpr-${dpr}-scale-${n}.png`,
        shot = decodePng(await page.screenshot({ path: `${output}/${name}` })),
        expected = playerSpriteImage(ui.player!.front, n);
      let mismatches = 0,
        opaque = 0;
      for (let y = 0; y < expected.height; y++)
        for (let x = 0; x < expected.width; x++) {
          const i = (y * expected.width + x) * 4;
          if (!expected.data[i + 3]) continue;
          opaque++;
          const j = ((bounds.y + y) * shot.width + bounds.x + x) * 4;
          if ([0, 1, 2, 3].some((c) => expected.data[i + c] !== shot.data[j + c])) mismatches++;
        }
      proof.push({
        name,
        viewportCSS: page.viewportSize(),
        dpr,
        n,
        physicalSprite: [expected.width, expected.height],
        opaquePixels: opaque,
        mismatches,
      });
      expect(mismatches, name).toBe(0);
    }
    await context.close();
  }
  await writeFile(`${output}/portrait-dpr-matrix.json`, JSON.stringify(proof, null, 2));
});

test('P1.3 standalone local diagnostic reuses the same source Brendan back', async ({ page }) => {
  await page.goto('/dev/battle');
  await page.getByRole('button', { name: 'Start battle' }).click();
  await expect(page.locator('canvas[data-battle-player="source-brendan-back-3"]')).toHaveCount(1);
});
