// Offline authoring adapter for Sprite Lab's randomized Steven construction.
// Game simulation, timing and animation ownership are intentionally uninvolved.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {v07TransformPixel} from './sprite-lab-transform.mjs';
const dir=fileURLToPath(new URL('.',import.meta.url));
const source=JSON.parse(fs.readFileSync(dir+'steven.json','utf8'));
const recipe=JSON.parse(fs.readFileSync(dir+'steven-variant.json','utf8'));
const p=recipe.character;
const centered=(width,y0,y1)=>({x0:7-Math.floor((width-1)/2),x1:7-Math.floor((width-1)/2)+width-1,y0,y1});
const targets={head:centered(p.headWidth,21-p.headHeight,20),torso:centered(p.torsoWidth,21,25),arms:centered(p.torsoWidth+4,21,25),left:{x0:7-p.legWidth,x1:6,y0:26,y1:29},right:{x0:9,x1:8+p.legWidth,y0:26,y1:29},leftShoe:{x0:7-p.shoeWidth,x1:6,y0:30,y1:30},rightShoe:{x0:9,x1:8+p.shoeWidth,y0:30,y1:30}};
function slot(x,y){return y<=20?'head':y<=25?(x<4||x>11?'arms':'torso'):y<=29?(x<=7?'left':'right'):(x<=7?'leftShoe':'rightShoe');}
const frames=source.frames.map((pixels,frame)=>{
 const translation=frame>=3?1:0,canonical=frame<3?frame:frame<5?0:frame<7?1:2;
 const groups={};
 for(let y=10;y<=30;y++)for(let x=0;x<16;x++)if(source.frames[canonical][y*16+x]){const key=slot(x,y);(groups[key]??=[]).push({x,y});}
 const bounds=Object.fromEntries(Object.entries(groups).map(([key,points])=>{const x0=Math.min(...points.map(q=>q.x)),x1=Math.max(...points.map(q=>q.x)),y0=Math.min(...points.map(q=>q.y)),y1=Math.max(...points.map(q=>q.y));return[key,{x0,x1,y0,y1,width:x1-x0+1,height:y1-y0+1}];}));
 const out=Array(512).fill(0);
 for(let y=0;y<32;y++)for(let x=0;x<16;x++)if(pixels[y*16+x]){
  const normalizedY=y-translation,key=slot(x,normalizedY),b=bounds[key]??(key==='arms'?{x0:2,x1:13,y0:21,y1:25,width:12,height:5}:undefined);
  if(!b)throw Error('Missing measured Steven slot '+key);
  const t=v07TransformPixel({x:x-b.x0,y:normalizedY-b.y0,paletteIndex:pixels[y*16+x]},b,targets[key]);
  out[(t.y+translation)*16+t.x]=t.paletteIndex;
 }
 return out;
});
// Explicit Steven roles: indices 11–13 are hair, 9–10 are clothing.
// Sprite Lab's generic role guesses interpret Steven's gray hair as red skin.
const palette=[...source.palette];
palette[1]=p.colors.skinLight;palette[2]=p.colors.skinLight;palette[3]=p.colors.skinMid;palette[4]=p.colors.skinDark;
palette[9]='#536662';palette[10]='#263C39';
recipe.hairRamp.forEach((c,i)=>palette[11+i]=c);
palette[14]=p.colors.highlight;palette[15]=p.colors.outline;
const output=JSON.stringify({...source,source:'Sprite Lab randomized Steven / steven-variant.json',sourceSha256:source.sha256,palette,frames,recipe:'steven-variant.json',recipeSha256:createHash('sha256').update(fs.readFileSync(dir+'steven-variant.json')).digest('hex'),authoring:'Sprite Lab v0.8.3 integer slot transform; Steven-specific measured bands; preserved source walk translation'},null,2)+'\n';
if(process.argv.includes('--check')){
 if(fs.readFileSync(dir+'neighbor.json','utf8')!==output)throw Error('Randomized neighbor export is stale');
}else fs.writeFileSync(dir+'neighbor.json',output);
console.log('Authored nine randomized Steven-derived neighbor cells from Sprite Lab parameters.');
