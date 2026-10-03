import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('../../../artifacts/phase-a/visual-review/', import.meta.url));const records=JSON.parse(fs.readFileSync(path.join(dir,'captures.json'))).filter(r=>r.filename!=='23-native-battle-1x.png');
let browser;
async function capture(page,name,note=''){
 const frame=page.getByRole('region',{name:'Game frame',exact:true});
 const mobile=await page.evaluate(()=>matchMedia('(pointer: coarse)').matches);if(!mobile){const v=page.viewportSize();const d=await page.evaluate(()=>devicePixelRatio);await expect(frame).toHaveAttribute('data-scale',String(Math.floor(Math.min(v.width*d/240,v.height*d/160))));}const scale=Number(await frame.getAttribute('data-scale'));const box=await frame.boundingBox();
 const dpr=await page.evaluate(()=>devicePixelRatio);const viewport=page.viewportSize();
 const transition=await page.locator('[data-transition]').evaluateAll(es=>es.map(e=>({type:e.dataset.transition,frame:e.dataset.frame})));
 await page.screenshot({path:path.join(dir,name+'.png'),animations:'allow'});
 records.push({filename:name+'.png',viewport,dpr,scale,frame:box,transition,note});fs.writeFileSync(path.join(dir,'captures.json'),JSON.stringify(records,null,2));console.log('CAPTURE',name,viewport,dpr,scale);
}
async function newPage(viewport={width:960,height:640},extra={}){const context=await browser.newContext({viewport,deviceScaleFactor:1,...extra});return context.newPage();}
async function advance(p){const r=p.getByRole('button',{name:'Reveal dialogue',exact:true});if(await r.isVisible())await r.click();const c=p.getByRole('button',{name:'Continue dialogue',exact:true});await expect(c).toBeVisible();await c.click();await p.waitForTimeout(60);}
async function drainUntil(p,locator){for(let i=0;i<50;i++){if(await locator.isVisible() && await p.getByRole('button',{name:/dialogue/}).count()===0)return;if(await p.getByRole('button',{name:/dialogue/}).count())await advance(p);else await p.waitForTimeout(150);}throw Error('drain timed out '+await p.locator('body').innerText());}
(async()=>{browser=await chromium.launch({headless:true});const p=await newPage();await p.goto('http://127.0.0.1:3100/dev/battle');await p.getByRole('button',{name:'Start battle'}).click();await drainUntil(p,p.getByRole('group',{name:'Battle commands'}));await p.setViewportSize({width:240,height:160});await capture(p,'23-native-battle-1x','240×160 native bitmap text/window/cursor inspection; unfinished trainer and project portrait art. Shared actual battle renderer via dev entry.');await browser.close();})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});