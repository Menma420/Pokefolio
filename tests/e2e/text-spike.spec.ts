import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { decodePng, histogram, cropPixels, encodePng } from '../helpers/png';
import { rasterText } from '../../src/ui/kit/bitmap';
import { palette } from '../../src/ui/kit/palette';
const text='O0 Il1 rn m Éé\nAa Zz 0123456789\n▶ ▼ ▲ ◂ ▸ ↗ …';
test('isolated rendering spike: DPR 1–3 × native scales 1–8', async ({ browser }) => {
  test.setTimeout(120000);
  const output='artifacts/phase-a/spike'; fs.mkdirSync(output,{recursive:true});
  const results=[];
  for (const dpr of [1,2,3]) {
    const context=await browser.newContext({deviceScaleFactor:dpr,viewport:{width:1100,height:1250}});
    const page=await context.newPage();
    for (let n=1;n<=8;n++) {
      await page.goto(`/dev/text-spike?n=${n}`);
      await expect(page.locator('main')).toHaveAttribute('data-ready','true');
      await page.evaluate(()=>document.fonts.ready);
      const expected=rasterText(text,128,48,n,palette.text,palette.cream,palette.shadow);
      for (const candidate of ['A','B','C']) {
        const locator=page.locator(`[data-candidate="${candidate}"]`);
        const rect=await locator.boundingBox();
        const backing=await locator.evaluate(el=>{const canvas=el.querySelector('canvas'),img=el.querySelector('img');return canvas?{kind:'canvas',width:canvas.width,height:canvas.height}:img?{kind:'native-atlas',width:img.naturalWidth,height:img.naturalHeight}:{kind:'DOM',width:null,height:null};});
        const png=await page.screenshot({path:`${output}/${candidate}-dpr${dpr}-${n}x.png`,scale:'device'});
        // Playwright's locator screenshot rounds clips to CSS pixels, which is not a physical-pixel crop at DPR 3.
        const decoded=cropPixels(decodePng(png),Math.round(rect!.x*dpr),Math.round(rect!.y*dpr),128*n,48*n), stats=histogram(decoded.data,[palette.text,palette.cream,palette.shadow]);
        let differentPixels=0;
        for(let i=0;i<expected.data.length;i+=4) if(expected.data[i]!==decoded.data[i] || expected.data[i+1]!==decoded.data[i+1] || expected.data[i+2]!==decoded.data[i+2]) differentPixels++;
        fs.writeFileSync(`${output}/${candidate}-dpr${dpr}-${n}x-glyphs.png`,encodePng(decoded));
        const edge=[];
        for(let x=0;x<Math.min(20*n,decoded.width);x++) edge.push([...decoded.data.slice(x*4,x*4+3)]);
        results.push({candidate,dpr,n,physicalWidth:decoded.width,physicalHeight:decoded.height,css:rect,backing,...stats,differentPixels,topEdgePixels:edge});
      }
    }
    await context.close();
  }
  fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));
  // A is a diagnostic control; it is expected to fail. B diagnoses CSS atlas resampling; C must meet the actual screenshot gate.
  for(const result of results.filter(r=>r.candidate==='C')) {
    expect(result.intermediatePixels,JSON.stringify(result)).toBe(0);
    expect(result.physicalWidth).toBe(128*result.n);expect(result.physicalHeight).toBe(48*result.n);
    expect(result.differentPixels,`${result.candidate}, DPR ${result.dpr}, n ${result.n}`).toBe(0);
  }
});
