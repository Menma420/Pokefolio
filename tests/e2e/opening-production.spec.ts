import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { decodePng, cropPixels } from '../helpers/png';
import { INTRO_NARRATION } from '../../src/content/narrative';
import { paginateDialogue } from '../../src/ui/kit/text';

test.setTimeout(120000);
const output='artifacts/phase-b';
const state=(p:Page)=>p.getByRole('status',{name:'Game state'});
async function tick(p:Page,ms:number){for(let t=0;t<ms;t+=50)await p.clock.runFor(Math.min(50,ms-t));}
async function advance(p:Page){const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.isVisible())await reveal.click();await tick(p,50);await p.getByRole('button',{name:'Continue dialogue'}).click();await tick(p,100);}
async function step(p:Page,key:string,target:string){await p.keyboard.down(key);await tick(p,50);await expect(state(p)).toContainText(`movement ${target}`);await p.keyboard.up(key);await tick(p,400);}

test('B2 complete opening sequence, native scale evidence and returning-user persistence',async({browser})=>{
 fs.mkdirSync(output,{recursive:true});const records:object[]=[];const context=await browser.newContext({viewport:{width:960,height:640},deviceScaleFactor:1});const p=await context.newPage();const failures:string[]=[];p.on('pageerror',e=>failures.push(e.message));
 await p.clock.install();await p.goto('/');await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await tick(p,250);
 async function capture(file:string,scale:number,verifyProductionPixels=true){const frame=p.getByRole('region',{name:'Game frame'});await expect(frame).toHaveAttribute('data-scale',String(scale));const box=(await frame.boundingBox())!;const bytes=await p.screenshot({path:`${output}/${file}`});const png=decodePng(bytes);const cropped=cropPixels(png,Math.round(box.x),Math.round(box.y),240*scale,160*scale);let errors=0;
  for(let y=0;y<160;y++)for(let x=0;x<240;x++){const origin=((y*scale)*cropped.width+x*scale)*4;for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=((y*scale+dy)*cropped.width+x*scale+dx)*4;if([0,1,2,3].some(c=>cropped.data[i+c]!==cropped.data[origin+c]))errors++;}}
  if(verifyProductionPixels)expect(errors,`${file}: uniform native-pixel blocks`).toBe(0);records.push({filename:file,productionPixelCheck:verifyProductionPixels,pixelBlockMismatches:errors,viewport:p.viewportSize(),dpr:1,integerScale:scale,state:await state(p).innerText(),transition:await p.locator('[data-transition]').evaluateAll(nodes=>nodes.map(n=>({type:n.getAttribute('data-transition'),frame:n.getAttribute('data-frame')}))),clock:await p.evaluate(()=>Date.now()),physicalPixels:{width:png.width,height:png.height}});fs.writeFileSync(`${output}/opening-captures.json`,JSON.stringify(records,null,2));}
 for(const n of [1,3,4]){await p.setViewportSize({width:240*n,height:160*n});await capture(`b2-title-${n}x.png`,n);}await p.setViewportSize({width:1440,height:900});await capture('b2-title-largest-fit.png',5);await p.setViewportSize({width:960,height:640});
 await expect(p.getByRole('heading',{name:'POKEFOLIO'})).toHaveCount(1);await expect(p.getByRole('main',{name:'Game title'}).locator('[data-window]')).toHaveCount(0);await expect(p.getByRole('main',{name:'Game title'}).locator('[data-cursor]')).toHaveCount(0);
 await p.keyboard.press('Enter');await tick(p,600);await expect(state(p)).toContainText('Flow INTRO');
 for(const [i,line]of INTRO_NARRATION.entries())for(const [part,page]of paginateDialogue(line,210,8).entries()){
  const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.isVisible())await reveal.click();await tick(p,50);await expect(p.locator('div[role="status"].sr-only')).toHaveText(page);
  await capture(`b2-sequence-01-intro-${i+1}-${part+1}.png`,4);
  if(i===0&&part===0){for(const n of [1,3]){await p.setViewportSize({width:240*n,height:160*n});await capture(`b2-intro-${n}x.png`,n);}await p.setViewportSize({width:1440,height:900});await capture('b2-intro-largest-fit.png',5);await p.setViewportSize({width:960,height:640});}
  await p.getByRole('button',{name:'Continue dialogue'}).click();await tick(p,100);
 }
 await tick(p,2200);await expect(state(p)).toContainText('Flow OVERWORLD');await capture('b2-sequence-02-overworld.png',4);
 await step(p,'ArrowDown','7,6');await step(p,'ArrowDown','7,7');for(let x=8;x<=14;x++)await step(p,'ArrowRight',`${x},7`);await p.keyboard.down('ArrowRight');await tick(p,50);await p.keyboard.up('ArrowRight');for(let i=0;i<100&&!((await state(p).innerText()).includes('Flow ENCOUNTER'));i++)await p.clock.runFor(5);await expect(state(p)).toContainText('Flow ENCOUNTER');await tick(p,300);await p.clock.runFor(16);await capture('b2-sequence-03-challenger-alert.png',4);
 for(let i=0;i<80;i++){if(await p.getByRole('group',{name:'Audience selection'}).isVisible())break;if(await p.getByRole('button',{name:/dialogue/}).count()){const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.isVisible())await reveal.click();await tick(p,50);await capture(`b2-sequence-04-encounter-${i}.png`,4);await advance(p);}else await tick(p,100);}
 await expect(p.getByRole('group',{name:'Audience selection'})).toBeVisible();await tick(p,1000);await capture('b2-sequence-05-audience.png',4);await p.getByRole('group',{name:'Audience selection'}).getByRole('button',{name:'I’m hiring'}).click();await tick(p,150);
 for(let i=0;i<10&&!((await state(p).innerText()).includes('Flow VS'));i++){if(await p.getByRole('button',{name:/dialogue/}).count())await advance(p);else await tick(p,100);}
 await expect(p.getByRole('main',{name:'Interview challenge'})).toBeVisible();await tick(p,1400);await expect(p.locator('[data-vs-title]')).toBeVisible();
 for(const n of [1,3,4]){await p.setViewportSize({width:240*n,height:160*n});await capture(`b2-vs-recruiter-${n}x.png`,n);}await p.setViewportSize({width:1440,height:900});await capture('b2-vs-largest-fit.png',5);await p.setViewportSize({width:960,height:640});
 for(let i=0;i<50;i++){const wipe=p.locator('[data-transition="battle-wipe"]');if(await wipe.count()&&Number(await wipe.getAttribute('data-frame'))>=6)break;await tick(p,50);}await expect(p.locator('[data-transition="battle-wipe"]')).toBeVisible();await capture('b2-sequence-06-battle-wipe.png',4);await tick(p,700);await expect(p.getByRole('main',{name:'Interview battle'})).toBeVisible();await capture('b2-sequence-07-battle-arrival-unfinished.png',4,false);
 await p.clock.resume();await p.reload();await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.getByRole('main',{name:'Game title'}).click({position:{x:4,y:4}});await tick(p,700);await expect(state(p)).toContainText('Flow OVERWORLD');await expect(p.getByRole('button',{name:/dialogue/})).toHaveCount(0);
 expect(failures).toEqual([]);await context.close();
});

test('B2 Engineer and Visitor VS portraits retain locked palettes',async({browser})=>{
 const records:object[]=[];
 for(const audience of ['ENGINEER','FRIEND']){const context=await browser.newContext({viewport:{width:960,height:640}});const p=await context.newPage();await p.clock.install();await p.goto('/dev/battle');await p.getByLabel('Audience').selectOption(audience);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.getByRole('button',{name:'Start battle'}).click();await tick(p,1400);await expect(p.locator('[data-vs-title]')).toBeVisible();await expect(p.getByRole('img',{name:'Uttkarsh challenger artwork'})).toBeVisible();for(const scale of [1,3,4,5]){await p.setViewportSize(scale===5?{width:1440,height:900}:{width:240*scale,height:160*scale});await expect(p.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale',String(scale));const filename=`b2-vs-${audience.toLowerCase()}-${scale===5?'largest-fit':scale+'x'}.png`;const bytes=await p.screenshot({path:`${output}/${filename}`});const png=decodePng(bytes);const colors=(await p.getByRole('main',{name:'Interview challenge'}).getAttribute('data-vs-colors'))!.split(',');for(const color of colors){const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));let count=0;for(let i=0;i<png.data.length;i+=4)if(rgb.every((v,c)=>v===png.data[i+c]))count++;expect(count).toBeGreaterThan(100);}records.push({filename,viewport:p.viewportSize(),dpr:1,integerScale:scale,audience,colors});}await context.close();}
 fs.writeFileSync(`${output}/opening-audience-captures.json`,JSON.stringify(records,null,2));
});
