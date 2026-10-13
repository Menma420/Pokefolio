import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { decodePng, encodePng } from '../helpers/png';
import { trainerSpriteImage } from '../../src/core/emerald/playerGraphics';
import type { EmeraldUi } from '../../src/core/emerald/ui';
const canvas = 'canvas[data-world-art="source-emerald"]';
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
const source = async (page: Page) =>
  JSON.parse((await page.locator(canvas).getAttribute('data-source-state'))!);
const output = `artifacts/emerald-source/phase-p1-5-opponent/${process.env.OPPONENT_CAPTURE_MODE ?? 'after'}`;
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
  await page.clock.runFor(40);
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
  if (
    !process.env.OPPONENT_CAPTURE_MODE &&
    (name.startsWith('encounter-') || name.startsWith('vs-') || name.startsWith('battle-arrival-'))
  )
    await proveSprite(
      name,
      name.startsWith('encounter-') ? 16 : name.startsWith('vs-') ? 158 : 160,
      name.startsWith('encounter-') ? 35 : name.startsWith('vs-') ? 0 : 8,
      Number(scale),
    );
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
async function proveSprite(name: string, x: number, y: number, n: number) {
  const ui = JSON.parse(
    await readFile('artifacts/emerald-source/ui/ui-bundle.json', 'utf8'),
  ) as EmeraldUi;
  const expected = trainerSpriteImage(ui.opponent!.front, n),
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
      if ([0, 1, 2, 3].some((c) => expected.data[i + c] !== shot.data[j + c])) {
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
        source: ui.opponent!.front.graphicsPath,
        frame: 0,
        n,
        x,
        y,
        opaquePixels: opaque,
        mismatches,
        oracle:
          'source PNG independently checked in Python; visible opaque sprite pixels only, not whole-screen emulator equality',
      },
      null,
      2,
    ),
  );
  expect(mismatches, name).toBe(0);
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

async function matrix(page: Page, name: string) {
  for (const n of [1, 3, 4]) {
    await page.setViewportSize({ width: 240 * n, height: 160 * n });
    await capture(page, `${name}-${n}x`);
  }
}

for (const audience of ['Recruiter', 'Engineer', 'Friend']) {
  test(`P1.5 source Steven opponent and preserved ${audience} identity`, async ({ page }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
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
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('Flow OVERWORLD');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await route(page);
    await drain(page, () => page.getByRole('group', { name: 'Audience selection' }).isVisible());
    for (let i = 0; i < ['Recruiter', 'Engineer', 'Friend'].indexOf(audience); i++)
      await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('img', { name: 'Steven Stone challenger portrait' })).toHaveCount(
      1,
    );
    const anchor = await source(page);
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await matrix(page, `encounter-${audience.toLowerCase()}`);
    await page.keyboard.press('Enter');
    await page.clock.runFor(1000);
    await expect(page.locator('[data-vs-title]')).toBeVisible();
    await expect(page.locator('[data-vs-player-name]')).toHaveAttribute(
      'data-vs-player-name',
      'UTTKARSH',
    );
    await expect(page.locator('[data-vs-challenger-name]')).toHaveAttribute(
      'data-vs-challenger-name',
      audience === 'Friend' ? 'VISITOR' : audience.toUpperCase(),
    );
    await expect(page.getByRole('img', { name: 'Uttkarsh — Brendan portrait' })).toBeVisible();
    await expect(
      page.getByRole('img', {
        name: `${audience === 'Friend' ? 'Visitor' : audience} challenger portrait`,
      }),
    ).toBeVisible();
    if (!process.env.OPPONENT_CAPTURE_MODE) {
      await expect(page.locator('[data-source-opponent="steven-front"]')).toHaveCount(1);
      await expect(page.locator('[data-source-player="front"]')).toHaveCount(1);
      await expect(page.getByLabel('Uttkarsh challenger artwork')).toHaveCount(0);
    }
    const playerInk = page.locator('[data-vs-player-name] [data-bitmap-text]');
    const challengerInk = page.locator('[data-vs-challenger-name] [data-bitmap-text]');
    for (const attr of ['data-native-height', 'data-ink', 'data-shadow'])
      await expect(challengerInk).toHaveAttribute(attr, (await playerInk.getAttribute(attr))!);
    await expect(page.locator('[data-source-ui="vs-nameplate"]')).toHaveCount(0);
    await expect(page.locator('[data-opening-art="vs-title-bar"]')).toHaveCount(0);
    await matrix(page, `vs-${audience.toLowerCase()}`);
    const labelBounds = await challengerInk.boundingBox();
    const spriteBounds = await page.locator('[data-source-opponent="steven-front"]').boundingBox();
    const scale = Number(
      await page.getByRole('region', { name: 'Game frame' }).first().getAttribute('data-scale'),
    );
    expect(
      Math.abs(labelBounds!.x + labelBounds!.width / 2 - spriteBounds!.x - spriteBounds!.width / 2),
    ).toBeLessThanOrEqual(scale / 2);
    expect(labelBounds!.y - spriteBounds!.y - spriteBounds!.height).toBe(4 * scale);
    await page.clock.runFor(400);
    for (
      let i = 0;
      i < 30 && (await page.locator(canvas).getAttribute('data-battle-opponent')) !== '160,8,true';
      i++
    )
      await page.clock.runFor(100);
    await expect(state(page)).toContainText('Flow BATTLE');
    await expect(page.locator(canvas)).toHaveAttribute('data-battle-opponent', '160,8,true');
    if (!process.env.OPPONENT_CAPTURE_MODE)
      await expect(page.locator(canvas)).toHaveAttribute(
        'data-battle-opponent-art',
        'source-steven-front',
      );
    await matrix(page, `battle-arrival-${audience.toLowerCase()}`);
    await page.clock.resume();
    await drain(
      page,
      async () =>
        (await page.getByRole('group', { name: 'Battle commands' }).isVisible()) &&
        (await page.getByRole('button', { name: /dialogue/ }).count()) === 0,
    );
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await matrix(page, `battle-root-${audience.toLowerCase()}`);
    await page.clock.resume();
    await page
      .getByRole('group', { name: 'Battle commands' })
      .getByRole('button', { name: 'EXIT', exact: true })
      .click();
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('Flow OVERWORLD');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    const returned = await source(page);
    expect(returned.map).toBe(anchor.map);
    for (const key of ['x', 'y', 'facing', 'elevation'])
      expect(returned.player[key]).toBe(anchor.player[key]);
    await step(page, 'ArrowLeft');
    await step(page, 'ArrowRight');
    expect(errors).toEqual([]);
  });
}

test('P1.5 standalone diagnostic shares source Steven without replacing Brendan', async ({
  page,
}) => {
  await page.goto('/dev/battle');
  await page.getByRole('button', { name: 'Start battle' }).click();
  await expect(
    page.locator(
      'canvas[data-battle-player="source-brendan-back-3"][data-battle-opponent-art="source-steven-front"]',
    ),
  ).toHaveCount(1);
});

test('P1.7 ordinary interview EXIT restores map music without a victory cue', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'uw.progress.v1',
      JSON.stringify({
        projectsVisited: [],
        battlesWon: 0,
        introSeen: true,
        firstEncounterDone: false,
      }),
    );
    const events: {
      type: string;
      loop: boolean;
      bufferDuration: number;
      offset: number;
      duration: number | null;
      time: number;
    }[] = [];
    Reflect.set(window, '__victoryTiming', events);
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = original.call(this),
        start = node.start.bind(node);
      node.start = (when = 0, offset = 0, duration?: number) => {
        events.push({
          type: 'start',
          loop: node.loop,
          bufferDuration: node.buffer?.duration ?? 0,
          offset,
          duration: duration ?? null,
          time: this.currentTime,
        });
        if (duration !== undefined)
          node.addEventListener('ended', () =>
            events.push({
              type: 'ended',
              loop: node.loop,
              bufferDuration: node.buffer?.duration ?? 0,
              offset,
              duration,
              time: this.currentTime,
            }),
          );
        if (duration === undefined) start(when, offset);
        else start(when, offset, duration);
      };
      return node;
    };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await route(page);
  await drain(page, () => page.getByRole('group', { name: 'Audience selection' }).isVisible());
  await page.keyboard.press('Enter');
  await drain(
    page,
    async () =>
      (await page.getByRole('group', { name: 'Battle commands' }).isVisible()) &&
      (await page.getByRole('button', { name: /dialogue/ }).count()) === 0,
  );
  await page
    .getByRole('group', { name: 'Battle commands' })
    .getByRole('button', { name: 'EXIT', exact: true })
    .click();
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  const timing = () =>
    page.evaluate(
      () =>
        Reflect.get(window, '__victoryTiming') as {
          type: string;
          loop: boolean;
          bufferDuration: number;
          offset: number;
          duration: number | null;
          time: number;
        }[],
    );
  await expect.poll(async()=>JSON.parse((await page.locator('[data-music-trace]').textContent())!).filter((e:{event:string})=>e.event==='request').at(-1)?.id).toBe('MUS_ROUTE101');
  await page.waitForTimeout(4500);
  const events=await timing();
  expect(events.every(e=>e.duration===null&&e.loop)).toBe(true);
  expect(events.some(e=>e.duration===4)).toBe(false);
  await expect(state(page)).toContainText('player tile 16,11; facing right;');
  await mkdir('artifacts/emerald-source/phase-p1-7-audio', { recursive: true });
  await writeFile('artifacts/emerald-source/phase-p1-7-audio/no-victory-browser-timing.json',JSON.stringify(events,null,2));
});
