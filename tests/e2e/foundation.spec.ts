import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const output='artifacts/phase-a';
test('foundation device-pixel scaling and review captures',async({browser})=>{
 fs.mkdirSync(output,{recursive:true});
 for(const dpr of [1,2,3]) {
  const context=await browser.newContext({deviceScaleFactor:dpr});
  const page=await context.newPage();
  for(const n of [1,2,3,4,5,6,7,8,10]) {
   await page.setViewportSize({width:Math.ceil(240*n/dpr),height:Math.ceil(160*n/dpr)});
   await page.goto('/dev/kit');
   await page.evaluate(()=>document.fonts.ready);
   await expect(page.getByRole('button',{name:'Continue dialogue'})).toBeVisible();
   const font=await page.evaluate(()=>document.fonts.check('8px Pokefolio'));
   expect(font).toBe(true);
   const frame=page.getByRole('region',{name:'Game frame'});
   await expect(frame).toHaveAttribute('data-scale',String(n));
   const rect=await frame.boundingBox();
   expect(rect!.width*dpr).toBeCloseTo(240*n,1);expect(rect!.height*dpr).toBeCloseTo(160*n,1);
   expect(await frame.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
   await page.screenshot({path:`${output}/kit-${n}x-dpr${dpr}.png`});
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();await page.goto('/dev/kit');await page.evaluate(()=>document.fonts.ready);
   await expect(page.getByRole('button',{name:'Continue dialogue'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale','5');
 await page.screenshot({path:`${output}/kit-largest-1440x900.png`});await context.close();
});
