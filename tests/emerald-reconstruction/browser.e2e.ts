import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const scene='[aria-label="Source-derived Littleroot Town"]';
interface State {map:string;player:{x:number;y:number;facing:string;step:number};camera:{totalX:number;totalY:number;pixelX:number;pixelY:number};logicalFrame:number;transition:unknown}
const state=async(page:Page)=>JSON.parse((await page.locator(scene).getAttribute('data-state'))!) as State;
async function ready(page:Page,path='/dev/emerald'){
 await page.goto(path,{timeout:120000});await expect(page.locator(scene)).toHaveAttribute('data-ready','true',{timeout:90000});await page.locator('[aria-label="Game frame"]').focus();
}
async function step(page:Page,key:string,dx:number,dy:number){
 const before=await state(page);await page.keyboard.press(key);
 await page.waitForFunction(({x,y,scene})=>{const v=JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!);return v.player.x!==x||v.player.y!==y||v.transition!==null;},{x:before.player.x,y:before.player.y,scene});
 await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).player.step===0,scene);
 const after=await state(page);expect([after.player.x,after.player.y]).toEqual([before.player.x+dx,before.player.y+dy]);
}
const directory=process.env.EMERALD_EVIDENCE_DIR??'artifacts/emerald-source/screenshots';
async function capture(page:Page,name:string){await mkdir(directory,{recursive:true});await page.screenshot({path:`${directory}/${name}.png`});await writeFile(`${directory}/${name}.state.json`,JSON.stringify(await state(page),null,2));}
test('private diagnostic writes do not reload the live source scene',async({page})=>{
 await ready(page);let reloads=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())reloads++;});
 const before=await state(page);await writeFile('artifacts/emerald-source/watch-probe.json',JSON.stringify({diagnostic:'watch isolation'}));
 // An absence check needs an observation interval longer than Watchpack's
 // aggregation; the following movement also proves the original scene lives.
 await page.waitForTimeout(2000);expect(reloads).toBe(0);expect((await state(page)).logicalFrame).toBeGreaterThan(before.logicalFrame);
 await step(page,'ArrowLeft',-1,0);expect(reloads).toBe(0);
});
test('source town walk, real automatic house warp, return and portfolio access',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 expect(await state(page)).toMatchObject({map:'LittlerootTown',player:{x:10,y:10}});
 for(let i=0;i<5;i++)await step(page,'ArrowLeft',-1,0);
 await step(page,'ArrowUp',0,-1);await capture(page,'door-approach-4x');
 await page.keyboard.press('ArrowUp');await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).transition!==null,scene);
 await expect.poll(async()=>(await state(page)).map).toBe('LittlerootTown_BrendansHouse_1F');
 await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).transition===null,scene);
 expect((await state(page)).player).toMatchObject({x:8,y:8});await capture(page,'brendans-house-4x');
 await page.keyboard.press('ArrowDown');await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).transition!==null,scene);
 await expect.poll(async()=>(await state(page)).map).toBe('LittlerootTown');await page.waitForFunction(scene=>{const s=JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!);return s.player.step===0&&s.transition===null;},scene);
 expect((await state(page)).player).toMatchObject({x:5,y:9,facing:'south'});
 await page.keyboard.press('x');await expect(page.getByLabel('Portfolio state')).toContainText('Screen menu');await capture(page,'source-town-portfolio-menu');await page.keyboard.press('Backspace');await expect(page.getByLabel('Portfolio state')).toHaveCount(0);expect(errors).toEqual([]);
});
test('continuous connection to Route101 and back',async({page})=>{
 await ready(page,'/dev/emerald?x=10&y=1');await step(page,'ArrowUp',0,-1);await capture(page,'connection-town-edge');
 await page.keyboard.down('ArrowUp');await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).player.step>0,scene);await page.keyboard.up('ArrowUp');await capture(page,'connection-midstep');
 await expect.poll(async()=>(await state(page)).map).toBe('Route101');expect((await state(page)).player).toMatchObject({x:10,y:19});await capture(page,'connection-route101');
 await page.keyboard.down('ArrowDown');await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).player.step>0,scene);await page.keyboard.up('ArrowDown');await expect.poll(async()=>(await state(page)).map).toBe('LittlerootTown');expect((await state(page)).player).toMatchObject({x:10,y:0});
});
for(const [x,y,map,label,ix,iy] of [[14,9,'LittlerootTown_MaysHouse_1F','mays-house',2,8],[7,17,'LittlerootTown_ProfessorBirchsLab','birchs-lab',6,12]] as const){
 test(`source entrance and exit: ${label}`,async({page})=>{
  await ready(page,`/dev/emerald?x=${x}&y=${y}`);await page.keyboard.press('ArrowUp');await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).transition!==null,scene);
  await expect.poll(async()=>(await state(page)).map).toBe(map);await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).transition===null,scene);expect((await state(page)).player).toMatchObject({x:ix,y:iy});await capture(page,`${label}-4x`);
  await page.keyboard.press('ArrowDown');await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).transition!==null,scene);await expect.poll(async()=>(await state(page)).map).toBe('LittlerootTown');await page.waitForFunction(scene=>{const v=JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!);return v.player.step===0&&v.transition===null;},scene);expect((await state(page)).player).toMatchObject({x,y,facing:'south'});
 });
}
test('source assets are indexed private data and invalid checkpoints fail visibly',async({page,request})=>{
 const response=await request.get('/dev/emerald/data');expect(response.headers()['cache-control']).toBe('no-store');const data=await response.json();expect(data.sourceCommit).toBe('731ad5bfd6e6f265508d0efcca0ba42f9dcf5881');expect(data.maps.LittlerootTown.words).toHaveLength(400);await page.goto('/dev/emerald?x=-1');await expect(page.locator('[aria-label="Game frame"]').getByRole('alert')).toContainText('Invalid source checkpoint');
});
test('native and integer-scale screenshots use identical source state',async({browser})=>{
 for(const [w,h,dpr,label] of [[240,160,1,'1x'],[720,480,1,'3x'],[960,640,1,'4x'],[1440,900,1,'largest-fit'],[800,600,3,'dpr3-scale10']] as const){
  const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr});const page=await context.newPage();await ready(page,'/dev/emerald?paused=1');await page.waitForTimeout(150);expect((await state(page)).logicalFrame).toBe(0);const n=Math.floor(Math.min(w*dpr/240,h*dpr/160));await expect(page.locator('[aria-label="Game frame"]')).toHaveAttribute('data-scale',String(n));await capture(page,`town-${label}`);
  const url=await page.locator(`${scene} canvas`).first().evaluate(c=>(c as HTMLCanvasElement).toDataURL());await writeFile(`${directory}/town-${label}-native.png`,Buffer.from(url.split(',')[1]!,'base64'));await writeFile(`${directory}/town-${label}-geometry.json`,JSON.stringify({viewportCSS:[w,h],dpr,integerScale:n,native:[240,160]},null,2));await context.close();
 }
});
test('touch movement and X/Y preserve intent parity',async({browser})=>{
 const context=await browser.newContext({viewport:{width:400,height:800},isMobile:true,hasTouch:true});const page=await context.newPage();await ready(page);await page.getByLabel('Move left',{exact:true}).tap();await expect.poll(async()=>(await state(page)).player.x).toBe(9);await page.waitForFunction(scene=>JSON.parse(document.querySelector(scene)!.getAttribute('data-state')!).player.step===0,scene);await page.getByLabel('Menu (X)',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toContainText('Screen menu');await capture(page,'touch-source-menu');await page.getByLabel('B back',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toHaveCount(0);await page.getByLabel('Bag (Y)',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toContainText('Screen bag');await context.close();
});
