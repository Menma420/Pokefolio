import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { FIRST_ENCOUNTER_DIALOGUE } from '../../src/content/narrative';
import { Audiences } from '../../src/content/audiences';
import { paginateDialogue } from '../../src/ui/kit/text';

// Real time, real root route, real Phaser: no dev arena or mocked bridge/clock.
test.setTimeout(120_000);
const output = 'artifacts/phase-10';
const state = (page: Page) => page.getByRole('status', { name: 'Game state' });
async function start(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('uw.progress.v1', JSON.stringify({ projectsVisited: [], battlesWon: 0, introSeen: true, firstEncounterDone: false })));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PRESS START' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(page.locator('[data-transition]')).toHaveCount(0);
}
async function step(page: Page, key: string, to: string) {
  await page.keyboard.down(key);
  await expect(state(page)).toContainText(`movement ${to}`);
  await page.keyboard.up(key);
  await expect(state(page)).toContainText(`player tile ${to};`);
}
async function behind(page: Page) {
  await step(page, 'ArrowUp', '7,4');
  for (let x = 8; x <= 19; x++) await step(page, 'ArrowRight', `${x},4`);
  for (let y = 5; y <= 7; y++) await step(page, 'ArrowDown', `19,${y}`);
  // A blocked left step changes facing without moving into the NPC.
  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('canvas[data-frameplayer="player-left-idle"]')).toHaveCount(1);
  await page.keyboard.up('ArrowLeft');
}
async function readText(page: Page, line: string) {
  for (const part of paginateDialogue(line, 210, 8)) {
    const button = page.getByRole('button', { name: /dialogue/ });
    await expect(button).toBeVisible();
    if (await page.getByRole('button', { name: 'Reveal dialogue' }).isVisible()) await page.getByRole('button', { name: 'Reveal dialogue' }).click();
    await expect(page.locator('div[role="status"].sr-only')).toHaveText(part);
    await page.getByRole('button', { name: 'Continue dialogue' }).click();
  }
}
async function readEncounter(page: Page) {
  for (const line of FIRST_ENCOUNTER_DIALOGUE) await readText(page, line);
}
async function settleBattle(page: Page, filename: string, project: string) {
  const battle = page.getByRole('main', { name: 'Interview battle' });
  await expect(battle).toBeVisible();
  await expect(page.locator('canvas[data-battle-scene="ready"][data-world-scene="sleeping"]')).toHaveCount(1);
  await expect(page.locator('canvas[data-battle-raster][data-ready="true"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Current project' })).toContainText(project);
  await expect(battle).toHaveAttribute('data-battle-frame', /^(5[6-9]|[6-9]\d|\d{3,})$/);
  const commands = page.getByRole('group', { name: 'Battle commands' });
  // The reducer shows root commands underneath the queued project-entry reaction.
  // Drain that speaking surface before exercising keyboard commands.
  for (let i = 0; i < 20 && (!(await commands.isVisible()) || await page.getByRole('button', { name: /dialogue/ }).count()); i++) {
    await expect(page.getByRole('button', { name: /dialogue/ })).toBeVisible();
    if (await page.getByRole('button', { name: 'Reveal dialogue' }).isVisible()) await page.getByRole('button', { name: 'Reveal dialogue' }).click();
    await page.getByRole('button', { name: 'Continue dialogue' }).click();
  }
  await expect(commands).toBeVisible();
  await expect(page.getByRole('button', { name: /dialogue/ })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Game frame' }).getByRole('alert')).toHaveCount(0);
  await page.screenshot({ path: `${output}/${filename}` });
}
async function exit(page: Page, tile: string, facing: string) {
  await page.keyboard.press('Backspace');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await expect(state(page)).toContainText(`player tile ${tile}; facing ${facing};`);
  await expect(state(page)).toContainText('first encounter complete');
  await expect(page.locator('canvas[data-world-scene="awake"][data-battle-scene="unloaded"]')).toHaveCount(1);
}

test('production LOS → audience → VS → actual battle scene and initial project', async ({ page }) => {
  fs.mkdirSync(output, { recursive: true });
  const trace: object[] = [];
  const errors: string[] = [];
  page.on('console', message => trace.push({ event: 'console', type: message.type(), text: message.text() }));
  page.on('pageerror', error => { errors.push(error.message); trace.push({ event: 'pageerror', text: error.message }); });
  page.on('request', request => { if (request.url().includes('/assets/battle/')) trace.push({ event: 'request', url: request.url(), time: Date.now() }); });
  page.on('response', response => { if (response.url().includes('/assets/battle/')) trace.push({ event: 'response', url: response.url(), status: response.status(), time: Date.now() }); });
  // Two ordinary network round trips exceed the command watchdog on a cold load.
  await page.route('**/assets/battle/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 850));
    await route.continue();
  });
  try {
    await start(page);
    trace.push({ event: 'overworld-ready', time: Date.now() });
    await step(page, 'ArrowDown', '7,6');
    await step(page, 'ArrowDown', '7,7');
    for (let x = 8; x <= 15; x++) await step(page, 'ArrowRight', `${x},7`);
    await expect(state(page)).toContainText('Flow ENCOUNTER');
    trace.push({ event: 'encounter-started', time: Date.now() });
    await readEncounter(page);
    await page.getByRole('group', { name: 'Audience selection' }).getByRole('button', { name: 'I’m hiring' }).click();
    await expect(page.getByRole('main', { name: 'Interview challenge' })).toBeVisible();
    trace.push({ event: 'vs-visible', time: Date.now() });
    await expect(state(page)).toContainText('Flow BATTLE');
    await expect(page.locator('canvas[data-battle-scene="ready"][data-world-scene="sleeping"]')).toHaveCount(1);
    await expect(page.locator('canvas[data-battle-raster]')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Game frame' }).getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Current project' })).toContainText('Acko Clinic');
    await expect(page.getByRole('main', { name: 'Interview battle' })).toHaveAttribute('data-battle-frame', /^(5[6-9]|[6-9]\d|\d{3,})$/);
    await settleBattle(page, 'actual-battle-entry.png', 'Acko Clinic');
    trace.push({ event: 'battle-ready', time: Date.now(), state: await page.getByRole('status', { name: 'Battle state' }).innerText(), rendererReady: await page.locator('[data-battle-view-ready]').getAttribute('data-battle-view-ready') });
    await exit(page, '15,7', 'right');
    expect(errors).toEqual([]);
  } finally {
    trace.push({ event: 'final-state', state: await state(page).textContent(), canvases: await page.locator('canvas').evaluateAll(nodes => nodes.map(node => ({ ...((node as HTMLCanvasElement).dataset) }))) });
    fs.writeFileSync(`${output}/battle-entry-trace.json`, JSON.stringify(trace, null, 2));
  }
});

test('first interaction behind challenger turns and immediately starts encounter', async ({ page }) => {
  await start(page);
  await behind(page);
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow ENCOUNTER');
  await expect(state(page)).toContainText('player tile 19,7;');
  await expect(page.locator('canvas[data-framechallenger="challenger-right-idle"]')).toHaveCount(1);
  await page.screenshot({ path: `${output}/behind-immediate-encounter.png` });
  await readEncounter(page);
  const engineer = page.getByRole('button', { name: 'I’m an engineer' });
  await engineer.click(); await engineer.click();
  await expect(page.getByRole('main', { name: 'Interview challenge' })).toBeVisible();
  await settleBattle(page, 'actual-battle-engineer.png', 'Acko Clinic');
  await exit(page, '19,7', 'left');
  // Walking into the sightline again is inert after completing the first battle.
  await step(page, 'ArrowRight', '20,7');
  await step(page, 'ArrowLeft', '19,7');
  await expect(state(page)).toContainText('Flow OVERWORLD');
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('Flow ENCOUNTER');
  await readText(page, Audiences.ENGINEER!.greetings.repeat[0]!);
  const visitor = page.getByRole('button', { name: 'I’m just visiting' });
  await visitor.click(); await visitor.click();
  await readText(page, FIRST_ENCOUNTER_DIALOGUE[3]);
  await expect(page.getByRole('main', { name: 'Interview challenge' })).toBeVisible();
  await settleBattle(page, 'actual-battle-visitor-repeat.png', 'Pokefolio');
  await exit(page, '19,7', 'left');
});
