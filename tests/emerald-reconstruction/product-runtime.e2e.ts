import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/emerald-source/phase-product-runtime';
test('production without distribution configuration stays Emerald and exposes its missing asset prerequisite',async({page,request})=>{
 await page.goto('http://127.0.0.1:3112/?world=legacy');
 await expect(page.locator('[data-game-runtime]')).toHaveAttribute('data-game-runtime','emerald');
 await expect(page.locator('[data-game-runtime]')).toHaveAttribute('data-game-assets','unavailable');
 await expect(page.getByRole('region',{name:'Game frame'}).getByRole('alert')).toContainText('Emerald asset delivery is not configured');
 await expect(page.locator('canvas[data-world-art]')).toHaveCount(0);
 await expect(page.locator('[data-art="title-background"]')).toHaveCount(0);
 expect((await request.get('http://127.0.0.1:3112/api/game-assets/world')).status()).toBe(503);
 for(const route of ['/projects','/skills','/experience','/about','/resume'])expect((await request.get('http://127.0.0.1:3112'+route)).status()).toBe(200);
 await mkdir(out,{recursive:true});await page.screenshot({path:`${out}/production-unconfigured.png`});
});
test('production root uses the delivered source world/UI/music, ignores legacy query and retains portfolio navigation',async({page,request})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
 await page.addInitScript(()=>sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:false,projectsVisited:[],battlesWon:0})));
 await page.goto('/?world=legacy');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});
 await expect(page.locator('[data-source-ui="emerald-title"]')).toHaveCount(1);await page.keyboard.press('Enter');
 await expect(page.getByRole('status',{name:'Game state'})).toContainText('Map LittlerootTown');
 await expect(page.locator('[data-game-runtime]')).toHaveAttribute('data-game-runtime','emerald');
 await expect(page.locator('[data-game-runtime]')).toHaveAttribute('data-game-assets','ready');
 await expect(page.locator('canvas[data-world-art="source-emerald"]')).toHaveCount(1);
 await expect(page.locator('[data-transition]')).toHaveCount(0);
 for(const n of [1,3,4]){await page.setViewportSize({width:240*n,height:160*n});await expect(page.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale',String(n));await page.screenshot({path:`${out}/production-littleroot-${n}x.png`});}
 await page.keyboard.press('x');await expect(page.getByLabel('Portfolio state')).toContainText('Screen menu');await expect(page.locator('[data-source-ui="start"]')).toHaveCount(1);await expect(page.locator('[data-transition]')).toHaveCount(0);await page.screenshot({path:`${out}/production-menu.png`});
 expect(requests.some(p=>p.startsWith('/dev/emerald'))).toBe(false);
 for(const route of ['/dev/emerald','/dev/emerald/data','/dev/emerald/ui','/dev/emerald/audio'])expect((await request.get(route)).status(),route).toBe(404);
 const release=JSON.parse(readFileSync('artifacts/emerald-source/delivery/release.json','utf8'));
 for(const id of ['world','ui','MUS_LITTLEROOT','MUS_BIRCH_LAB','MUS_ROUTE101']){
  const response=await request.get('/api/game-assets/'+id);expect(response.status(),id).toBe(200);
  // JSON transport may reserialize whitespace; compare decoded world/UI values.
  if(id==='world'||id==='ui')expect(await response.json()).toEqual(JSON.parse(readFileSync('artifacts/emerald-source/delivery/'+release.files[id].path,'utf8')));
  else expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(release.files[id].sha256);
 }
 expect((await request.get('/api/game-assets/MUS_VS_RIVAL')).status()).toBe(404);
 const music=await(await request.get('/api/game-assets/music')).json();expect(music.tracks.MUS_LITTLEROOT.src).toBe('/api/game-assets/MUS_LITTLEROOT');
 await writeFile(`${out}/production-requests.json`,JSON.stringify(requests,null,2));
});
