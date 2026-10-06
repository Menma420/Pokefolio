import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import manifest from '../../public/assets/world/manifest.json';
import {decodePng,cropPixels} from '../helpers/png';
const out='artifacts/phase-11/brendan';
const atlas=JSON.parse(fs.readFileSync('public'+manifest.characters.atlas,'utf8'));
const atlasImage=decodePng(fs.readFileSync('public'+manifest.characters.image));
async function tick(p:Page,ms:number){for(let i=0;i<ms;i+=25)await p.clock.runFor(Math.min(25,ms-i));}
test('Brendan renders every golden direction/pose with unchanged movement anchors and crisp physical pixels',async({browser})=>{
 fs.mkdirSync(out,{recursive:true});const records:object[]=[];
 for(const [dpr,n] of [[1,1],[1,3],[1,4],[3,4]]){
  const context=await browser.newContext({deviceScaleFactor:dpr,viewport:{width:Math.ceil(240*n!/dpr!),height:Math.ceil(160*n!/dpr!)},recordVideo:dpr===1&&n===4?{dir:`${out}/recording`,size:{width:960,height:640}}:undefined}),p=await context.newPage(),errors:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:false,projectsVisited:[],battlesWon:0}));localStorage.setItem('uw.hints.v1',JSON.stringify({seenHowToPlay:true,seenBattleUI:true,seenFirstMove:true,seenFirstInteract:true,seenPokedex:true,seenTrainerCard:true}));});
  await p.clock.install();await p.goto('/');await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.keyboard.press('a');await tick(p,800);
  const status=p.getByRole('status',{name:'Game state'}),canvas=p.locator('canvas[data-world-art]'),frame=p.getByRole('region',{name:'Game frame'});
  await expect(status).toContainText('Flow OVERWORLD');await expect(frame).toHaveAttribute('data-scale',String(n));
  async function inspect(direction:string,pose:string,from:{x:number;y:number},to:{x:number;y:number}){
   const name=`player-${direction}-${pose}`;
   for(let tries=0;await canvas.getAttribute('data-frameplayer')!==name&&tries<24;tries++)await tick(p,25);
   // Flush the next Phaser post-render after observing the actual animation phase.
   await tick(p,20);await expect(canvas).toHaveAttribute('data-frameplayer',name);
   const rendered=await p.locator('canvas[data-world-raster]').evaluate(el=>{const r=el.parentElement!.querySelector('canvas[data-world-art]')!.getBoundingClientRect(),dpr=devicePixelRatio;return {data:(el as HTMLCanvasElement).toDataURL('image/png'),prefixX:Math.round(r.left*dpr)-Math.round(Math.floor(r.left)*dpr),prefixY:Math.round(r.top*dpr)-Math.round(Math.floor(r.top)*dpr)};}),bytes=Buffer.from(rendered.data.split(',')[1]!,'base64'),image=decodePng(bytes),surface=cropPixels(image,rendered.prefixX,rendered.prefixY,240*n!,160*n!),f=atlas.frames[name].frame,reference=cropPixels(atlasImage,f.x,f.y,16,32);
   fs.writeFileSync(`${out}/render-${direction}-${pose}-dpr${dpr}-${n}x.png`,bytes);
   const native=new Uint8Array(240*160*4);let mismatches=0;
   for(let y=0;y<160;y++)for(let x=0;x<240;x++){const origin=(y*n!*surface.width+x*n!)*4;native.set(surface.data.subarray(origin,origin+4),(y*240+x)*4);for(let dy=0;dy<n!;dy++)for(let dx=0;dx<n!;dx++){const at=((y*n!+dy)*surface.width+x*n!+dx)*4;for(let c=0;c<4;c++)if(surface.data[at+c]!==surface.data[origin+c])mismatches++;}}
   expect(mismatches).toBe(0);
   const opaque:number[]=[];for(let i=0;i<reference.data.length;i+=4)if(reference.data[i+3])opaque.push(i);
   const locations:{x:number;y:number}[]=[];
   for(let y=0;y<=128;y++)for(let x=0;x<=224;x++){if(opaque.every(i=>{const at=((y+Math.floor(i/4/16))*240+x+(i/4)%16)*4;return [0,1,2].every(c=>native[at+c]===reference.data[i+c]);}))locations.push({x,y});}
   expect(locations).toHaveLength(1);const camera=await canvas.evaluate(el=>({x:Number((el as HTMLCanvasElement).dataset.cameraX),y:Number((el as HTMLCanvasElement).dataset.cameraY)})),position={x:locations[0]!.x+8+camera.x,y:locations[0]!.y+32+camera.y};
   const start={x:from.x*16+8,y:from.y*16+16},end={x:to.x*16+8,y:to.y*16+16};
   for(const axis of ['x','y'] as const){expect(Number.isInteger(camera[axis])).toBe(true);expect(position[axis]).toBeGreaterThanOrEqual(Math.min(start[axis],end[axis]));expect(position[axis]).toBeLessThanOrEqual(Math.max(start[axis],end[axis]));expect(Math.abs(position[axis]-start[axis])%2).toBe(0);if(pose==='idle')expect(position[axis]).toBe(end[axis]);}
   records.push({filename:`render-${direction}-${pose}-dpr${dpr}-${n}x.png`,viewportCSS:p.viewportSize(),dpr,integerScale:n,frame:name,camera,worldAnchor:position,sourcePixelMismatches:0,physicalBlockMismatches:mismatches});fs.writeFileSync(`${out}/captures.json`,JSON.stringify(records,null,2));
  }
  let from={x:7,y:5};
  for(const [direction,key,to] of [['down','ArrowDown',{x:7,y:6}],['left','ArrowLeft',{x:6,y:6}],['up','ArrowUp',{x:6,y:5}],['right','ArrowRight',{x:7,y:5}]] as const){
   await p.keyboard.down(key);for(let tries=0;!(await status.innerText()).includes(`movement ${to.x},${to.y}`)&&tries<24;tries++)await tick(p,25);await expect(status).toContainText(`movement ${to.x},${to.y}`);await p.keyboard.up(key);for(const pose of ['0','1','2','idle'])await inspect(direction,pose,from,to);await expect(status).toContainText(`player tile ${to.x},${to.y};`);from=to;
  }
  expect(errors).toEqual([]);const video=dpr===1&&n===4?p.video():null;await p.screenshot({path:`${out}/actual-overworld-dpr${dpr}-${n}x.png`});await context.close();if(video)await video.saveAs(`${out}/four-directions.webm`);
 }
});
