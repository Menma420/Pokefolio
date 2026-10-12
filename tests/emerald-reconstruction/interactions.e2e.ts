import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {EmeraldRenderer} from '../../src/core/emerald/renderer';
import type {EmeraldBundle,Facing} from '../../src/core/emerald/types';
import npcDialogue from '../../src/content/world/npc-easter-eggs.json';
const bundle=JSON.parse(readFileSync('artifacts/emerald-source/bundle.json','utf8')) as EmeraldBundle;
const canvas='canvas[data-world-art="source-emerald"]';
interface Actor {gfx:string;x:number;y:number;previousX:number;previousY:number;facing:Facing;step:number}
interface State {logicalFrame:number;map:string;player:Actor;objects:Actor[];camera:unknown;interaction:{active:boolean;executions:number;lastTarget:string;error:string|null}}
const source=async(p:Page)=>JSON.parse((await p.locator(canvas).getAttribute('data-source-state'))!) as State;
const moves=[{dx:0,dy:-1,key:'ArrowUp',facing:'north'},{dx:0,dy:1,key:'ArrowDown',facing:'south'},{dx:-1,dy:0,key:'ArrowLeft',facing:'west'},{dx:1,dy:0,key:'ArrowRight',facing:'east'}] as const;
async function start(p:Page){await p.addInitScript(()=>sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:false,projectsVisited:[],battlesWon:0})));await p.goto('/');await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});await p.keyboard.press('Enter');await expect(p.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD');await expect(p.locator('[data-transition]')).toHaveCount(0);}
function path(s:State,x:number,y:number){
 const r=new EmeraldRenderer(bundle,s.map,s.player.x,s.player.y),m=r.map;
 const blocked=new Set(s.objects.flatMap(o=>[`${o.x},${o.y}`,`${o.previousX},${o.previousY}`]));
 const queue=[{x:s.player.x,y:s.player.y,keys:[] as string[]}],seen=new Set<string>();
 const opposite={north:'south',south:'north',west:'east',east:'west'} as const;
 while(queue.length){const at=queue.shift()!;if(at.x===x&&at.y===y)return at.keys;for(const d of moves){const nx=at.x+d.dx,ny=at.y+d.dy,key=`${nx},${ny}`,cell=r.cell(nx,ny);if(nx<0||ny<0||nx>=m.width||ny>=m.height||cell.collision||blocked.has(key)||seen.has(key)||bundle.blockedDirections[d.facing].includes(r.definition(r.cell(at.x,at.y).metatileId).attr&255)||bundle.blockedDirections[opposite[d.facing]].includes(r.definition(cell.metatileId).attr&255)||(cell.elevation!==0&&cell.elevation!==15&&cell.elevation!==3))continue;seen.add(key);queue.push({x:nx,y:ny,keys:[...at.keys,d.key]});}}
 return null;
}
async function navigate(p:Page,x:number,y:number){for(let i=0;i<160;i++){const s=await source(p);if(s.player.x===x&&s.player.y===y&&s.player.step===0)return;const keys=path(s,x,y);if(!keys?.length){await p.waitForTimeout(100);continue;}const d=moves.find(d=>d.key===keys[0])!;await p.keyboard.press(d.key);try{await expect.poll(async()=>{const n=await source(p);return [n.player.x,n.player.y,n.player.step];},{timeout:1800}).toEqual([s.player.x+d.dx,s.player.y+d.dy,0]);}catch{/* A source wanderer can occupy the next tile; replan from its new snapshot. */}}
 throw new Error('Source navigation did not settle');}
async function capture(p:Page,name:string){const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.count())await reveal.click();const dir=process.env.EMERALD_EVIDENCE_DIR??'artifacts/emerald-source/screenshots';await mkdir(dir,{recursive:true});await p.screenshot({path:`${dir}/${name}.png`});await writeFile(`${dir}/${name}.state.json`,JSON.stringify({viewportCSS:p.viewportSize(),dpr:await p.evaluate(()=>devicePixelRatio),scale:await p.getByRole('region',{name:'Game frame'}).first().getAttribute('data-scale'),source:await source(p)},null,2));}
async function talk(p:Page,gfx:string,touch=false){
 for(let i=0;i<25;i++){
  const s=await source(p),actor=s.objects.find(o=>o.gfx===gfx)!;
  const candidates=moves.map(d=>({x:actor.x-d.dx,y:actor.y-d.dy,d,keys:path(s,actor.x-d.dx,actor.y-d.dy)})).filter(v=>v.keys).sort((a,b)=>a.keys!.length-b.keys!.length);
  if(!candidates.length)throw new Error(`No reachable adjacent tile for ${gfx}`);
  const at=candidates[0]!;await navigate(p,at.x,at.y);const live=(await source(p)).objects.find(o=>o.gfx===gfx)!;
  if(live.x!==actor.x||live.y!==actor.y)continue;
  await p.keyboard.press(at.d.key);await expect.poll(async()=>(await source(p)).player.facing).toBe(at.d.facing);if(touch)await p.getByRole('button',{name:'A confirm'}).tap();else await p.keyboard.press('Enter');
  try{await expect.poll(async()=>(await source(p)).interaction.active,{timeout:1000}).toBe(true);return;}catch{continue;}
 }
 throw new Error(`NPC ${gfx} interaction never started`);
}
async function finish(p:Page){
 for(let i=0;i<100;i++){if(!(await source(p)).interaction.active)return;const button=p.getByRole('button',{name:/^(Reveal|Continue) dialogue$/});if(await button.count())await button.click();await p.waitForTimeout(80);}
 throw new Error('Source dialogue failed to release');
}
async function authoredPages(p:Page,gfx:string,repeat=false){
 const npc=npcDialogue.npcs.find(n=>n.graphicsId===gfx)!;
 const expected=(repeat?npc.repeatInteraction:npc.firstInteraction).messages.flatMap(message=>message.pages.map(lines=>lines.join('\n')));
 for(const text of expected){
  await expect(p.getByRole('button',{name:/^(Reveal|Continue) dialogue$/})).toBeVisible();
  const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.count())await reveal.click();
  await expect(p.locator('div[role="status"].sr-only')).toHaveText(text);
  await p.getByRole('button',{name:'Continue dialogue'}).click();
 }
 await expect.poll(async()=>(await source(p)).interaction.active).toBe(false);
}
async function captureEasterEgg(p:Page,gfx:string){
 const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.count())await reveal.click();
 const dir=process.env.EMERALD_EVIDENCE_DIR??'artifacts/emerald-source/phase-p0-interactions/screenshots',name=`easter-egg-${gfx.toLowerCase()}`;
 await p.screenshot({path:`${dir}/${name}.png`});await writeFile(`${dir}/${name}.state.json`,JSON.stringify({viewportCSS:p.viewportSize(),dpr:await p.evaluate(()=>devicePixelRatio),scale:await p.getByRole('region',{name:'Game frame'}).first().getAttribute('data-scale'),source:await source(p)},null,2));
}
async function sign(p:Page,script:string){const s=await source(p),bg=bundle.maps[s.map]!.events.bg_events.find(v=>v.script===script)!;const candidates=moves.filter(d=>!bg.player_facing_dir||bg.player_facing_dir.endsWith('ANY')||bg.player_facing_dir.endsWith(d.facing.toUpperCase())).map(d=>({x:bg.x-d.dx,y:bg.y-d.dy,d,keys:path(s,bg.x-d.dx,bg.y-d.dy)})).filter(v=>v.keys).sort((a,b)=>a.keys!.length-b.keys!.length);const at=candidates[0]!;expect(at,script).toBeDefined();await navigate(p,at.x,at.y);await p.keyboard.press(at.d.key);await expect.poll(async()=>(await source(p)).player.facing).toBe(at.d.facing);await p.keyboard.press('Enter');await expect.poll(async()=>(await source(p)).interaction.active).toBe(true);}
test('normal root: all town NPCs and four signs, repeat dialogue, lock and exact release',async({page})=>{
 await start(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const gfx of ['OBJ_EVENT_GFX_TWIN','OBJ_EVENT_GFX_FAT_MAN','OBJ_EVENT_GFX_BOY_2']){
  await talk(page,gfx);const before=await source(page);await captureEasterEgg(page,gfx);
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('x');await page.keyboard.press('y');expect((await source(page)).player).toMatchObject({x:before.player.x,y:before.player.y});expect((await source(page)).interaction.executions).toBe(before.interaction.executions);await expect(page.getByRole('menu')).toHaveCount(0);
  await authoredPages(page,gfx);const after=await source(page);expect(after.camera).toEqual(before.camera);expect(after.player).toMatchObject({x:before.player.x,y:before.player.y});expect(after.interaction.error).toBeNull();
  await talk(page,gfx);await authoredPages(page,gfx,true);
 }
 for(const script of ['TownSign','BirchsLabSign','BrendansHouseSign','MaysHouseSign']){await sign(page,`LittlerootTown_EventScript_${script}`);if(script==='TownSign'){await expect(page.locator('div[role="status"].sr-only')).toContainText('LITTLEROOT TOWN');await capture(page,'interaction-town-sign');}await finish(page);expect((await source(page)).interaction.error).toBeNull();}
 await sign(page,'LittlerootTown_EventScript_TownSign');const n=(await source(page)).interaction.executions;await page.keyboard.press('Enter');expect((await source(page)).interaction.executions).toBe(n);await page.keyboard.press('Backspace');await expect.poll(async()=>(await source(page)).interaction.active).toBe(false);expect(errors).toEqual([]);
});
test('normal root: ground-floor NPCs, Mom rest, lab board/books/PC and input resumes',async({page})=>{
 test.setTimeout(180000);await start(page);
 for(const [x,y,map,actors] of [[5,9,'LittlerootTown_BrendansHouse_1F',['OBJ_EVENT_GFX_MOM']],[14,9,'LittlerootTown_MaysHouse_1F',['OBJ_EVENT_GFX_WOMAN_4','OBJ_EVENT_GFX_NINJA_BOY']],[7,17,'LittlerootTown_ProfessorBirchsLab',['OBJ_EVENT_GFX_SCIENTIST_1','OBJ_EVENT_GFX_PROF_BIRCH']]] as const){
  await navigate(page,x,y);await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).map).toBe(map);await expect.poll(async()=>(await source(page)).player.step).toBe(0);
  for(const gfx of actors){await talk(page,gfx);await captureEasterEgg(page,gfx);await authoredPages(page,gfx);expect((await source(page)).interaction.error).toBeNull();await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow INTERIOR');await talk(page,gfx);await authoredPages(page,gfx,true);}
  if(map.endsWith('House_1F')){
   const tx=map.endsWith('BrendansHouse_1F')?4:6;await navigate(page,tx,5);await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).player.facing).toBe('north');await page.keyboard.press('Enter');await expect.poll(async()=>(await source(page)).interaction.active).toBe(true);await capture(page,`interaction-${map}-tv`);await finish(page);expect((await source(page)).interaction.error).toBeNull();
   if(map.endsWith('BrendansHouse_1F')){await navigate(page,3,8);await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).player.facing).toBe('north');await page.keyboard.press('Enter');await expect.poll(async()=>(await source(page)).interaction.active).toBe(true);await capture(page,'interaction-running-shoes-manual');await finish(page);}
  }
  if(map.endsWith('Lab'))for(const suffix of ['Machine','Book','Bookshelf','PC']){await sign(page,`LittlerootTown_ProfessorBirchsLab_EventScript_${suffix}`);await capture(page,`interaction-lab-${suffix.toLowerCase()}`);await finish(page);expect((await source(page)).interaction.error).toBeNull();}
  const dest=map.endsWith('BrendansHouse_1F')?[8,8]:map.endsWith('MaysHouse_1F')?[2,8]:[6,12];await navigate(page,dest[0]!,dest[1]!);await page.keyboard.press('ArrowDown');await expect.poll(async()=>(await source(page)).map).toBe('LittlerootTown');await expect.poll(async()=>(await source(page)).player.step).toBe(0);expect((await source(page)).player).toMatchObject({x,y,facing:'south'});
 }
});
test('normal root: Route101 sign uses source arrow and never triggers challenger',async({page})=>{
 await start(page);await navigate(page,10,0);await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).map).toBe('Route101');await expect.poll(async()=>(await source(page)).player.step).toBe(0);await sign(page,'Route101_EventScript_RouteSign');await expect(page.locator('div[role="status"].sr-only')).toContainText('ROUTE 101');await capture(page,'interaction-route-sign');await finish(page);await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD');expect((await source(page)).interaction.error).toBeNull();
});
test('normal root touch A/B: source town sign, paging/cancel and movement',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:400,height:800}});const page=await context.newPage();await start(page);await navigate(page,15,14);await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).player.facing).toBe('north');await page.getByRole('button',{name:'A confirm'}).tap();await expect.poll(async()=>(await source(page)).interaction.active).toBe(true);await capture(page,'interaction-touch-sign');await page.getByRole('button',{name:'B back'}).tap();await expect.poll(async()=>(await source(page)).interaction.active).toBe(false);await page.getByRole('button',{name:'Move left',exact:true}).tap();await expect.poll(async()=>(await source(page)).player.x).toBe(14);await context.close();
});

test('normal root touch NPC: A turns the source actor, B releases dialogue and Y opens Bag',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:400,height:800}});const page=await context.newPage();await start(page);await talk(page,'OBJ_EVENT_GFX_FAT_MAN',true);const before=await source(page);await capture(page,'interaction-touch-npc');await page.getByRole('button',{name:'B back'}).tap();await expect.poll(async()=>(await source(page)).interaction.active).toBe(false);expect((await source(page)).player).toMatchObject({x:before.player.x,y:before.player.y});await page.getByRole('button',{name:'Bag (Y)'}).tap();await expect(page.getByRole('region',{name:'Bag',exact:true})).toBeVisible();await context.close();
});
