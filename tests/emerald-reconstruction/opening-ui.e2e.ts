import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const canvas = 'canvas[data-world-art="source-emerald"]';
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
const source = async (page: Page) =>
  JSON.parse((await page.locator(canvas).getAttribute('data-source-state'))!);
const output = process.env.EMERALD_UI_EVIDENCE_DIR
  ? `${process.env.EMERALD_UI_EVIDENCE_DIR}/opening`
  : `artifacts/emerald-source/phase-p1-4-ui/${process.env.P14_CAPTURE_MODE ?? 'after'}`;
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
  if (name.startsWith('vs-')) await page.clock.runFor(40);
  else await page.waitForTimeout(60);
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
test('P1.4 actual intro, audience, VS and battle window matrix', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow INTRO');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal dialogue' }).click();
  if (!process.env.P14_CAPTURE_MODE) {
    await expect(page.locator('[data-source-ui="birch-intro"]')).toBeVisible();
    await expect(page.locator('[role="status"].sr-only').filter({ hasText: 'Welcome' })).toHaveText(
      'Welcome to the world of Uttkarsh.',
    );
    await expect(page.locator('[data-art="intro-uttkarsh"]')).toHaveCount(0);
  }
  await matrix(page, 'intro');
  await page.getByRole('button', { name: 'Continue dialogue' }).click();
  await page.getByRole('button', { name: 'Reveal dialogue' }).click();
  await expect(page.locator('[role="status"].sr-only').filter({ hasText: 'Here,' })).toHaveText(
    'Here, you play as Uttkarsh.',
  );
  await drain(page, async () => (await state(page).textContent())!.includes('Flow OVERWORLD'));
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  const spawn = await source(page);
  expect([spawn.map, spawn.player.x, spawn.player.y]).toEqual(['LittlerootTown', 10, 10]);
  await page.reload();
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await page.setViewportSize({ width: 960, height: 640 });
  await route(page);
  await drain(page, () => page.getByRole('group', { name: 'Audience selection' }).isVisible());
  await page.waitForTimeout(1000);
  await matrix(page, 'audience');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  await expect(page.locator('[data-vs-title]')).toBeVisible();
  await matrix(page, 'vs');
  await page.clock.resume();
  await expect(state(page)).toContainText('Flow BATTLE');
  await drain(
    page,
    async () =>
      (await page.getByRole('group', { name: 'Battle commands' }).isVisible()) &&
      (await page.getByRole('button', { name: /dialogue/ }).count()) === 0,
  );
  await matrix(page, 'battle-root');
  await page
    .getByRole('group', { name: 'Battle commands' })
    .getByRole('button', { name: 'EXIT', exact: true })
    .click();
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('P1.4 touch A advances Birch and reduced motion preserves welcome and source spawn', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 400, height: 800 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
  await page.getByRole('button', { name: 'PRESS START' }).tap();
  await expect(state(page)).toContainText('Flow INTRO');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  const a = page.getByRole('button', { name: 'A confirm', exact: true });
  await a.tap();
  await expect(page.locator('[role="status"].sr-only').filter({ hasText: 'Welcome' })).toHaveText(
    'Welcome to the world of Uttkarsh.',
  );
  await capture(page, 'intro-touch-reduced-motion');
  for (let i = 0; i < 12 && !(await state(page).textContent())!.includes('Flow OVERWORLD'); i++) {
    await a.tap();
    await page.waitForTimeout(120);
  }
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  const s = await source(page);
  expect([s.map, s.player.x, s.player.y]).toEqual(['LittlerootTown', 10, 10]);
  await page.getByRole('button', { name: 'Menu (X)', exact: true }).tap();
  await expect(page.getByRole('navigation', { name: 'Player Menu' })).toBeVisible();
  await page.getByRole('button', { name: 'B back', exact: true }).tap();
  await expect(page.getByRole('navigation', { name: 'Player Menu' })).toHaveCount(0);
  await context.close();
});
