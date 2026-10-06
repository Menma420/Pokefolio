import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {WORLD_TEST_MAPS,M1_TOWN_MAP_ID} from '../../src/content/maps';
import {collisionAt,BLOCKING_COLLISION_FLAGS,type Direction} from '../../src/domain/map';
import manifest from '../../public/assets/world/manifest.json';
import {decodePng,cropPixels} from '../helpers/png';
const out='artifacts/phase-11/npc-replacements',map=WORLD_TEST_MAPS.get(M1_TOWN_MAP_ID)!;
const atlas=JSON.parse(fs.readFileSync('public'+manifest.characters.atlas,'utf8')),image=decodePng(fs.readFileSync('public'+manifest.characters.image));
const keys={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
async function tick(p:Page,ms:number){for(let i=0;i<ms;i+=25)await p.clock.runFor(Math.min(25,ms-i));}
function route(from:{x:number;y:number},to:{x:number;y:number}){
 const blocked=new Set(map.objects.flatMap(o=>o.type==='npc'?[{x:o.x,y:o.y},...o.route.points]:o.type==='door'?[o]:[]).map(p=>`${p.x},${p.y}`));
 const queue=[{...from,steps:[] as {x:number;y:number;direction:Direction}[]}],seen=new Set([`${from.x},${from.y}`]);
 for(let i=0;i<queue.length;i++){const p=queue[i]!;if(p.x===to.x&&p.y===to.y)return p.steps;
  for(const [direction,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]] as const){const x=p.x+dx,y=p.y+dy,key=`${x},${y}`;if(x<0||y<0||x>=map.width||y>=map.height||seen.has(key)||blocked.has(key)||(collisionAt(map,x,y)&BLOCKING_COLLISION_FLAGS))continue;seen.add(key);queue.push({x,y,steps:[...p.steps,{x,y,direction}]});}
 }throw new Error('No existing walkable route to NPC viewpoint');
}
test('actual overworld displays exact Steven, exact May and the supplied Trainer neighbor',async({browser})=>{
 fs.mkdirSync(out,{recursive:true});const context=await browser.newContext({viewport:{width:960,height:640}}),p=await context.newPage(),errors:string[]=[],captures:object[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:true,projectsVisited:[],battlesWon:0}));localStorage.setItem('uw.hints.v1',JSON.stringify({seenHowToPlay:true,seenBattleUI:true,seenFirstMove:true,seenFirstInteract:true,seenPokedex:true,seenTrainerCard:true}));});
 await p.clock.install();await p.goto('/');await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.keyboard.press('Enter');await tick(p,800);
 const state=p.getByRole('status',{name:'Game state'}),canvas=p.locator('canvas[data-world-art]');await expect(state).toContainText('Flow OVERWORLD');
 async function capture(filename:string,art:string){
  const viewport=p.viewportSize()!,scale=viewport.width/240;expect(Number.isInteger(scale)).toBe(true);let name='';
  // ResizeObserver and Phaser POST_RENDER are independent beats. Wait for the
  // physical surface to display the same authored frame as the scene metadata.
  await expect.poll(async()=>{
   await tick(p,50);name=(await canvas.getAttribute('data-frame'+art))!;
   const f=atlas.frames[name].frame,reference=cropPixels(image,f.x,f.y,16,32),data=await p.locator('canvas[data-world-raster]').evaluate(el=>(el as HTMLCanvasElement).toDataURL('image/png')),surface=decodePng(Buffer.from(data.split(',')[1]!,'base64'));
   expect(surface.width).toBe(viewport.width);expect(surface.height).toBe(viewport.height);let matches=0;
   const opaque:number[]=[];for(let i=0;i<reference.data.length;i+=4)if(reference.data[i+3])opaque.push(i);
   for(let y=0;y<=128;y++)for(let x=0;x<=224;x++)if(opaque.every(i=>{const at=(((y+Math.floor(i/4/16))*scale)*surface.width+(x+(i/4)%16)*scale)*4;return [0,1,2].every(c=>surface.data[at+c]===reference.data[i+c]);}))matches++;
   return matches;
  },{timeout:5000,intervals:[10]}).toBe(1);
  await p.screenshot({path:`${out}/${filename}.png`});captures.push({filename:filename+'.png',viewportCSS:viewport,dpr:1,integerScale:scale,frame:name,goldenPixelMismatches:0,state:await state.innerText()});fs.writeFileSync(`${out}/captures.json`,JSON.stringify(captures,null,2));
 }
 await capture('may-town','npc-guide');let tile={x:7,y:5};
 async function visit(to:{x:number;y:number}){for(const step of route(tile,to)){await p.keyboard.down(keys[step.direction]);await tick(p,50);await expect(state).toContainText(`movement ${step.x},${step.y}`);await p.keyboard.up(keys[step.direction]);await tick(p,400);await expect(state).toContainText(`player tile ${step.x},${step.y};`);}tile=to;}
 await visit({x:14,y:6});await capture('steven-challenger','challenger');await visit({x:22,y:18});await capture('trainer-neighbor','npc-neighbor');await p.setViewportSize({width:720,height:480});await tick(p,100);await capture('trainer-neighbor-3x','npc-neighbor');await p.setViewportSize({width:240,height:160});await tick(p,100);await capture('trainer-neighbor-1x','npc-neighbor');expect(errors).toEqual([]);await context.close();
});
