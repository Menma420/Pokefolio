import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {decodePng,cropPixels,histogram} from '../helpers/png';
import art from '../../assets-src/battle/art.json';
import worldPalettes from '../../assets-src/world/palette-sheet.json';
import {palette} from '../../src/ui/kit/palette';
import {getAuthoredTrees,getProject} from '../../src/content/registry';
import {getParty} from '../../src/content/party';
import {Audiences} from '../../src/content/audiences';
import type {AudienceId} from '../../src/domain/types';
import {paginateDialogue} from '../../src/ui/kit/text';
import {UI_STRINGS} from '../../src/content/ui-strings';

test.setTimeout(180000);
const output='artifacts/phase-b';
const status=(p:Page)=>p.getByRole('status',{name:'Battle state'});
const live=(p:Page)=>p.locator('div[role="status"].sr-only');
async function tick(p:Page,ms:number){for(let t=0;t<ms;t+=25)await p.clock.runFor(Math.min(25,ms-t));}
async function beatFrame(p:Page,target:number){for(let i=0;i<250;i++){const main=p.getByRole('main',{name:'Interview battle'});if(await main.count()&&Number(await main.getAttribute('data-battle-frame'))>=target)return;await tick(p,10);}throw new Error(`Battle frame ${target} not reached`);}
function recorder(p:Page,dpr:number,index:string){const rows:object[]=[];return async(filename:string,n:number)=>{
 const frame=p.getByRole('region',{name:'Game frame'});await expect(frame).toHaveAttribute('data-scale',String(n));await p.clock.runFor(20);const box=(await frame.boundingBox())!;const image=decodePng(await p.screenshot({path:`${output}/${filename}`}));const pixels=cropPixels(image,Math.round(box.x*dpr),Math.round(box.y*dpr),240*n,160*n);let mismatches=0;const mismatchRows=Array(160).fill(0),mismatchColumns=Array(240).fill(0);
 for(let y=0;y<160;y++)for(let x=0;x<240;x++){const origin=((y*n)*pixels.width+x*n)*4;for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++){const i=((y*n+dy)*pixels.width+x*n+dx)*4;if([0,1,2,3].some(c=>pixels.data[i+c]!==pixels.data[origin+c])){mismatches++;mismatchRows[y]++;mismatchColumns[x]++;}}}
 if(mismatches)fs.writeFileSync(`${output}/${filename}.diagnostic.json`,JSON.stringify({mismatches,mismatchRows,mismatchColumns,canvases:await p.locator('canvas').evaluateAll(nodes=>nodes.map(node=>{const canvas=node as HTMLCanvasElement,rect=canvas.getBoundingClientRect();return {width:canvas.width,height:canvas.height,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},style:canvas.getAttribute('style'),data:{...canvas.dataset},parent:canvas.parentElement?.getAttribute('data-battle-art')??canvas.parentElement?.getAttribute('data-bitmap-text')};}))},null,2));expect(mismatches,`${filename}: full-scene native pixel blocks`).toBe(0);
 const allowed=[...new Set([...Object.values(palette),...Object.values(art).flatMap(a=>a.palette.filter((c):c is string=>c!==null)),...Object.values(worldPalettes.tiles).flat(),'#283D38',...Object.values(worldPalettes.characters).flatMap(p=>Object.values(p))])];const colors=histogram(pixels.data,allowed);
 if(!filename.includes('-vs-'))expect(colors.intermediatePixels,`${filename}: authored palette`).toBe(0);
 rows.push({filename,viewport:p.viewportSize(),dpr,integerScale:n,physicalPixels:{width:image.width,height:image.height},frameBounds:box,pixelBlockMismatches:mismatches,intermediateColors:colors.intermediateColors,gameState:await status(p).count()?await status(p).innerText():null,beat:await p.locator('[data-battle-beat]').evaluateAll(ns=>ns[0]?.getAttribute('data-battle-beat')??null),beatFrame:await p.locator('[data-battle-frame]').evaluateAll(ns=>ns[0]?.getAttribute('data-battle-frame')??null),transition:await p.locator('[data-transition]').evaluateAll(ns=>ns.map(n=>({type:n.getAttribute('data-transition'),frame:n.getAttribute('data-frame')})))});fs.writeFileSync(`${output}/${index}`,JSON.stringify(rows,null,2));
 };}
async function read(p:Page,text:string,capture?:()=>Promise<void>){if(Object.values(Audiences).some(a=>Object.values(a.reactions).flat().includes(text)))text=`"${text}"`;for(const [i,part]of paginateDialogue(text,226).entries()){
 await expect(p.getByRole('button',{name:/dialogue/})).toBeVisible();if(await p.getByRole('button',{name:'Reveal dialogue'}).isVisible())await p.getByRole('button',{name:'Reveal dialogue'}).click();await expect(live(p)).toHaveText(part);if(i===0&&capture)await capture();await p.getByRole('button',{name:'Continue dialogue'}).click();await tick(p,50);
 }}
async function startArena(p:Page,audience='RECRUITER'){
 await p.clock.install();await p.goto('/dev/battle');await p.getByLabel('Audience').selectOption(audience);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.getByRole('button',{name:'Start battle'}).click();for(let i=0;i<60&&!(await p.locator('canvas[data-battle-scene="ready"]').count());i++)await tick(p,25);await expect(p.locator('canvas[data-battle-scene="ready"]')).toHaveCount(1);
}

test('B3 complete production battle sequence and all native scales',async({browser})=>{
 fs.mkdirSync(output,{recursive:true});const context=await browser.newContext({viewport:{width:960,height:640}});const p=await context.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));const capture=recorder(p,1,'battle-captures.json');await startArena(p);await tick(p,1000);await capture('b3-sequence-01-vs-recruiter.png',4);
 for(let i=0;i<70&&!((await status(p).innerText()).includes('view sendout'));i++)await tick(p,25);await expect(status(p)).toContainText('view sendout');await capture('b3-sequence-02-battle-arrival.png',4);
 await beatFrame(p,16);await capture('b3-sequence-03-sendout-trainers.png',4);await beatFrame(p,40);await capture('b3-sequence-04-project-flash.png',4);await beatFrame(p,44);await capture('b3-sequence-05-project-silhouette.png',4);await beatFrame(p,56);await capture('b3-sequence-06-project-out.png',4);
 const audience='RECRUITER' as AudienceId,party=getParty(audience),project=getProject(party[0]!)!;const tree=getAuthoredTrees().find(t=>t.projectId===project.id&&t.audienceId===audience)!;const root=tree.topics[0]!,depth2=root.children![0]!,depth3=depth2.children![0]!;
 await read(p,UI_STRINGS.sendOut(project.name));await read(p,Audiences[audience]!.reactions['project-entry'][0]!);await expect(status(p)).toContainText('view root');
 for(const n of [1,3,4,5]){await p.setViewportSize(n===5?{width:1440,height:900}:{width:240*n,height:160*n});await capture(`b3-command-${n===5?'largest-fit':n+'x'}.png`,n);}await p.setViewportSize({width:960,height:640});
 await p.keyboard.press('Enter');await tick(p,120);await capture('b3-sequence-07-topic.png',4);await p.keyboard.press('Enter');await tick(p,120);await read(p,Audiences[audience]!.reactions['detail-open'][0]!);
 for(const [i,text]of root.answer.pages.entries())await read(p,text,i===0?()=>capture('b3-sequence-08-answer.png',4):undefined);
 await p.keyboard.press('Enter');await tick(p,120);await capture('b3-sequence-09-deeper-topic.png',4);await p.keyboard.press('Enter');await tick(p,120);
 for(const [i,text]of depth2.answer.pages.entries())await read(p,text,i===0?()=>capture('b3-sequence-10-deeper-answer.png',4):undefined);
 await p.keyboard.press('Enter');await tick(p,120);await p.keyboard.press('Enter');await tick(p,120);for(const text of depth3.answer.pages)await read(p,text);await read(p,Audiences[audience]!.reactions['answer-return'][0]!);await expect(p.getByRole('group',{name:'Interview topics'})).toBeVisible();await capture('b3-sequence-11-leaf-auto-parent.png',4);
 // Return to the same depth-two answer command state, matching the existing switch regression.
 await p.keyboard.press('Backspace');await p.keyboard.press('Enter');await tick(p,120);for(const text of depth2.answer.pages)await read(p,text);
 await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await tick(p,500);await expect(p.getByRole('main',{name:'Choose a project'})).toBeVisible();
 const canvas=await p.locator('canvas:not([data-bitmap])').evaluate(c=>{c.setAttribute('data-same-battle-canvas','true');return c.getAttribute('data-battle-scene');});expect(canvas).toBe('ready');
 for(const n of [1,3,4]){await p.setViewportSize({width:240*n,height:160*n});await capture(`b3-party-recruiter-${n}x.png`,n);}await p.setViewportSize({width:960,height:640});await p.keyboard.press('Backspace');await tick(p,400);await expect(status(p)).toContainText('view answer');await capture('b3-party-cancel-return-depth-4x.png',4);await p.keyboard.press('Enter');await tick(p,500);await expect(p.getByRole('main',{name:'Choose a project'})).toBeVisible();await p.keyboard.press('ArrowDown');await capture('b3-sequence-12-party-choice.png',4);await p.keyboard.press('Enter');await tick(p,120);await beatFrame(p,24);await capture('b3-sequence-13-withdraw-project.png',4);await beatFrame(p,44);await capture('b3-sequence-14-switch-silhouette.png',4);await beatFrame(p,70);await capture('b3-sequence-15-new-project.png',4);
 const next=getProject(party[1]!)!;await read(p,UI_STRINGS.sendOut(next.name));await read(p,Audiences[audience]!.reactions['project-switch'][0]!);await expect(p.locator('canvas[data-same-battle-canvas="true"]')).toHaveCount(1);await expect(p.getByRole('region',{name:'Current project'})).toContainText(next.name);await capture('b3-sequence-16-party-return-depth.png',4);
 await p.keyboard.press('Backspace');await expect(p.getByRole('group',{name:'Battle commands'})).toBeVisible();await p.keyboard.press('Backspace');await tick(p,200);await capture('b3-sequence-17-exit-line.png',4);await tick(p,800);await expect(p.getByRole('button',{name:'Start battle'})).toBeVisible();expect(errors).toEqual([]);await context.close();
});

test('B3 Engineer and Visitor Parties retain all six projects and production scene roles',async({browser})=>{
 for(const audience of ['ENGINEER','FRIEND']){const context=await browser.newContext({viewport:{width:960,height:640}}),p=await context.newPage(),capture=recorder(p,1,`battle-${audience.toLowerCase()}-captures.json`);await startArena(p,audience);await tick(p,2300);await expect(status(p)).toContainText('view sendout');await beatFrame(p,56);
 const projects=getParty(audience as AudienceId),project=getProject(projects[0]!)!;await read(p,UI_STRINGS.sendOut(project.name));await read(p,Audiences[audience]!.reactions['project-entry'][0]!);for(const n of [1,3,4]){await p.setViewportSize({width:240*n,height:160*n});await capture(`b3-command-${audience.toLowerCase()}-${n}x.png`,n);}await p.setViewportSize({width:960,height:640});
 await expect(p.locator('canvas[data-battle-opponent="224,8,false"]')).toHaveCount(1);await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await tick(p,500);const slots=p.getByRole('main',{name:'Choose a project'}).locator('button[aria-pressed]');expect(await slots.count()).toBe(6);for(const id of projects)await expect(p.getByRole('button',{name:getProject(id)!.name,exact:true})).toBeVisible();for(const n of [1,3,4]){await p.setViewportSize({width:240*n,height:160*n});await capture(`b3-party-${audience.toLowerCase()}-${n}x.png`,n);}await context.close();}
});

test('B3 physical scene and React layers remain crisp at DPR 2 and 3 with nondivisible scales',async({browser})=>{
 for(const dpr of [2,3]){const n=4,context=await browser.newContext({viewport:{width:Math.ceil(240*n/dpr),height:Math.ceil(160*n/dpr)},deviceScaleFactor:dpr}),p=await context.newPage();const capture=recorder(p,dpr,`battle-dpr-${dpr}-captures.json`);await startArena(p);await tick(p,2300);await beatFrame(p,56);await capture(`b3-sendout-dpr-${dpr}-4x.png`,n);if(dpr===2){await p.setViewportSize({width:1440,height:900});await capture('b3-largest-fit-desktop-dpr-2-11x.png',11);}await context.close();}
});

test('B3 main-game dedicated scene sleeps the world and EXIT restores the exact anchor',async({browser})=>{
 const context=await browser.newContext({viewport:{width:960,height:640}}),p=await context.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>sessionStorage.setItem('uw.progress.v1',JSON.stringify({projectsVisited:[],battlesWon:0,introSeen:true,firstEncounterDone:false})));
 await p.clock.install();await p.goto('/');await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.keyboard.press('Enter');await tick(p,700);
 const game=p.getByRole('status',{name:'Game state'});await expect(game).toContainText('Flow OVERWORLD');
 async function step(key:string,to:string){await p.keyboard.down(key);await tick(p,50);await expect(game).toContainText(`movement ${to}`);await p.keyboard.up(key);await tick(p,400);}
 await step('ArrowDown','7,6');await step('ArrowDown','7,7');for(let x=8;x<=15;x++)await step('ArrowRight',`${x},7`);await tick(p,1500);
 const {FIRST_ENCOUNTER_DIALOGUE}=await import('../../src/content/narrative');
 for(const line of FIRST_ENCOUNTER_DIALOGUE)for(const part of paginateDialogue(line,210,8)){
  await expect(p.getByRole('button',{name:/dialogue/})).toBeVisible();if(await p.getByRole('button',{name:'Reveal dialogue'}).isVisible())await p.getByRole('button',{name:'Reveal dialogue'}).click();await expect(live(p)).toHaveText(part);await p.getByRole('button',{name:'Continue dialogue'}).click();await tick(p,50);
 }
 const anchor=(await game.innerText()).match(/Map ([^;]+); room ([^;]+); player tile ([^;]+); facing ([^;]+);/)![0];await p.getByRole('group',{name:'Audience selection'}).getByRole('button',{name:'I’m hiring'}).click();await tick(p,2700);
 for(let i=0;i<60&&!(await p.locator('canvas[data-battle-scene="ready"][data-world-scene="sleeping"]').count());i++)await tick(p,25);await expect(p.locator('canvas[data-battle-scene="ready"][data-world-scene="sleeping"]')).toHaveCount(1);await expect(p.getByRole('region',{name:'Game frame'}).getByRole('alert')).toHaveCount(0);await beatFrame(p,56);
 const capture=recorder(p,1,'battle-world-captures.json');await capture('b3-main-game-battle-4x.png',4);const first=getProject(getParty('RECRUITER' as AudienceId)[0]!)!;await read(p,UI_STRINGS.sendOut(first.name));await read(p,Audiences.RECRUITER!.reactions['project-entry'][0]!);await p.keyboard.press('Backspace');await tick(p,1200);
 await expect(game).toContainText('Flow OVERWORLD');await expect(game).toContainText(anchor);await expect(p.locator('canvas[data-world-scene="awake"][data-battle-scene="unloaded"]')).toHaveCount(1);await capture('b3-main-game-exact-return-4x.png',4);expect(errors).toEqual([]);await context.close();
});


test('B3 every authored project has a production battle emblem and a readable plate',async({browser})=>{
 const context=await browser.newContext({viewport:{width:960,height:640}}),p=await context.newPage(),capture=recorder(p,1,'battle-project-captures.json');const visited=new Set<string>();await p.clock.install();
 for(const audience of ['RECRUITER','ENGINEER','FRIEND'])for(const id of getParty(audience as AudienceId)){
  if(visited.has(id))continue;visited.add(id);await p.clock.resume();await p.goto('/dev/battle');await p.getByLabel('Audience').selectOption(audience);await p.getByLabel('Starting project').selectOption(id);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.getByRole('button',{name:'Start battle'}).click();await tick(p,2400);await beatFrame(p,56);await expect(p.getByRole('region',{name:'Current project'})).toContainText(getProject(id)!.name);await expect(p.locator('[data-project-slot] [data-battle-art]')).toHaveAttribute('data-battle-art',`project-${getProject(id)!.slug}`);await capture(`b3-project-${getProject(id)!.slug}-4x.png`,4);
 }
 expect(visited.size).toBe(12);await context.close();
});
