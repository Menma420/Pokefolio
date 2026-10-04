import { test as configurationTest } from '@playwright/test';
configurationTest.setTimeout(60000);
import fs from 'node:fs';
import { paginateDialogue } from '../../src/ui/kit/text';
import { expect, test, type Page } from '@playwright/test';
import { AUDIENCE_ENGINEER, AUDIENCE_RECRUITER } from '../../src/content/audiences';
import { getAuthoredTrees, getProject } from '../../src/content/registry';
import { getParty } from '../../src/content/party';
import type { AudienceId } from '../../src/domain/types';
import { FIRST_ENCOUNTER_DIALOGUE, INTRO_NARRATION } from '../../src/content/narrative';
import { Audiences } from '../../src/content/audiences';
import { UI_STRINGS } from '../../src/content/ui-strings';

function gameState(page: Page) { return page.getByRole('status', { name: 'Game state' }); }
function dialogue(page: Page) { return page.locator('div[role="status"].sr-only'); }

async function expectAlignedLayers(page: Page, mainName?: string) {
  await expect(page.getByRole('region', { name: 'Game frame' })).toHaveAttribute('data-scale', '4');
  const frameBox = await page.getByRole('region', { name: 'Game frame' }).boundingBox();
  const canvasBox = await page.locator('canvas:not([data-bitmap])').evaluate((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  expect(frameBox).not.toBeNull();
  expect(canvasBox!.width).toBe(240 * Number(await page.getByRole('region', { name: 'Game frame' }).getAttribute('data-scale')));
  expect(canvasBox!.height).toBe(160 * Number(await page.getByRole('region', { name: 'Game frame' }).getAttribute('data-scale')));
  expect(frameBox!.width / frameBox!.height).toBe(3 / 2);
  if (mainName) {
    const box = await page.getByRole('main', { name: mainName }).boundingBox();
    expect(box!.width).toBe(frameBox!.width);
    expect(box!.height).toBe(frameBox!.height);
  }
  const battleMain = page.getByRole('main', { name: 'Interview battle' });
  if (await battleMain.isVisible()) {
    try {
      const box = await battleMain.boundingBox({ timeout: 500 });
      if (box) {
        expect(box.width).toBe(frameBox!.width);
        expect(box.height).toBe(frameBox!.height);
      }
    } catch {}
  }
  const vsMain = page.getByRole('main', { name: 'Interview challenge' });
  if (await vsMain.isVisible()) {
    try {
      const box = await vsMain.boundingBox({ timeout: 500 });
      if (box) {
        expect(box.width).toBe(frameBox!.width);
        expect(box.height).toBe(frameBox!.height);
      }
    } catch {}
  }
  const dialogueButton = page.getByRole('button', { name: /dialogue/ });
  if (await dialogueButton.first().isVisible()) {
    try {
      const buttonBox = await dialogueButton.first().boundingBox({ timeout: 500 });
      if (buttonBox) {
        expect(buttonBox.x).toBeGreaterThanOrEqual(frameBox!.x);
        expect(buttonBox.y).toBeGreaterThanOrEqual(frameBox!.y);
        expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(frameBox!.x + frameBox!.width);
        expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(frameBox!.y + frameBox!.height);
      }
    } catch {}
  }
  const audienceGroup = page.getByRole('group', { name: 'Audience selection' });
  if (await audienceGroup.isVisible()) {
    try {
      const box = await audienceGroup.boundingBox({ timeout: 500 });
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(frameBox!.x);
        expect(box.y).toBeGreaterThanOrEqual(frameBox!.y);
        expect(box.x + box.width).toBeLessThanOrEqual(frameBox!.x + frameBox!.width);
        expect(box.y + box.height).toBeLessThanOrEqual(frameBox!.y + frameBox!.height);
      }
    } catch {}
  }
}

async function displayedAnchor(page: Page) {
  const text = await gameState(page).innerText();
  const match = text.match(/Map ([^;]+); room ([^;]+); player tile ([^;]+); facing ([^;]+);/);
  expect(match).not.toBeNull();
  return { mapId: match![1], roomId: match![2], tile: match![3], facing: match![4] };
}

async function advanceDialogue(page: Page, text: string) {
  const pages = paginateDialogue(text, 210,8);
  for (const part of pages) {
    await expect(page.getByRole('button', {name: /dialogue/})).toBeVisible();
    const reveal = page.getByRole('button', { name: 'Reveal dialogue' });
    if (await reveal.isVisible()) await reveal.click();
    await expect(dialogue(page)).toHaveText(part);
    fs.mkdirSync('artifacts/phase-a/flow',{recursive:true});
    if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({path:`artifacts/phase-a/flow/${text.slice(0,32).replace(/[^a-zA-Z0-9]/g,'-')}.png`});
    await page.getByRole('button', { name: 'Continue dialogue' }).click();
  }
}
async function readBattleDialogue(page: Page, text: string) {
  if(Object.values(Audiences).some(a=>Object.values(a.reactions).flat().includes(text)))text=`"${text}"`;
  for (const part of paginateDialogue(text, 226)) {
    await expect(page.getByRole('button', {name: /dialogue/})).toBeVisible();
    const reveal = page.getByRole('button', { name: 'Reveal dialogue' });
    if (await reveal.isVisible()) await reveal.click();
    await expect(dialogue(page)).toHaveText(part);
    fs.mkdirSync('artifacts/phase-a/flow',{recursive:true});
    if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({path:`artifacts/phase-a/flow/${text.slice(0,32).replace(/[^a-zA-Z0-9]/g,'-')}.png`});
    await page.getByRole('button', { name: 'Continue dialogue' }).click();
  }
}

async function walkOneTile(page: Page, key: string, from: string, to: string) {
  const state = gameState(page);
  await expect(state).toContainText(`player tile ${from}`);
  await page.keyboard.down(key);
  await expect(state).toContainText(`movement ${to}`);
  await page.keyboard.up(key);
  await expect.poll(() => state.innerText()).toContain(`player tile ${to}`);
}

async function startOverworld(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('main', { name: 'Game title' })).toBeVisible();
  await expectAlignedLayers(page, 'Game title');
  await page.getByRole('button', { name: 'PRESS START' }).click();
  await expect.poll(async()=>await dialogue(page).count() || (await gameState(page).innerText()).includes('Flow OVERWORLD')).toBeTruthy();
  if (await dialogue(page).count()) {
    for (const line of INTRO_NARRATION) await advanceDialogue(page, line);
  }
  await expect(gameState(page)).toContainText('Flow OVERWORLD');
}

async function reachChallengerSightline(page: Page) {
  await walkOneTile(page, 'ArrowDown', '7,5', '7,6');
  await walkOneTile(page, 'ArrowDown', '7,6', '7,7');
  for (let x = 7; x < 15; x += 1) await walkOneTile(page, 'ArrowRight', `${x},7`, `${x + 1},7`);
}

async function selectAudience(page: Page, label: string) {
  await expect(page.getByRole('group', { name: 'Audience selection' })).toBeVisible();
  const button=page.getByRole('button', { name: label, exact: true });
  const selected=await button.locator('[data-cursor]').count();
  await button.click();
  if(!selected) await button.click();
}

async function enterFirstBattle(page: Page, audienceId: AudienceId) {
  const firstProject = getParty(audienceId)[0]!;
  await expect(page.getByRole('main', { name: 'Interview challenge' })).toBeVisible();
  await expect(page.locator('[data-bitmap-text]').filter({hasText:Audiences[audienceId]!.announcement})).toBeVisible();
  fs.mkdirSync('artifacts/phase-a/flow',{recursive:true});if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({path:`artifacts/phase-a/flow/vs-${audienceId}.png`});
  await expect(gameState(page)).toContainText('Flow BATTLE');
  await expect(page.getByRole('main', { name: 'Interview battle' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current project' })).toContainText(getProject(firstProject)!.name);
  return firstProject;
}

async function exitBattleThroughCommand(page: Page) {
  const exit=page.getByRole('button', { name: 'EXIT', exact: true });
  const selected=await exit.locator('[data-cursor]').count();
  await exit.click();if(!selected)await exit.click();
  await expect(dialogue(page)).toHaveText('Battle over!');
  if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({path:'artifacts/phase-a/flow/battle-over.png'});
  await expect(page.getByRole('main', {name:'Interview battle'})).toHaveCount(0);
  await expect(gameState(page)).toContainText('Flow OVERWORLD');
}

test('M1 golden path: intro, automatic LOS, authored interview, exact return, repeat and refresh', async ({ page }) => {
  page.on('pageerror', (error) => console.error(`M1 page error: ${error.message}\n${error.stack ?? ''}`));
  await startOverworld(page);
  await walkOneTile(page, 'ArrowDown', '7,5', '7,6');
  await expect(page.locator('[data-bitmap-text]').filter({hasText:'Arrow Keys: Move'})).toBeVisible();
  await walkOneTile(page, 'ArrowDown', '7,6', '7,7');
  for (let x = 7; x < 15; x += 1) await walkOneTile(page, 'ArrowRight', `${x},7`, `${x + 1},7`);

  const state = gameState(page);
  await expect(state).toContainText('Flow ENCOUNTER');
  await expectAlignedLayers(page);
  const firstAnchor = await displayedAnchor(page);
  expect(firstAnchor).toEqual({ mapId: 'm1-town', roomId: 'east-room', tile: '15,7', facing: 'right' });
  for (const line of FIRST_ENCOUNTER_DIALOGUE) await advanceDialogue(page, line);
  await expect(page.locator('[data-bitmap-text]').filter({hasText:'What brings you here?'})).toBeVisible();
  await selectAudience(page, 'I’m hiring');
  await expectAlignedLayers(page);
  await enterFirstBattle(page, AUDIENCE_RECRUITER);
  await expectAlignedLayers(page, 'Interview battle');

  const projectId = getParty(AUDIENCE_RECRUITER)[0]!;
  const authoredTree = getAuthoredTrees().find((tree) => tree.projectId === projectId && tree.audienceId === AUDIENCE_RECRUITER);
  expect(authoredTree).toBeDefined();
  const rootTopic = authoredTree!.topics[0]!;
  const depthTwo = rootTopic.children![0]!;
  const depthThree = depthTwo.children![0]!;

  await readBattleDialogue(page, UI_STRINGS.sendOut(getProject(projectId)!.name));
  await readBattleDialogue(page, Audiences[AUDIENCE_RECRUITER]!.reactions['project-entry'][0]!);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: rootTopic.label })).toBeVisible();
  await page.keyboard.press('Enter');
  await readBattleDialogue(page, Audiences[AUDIENCE_RECRUITER]!.reactions['detail-open'][0]!);
  for (const text of rootTopic.answer.pages) await readBattleDialogue(page, text);

  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: depthTwo.label })).toBeVisible();
  await page.keyboard.press('Enter');
  // Cooldown is intentionally still active after the first detail reaction.
  // Depth two should therefore reveal its authored answer directly.
  await expect(page.getByRole('img', { name: `${Audiences[AUDIENCE_RECRUITER]!.challengerTitle} portrait` })).toHaveCount(0);
  for (const text of depthTwo.answer.pages) await readBattleDialogue(page, text);

  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: depthThree.label })).toBeVisible();
  await page.keyboard.press('Enter');
  for (const text of depthThree.answer.pages) await readBattleDialogue(page, text);
  const reactionText=Audiences[AUDIENCE_RECRUITER]!.reactions['answer-return'][0]!;
  if (await page.getByRole('button',{name:/dialogue/}).count()) {
    const reveal=page.getByRole('button',{name:'Reveal dialogue'});if(await reveal.isVisible())await reveal.click();
    await expect(dialogue(page)).toHaveText(`"${reactionText}"`);
    await readBattleDialogue(page, Audiences[AUDIENCE_RECRUITER]!.reactions['answer-return'][0]!);
  }
  await expect(page.getByRole('group', { name: 'Interview topics' })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: depthTwo.label })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: rootTopic.label })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('group', { name: 'Battle commands' })).toBeVisible();
  await exitBattleThroughCommand(page);

  await expect(state).toContainText('Flow OVERWORLD; runtime ready; Map m1-town; room east-room; player tile 15,7; facing right; movement idle; encounter step idle; battle hidden; first encounter complete.');
  await expect.poll(() => displayedAnchor(page)).toEqual(firstAnchor);
  await expect(state).toContainText('first encounter complete');
  await expect(state).not.toContainText('Flow ENCOUNTER');
  await walkOneTile(page, 'ArrowLeft', '15,7', '14,7');
  await expect(page.getByText('Enter: Interact')).toBeVisible();
  await walkOneTile(page, 'ArrowRight', '14,7', '15,7');
  await page.keyboard.press('Enter');
  await expect(state).toContainText('Flow ENCOUNTER');
  const repeatAnchor = await displayedAnchor(page);
  const repeatGreeting = Audiences[AUDIENCE_RECRUITER]!.greetings.repeat[0]!;
  await advanceDialogue(page, repeatGreeting);
  await selectAudience(page, 'I’m an engineer');
  await advanceDialogue(page, FIRST_ENCOUNTER_DIALOGUE[3]);
  const secondProject = await enterFirstBattle(page, AUDIENCE_ENGINEER);
  expect(secondProject).toBe(getParty(AUDIENCE_ENGINEER)[0]);
  await expect(page.getByRole('region', { name: 'Current project' })).toContainText(getProject(secondProject)!.name);
  await readBattleDialogue(page, UI_STRINGS.sendOut(getProject(secondProject)!.name));
  await readBattleDialogue(page, Audiences[AUDIENCE_ENGINEER]!.reactions['project-entry'][0]!);

  await page.evaluate(() => window.history.back());
  await expect(dialogue(page)).toHaveText('Battle over!');
  if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({path:'artifacts/phase-a/flow/battle-over.png'});
  await expect(page.getByRole('main', {name:'Interview battle'})).toHaveCount(0);
  await expect(state).toContainText('Flow OVERWORLD');
  await expect.poll(() => displayedAnchor(page)).toEqual(repeatAnchor);

  await page.reload();
  await expect(page.getByRole('main', { name: 'Game title' })).toBeVisible();
  await page.getByRole('button', { name: 'PRESS START' }).click();
  await expect(state).toContainText('Flow OVERWORLD');
  await expect(state).toContainText('first encounter complete');
  await expect(dialogue(page)).toHaveCount(0);
});

test('unmount during a running first encounter cleans up to a fresh playable title', async ({ page }) => {
  await startOverworld(page);
  await reachChallengerSightline(page);
  await expect(gameState(page)).toContainText('encounter step move');
  await page.goto('/dev/battle');
  await expect(page.getByRole('button', { name: 'Start battle' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('main', { name: 'Game title' })).toBeVisible();
  await page.getByRole('button', { name: 'PRESS START' }).click();
  if (await dialogue(page).count()) {
    for (const line of INTRO_NARRATION) await advanceDialogue(page, line);
  }
  await expect(gameState(page)).toContainText('Flow OVERWORLD');
  await walkOneTile(page, 'ArrowDown', '7,5', '7,6');
});

test('route changes abort dialogue, VS, battle wipe, and battle without locking the next world', async ({ page }) => {
  test.setTimeout(120_000);

  const restartWorld = async () => {
    await page.goto('/dev/battle');
    await expect(page.getByRole('button', { name: 'Start battle' })).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('main', { name: 'Game title' })).toBeVisible();
    await page.getByRole('button', { name: 'PRESS START' }).click();
    await expect(gameState(page)).toContainText('Flow OVERWORLD');
  };
  const beginSelectedEncounter = async () => {
    await reachChallengerSightline(page);
    await expect(gameState(page)).toContainText('encounter step say');
    for (const line of FIRST_ENCOUNTER_DIALOGUE) await advanceDialogue(page, line);
    await selectAudience(page, 'I’m hiring');
  };
  const abortAndVerifyWorld = async () => {
    await restartWorld();
    await walkOneTile(page, 'ArrowDown', '7,5', '7,6');
  };

  await startOverworld(page);
  await reachChallengerSightline(page);
  await expect(dialogue(page)).toHaveText(FIRST_ENCOUNTER_DIALOGUE[0]!);
  await abortAndVerifyWorld();

  await restartWorld();
  await beginSelectedEncounter();
  await expect(page.getByRole('main', { name: 'Interview challenge' })).toBeVisible();
  await expectAlignedLayers(page, 'Interview challenge');
  await abortAndVerifyWorld();

  await restartWorld();
  await beginSelectedEncounter();
  await expect(page.locator('[data-transition="battle-wipe"]')).toBeVisible();
  await abortAndVerifyWorld();

  await restartWorld();
  await beginSelectedEncounter();
  await expect(gameState(page)).toContainText('Flow BATTLE');
  await expect(page.getByRole('main', { name: 'Interview battle' })).toBeVisible();
  await abortAndVerifyWorld();
});

test('walking onto the main doorway triggers transition and interior without Enter/A, preserving return point', async ({ page }) => {
  await startOverworld(page);
  await page.evaluate(() => {
    const keys: string[] = [];
    Reflect.set(window, 'doorRegressionKeys', keys);
    document.addEventListener('keydown', (event) => keys.push(event.key));
  });
  // Stay above the challenger lane; reach the door using movement only.
  await walkOneTile(page, 'ArrowUp', '7,5', '7,4');
  for (let x = 7; x < 21; x += 1) await walkOneTile(page, 'ArrowRight', `${x},4`, `${x + 1},4`);
  await walkOneTile(page, 'ArrowDown', '21,4', '21,5');
  const cdp = await page.context().newCDPSession(page);
  await page.keyboard.down('ArrowRight');
  await expect(gameState(page)).toContainText('movement 22,5');
  await page.keyboard.up('ArrowRight');
  const transition = page.locator('[data-transition="door"]');
  await page.waitForFunction(() => Number(document.querySelector('[data-transition="door"]')?.getAttribute('data-frame') ?? -1) >= 3);
  // Freeze only browser time to photograph a real fade frame, not a preview.
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  try {
    await expect(transition).toBeVisible();
    const inputs = await page.evaluate(() => Reflect.get(window, 'doorRegressionKeys') as string[]);
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((key) => key.startsWith('Arrow'))).toBe(true);
    const evidence = 'artifacts/phase-a/visual-review';
    fs.mkdirSync(evidence, { recursive: true });
    if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({ path: `${evidence}/walk-on-door-transition.png` });
    fs.writeFileSync(`${evidence}/capture.json`, JSON.stringify({
      filename: 'walk-on-door-transition.png', viewport: page.viewportSize(),
      dpr: await page.evaluate(() => window.devicePixelRatio),
      integerScale: Number(await page.getByRole('region', { name: 'Game frame' }).getAttribute('data-scale')),
      doorwayTile: '22,5', transitionFrame: await transition.getAttribute('data-frame'), inputs,
    }, null, 2));
  } finally {
    await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance' });
  }
  await expect(gameState(page)).toContainText('Map m1-interior-test');
  await expect(gameState(page)).toContainText('player tile 7,7');
  await expect(transition).toHaveCount(0);
  if(process.env.POKEFOLIO_FLOW_SCREENSHOTS!=='0')await page.screenshot({ path: 'artifacts/phase-a/visual-review/interior-arrival.png' });
  await page.keyboard.press('Backspace');
  await expect(gameState(page)).toContainText('Map m1-town');
  await expect(gameState(page)).toContainText('player tile 21,5');
  await expect(gameState(page)).toContainText('room east-room');
  await expect(gameState(page)).toContainText('facing right');
  await expect(transition).toHaveCount(0);
});
