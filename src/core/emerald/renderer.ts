import type {EmeraldBundle,SourceMap,SourceTileset} from './types';
export const MAP_OFFSET=7;
export const toRuntimeCell=(x:number,y:number)=>({x:x+7,y:y+7});
export const toLocalCell=(x:number,y:number)=>({x:x-7,y:y-7});
export function unpackWord(word:number){return {metatileId:word&1023,collision:(word>>>10)&3,elevation:word>>>12};}
export function bgr555(word:number):[number,number,number]{return [0,5,10].map(s=>{const n=word>>>s&31;return n<<3|n>>>2;}) as [number,number,number];}
// Palette conversion is fixed; avoid allocating an RGB array for every pixel/frame.
const RGB555=new Uint8Array(32768*3);
for(let word=0;word<32768;word++)for(let c=0;c<3;c++){const v=word>>>(c*5)&31;RGB555[word*3+c]=(v<<3)|(v>>>2);}
export function layers(entries:readonly number[],kind:number):number[][]{
 const bottom=entries.slice(0,4),top=entries.slice(4,8);
 if(kind===0)return [top,bottom,[0x3014,0x3014,0x3014,0x3014]];
 if(kind===1)return [[0,0,0,0],top,bottom];
 if(kind===2)return [top,[0,0,0,0],bottom];
 throw new Error(`Unsupported source layer ${kind}`);
}
/** Exact padded-grid layout and north/south strips for the selected connected scope. */
export function runtimeGrid(bundle:EmeraldBundle,map:SourceMap){
 const width=map.width+15,height=map.height+14,words=new Uint16Array(width*height).fill(1023);
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)words[(y+7)*width+x+7]=map.words[y*map.width+x]!;
 // ScrCmd_setmetatile/MapGridSetMetatileIdAt: preserve the grid elevation.
 for(const edit of map.loadEdits??[]){const at=(edit.y+7)*width+edit.x+7;words[at]=(words[at]!&0xf000)|edit.metatileId|edit.collision;}
 for(const c of map.events.connections??[]){const target=Object.values(bundle.maps).find(m=>m.id===c.map);if(!target)continue;
  if(c.direction!=='up'&&c.direction!=='down')throw new Error('Unsupported connection direction');
  const startX=c.offset+7;
  for(let y=0;y<7;y++)for(let x=0;x<target.width;x++){
   const dx=startX+x,dy=c.direction==='up'?y:map.height+7+y,sy=c.direction==='up'?target.height-7+y:y;
   if(dx>=0&&dx<width)words[dy*width+dx]=target.words[sy*target.width+x]!;
  }
 }
 return {width,height,words};
}
export class EmeraldRenderer {
 readonly map:SourceMap;readonly grid:ReturnType<typeof runtimeGrid>;
 readonly bg=[new Uint16Array(1024),new Uint16Array(1024),new Uint16Array(1024)];
 readonly indices=new Uint8Array(1024*64);readonly palette:number[];
 camera={originX:0,originY:0,x:0,y:0,tileX:0,tileY:0,pixelX:0,pixelY:0,totalX:0,totalY:0,panX:0,panY:32};
 private animations:TileAnimationState[]=[];
 constructor(readonly bundle:EmeraldBundle,name:string,x:number,y:number){
  this.map=bundle.maps[name]!;if(!this.map)throw new Error(`Map not extracted: ${name}`);
  this.grid=runtimeGrid(bundle,this.map);const primary=bundle.tilesets[this.map.primary]!,secondary=bundle.tilesets[this.map.secondary]!;
  this.indices.set(primary.indices);this.indices.set(secondary.indices,512*64);this.palette=primary.palettes.slice(0,6).concat(secondary.palettes.slice(6,13)).flat();this.palette[0]=0;
  this.animations=[...primary.animations.map(a=>({a,base:0})),...secondary.animations.map(a=>({a,base:512}))];
  // saveBlock.pos is the runtime top-left draw origin; focus includes MAP_OFFSET.
  this.camera.originX=x;this.camera.originY=y;this.drawWhole();
 }
 block(rx:number,ry:number){const g=this.grid;if(rx>=0&&ry>=0&&rx<g.width&&ry<g.height)return g.words[ry*g.width+rx]!;return this.border(rx,ry);}
 border(rx:number,ry:number){return this.map.border[((rx+1)&1)+(((ry+1)&1)<<1)]!|0xc00;}
 cell(x:number,y:number){const {x:rx,y:ry}=toRuntimeCell(x,y),raw=this.block(rx,ry),word=raw===1023?this.border(rx,ry):raw;return {...unpackWord(word),collision:raw===1023?1:(raw>>>10)&3,elevation:raw===1023?0:raw>>>12,rawWord:raw};}
 definition(id:number){const tileset=this.bundle.tilesets[id<512?this.map.primary:this.map.secondary]!,local=id<512?id:id-512;const entries=tileset.metatiles[local],attr=tileset.attributes[local];if(!entries||attr===undefined)throw new Error(`Missing metatile ${id}`);return {entries,attr};}
 private drawCell(rx:number,ry:number,tx:number,ty:number){
  const raw=this.block(rx,ry),id=(raw===1023?this.border(rx,ry):raw)&1023,{entries,attr}=this.definition(id);
  layers(entries,attr>>>12).forEach((values,b)=>values.forEach((word,q)=>{this.bg[b]![(ty+Math.floor(q/2))%32*32+(tx+q%2)%32]=word;}));
 }
 drawWhole(){const c=this.camera;for(let y=0;y<16;y++)for(let x=0;x<16;x++)this.drawCell(c.originX+x,c.originY+y,(c.tileX+x*2)%32,(c.tileY+y*2)%32);}
 /** Port of CameraUpdate, including C signed remainder, byte offsets and one-slice redraw. */
 moveCamera(speedX:number,speedY:number){
  const c=this.camera;let dx=0,dy=0;
  if(c.x===0&&speedX!==0)dx=Math.sign(speedX);if(c.y===0&&speedY!==0)dy=Math.sign(speedY);
  if(c.x!==0&&c.x===-speedX)dx=Math.sign(speedX);
  // Preserve the pinned engine's deltaX assignment in this branch.
  if(c.y!==0&&c.y===-speedY)dx=Math.sign(speedY);
  c.x=(c.x+speedX)%16||0;c.y=(c.y+speedY)%16||0;
  if(dx||dy){c.originX+=dx;c.originY+=dy;c.tileX=(c.tileX+dx*2+32)%32;c.tileY=(c.tileY+dy*2+32)%32;
   if(dx>0)for(let i=0;i<16;i++)this.drawCell(c.originX+14,c.originY+i,(c.tileX+28)%32,(c.tileY+i*2)%32);
   if(dx<0)for(let i=0;i<16;i++)this.drawCell(c.originX,c.originY+i,c.tileX,(c.tileY+i*2)%32);
   if(dy>0)for(let i=0;i<16;i++)this.drawCell(c.originX+i,c.originY+14,(c.tileX+i*2)%32,(c.tileY+28)%32);
   if(dy<0)for(let i=0;i<16;i++)this.drawCell(c.originX+i,c.originY,(c.tileX+i*2)%32,c.tileY);
  }
  c.pixelX=(c.pixelX+speedX+256)%256;c.pixelY=(c.pixelY+speedY+256)%256;c.totalX-=speedX;c.totalY-=speedY;
 }
 animate(frame:number){for(const {a,base} of this.animations){const timer=frame%a.counterMax;if(timer%a.period!==a.phase)continue;const index=a.order[Math.floor(timer/a.period)%a.order.length]!;this.indices.set(a.frames[index]!.slice(0,a.count*64),(base+a.slot)*64);}}
 tileIndex(entry:number,x:number,y:number){if(entry&0x400)x=7-x;if(entry&0x800)y=7-y;return this.indices[(entry&1023)*64+y*8+x]!;}
 /** GBA BG priority, transparent index zero, backdrop color zero. */
 render(objects:readonly RasterObject[]=[]){
  const c=this.camera,result=new Uint8ClampedArray(240*160*4);
  const ordered=[...objects].sort((a,b)=>b.priority-a.priority||(b.subpriority??-b.y)-(a.subpriority??-a.y)||(b.oamOrder??0)-(a.oamOrder??0));
  for(let y=0;y<160;y++)for(let x=0;x<240;x++){
   const bx=(x+c.pixelX+c.panX)&255,by=(y+c.pixelY+c.panY+8)&255,at=(by>>>3)*32+(bx>>>3);let color=this.palette[0]!;
   for(let priority=3;priority>=0;priority--){
    const bg=priority-1;if(bg>=0){const entry=this.bg[bg]![at]!,n=this.tileIndex(entry,bx&7,by&7);if(n)color=this.palette[(entry>>>12)*16+n]??0;}
    // Objects win ties against a BG of the same priority on GBA.
    for(const obj of ordered){if(obj.priority!==priority)continue;const ox=x-obj.x,oy=y-obj.y;if(ox<0||oy<0||ox>=obj.width||oy>=obj.height)continue;const n=obj.pixels[oy*obj.width+(obj.flip?obj.width-1-ox:ox)]!;if(n)color=obj.palette[n]!;}
   }
   const rgb=color*3,offset=(y*240+x)*4;result[offset]=RGB555[rgb]!;result[offset+1]=RGB555[rgb+1]!;result[offset+2]=RGB555[rgb+2]!;result[offset+3]=255;
  }
  return result;
 }
}
interface TileAnimationState {a:SourceTileset['animations'][number];base:number}
export interface RasterObject {x:number;y:number;width:number;height:number;pixels:readonly number[];palette:readonly number[];priority:number;flip:boolean;subpriority?:number;oamOrder?:number}
