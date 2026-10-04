import {AXE_SCRIPT} from '../helpers/axe';
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {decodePng,cropPixels,histogram,encodePng} from '../helpers/png';
import {rasterText} from '../../src/ui/kit/bitmap';
import {palette} from '../../src/ui/kit/palette';
test('integrated foundation: exact text pixels, palette and native composition across DPR × scale',async({browser})=>{
 test.setTimeout(120000);const out='artifacts/phase-a/integrated';fs.mkdirSync(out,{recursive:true});const results=[];
 for(const dpr of [1,2,3]){
  const context=await browser.newContext({deviceScaleFactor:dpr});const page=await context.newPage();
  for(let n=1;n<=8;n++){
   // Extra shell room keeps every requested physical scale attainable at every DPR.
   await page.setViewportSize({width:Math.ceil(240*n/dpr)+2,height:Math.ceil(160*n/dpr)+2});
   await page.goto('/dev/kit');
   await expect(page.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale',String(n));
   await expect(page.getByRole('button',{name:'Continue dialogue'})).toBeVisible();
   await expect.poll(()=>page.locator('[data-bitmap]:not([data-ready])').count()).toBe(0);
   const png=await page.screenshot({path:`${out}/kit-dpr${dpr}-${n}x.png`});const decoded=decodePng(png);
   const frame=await page.getByRole('region',{name:'Game frame'}).boundingBox();
   const crop=cropPixels(decoded,Math.round(frame!.x*dpr),Math.round(frame!.y*dpr),240*n,160*n);
   const stats=histogram(crop.data,Object.values(palette));
   const samples=await page.locator('[data-bitmap-text]').evaluateAll(elements=>elements.map(el=>{
    const r=el.getBoundingClientRect();const node=el as HTMLElement;
    return {text:node.dataset.bitmapText!,width:Number(node.dataset.nativeWidth),height:Number(node.dataset.nativeHeight),ink:node.dataset.ink!,shadow:node.dataset.shadow!,x:r.x,y:r.y};
   }));
   let glyphMismatches=0;
   for(const sample of samples){
    const actual=cropPixels(decoded,Math.round(sample.x*dpr),Math.round(sample.y*dpr),sample.width*n,sample.height*n);
    const reference=rasterText(sample.text,sample.width,sample.height,n,sample.ink,undefined,sample.shadow);
    // Compare every ink/shadow cell; transparent pixels belong to the window/background.
    for(let i=0;i<reference.data.length;i+=4)if(reference.data[i+3]&&[0,1,2].some(c=>actual.data[i+c]!==reference.data[i+c]))glyphMismatches++;
   }
   results.push({dpr,n,...stats,glyphMismatches,physicalWidth:crop.width,physicalHeight:crop.height});
   fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
   expect(stats.intermediatePixels,`DPR ${dpr}, n ${n}`).toBe(0);expect(glyphMismatches,`DPR ${dpr}, n ${n}`).toBe(0);
   fs.writeFileSync(`${out}/surface-dpr${dpr}-${n}x.png`,encodePng(crop));
  }
  await page.setViewportSize({width:1440,height:900});await page.goto('/dev/kit');
  await expect(page.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale',String(dpr===1?5:dpr===2?11:16));
  const largest=decodePng(await page.screenshot({path:`${out}/largest-dpr${dpr}.png`}));const box=await page.getByRole('region',{name:'Game frame'}).boundingBox();const scale=dpr===1?5:dpr===2?11:16;
  const surface=cropPixels(largest,Math.round(box!.x*dpr),Math.round(box!.y*dpr),240*scale,160*scale),stats=histogram(surface.data,Object.values(palette));expect(stats.intermediatePixels).toBe(0);
  fs.writeFileSync(`${out}/largest-dpr${dpr}-results.json`,JSON.stringify({dpr,n:scale,physicalWidth:surface.width,physicalHeight:surface.height,...stats},null,2));await context.close();
 }
});
test('touch safe-area, hit targets, spacing, gating and outside-surface placement',async({browser})=>{
 const out='artifacts/phase-a/touch';fs.mkdirSync(out,{recursive:true});
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:3});const page=await context.newPage();
  await page.goto('/dev/kit');await expect(page.getByRole('button',{name:'Move up'})).toBeVisible();
  await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','24px');document.documentElement.style.setProperty('--safe-bottom','20px');document.documentElement.style.setProperty('--safe-left','10px');document.documentElement.style.setProperty('--safe-right','10px');window.dispatchEvent(new Event('resize'));});
  await expect(page.getByRole('button',{name:'Continue dialogue'})).toBeVisible();
  const frame=await page.getByRole('region',{name:'Game frame'}).boundingBox();
  const buttons=await page.locator('.touch-controller button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const b of buttons){expect(b.w).toBeGreaterThanOrEqual(48);expect(b.h).toBeGreaterThanOrEqual(48);expect(b.x).toBeGreaterThanOrEqual(26);expect(b.x+b.w).toBeLessThanOrEqual(viewport.width-26);expect(b.y+b.h).toBeLessThanOrEqual(viewport.height-36);
   expect(b.x+b.w<=frame!.x||b.x>=frame!.x+frame!.width||b.y>=frame!.y+frame!.height||b.y+b.h<=frame!.y).toBe(true);
  }
  for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
   const a=buttons[i]!,b=buttons[j]!;const gapX=Math.max(a.x-b.x-b.w,b.x-a.x-a.w),gapY=Math.max(a.y-b.y-b.h,b.y-a.y-a.h);expect(Math.max(gapX,gapY)).toBeGreaterThanOrEqual(8);
  }
  await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-safe.png`});
  await page.goto('/');await expect(page.locator('.touch-controller')).toHaveAttribute('data-mode','title');await expect(page.locator('.touch-controller button')).toHaveCount(1);await expect(page.getByRole('button',{name:'A confirm'})).toBeVisible();
  await context.close();
 }
});
test('dark cursor, stepped transition captures, reduced motion and accessible text',async({page})=>{
 test.setTimeout(120000);const out='artifacts/phase-a/transitions';fs.mkdirSync(out,{recursive:true});await page.setViewportSize({width:960,height:640});
 await page.goto('/dev/kit?scene=blue');await expect(page.locator('[data-window="blue"]')).toBeVisible();await expect.poll(()=>page.locator('[data-bitmap]:not([data-ready])').count()).toBe(0);
 await page.screenshot({path:`${out}/dark-cursor-4x.png`});
 const cursor=await page.locator('[data-window="blue"] [data-cursor]').boundingBox();const pixels=cropPixels(decodePng(await page.screenshot()),Math.round(cursor!.x),Math.round(cursor!.y),32,32);const colors=histogram(pixels.data,Object.values(palette));
 expect(colors.colors[palette.onDark]).toBeGreaterThan(0);expect(colors.colors[palette.outer]).toBeGreaterThan(0);expect(colors.intermediatePixels).toBe(0);
 await page.addScriptTag({path:AXE_SCRIPT});
 const violations=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:()=>Promise<{violations:{id:string;impact:string}[]}>}}).axe;return (await axe.run()).violations.filter(v=>v.impact==='critical'||v.impact==='serious');});expect(violations).toEqual([]);
 for(const [type,frames] of Object.entries({'fade-in':[0,2,4,6,8],'title-start':[3,12,16,20,24,28],'intro-reveal':[0,42,84,126],cut:[0,1],slide:[0,1,2,3,4],'slide-close':[0,2,4],fade:[0,2,4,6,8,12,16],door:[0,3,6,9,12],flash:[0,4,8],'battle-wipe':[0,5,10,14,19,24,40],'switch-short':[0,8,16],'exit-short':[0,8,16]})){
  for(const frame of frames){await page.goto(`/dev/kit?transition=${type}&frame=${frame}`);await expect(page.locator('[data-transition]')).toHaveAttribute('data-frame',String(frame));await expect.poll(()=>page.locator('[data-bitmap]:not([data-ready])').count()).toBe(0);await page.screenshot({path:`${out}/${type}-f${frame}.png`});}
  await page.goto(`/dev/kit?transition=${type}&frame=1&reduced=1`);await expect(page.locator('[data-transition]')).toHaveAttribute('data-frame','1');await page.screenshot({path:`${out}/${type}-reduced-f1.png`});
 }
});
test('AUTO hides controls on fine-pointer laptops until the first touch on the game surface',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:960,height:640}});await context.addInitScript(()=>{const match=window.matchMedia.bind(window);window.matchMedia=query=>query==='(pointer: coarse)'?Object.defineProperty(match(query),'matches',{value:false}):match(query);});
 const page=await context.newPage();await page.goto('/dev/kit');await expect(page.locator('.touch-controller')).toHaveCount(0);await page.getByRole('region',{name:'Game frame'}).tap({position:{x:8,y:8}});await expect(page.locator('.touch-controller')).toBeVisible();await context.close();
});
test('original controller art at m=3 and m=4: every pressed state, multi-touch and dialogue gating',async({browser})=>{
 test.setTimeout(60000);const out='artifacts/phase-a/touch';const context=await browser.newContext({hasTouch:true,deviceScaleFactor:3,viewport:{width:1440,height:900}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
 for(const m of [3,4]){
  await page.goto(`/dev/kit?controller=${m}`);await expect(page.getByRole('button',{name:'Move up'})).toBeVisible();await page.screenshot({path:`${out}/m${m}-rest.png`});
  const frame=await page.getByRole('region',{name:'Game frame'}).boundingBox();
  for(const action of ['UP','DOWN','LEFT','RIGHT','A','B','X','Y']){
   const button=page.locator(`[data-action="${action}"]`),rect=await button.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(48);expect(rect!.x+rect!.width<=frame!.x||rect!.x>=frame!.x+frame!.width).toBe(true);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:rect!.x+rect!.width/2,y:rect!.y+rect!.height/2}]});await expect(button).toHaveCSS('opacity','1');await page.screenshot({path:`${out}/m${m}-${action}-pressed.png`});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(button).toHaveCSS('opacity','0.5');
  }
  const up=(await page.locator('[data-action="UP"]').boundingBox())!,a=(await page.locator('[data-action="A"]').boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:up.x+up.width/2,y:up.y+up.height/2},{id:2,x:a.x+a.width/2,y:a.y+a.height/2}]});await expect(page.locator('[data-action="UP"]')).toHaveCSS('opacity','1');await expect(page.locator('[data-action="A"]')).toHaveCSS('opacity','1');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.goto(`/dev/kit?controller=${m}&mode=dialogue`);await expect(page.locator('[data-action="X"]')).toHaveAttribute('aria-disabled','true');await expect(page.locator('[data-action="Y"]')).toHaveAttribute('aria-disabled','true');await page.screenshot({path:`${out}/m${m}-dimmed.png`});
  const x=await page.locator('[data-action="X"]').boundingBox();await page.touchscreen.tap(x!.x+x!.width/2,x!.y+x!.height/2);await expect(page.locator('[data-action="X"]')).toHaveCSS('opacity','0.5');
 }
 await context.close();
});
