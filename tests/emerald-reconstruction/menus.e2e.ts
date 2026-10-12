import { test, expect, type Page } from '@playwright/test';
import { AXE_SCRIPT } from '../helpers/axe';
import { decodePng } from '../helpers/png';
import { mkdir, writeFile } from 'node:fs/promises';
const canvas = 'canvas[data-world-art="source-emerald"]';
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
const source = async (page: Page) =>
  JSON.parse((await page.locator(canvas).getAttribute('data-source-state'))!);
const output = process.env.EMERALD_UI_EVIDENCE_DIR ?? `artifacts/emerald-source/phase-p1-2-ui/${process.env.P12_CAPTURE_MODE ?? 'final'}`;
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
        portfolio: await page.getByLabel('Portfolio state').allTextContents(),
        battle: await page.getByRole('status', { name: 'Battle state' }).allTextContents(),
        source: await source(page),
      },
      null,
      2,
    ),
  );
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

async function settled(page: Page, screen: string) {
  await expect(page.getByLabel('Portfolio state')).toContainText(`Screen ${screen};`);
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await page.waitForTimeout(150);
}
const axeResults: { screen: string; violations: unknown[] }[] = [];
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: AXE_SCRIPT });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as { axe: { run: (e: Element) => Promise<{ violations: unknown[] }> } }
    ).axe;
    return (await axe.run(document.querySelector('[aria-label="Game frame"]')!)).violations;
  });
  axeResults.push({ screen: name, violations });
  await writeFile(`${output}/accessibility.json`, JSON.stringify(axeResults, null, 2));
  expect(violations, name).toEqual([]);
}
async function matrix(page: Page, name: string) {
  for (const n of [1, 3, 4]) {
    await page.setViewportSize({ width: 240 * n, height: 160 * n });
    await capture(page, `${name}-${n}x`);
  }
  if (!process.env.P12_CAPTURE_MODE) await audit(page, name);
}
async function openMenu(page: Page, label: string, screen: string) {
  await page.keyboard.press('x');
  await settled(page, 'menu');
  const b = page
    .getByRole('navigation', { name: 'Player Menu' })
    .getByRole('button', { name: label, exact: true });
  await b.click();
  await page.keyboard.press('Enter');
  await settled(page, screen);
}
test('P1.2 normal gameplay portfolio screen matrix', async ({ page }) => {
  test.setTimeout(240000);
  await start(page);
  await openMenu(page, 'POKÉDEX', 'dex');
  await matrix(page, 'dex-list');
  await page.keyboard.press('ArrowDown');
  await matrix(page, 'dex-selected');
  await page.keyboard.press('Enter');
  await settled(page, 'dex-detail');
  await matrix(page, 'dex-detail');
  await page.keyboard.press('Enter');
  await matrix(page, 'dex-page');
  await page.keyboard.press('ArrowRight');
  await matrix(page, 'dex-related');
  await page.keyboard.press('Backspace');
  await settled(page, 'dex');
  await expect(page.getByLabel('Portfolio state')).toContainText('cursor 1;');
  await page.keyboard.press('Backspace');
  await settled(page, 'menu');
  await page.keyboard.press('Backspace');
  await openMenu(page, 'PROJECTS', 'projects');
  await matrix(page, 'projects');
  await page.keyboard.press('ArrowDown');
  await matrix(page, 'projects-selected');
  await page.keyboard.press('Enter');
  await settled(page, 'project-detail');
  await matrix(page, 'project-detail');
  await page.keyboard.press('ArrowRight');
  await matrix(page, 'project-tech');
  await page.keyboard.press('ArrowRight');
  await matrix(page, 'project-links');
  await page.keyboard.press('Backspace');
  await settled(page, 'projects');
  await expect(page.getByLabel('Portfolio state')).toContainText('cursor 1;');
  await page.keyboard.press('Backspace');
  await settled(page, 'menu');
  await page.keyboard.press('Backspace');
  await openMenu(page, 'EXPERIENCE', 'experience');
  await matrix(page, 'experience');
  await page.keyboard.press('Enter');
  await settled(page, 'experience-detail');
  await matrix(page, 'experience-detail');
  await page.keyboard.press('ArrowRight');
  await matrix(page, 'experience-section');
  await page.keyboard.press('Backspace');
  await settled(page, 'experience');
  await page.keyboard.press('Backspace');
  await settled(page, 'menu');
  await page.keyboard.press('Backspace');
  await openMenu(page, 'UTTKARSH', 'card');
  await matrix(page, 'trainer-card');
  await page.keyboard.press('Backspace');
  await settled(page, 'menu');
  await page.keyboard.press('Backspace');
  await openMenu(page, 'OPTIONS', 'options');
  await matrix(page, 'options');
  await page.keyboard.press('ArrowDown');
  await matrix(page, 'options-selected');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await settled(page, 'controls');
  await matrix(page, 'controls');
  await page.keyboard.press('Backspace');
  await settled(page, 'options');
  await expect(page.getByLabel('Portfolio state')).toContainText('cursor 5;');
  await page.keyboard.press('Backspace');
  await settled(page, 'menu');
  await page.keyboard.press('Backspace');
  await openMenu(page, 'EXIT', 'exit');
  await matrix(page, 'exit-no');
  await page.keyboard.press('ArrowUp');
  await matrix(page, 'exit-yes');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await settled(page, 'menu');
  await page.keyboard.press('Backspace');
  await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
  await route(page);
  await drain(page, () => page.getByRole('group', { name: 'Audience selection' }).isVisible());
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow BATTLE');
  await drain(
    page,
    async () =>
      (await page.getByRole('group', { name: 'Battle commands' }).isVisible()) &&
      (await page.getByRole('button', { name: /dialogue/ }).count()) === 0,
  );
  const commands = page.getByRole('group', { name: 'Battle commands' });
  await commands.getByRole('button', { name: 'PARTY', exact: true }).click();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status', { name: 'Battle state' })).toContainText(
    'Battle view party',
  );
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await matrix(page, 'party');
  await page.keyboard.press('ArrowDown');
  await matrix(page, 'party-selected');
  await page.keyboard.press('Backspace');
  await expect(commands).toBeVisible();
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await commands.getByRole('button', { name: 'DETAILS', exact: true }).click();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-source-ui="project-summary"]')).toBeVisible();
  if (await page.getByRole('button', { name: 'Reveal dialogue' }).isVisible())
    await page.getByRole('button', { name: 'Reveal dialogue' }).click();
  await matrix(page, 'battle-summary');
  await drain(page, () => page.getByRole('group', { name: 'Interview topics' }).isVisible());
});

test('P1.2 touch controller menu/detail parity and exact world return', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 400, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await start(page);
  const anchor = await source(page);
  const buttons: Record<string, string> = {
    X: 'Menu (X)',
    Y: 'Bag (Y)',
    DOWN: 'Move down',
    UP: 'Move up',
    RIGHT: 'Move right',
    A: 'A confirm',
    B: 'B back',
  };
  const press = async (key: string) => {
    await page.getByLabel(buttons[key]!, { exact: true }).tap();
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await page.waitForTimeout(150);
  };
  const menu = async (index: number) => {
    await press('X');
    await settled(page, 'menu');
    for (let i = 0; i < 7; i++) await press('UP'); // wraps; restore known first entry by reading actual focus
    for (let i = 0; i < 7; i++) {
      if ((await page.getByLabel('Portfolio state').textContent())!.includes(`cursor ${index};`))
        break;
      await press('DOWN');
    }
    await press('A');
  };
  await menu(0);
  await settled(page, 'dex');
  await press('DOWN');
  await press('A');
  await settled(page, 'dex-detail');
  await audit(page, 'touch-dex-detail');
  await capture(page, 'touch-dex-detail');
  await press('B');
  await settled(page, 'dex');
  await expect(page.getByLabel('Portfolio state')).toContainText('cursor 1;');
  await press('B');
  await settled(page, 'menu');
  await press('B');
  for (const [index, screen, detail] of [
    [1, 'projects', 'project-detail'],
    [2, 'experience', 'experience-detail'],
    [4, 'card', null],
    [5, 'options', null],
  ] as const) {
    await menu(index);
    await settled(page, screen);
    if (detail) {
      await press('A');
      await settled(page, detail);
      await audit(page, `touch-${detail}`);
      await press('B');
      await settled(page, screen);
    }
    await audit(page, `touch-${screen}`);
    await capture(page, `touch-${screen}`);
    await press('B');
    await settled(page, 'menu');
    await press('B');
  }
  await press('Y');
  await settled(page, 'bag');
  await audit(page, 'touch-bag');
  await press('B');
  await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
  const returned = await source(page);
  expect(returned.map).toBe(anchor.map);
  expect(returned.player).toEqual(anchor.player);
  await context.close();
});

test('P1.2 Options screenshot pixels remain exact at DPR 1/2/3 and native scales 1 through 8', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const proof: object[] = [];
  for (const dpr of [1, 2, 3]) {
    const context = await browser.newContext({
        deviceScaleFactor: dpr,
        viewport: { width: 960, height: 640 },
      }),
      page = await context.newPage();
    await start(page);
    await openMenu(page, 'OPTIONS', 'options');
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await page.clock.runFor(100);
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
      const selector = '[data-source-ui="options"] canvas';
      await expect(page.locator(selector)).toHaveAttribute('data-ready', 'true');
      const raster = await page.locator(selector).evaluate((node) => {
        const c = node as HTMLCanvasElement,
          r = c.getBoundingClientRect();
        return {
          width: c.width,
          height: c.height,
          x: Math.round(r.left * devicePixelRatio),
          y: Math.round(r.top * devicePixelRatio),
          png: c.toDataURL('image/png'),
        };
      });
      const rasterPixels = decodePng(Buffer.from(raster.png.split(',')[1]!, 'base64'));
      const filename = `options-dpr-${dpr}-scale-${n}.png`,
        bytes = await page.screenshot({ path: `${output}/${filename}` }),
        shot = decodePng(bytes);
      let mismatches = 0,
        opaque = 0;
      const colors = new Set<string>();
      for (let y = 0; y < raster.height; y++)
        for (let x = 0; x < raster.width; x++) {
          const i = (y * raster.width + x) * 4;
          if (rasterPixels.data[i + 3] !== 255) continue;
          opaque++;
          const s = ((raster.y + y) * shot.width + raster.x + x) * 4;
          if (x % n === 0 && y % n === 0)
            colors.add(
              `${rasterPixels.data[i]},${rasterPixels.data[i + 1]},${rasterPixels.data[i + 2]}`,
            );
          if (
            shot.data[s] !== rasterPixels.data[i] ||
            shot.data[s + 1] !== rasterPixels.data[i + 1] ||
            shot.data[s + 2] !== rasterPixels.data[i + 2]
          )
            mismatches++;
        }
      proof.push({
        filename,
        viewportCSS: page.viewportSize(),
        dpr,
        n,
        physicalRaster: [raster.width, raster.height],
        opaquePixels: opaque,
        colorCount: colors.size,
        screenshotRasterMismatches: mismatches,
      });
      expect(mismatches, filename).toBe(0);
    }
    await context.close();
  }
  await writeFile(`${output}/options-dpr-matrix.json`, JSON.stringify(proof, null, 2));
});
