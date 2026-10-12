import { test, expect, type Page } from '@playwright/test';
import { AXE_SCRIPT } from '../helpers/axe';
import { decodePng } from '../helpers/png';
import { mkdir, writeFile } from 'node:fs/promises';
const canvas = 'canvas[data-world-art="source-emerald"]';
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
const source = async (page: Page) =>
  JSON.parse((await page.locator(canvas).getAttribute('data-source-state'))!);
const output = process.env.EMERALD_UI_EVIDENCE_DIR ?? `artifacts/emerald-source/phase-p1-ui/${process.env.P1_CAPTURE_MODE ?? 'final'}`;
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

test('P1 native menu, Bag and actual battle evidence', async ({ page }) => {
  await start(page);
  await page.keyboard.press('x');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await capture(page, 'start-menu-4x');
  await page.keyboard.press('ArrowDown');
  await capture(page, 'start-menu-cursor-4x');
  for (const scale of [1, 3]) {
    await page.setViewportSize({ width: 240 * scale, height: 160 * scale });
    await capture(page, `start-menu-${scale}x`);
  }
  await page.setViewportSize({ width: 960, height: 640 });
  await page.keyboard.press('Backspace');
  await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await page.keyboard.press('y');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await capture(page, 'bag-documents-4x');
  if (process.env.P1_CAPTURE_MODE !== 'baseline') {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-source-ui="bag-message"]')).toHaveCount(1);
    await capture(page, 'bag-secondary-message-4x');
    await page.keyboard.press('ArrowUp');
  }
  for (const scale of [1, 3]) {
    await page.setViewportSize({ width: 240 * scale, height: 160 * scale });
    await capture(page, `bag-documents-${scale}x`);
  }
  await page.setViewportSize({ width: 960, height: 640 });
  await page.keyboard.press('ArrowRight');
  await capture(page, 'bag-profiles-4x');
  await page.keyboard.press('ArrowDown');
  await capture(page, 'bag-selected-4x');
  await page.keyboard.press('ArrowRight');
  await capture(page, 'bag-contact-4x');
  await page.keyboard.press('ArrowRight');
  await capture(page, 'bag-extras-4x');
  await page.keyboard.press('Backspace');
  await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
  await expect(page.locator('[data-transition]')).toHaveCount(0);
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
  await capture(page, 'battle-root-4x');
  for (const scale of [1, 3]) {
    await page.setViewportSize({ width: 240 * scale, height: 160 * scale });
    await capture(page, `battle-root-${scale}x`);
  }
  await page.setViewportSize({ width: 960, height: 640 });
  const commands = page.getByRole('group', { name: 'Battle commands' });
  const frameBox = (await page.getByRole('region', { name: 'Game frame' }).first().boundingBox())!;
  for (const [i, label] of ['DETAILS', 'LINK', 'PARTY', 'EXIT'].entries()) {
    const rect = (await commands.getByRole('button', { name: label, exact: true }).boundingBox())!;
    expect([
      (rect.x - frameBox.x) / 4,
      (rect.y - frameBox.y) / 4,
      rect.width / 4,
      rect.height / 4,
    ]).toEqual([128 + (i % 2) * 56, 120 + Math.floor(i / 2) * 16, i % 2 ? 48 : 56, 16]);
  }
  await commands.getByRole('button', { name: 'PARTY', exact: true }).click();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status', { name: 'Battle state' })).toContainText(
    'Battle view party',
  );
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  await page.keyboard.press('Backspace');
  await expect(commands).toBeVisible();
  await expect(page.locator('[data-transition]')).toHaveCount(0);
  // Return to DETAILS after exercising the real PARTY handler.
  await commands.getByRole('button', { name: 'DETAILS', exact: true }).click();
  await page.keyboard.press('Enter');
  await drain(page, () => page.getByRole('group', { name: 'Interview topics' }).isVisible());
  await capture(page, 'battle-topics-4x');
  for (const scale of [1, 3]) {
    await page.setViewportSize({ width: 240 * scale, height: 160 * scale });
    await capture(page, `battle-topics-${scale}x`);
  }
  await page.setViewportSize({ width: 960, height: 640 });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status', { name: 'Battle state' })).toContainText(
    'Battle view answer',
  );
  await drain(page, () => page.getByText('UTTKARSH', { exact: true }).isVisible());
  if (await page.getByRole('button', { name: 'Reveal dialogue' }).isVisible())
    await page.getByRole('button', { name: 'Reveal dialogue' }).click();
  await capture(page, 'battle-answer-4x');
  await drain(page, () => page.getByRole('group', { name: 'Battle commands' }).isVisible());
  // The frozen reducer exposes DETAILS after a non-leaf answer. A enters
  // its child-topic list; leaf-only automatic return is deliberately unchanged.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Interview topics' })).toBeVisible();
  await capture(page, 'battle-nested-topics-4x');
  await expect(
    page
      .getByRole('group', { name: 'Interview topics' })
      .getByRole('button', { name: 'What did you personally own?', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(
    page
      .getByRole('group', { name: 'Interview topics' })
      .getByRole('button', { name: 'What was your role?', exact: true }),
  ).toBeVisible();
  await capture(page, 'battle-cancel-4x');
});

async function axeScreen(page: Page) {
  await page.addScriptTag({ path: AXE_SCRIPT });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (element: Element) => Promise<{ violations: { id: string }[] }> };
      }
    ).axe;
    return (await axe.run(document.querySelector('[aria-label="Game frame"]')!)).violations;
  });
  expect(violations).toEqual([]);
}
test('P1 source menu and Bag keyboard/touch semantics, focus, accessibility and document return', async ({
  browser,
}) => {
  for (const touch of [false, true]) {
    const context = await browser.newContext(
        touch ? { viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true } : {},
      ),
      page = await context.newPage();
    await start(page);
    const act = async (key: string) => {
      if (touch)
        await page
          .getByLabel(
            (
              {
                x: 'Menu (X)',
                y: 'Bag (Y)',
                ArrowDown: 'Move down',
                ArrowUp: 'Move up',
                ArrowRight: 'Move right',
                ArrowLeft: 'Move left',
                Enter: 'A confirm',
                Backspace: 'B back',
              } as Record<string, string>
            )[key]!,
            { exact: true },
          )
          .tap();
      else await page.keyboard.press(key);
      await expect(page.locator('[data-transition]')).toHaveCount(0);
    };
    const anchor = await source(page);
    await act('x');
    await expect(page.getByRole('button', { name: 'POKÉDEX', exact: true })).toBeFocused();
    await axeScreen(page);
    await act('ArrowUp');
    await expect(page.getByRole('button', { name: 'EXIT', exact: true })).toBeFocused();
    await act('ArrowDown');
    await expect(page.getByRole('button', { name: 'POKÉDEX', exact: true })).toBeFocused();
    await act('ArrowDown');
    await act('Enter');
    await expect(page.getByLabel('Portfolio state')).toContainText('Screen projects');
    // The destination mounts at fade's covered midpoint. Input is intentionally
    // locked until reveal completes; wait for that contract before testing Back.
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await act('Backspace');
    await expect(page.getByRole('button', { name: 'PROJECTS', exact: true })).toBeFocused();
    await act('Backspace');
    await act('y');
    await expect(page.getByRole('button', { name: 'RESUME', exact: true })).toBeFocused();
    await axeScreen(page);
    await act('ArrowDown');
    await expect(page.getByRole('button', { name: 'CERTIFICATES', exact: true })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await act('Enter');
    await expect(page.getByRole('region', { name: 'Bag' }).getByRole('status')).toContainText(
      "That isn't available right now.",
    );
    await capture(page, `bag-unavailable-${touch ? 'touch' : 'keyboard'}`);
    await act('ArrowRight');
    await expect(page.getByRole('button', { name: 'GITHUB', exact: true })).toBeFocused();
    await act('ArrowDown');
    await expect(page.getByRole('button', { name: 'LINKEDIN', exact: true })).toBeFocused();
    await act('ArrowRight');
    await expect(page.getByRole('button', { name: 'EMAIL', exact: true })).toBeFocused();
    await act('ArrowRight');
    await act('Enter');
    await expect(page.getByRole('button', { name: /dialogue/ })).toBeVisible();
    if (await page.getByRole('button', { name: 'Reveal dialogue' }).isVisible())
      await page.getByRole('button', { name: 'Reveal dialogue' }).click();
    await capture(page, `bag-reading-${touch ? 'touch' : 'keyboard'}`);
    await act('Backspace');
    await expect(page.getByRole('button', { name: 'ACHIEVEMENTS', exact: true })).toBeFocused();
    await act('Backspace');
    await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
    expect((await source(page)).player).toEqual(anchor.player);
    await context.close();
  }
});
test('P1 source UI screenshot pixels remain exact at DPR 1/2/3 and native scales 1 through 8', async ({
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
    await page.keyboard.press('x');
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
      const selector = '[data-source-ui="start"] canvas';
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
      const filename = `dpr-${dpr}-scale-${n}.png`,
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
  await writeFile(`${output}/dpr-matrix.json`, JSON.stringify(proof, null, 2));
});
