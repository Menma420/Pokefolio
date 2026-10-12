import {test,expect,type Page,type Download} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {INTRO_NARRATION} from '../../src/content/narrative';
import {paginateDialogue} from '../../src/ui/kit/text';

const canvas='canvas[data-world-art="source-emerald"]';
const state=(page:Page)=>page.getByRole('status',{name:'Game state'});
const source=async(page:Page)=>JSON.parse((await page.locator(canvas).getAttribute('data-source-state'))!);
const output=process.env.EMERALD_EVIDENCE_DIR??'artifacts/emerald-source/screenshots';
async function capture(page:Page,name:string){
 await mkdir(output,{recursive:true});await page.screenshot({path:`${output}/${name}.png`});
 await writeFile(`${output}/${name}.state.json`,JSON.stringify({viewportCSS:page.viewportSize(),dpr:await page.evaluate(()=>devicePixelRatio),scale:await page.getByRole('region',{name:'Game frame'}).first().getAttribute('data-scale'),flow:await state(page).textContent(),source:await source(page)},null,2));
}
async function start(page:Page,path='/'){
 await page.addInitScript(()=>sessionStorage.setItem('uw.progress.v1',JSON.stringify({projectsVisited:[],battlesWon:0,introSeen:true,firstEncounterDone:false})));
 await page.goto(path);await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});await page.keyboard.press('Enter');
 await expect(state(page)).toContainText('Flow OVERWORLD');await expect(page.locator('[data-transition]')).toHaveCount(0);
}
async function step(page:Page,key:string){
 const s=await source(page),d=({ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]} as Record<string,number[]>)[key]!;
 await page.keyboard.press(key);
 await expect.poll(async()=>{const v=await source(page);return [v.map,v.player.x,v.player.y,v.player.step];}).toEqual([s.map,s.player.x+d[0]!,s.player.y+d[1]!,0]);
}
async function route(page:Page){
 for(let i=0;i<10;i++)await step(page,'ArrowUp');
 await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).map).toBe('Route101');
 await expect.poll(async()=>(await source(page)).player.step).toBe(0);
 // Walkable source route around the actual cliff; no teleports or dev harness.
 for(const [key,n] of [['ArrowUp',5],['ArrowLeft',3],['ArrowUp',3],['ArrowRight',9]] as const)for(let i=0;i<n;i++)await step(page,key);
}
test('source Youngster turns from behind and immediately enters the existing encounter',async({page})=>{
 await start(page);
 for(let i=0;i<10;i++)await step(page,'ArrowUp');await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).map).toBe('Route101');await expect.poll(async()=>(await source(page)).player.step).toBe(0);
 // Source walkable path to the north side avoids the south-facing sightline.
 for(const [key,n] of [['ArrowUp',4],['ArrowLeft',4],['ArrowUp',5],['ArrowRight',7],['ArrowUp',1],['ArrowRight',2],['ArrowUp',2],['ArrowRight',1]] as const)for(let i=0;i<n;i++)await step(page,key);
 expect((await source(page)).player).toMatchObject({x:16,y:7});await expect(state(page)).toContainText('Flow OVERWORLD');
 await page.keyboard.press('ArrowDown');await expect.poll(async()=>(await source(page)).player.facing).toBe('south');expect((await source(page)).player).toMatchObject({x:16,y:7,step:0});
 await page.keyboard.press('Enter');await expect(state(page)).toContainText('Flow ENCOUNTER');
 expect((await source(page)).objects.find((o:{gfx:string})=>o.gfx==='OBJ_EVENT_GFX_YOUNGSTER')).toMatchObject({x:16,y:8,facing:'north'});
 await capture(page,'integrated-behind-immediate');
});
async function drain(page:Page,done:()=>Promise<boolean>){
 for(let i=0;i<100;i++){
  if(await done())return;
  const button=page.getByRole('button',{name:/^(Reveal|Continue) dialogue$/});
  if(await button.count())await button.click();
  // Let the next queued line/page mount before a second activation.
  await page.waitForTimeout(120);
 }
 throw new Error(`Speaking surface did not settle: ${await state(page).textContent()}`);
}
test('normal root: source town → Route101 challenger → interview → exact return',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 expect(await source(page)).toMatchObject({map:'LittlerootTown',player:{x:10,y:10,elevation:3}});await capture(page,'integrated-town-4x');
 await page.setViewportSize({width:240,height:160});await expect(page.getByRole('region',{name:'Game frame'}).first()).toHaveAttribute('data-scale','1');await capture(page,'integrated-town-1x');
 await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('region',{name:'Game frame'}).first()).toHaveAttribute('data-scale','5');await capture(page,'integrated-town-largest-fit');await page.setViewportSize({width:960,height:640});
 await page.keyboard.press('x');await expect(page.getByLabel('Portfolio state')).toContainText('Screen menu');await expect(page.locator('[data-transition]')).toHaveCount(0);await capture(page,'integrated-menu');await page.keyboard.press('Backspace');await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
 await page.keyboard.press('y');await expect(page.getByLabel('Portfolio state')).toContainText('Screen bag');await expect(page.locator('[data-transition]')).toHaveCount(0);await page.keyboard.press('Backspace');await expect(page.getByLabel('Portfolio state')).toHaveCount(0);await expect(page.locator('[data-transition]')).toHaveCount(0);
 await route(page);await expect(state(page)).toContainText('Flow ENCOUNTER');await capture(page,'integrated-challenger-detection');
 await expect.poll(async()=>(await source(page)).objects.find((o:{gfx:string})=>o.gfx==='OBJ_EVENT_GFX_YOUNGSTER')).toMatchObject({x:16,y:10,step:0,facing:'south'});
 await page.keyboard.press('x');await page.keyboard.press('y');await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
 await capture(page,'integrated-challenger-dialogue');
 await drain(page,()=>page.getByRole('group',{name:'Audience selection'}).isVisible());await capture(page,'integrated-audience');
 await page.keyboard.press('Enter');await expect(page.getByRole('region',{name:'Interview challenge'})).toBeVisible();await capture(page,'integrated-vs');
 await expect(state(page)).toContainText('Flow BATTLE');
 await expect(page.locator('canvas[data-battle-scene="ready"][data-world-scene="sleeping"]')).toHaveCount(1);
 await expect(page.locator('canvas[data-battle-raster][data-ready="true"]')).toHaveCount(1);
 await drain(page,async()=>await page.getByRole('group',{name:'Battle commands'}).isVisible()&&await page.getByRole('button',{name:/dialogue/}).count()===0);
 await expect(page.getByRole('region',{name:'Current project'})).toContainText('Acko Clinic');await capture(page,'integrated-actual-battle');
 await page.keyboard.press('x');await page.keyboard.press('y');await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
 await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:/dialogue/})).toBeVisible();await drain(page,()=>page.getByRole('group',{name:'Interview topics'}).isVisible());await capture(page,'integrated-topics');
 await page.keyboard.press('Enter');await expect(page.getByRole('status',{name:'Battle state'})).toContainText('Battle view answer');
 await drain(page,()=>page.getByText('UTTKARSH',{exact:true}).isVisible());
 await expect(page.getByRole('button',{name:/dialogue/})).toBeVisible();await page.getByRole('button',{name:'Reveal dialogue'}).click();await capture(page,'integrated-answer');
 await page.keyboard.press('Backspace');await expect(page.getByRole('status',{name:'Battle state'})).toContainText('Battle view topics');
 await page.keyboard.press('Backspace');await expect(page.getByRole('status',{name:'Battle state'})).toContainText('Battle view root');
 await page.keyboard.press('Backspace');await expect(state(page)).toContainText('Flow OVERWORLD',{timeout:15000});
 await expect(state(page)).toContainText('Map Route101; room Route101; player tile 16,11; facing right;');
 await expect(page.locator('canvas[data-world-scene="awake"][data-battle-scene="unloaded"]')).toHaveCount(1);
 await capture(page,'integrated-exact-return');await step(page,'ArrowLeft');
 await step(page,'ArrowRight');await expect(state(page)).toContainText('Flow OVERWORLD');
 // LOS is disabled on repeat; direct A toward the same source actor re-enters.
 await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).player.facing).toBe('north');
 await page.keyboard.press('Enter');await expect(state(page)).toContainText('Flow ENCOUNTER');await capture(page,'integrated-repeat');
 await expect(page.getByRole('region',{name:'Game frame'}).first().getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);
});
test('normal root automatic source house/lab warps and Route101 connection',async({page})=>{
 await start(page);
 for(let i=0;i<5;i++)await step(page,'ArrowLeft');await step(page,'ArrowUp');
 for(const [approach,map,ix,iy] of [
  [[], 'LittlerootTown_BrendansHouse_1F',8,8],
  [Array(9).fill('ArrowRight'),'LittlerootTown_MaysHouse_1F',2,8],
  // Follow the west side of the lab, outside all source NPC wander ranges.
  [[...Array(2).fill('ArrowDown'),...Array(5).fill('ArrowLeft'),'ArrowDown',...Array(7).fill('ArrowLeft'),...Array(6).fill('ArrowDown'),...Array(5).fill('ArrowRight'),'ArrowUp'],'LittlerootTown_ProfessorBirchsLab',6,12]
 ] as const){
  for(const key of approach)await step(page,key);
  const before=(await source(page)).player;
  await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).map).toBe(map);await expect.poll(async()=>(await source(page)).transition).toBe(null);
  await expect.poll(async()=>(await source(page)).player.step).toBe(0);expect((await source(page)).player).toMatchObject({x:ix,y:iy});await capture(page,`integrated-${map}`);
  await page.keyboard.press('ArrowDown');await expect.poll(async()=>(await source(page)).map).toBe('LittlerootTown');await expect.poll(async()=>(await source(page)).transition).toBe(null);await expect.poll(async()=>(await source(page)).player.step).toBe(0);
  expect((await source(page)).player).toMatchObject({x:before.x,y:before.y,facing:'south'});
 }
});
test('local legacy fallback retains approved world',async({page})=>{
 await start(page,'/?world=legacy');await expect(page.locator('canvas[data-world-art="source-emerald"]')).toHaveCount(0);await expect(state(page)).toContainText('player tile 7,5;');
});
test('normal root touch movement, X/Y menus and B parity',async({browser})=>{
 const context=await browser.newContext({viewport:{width:400,height:800},hasTouch:true,isMobile:true});const page=await context.newPage();await start(page);
 await page.getByLabel('Move left',{exact:true}).tap();await expect.poll(async()=>(await source(page)).player.x).toBe(9);await expect.poll(async()=>(await source(page)).player.step).toBe(0);
 await page.getByLabel('Menu (X)',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toContainText('Screen menu');await page.getByLabel('B back',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toHaveCount(0);
 await page.getByLabel('Bag (Y)',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toContainText('Screen bag');await capture(page,'integrated-touch-bag');await page.getByLabel('B back',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toHaveCount(0);await context.close();
});
test('fresh local root retains title, authored intro and persistence',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});await page.keyboard.press('Enter');
 await expect(state(page)).toContainText('Flow INTRO');await drain(page,async()=>(await state(page).textContent())!.includes('Flow OVERWORLD'));
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('uw.progress.v1')!).introSeen)).toBe(true);
 await expect(state(page)).toContainText('Map LittlerootTown');await capture(page,'integrated-fresh-intro-complete');
 await page.reload();await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});await page.keyboard.press('Enter');await expect(state(page)).toContainText('Flow OVERWORLD');
});
test('normal source root Bag opens the original PDF safely and web routes remain readable',async({page,context})=>{
 await start(page);await page.keyboard.press('y');await expect(page.getByRole('button',{name:'RESUME',exact:true})).toHaveAttribute('aria-current','true');await expect(page.locator('[data-transition]')).toHaveCount(0);
 const opened=context.waitForEvent('page'),download=new Promise<Download>(resolve=>{page.once('download',resolve);context.once('page',next=>next.once('download',resolve));});await page.keyboard.press('Enter');
 const pdf=await download,tab=await opened;expect(pdf.url()).toMatch(/\/documents\/Uttkarsh_Malviya\.pdf$/);expect(await tab.evaluate(()=>window.opener)).toBeNull();
 const response=await page.request.get('/documents/Uttkarsh_Malviya.pdf');expect(createHash('sha256').update(await response.body()).digest('hex')).toBe('1c2a144d5d245a874879f4423c7ca87831eed7002a3efa8435d8e58b65669f5e');await tab.close();
 for(const path of ['/about','/projects','/projects/pokefolio','/skills','/experience','/resume']){const r=await page.request.get(path);expect(r.status()).toBe(200);expect(await r.text()).toContain('<main');}
});

for(const [name,path] of [['source','/'],['legacy','/?world=legacy']] as const){
 test(`fresh ${name} startup stays revealed without the double blackout`,async({page})=>{
  await page.goto(path);
  await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});
  // Let Phaser boot with real time before controlling the transition clock.
  await expect.poll(()=>page.locator('canvas[data-world-raster]').evaluate(node=>{const canvas=node as HTMLCanvasElement;return canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4!==3&&v!==0);})).toBe(true);
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));await page.clock.runFor(300);
  await page.keyboard.press('Enter');await page.clock.runFor(600);await expect(state(page)).toContainText('Flow INTRO');
  for(const line of INTRO_NARRATION)for(const text of paginateDialogue(line,210,8)){
   const reveal=page.getByRole('button',{name:'Reveal dialogue'});if(await reveal.isVisible())await reveal.click();
   await expect(page.locator('div[role="status"].sr-only')).toHaveText(text);
   await page.getByRole('button',{name:'Continue dialogue'}).click();await page.clock.runFor(1);
  }
  const transition=page.locator('[data-transition="intro-reveal"]');await expect(transition).toHaveCount(1);
  const proof:object[]=[];let revealedHash='';const label=process.env.STARTUP_EVIDENCE_LABEL??'after';
  for(const target of [3,42,84,120]){
   while(Number(await transition.getAttribute('data-frame'))<target)await page.clock.runFor(5);
   const frame=Number(await transition.getAttribute('data-frame'));
   const opacity=await transition.evaluate(node=>Number((node.firstElementChild as HTMLElement).style.opacity));
   const filename=`startup-${name}-${label}-${frame}.png`;
   await mkdir(output,{recursive:true});const bytes=await page.screenshot({path:`${output}/${filename}`});
   const hash=createHash('sha256').update(bytes).digest('hex');if(!revealedHash)revealedHash=hash;
   proof.push({filename,frame,opacity,hash,viewportCSS:page.viewportSize(),dpr:await page.evaluate(()=>devicePixelRatio),scale:await page.getByRole('region',{name:'Game frame'}).first().getAttribute('data-scale'),flow:await state(page).textContent()});
   expect.soft(opacity,`revealed world must remain visible at frame ${frame}`).toBe(0);
   expect.soft(hash,`paused world pixels must stay unchanged at frame ${frame}`).toBe(revealedHash);
  }
  await writeFile(`${output}/startup-${name}-${label}.json`,JSON.stringify(proof,null,2));
  await page.clock.runFor(1000);await expect(state(page)).toContainText('Flow OVERWORLD');await expect(transition).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('uw.progress.v1')!).introSeen)).toBe(true);
  await page.clock.resume();await page.reload();await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));await page.clock.runFor(300);await page.keyboard.press('Enter');await page.clock.runFor(700);
  await expect(state(page)).toContainText('Flow OVERWORLD');await expect(page.getByRole('button',{name:/dialogue/})).toHaveCount(0);await expect(transition).toHaveCount(0);
 });
}
