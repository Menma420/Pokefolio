import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('source title matrix and unchanged start, intro and returning flow', async ({ page }) => {
  const folder = process.env.SOURCE_TITLE_EVIDENCE_DIR ?? `artifacts/emerald-source/phase-title/${process.env.SOURCE_TITLE_BASELINE ? 'before' : 'p1-6-after'}`;
  const prefix = process.env.SOURCE_TITLE_EVIDENCE_PREFIX ?? 'title';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto(process.env.SOURCE_TITLE_BASELINE ? '/?world=legacy' : '/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(2000);
  if (!process.env.SOURCE_TITLE_BASELINE) {
    await expect(page.locator('[data-source-ui="emerald-title"]')).toBeVisible();
    await expect(page.locator('[data-art="title-background"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'PokéFolio', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'PRESS START' })).toHaveAttribute(
      'data-title-prompt',
      'Press Start',
    );
  }
  await mkdir(folder, { recursive: true });
  for (const [width, height, scale] of [
    [240, 160, 1],
    [720, 480, 3],
    [960, 640, 4],
    [1440, 900, 5],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect(page.getByRole('region', { name: 'Game frame' }).first()).toHaveAttribute(
      'data-scale',
      String(scale),
    );
    await page.clock.runFor(40);
    if (!process.env.SOURCE_TITLE_BASELINE) {
      for (let i = 0; i < 32; i++) {
        const frame = Number(
          await page.locator('[data-title-frame]').getAttribute('data-title-frame'),
        );
        if (frame & 16) break;
        await page.clock.runFor(17);
      }
    }
    await page.screenshot({ path: `${folder}/${prefix}-${scale}x.png` });
    await writeFile(
      `${folder}/${prefix}-${scale}x.state.json`,
      JSON.stringify(
        {
          viewportCSS: { width, height },
          dpr: await page.evaluate(() => devicePixelRatio),
          integerScale: scale,
          sourceCommit: '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881',
          presentationFrame: (await page.locator('[data-title-frame]').count())
            ? await page.locator('[data-title-frame]').getAttribute('data-title-frame')
            : null,
          flow: await page.getByRole('status', { name: 'Game state' }).textContent(),
        },
        null,
        2,
      ),
    );
  }
  if (process.env.SOURCE_TITLE_BASELINE) return;
  await page.keyboard.press('Enter');
  await page.clock.runFor(1500);
  await expect(page.getByRole('status', { name: 'Game state' })).toContainText('Flow INTRO');
  await page.getByRole('button', { name: 'Reveal dialogue' }).click();
  await expect(
    page.locator('div[role="status"].sr-only').filter({ hasText: 'Welcome' }),
  ).toHaveText('Welcome to the world of Uttkarsh.');
  for (let i = 0; i < 20; i++) {
    if (
      (await page.getByRole('status', { name: 'Game state' }).textContent())?.includes(
        'Flow OVERWORLD',
      )
    )
      break;
    const next = page.getByRole('button', { name: /^(Reveal|Continue) dialogue$/ });
    if (await next.count()) await next.click();
    await page.clock.runFor(300);
  }
  await expect(page.getByRole('status', { name: 'Game state' })).toContainText('Flow OVERWORLD');
  await page.clock.resume();
  await page.reload();
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled({ timeout: 90000 });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.keyboard.press('Enter');
  await page.clock.runFor(1500);
  await expect(page.getByRole('status', { name: 'Game state' })).toContainText('Flow OVERWORLD');
  expect(errors).toEqual([]);
});
