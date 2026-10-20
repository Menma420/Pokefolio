import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

interface SourceState {logicalFrame:number;map:string;player:{x:number;y:number;step:number;facing:string};camera:Record<string,number>}
interface MovementSample {time:number;frame:number;pixels:number}
declare global {interface Window {__tileTiming:{start:number;done:boolean;completions:MovementSample[]}}}
const folder='artifacts/emerald-source/phase-movement-timing';
const source=(page:Page)=>page.locator('canvas[data-world-art="source-emerald"]').evaluate(c=>JSON.parse((c as HTMLCanvasElement).dataset.sourceState!) as SourceState);
async function start(page:Page){
 await page.addInitScript(()=>sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:false,projectsVisited:[],battlesWon:0})));
 await page.goto('/');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});await page.keyboard.press('Enter');
 await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD');await expect(page.locator('[data-transition]')).toHaveCount(0);
}
for(const config of [{name:'desktop',touch:false,dpr:1,cpu:1},{name:'mobile',touch:true,dpr:3,cpu:1},{name:'mobile-cpu4',touch:true,dpr:3,cpu:4}])test(`six completed source tile movements retain intended duration: ${config.name}`,async({browser},info)=>{
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:config.touch?{width:390,height:844}:{width:960,height:640},deviceScaleFactor:config.dpr,isMobile:config.touch,hasTouch:config.touch});
 try{
  const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:config.cpu});await start(page);
  await page.evaluate(()=>{
   const canvas=document.querySelector<HTMLCanvasElement>('canvas[data-world-art="source-emerald"]')!,read=()=>JSON.parse(canvas.dataset.sourceState!) as SourceState,initial=read();
   const stats:Window['__tileTiming']={start:performance.now(),done:false,completions:[]};window.__tileTiming=stats;let previousPixels=0;
   const observer=new MutationObserver(()=>{
    const current=read(),pixels=(initial.player.y-current.player.y)*16-current.player.step;
    for(let n=Math.max(1,Math.floor(previousPixels/16)+1);n<=Math.floor(pixels/16);n++)stats.completions.push({time:performance.now(),frame:current.logicalFrame,pixels});
    previousPixels=pixels;
    if(pixels>=96){stats.done=true;window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp',code:'ArrowUp',bubbles:true}));observer.disconnect();}
   });observer.observe(canvas,{attributes:true,attributeFilter:['data-source-state']});
   window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',code:'ArrowUp',bubbles:true}));
  });
  await expect.poll(()=>page.evaluate(()=>window.__tileTiming.done),{timeout:15000,intervals:[50]}).toBe(true);
  const stats=await page.evaluate(()=>window.__tileTiming),samples=stats.completions,elapsed=samples[5]!.time-samples[0]!.time,expected=5*16*1000/60;
  await mkdir(folder,{recursive:true});await writeFile(`${folder}/browser-${config.name}.json`,JSON.stringify({config,browser:browser.version(),stats,elapsed,expected},null,2));await page.screenshot({path:`${folder}/browser-${config.name}.png`});
  // Endpoints are observed at presentation time, with at most a late batch of
  // quantization. Old 4x scheduling takes ~2100ms here instead of 1333ms.
  expect(elapsed).toBeGreaterThan(expected*0.8);expect(elapsed).toBeLessThan(expected*1.2);
  await expect.poll(async()=>(await source(page)).player.step).toBe(0);
  expect(Object.values((await source(page)).camera).every(Number.isInteger)).toBe(true);
  if(config.touch){
   // Exercise the actual touch handler as well as the held-key timing run.
   const before=(await source(page)).player;
   await page.getByLabel('Move down',{exact:true}).tap();
   await expect.poll(async()=>(await source(page)).player).toMatchObject({x:before.x,y:before.y+1,step:0,facing:'south'});
  }
 }finally{await context.close();}
});

test('event-loop suspension does not replay held walking on resume',async({page})=>{
 await start(page);await page.keyboard.down('ArrowUp');await expect.poll(async()=>(await source(page)).player.step,{intervals:[10]}).toBeGreaterThan(0);
 // CDP frozen/active does not suspend this visible, audio-playing headless
 // target. Block the actual event loop instead; no fake timers or app hooks.
 const before=await page.evaluate(()=>{
  const state=JSON.parse(document.querySelector<HTMLCanvasElement>('canvas[data-world-art="source-emerald"]')!.dataset.sourceState!) as SourceState;
  const until=performance.now()+1500;while(performance.now()<until){/* intentional test-only suspension */}
  return state;
 });
 await expect.poll(async()=>(await source(page)).player.step).toBe(0);await page.keyboard.up('ArrowUp');
 const after=await source(page);expect(after.player).toMatchObject({x:before.player.x,y:before.player.y,step:0,facing:'north'});
 await page.waitForTimeout(350);expect((await source(page)).player).toEqual(after.player);
 await page.keyboard.press('ArrowRight');await expect.poll(async()=>(await source(page)).player).toMatchObject({x:after.player.x+1,y:after.player.y,step:0,facing:'east'});
 await mkdir(folder,{recursive:true});await writeFile(`${folder}/browser-resume.json`,JSON.stringify({method:'Actual event-loop blocked for 1.5s; desktop Chromium, not Android OS lifecycle',before,after},null,2));
});

test('hidden/visible lifecycle rebases source walking and clears held input',async({page})=>{
 await start(page);await page.keyboard.down('ArrowUp');
 await expect.poll(async()=>(await source(page)).player.step,{intervals:[10]}).toBeGreaterThan(0);
 const before=await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));
  return JSON.parse(document.querySelector<HTMLCanvasElement>('canvas[data-world-art="source-emerald"]')!.dataset.sourceState!) as SourceState;
 });
 await page.waitForTimeout(1000);expect(await source(page)).toEqual(before);
 await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');Reflect.deleteProperty(document,'visibilityState');document.dispatchEvent(new Event('visibilitychange'));});
 await page.keyboard.up('ArrowUp');await expect.poll(async()=>(await source(page)).player.step).toBe(0);
 expect((await source(page)).player).toMatchObject({x:before.player.x,y:before.player.y,step:0,facing:'north'});
 await page.waitForTimeout(350);expect((await source(page)).player).toMatchObject({x:before.player.x,y:before.player.y,step:0});
});
