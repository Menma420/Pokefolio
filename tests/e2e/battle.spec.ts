test.setTimeout(90000);
import {paginateDialogue} from '../../src/ui/kit/text';
import { expect, test, Page } from '@playwright/test';
import { getParty } from '../../src/content/party';
import { AUDIENCE_ENGINEER, AUDIENCE_FRIEND, AUDIENCE_RECRUITER } from '../../src/content/audiences';
import { getAuthoredTrees, getProject, getProjectDefinitions } from '../../src/content/registry';
import { PROJECT_IDS } from '../../src/content/projects/catalog';
import { Audiences } from '../../src/content/audiences';
import { getBattleSummary } from '../../src/content/battle-presentation';
import { UI_STRINGS } from '../../src/content/ui-strings';

declare global {
  interface Window {
    __openedUrls: Array<{ url: string; target: string; features: string }>;
  }
}

async function readDialogue(page:Page,text:string,touch=false) {
 if(Object.values(Audiences).some(a=>Object.values(a.reactions).flat().includes(text)))text=`"${text}"`;
 for(const part of paginateDialogue(text,226)) {
  await expect(page.getByRole('button',{name:/dialogue/})).toBeVisible();
  if(await page.getByRole('button',{name:'Reveal dialogue'}).isVisible()) {
   if(touch)await page.getByRole('button',{name:'A confirm'}).tap();else await page.keyboard.press('Enter');
   if(touch)await page.clock.runFor(50);
  }
  await expect(page.locator('div[role="status"].sr-only')).toHaveText(part);
  if(touch)await page.getByRole('button',{name:'A confirm'}).tap();else await page.keyboard.press('Enter');
  if(touch)await page.clock.runFor(50);
 }
}
async function revealAndAdvance(page:Page,text:string,wait=false) {await readDialogue(page,text);if(wait)await expect.poll(async()=>{const status=page.locator('div[role="status"].sr-only');return await status.count()===0||await status.textContent()!==paginateDialogue(text,226).at(-1)!;}).toBe(true);}
async function readAnswer(page:Page,pages:string[]) {for(const text of pages)await readDialogue(page,text);}
async function revealAndAdvanceWithTouch(page:Page,text:string,wait=false) {await readDialogue(page,text,true);if(wait)await expect.poll(async()=>{const status=page.locator('div[role="status"].sr-only');return await status.count()===0||await status.textContent()!==paginateDialogue(text,226).at(-1)!;}).toBe(true);}

test('audience selector resolves the six-project party for each audience', async ({ page }) => {
  await page.goto('/dev/battle');
  const audienceSelect = page.getByLabel('Audience');
  const projectSelect = page.getByLabel('Starting project');

  for (const audience of [AUDIENCE_RECRUITER, AUDIENCE_ENGINEER, AUDIENCE_FRIEND]) {
    await audienceSelect.selectOption(audience);
    const expectedNames = getParty(audience).map((projectId) => getProject(projectId)?.name);
    await expect.poll(() => projectSelect.locator('option').allTextContents()).toEqual(expectedNames);
  }
});

test('keyboard completes authored Recruiter interview, switches party project, opens root LINK, and exits', async ({ page }) => {
  await page.addInitScript(() => {
    window.__openedUrls = [];
    window.open = (url, target, features) => {
      if (url) window.__openedUrls.push({ url: String(url), target: target ?? '', features: features ?? '' });
      return null;
    };
  });
  await page.goto('/dev/battle');
  const startBattle = page.getByRole('button', { name: 'Start battle' });
  await startBattle.focus();
  await page.keyboard.press('Space');

  const challenge = page.getByRole('region', { name: 'Interview battle' });
  await expect(challenge).toBeVisible();
  const ackoTree = getAuthoredTrees().find((tree) => tree.projectId === PROJECT_IDS.ACKO_CLINIC && tree.audienceId === AUDIENCE_RECRUITER);
  expect(ackoTree).toBeDefined();
  const rootTopic = ackoTree!.topics[0]!;
  const depthTwo = rootTopic.children![0]!;
  const depthThree = depthTwo.children![0]!;

  await revealAndAdvance(page, UI_STRINGS.sendOut(getProject(PROJECT_IDS.ACKO_CLINIC)!.name));
  await revealAndAdvance(page, Audiences[AUDIENCE_RECRUITER]!.reactions['project-entry'][0]!, true);
  await expect(page.getByRole('group', { name: 'Battle commands' }).getByRole('button', { name: 'LINK' })).toBeVisible();
  await page.keyboard.press('Enter');
  await readDialogue(page,getBattleSummary(PROJECT_IDS.ACKO_CLINIC));

  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: rootTopic.label })).toBeVisible();
  await page.keyboard.press('Enter');
  const detailReaction = Audiences[AUDIENCE_RECRUITER]!.reactions['detail-open'][0]!;
  await revealAndAdvance(page, detailReaction, true);
  await readAnswer(page, rootTopic.answer.pages);

  const nestedCommands = page.getByRole('group', { name: 'Battle commands' });
  await expect(nestedCommands.getByRole('button', { name: 'BACK' })).toBeVisible();
  await expect(nestedCommands.getByRole('button', { name: 'LINK' })).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: depthTwo.label })).toBeVisible();
  await page.keyboard.press('Enter');
  await readAnswer(page, depthTwo.answer.pages);

  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: depthThree.label })).toBeVisible();
  await page.keyboard.press('Enter');
  await readAnswer(page, depthThree.answer.pages);
  await revealAndAdvance(page, Audiences[AUDIENCE_RECRUITER]!.reactions['answer-return'][0]!, true);
  await expect(page.getByRole('group', { name: 'Interview topics' })).toBeVisible();

  await page.keyboard.press('Backspace');
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: depthTwo.label })).toBeVisible();
  await page.keyboard.press('Enter');
  await readAnswer(page, depthTwo.answer.pages);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const party = page.getByRole('region', { name: 'Choose a project' });
  await expect(party).toBeVisible();
  const recruiterParty = getParty(AUDIENCE_RECRUITER);
  expect(recruiterParty).toHaveLength(6);
  const karsh = getProject(recruiterParty[1]!);
  expect(karsh?.id).toBe(PROJECT_IDS.KARSH);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await revealAndAdvance(page, UI_STRINGS.sendOut(karsh!.name));
  await expect(page.getByRole('region', { name: 'Current project' })).toContainText(karsh!.name);

  const karshTree = getAuthoredTrees().find((tree) => tree.projectId === karsh!.id && tree.audienceId === AUDIENCE_RECRUITER);
  expect(karshTree).toBeDefined();
  await revealAndAdvance(page, Audiences[AUDIENCE_RECRUITER]!.reactions['project-switch'][0]!, true);
  await readDialogue(page,getBattleSummary(karsh!.id));
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: karshTree!.topics[0]!.label })).toBeVisible();
  await page.keyboard.press('Backspace');

  const commands = page.getByRole('group', { name: 'Battle commands' });
  await expect(commands.getByRole('button', { name: 'LINK' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__openedUrls)).toEqual([{
    url: getProject(karsh!.id)!.links.primary.url,
    target: '_blank',
    features: 'noopener,noreferrer',
  }]);
  await expect(commands.getByRole('button', { name: 'DETAILS' })).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Start battle' })).toBeVisible();
});

test('touch-only controls open and read an authored topic', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 }, hasTouch: true });
  const page = await context.newPage();
  // Freeze the existing Clock so a finished typewriter cannot turn a reveal tap
  // into an advance between the visibility check and touch dispatch.
  await page.clock.install();
  await page.goto('/dev/battle');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Start battle' }).tap();
  for (let i = 0; i < 240; i++) {
    await page.clock.runFor(25);
    const battle = page.getByRole('region', { name: 'Interview battle' });
    if (await battle.count() && Number(await battle.getAttribute('data-battle-frame')) >= 56) break;
  }

  const ackoTree = getAuthoredTrees().find((tree) => tree.projectId === PROJECT_IDS.ACKO_CLINIC && tree.audienceId === AUDIENCE_RECRUITER)!;
  const rootTopic = ackoTree.topics[0]!;
  const confirm = page.getByRole('button', { name: 'A confirm' });
  await expect(page.getByRole('region', { name: 'Interview battle' })).toBeVisible();
  await expect(confirm).toBeVisible();
  await revealAndAdvanceWithTouch(page, UI_STRINGS.sendOut(getProject(PROJECT_IDS.ACKO_CLINIC)!.name));
  await revealAndAdvanceWithTouch(page, Audiences[AUDIENCE_RECRUITER]!.reactions['project-entry'][0]!, true);
  await confirm.tap();
  for (let i = 0; i < 4; i++) await page.clock.runFor(50);
  await readDialogue(page,getBattleSummary(PROJECT_IDS.ACKO_CLINIC),true);
  await expect(page.getByRole('group', { name: 'Interview topics' }).getByRole('button', { name: rootTopic.label })).toBeVisible();
  await confirm.tap();
  for (let i = 0; i < 4; i++) await page.clock.runFor(50);
  await revealAndAdvanceWithTouch(page, Audiences[AUDIENCE_RECRUITER]!.reactions['detail-open'][0]!, true);
  for(const answerPage of rootTopic.answer.pages) await readDialogue(page,answerPage,true);
  await expect(page.getByRole('group', { name: 'Battle commands' })).toBeVisible();
  await context.close();
});

test('Battle UI provides audience content for every authored active project', async () => {
  for (const audience of [AUDIENCE_RECRUITER, AUDIENCE_ENGINEER, AUDIENCE_FRIEND]) {
    for (const projectId of getParty(audience)) {
      const project = getProject(projectId);
      expect(project).toBeDefined();
      expect(getAuthoredTrees().some((tree) => tree.projectId === projectId && tree.audienceId === audience)).toBe(true);
    }
  }
  expect(getProjectDefinitions()).toHaveLength(12);
});
