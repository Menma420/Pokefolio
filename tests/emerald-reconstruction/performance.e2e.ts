import {test,expect} from '@playwright/test';
test('animated title retains its observer; world ticks retain unchanged touch rasters',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{
  const stats={titleObservers:0,touchObservers:0,touchDraws:0};Object.assign(window,{__rasterWork:stats});
  const RO=ResizeObserver;window.ResizeObserver=class extends RO{
   observe(target:Element,options?:ResizeObserverOptions){
    if(target.closest('[data-source-ui="emerald-title"]'))stats.titleObservers++;
    if(target.closest('.touch-controller'))stats.touchObservers++;
    super.observe(target,options);
   }
  };
  const put=CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData=function(image,dx,dy,dirtyX?:number,dirtyY?:number,dirtyWidth?:number,dirtyHeight?:number){
   if(this.canvas.closest('.touch-controller'))stats.touchDraws++;
   Reflect.apply(put,this,dirtyX===undefined?[image,dx,dy]:[image,dx,dy,dirtyX,dirtyY,dirtyWidth,dirtyHeight]);
  };
  sessionStorage.setItem('uw.progress.v1',JSON.stringify({projectsVisited:[],battlesWon:0,introSeen:true,firstEncounterDone:false}));
 });
 const page=await context.newPage();await page.goto('/');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});
 const counters=()=>page.evaluate(()=>(window as unknown as {__rasterWork:{titleObservers:number;touchObservers:number;touchDraws:number}}).__rasterWork);
 const frame=()=>page.locator('[data-title-frame]').getAttribute('data-title-frame').then(Number);
 await expect.poll(frame).toBeGreaterThan(20);const before=await counters(),start=await frame();await expect.poll(frame).toBeGreaterThan(start+10);
 expect((await counters()).titleObservers).toBe(before.titleObservers);
 await page.keyboard.press('Enter');await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD');await expect(page.locator('[data-transition]')).toHaveCount(0);
 const source=()=>page.locator('canvas[data-world-art="source-emerald"]').evaluate(c=>JSON.parse((c as HTMLCanvasElement).dataset.sourceState!));
 // Wait for the initial ResizeObserver deliveries, then require real simulation updates.
 const initial=(await source()).logicalFrame;await expect.poll(async()=>(await source()).logicalFrame).toBeGreaterThan(initial+10);
 const world=await counters(),tick=(await source()).logicalFrame;await expect.poll(async()=>(await source()).logicalFrame).toBeGreaterThan(tick+20);
 expect((await counters()).touchDraws).toBe(world.touchDraws);expect((await counters()).touchObservers).toBe(world.touchObservers);
 await page.getByLabel('Move left',{exact:true}).tap();await expect.poll(async()=>(await source()).player).toMatchObject({x:9,y:10,step:0});
 expect((await counters()).touchDraws).toBeGreaterThan(world.touchDraws);
 await page.getByLabel('Menu (X)',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toContainText('Screen menu');
 await page.getByLabel('B back',{exact:true}).tap();await expect(page.getByLabel('Portfolio state')).toHaveCount(0);await context.close();
});
