import {EmeraldRenderer,type RasterObject} from './renderer';
import type {EmeraldBundle,Facing,SourceObject,SourceWarp} from './types';
export const DIRECTIONS:Record<Facing,{x:number;y:number}>={south:{x:0,y:1},north:{x:0,y:-1},west:{x:-1,y:0},east:{x:1,y:0}};
const opposite:Record<Facing,Facing>={south:'north',north:'south',west:'east',east:'west'};
const priorities=[2,2,2,2,1,2,1,2,1,2,1,2,1,0,0,2];
const subpriorities=[115,115,83,115,83,115,83,115,83,115,83,115,83,0,0,115];
export interface Body {x:number;y:number;previousX:number;previousY:number;facing:Facing;elevation:number;gfx:string;step:number;leg:number;source?:SourceObject;delay:number}
/** Walking-only field adapter. Source scripts remain data, not portfolio domain logic. */
export class EmeraldWorld {
 readonly gameStats:Record<string,number>={};televisionShowState=0;interactionShade=16;readonly interaction={active:false,lastTarget:null as string|null,executions:0,error:null as string|null,effects:[] as string[]};
 renderer:EmeraldRenderer;player:Body;objects:Body[]=[];frame=0;paused=false;notice:string|null=null;
 transition:{warp:SourceWarp;phase:number}|null=null;private arrival=false;private rng:number;
 private initialX:number;private initialY:number;
 /** External scripted control suppresses wandering, without editing source events. */
 readonly controlledObjects=new Set<SourceObject>();
 constructor(readonly bundle:EmeraldBundle,name=bundle.state.map,x=bundle.state.player.x,y=bundle.state.player.y){
  this.bundle={...bundle,state:{...bundle.state,flags:[...bundle.state.flags],vars:{...bundle.state.vars}}};
  this.rng=bundle.state.rngSeed;this.initialX=x;this.initialY=y;
  this.renderer=new EmeraldRenderer(this.bundle,name,x,y);
  this.player={x,y,previousX:x,previousY:y,facing:bundle.state.player.facing,elevation:bundle.state.player.elevation,gfx:'OBJ_EVENT_GFX_BRENDAN_NORMAL',step:0,leg:0,delay:0};this.loadObjects();
 }
 nextSourceRandom(){return this.random();}
 private random(){this.rng=(Math.imul(1103515245,this.rng)+24691)>>>0;return this.rng>>>16;}
 private loadObjects(){for(const key of Object.keys(this.bundle.state.vars))if(key.startsWith('VAR_TEMP_'))delete this.bundle.state.vars[key];this.objects=this.renderer.map.events.object_events.filter(o=>!this.bundle.state.flags.includes(o.flag)&&this.bundle.actors[o.graphics_id]).map(o=>({x:o.x,y:o.y,previousX:o.x,previousY:o.y,facing:({MOVEMENT_TYPE_FACE_UP:'north',MOVEMENT_TYPE_FACE_DOWN:'south',MOVEMENT_TYPE_FACE_LEFT:'west',MOVEMENT_TYPE_FACE_RIGHT:'east'} as Record<string,Facing>)[o.movement_type]??'south',elevation:o.elevation,gfx:o.graphics_id,step:0,leg:0,source:o,delay:[32,64,96,128][this.random()%4]!}));}
 behavior(x:number,y:number){return this.renderer.definition(this.renderer.cell(x,y).metatileId).attr&255;}
 private targetMap(id:string){return Object.values(this.bundle.maps).find(m=>m.id===id);}
 private warpAt(x:number,y:number){return this.renderer.map.events.warp_events.find(w=>w.x===x&&w.y===y&&(w.elevation===0||w.elevation===this.player.elevation));}
 private connected(x:number,y:number){const m=this.renderer.map;const direction=y<0?'up':y>=m.height?'down':x<0?'left':x>=m.width?'right':null;if(!direction)return null;const c=m.events.connections?.find(c=>c.direction===direction);if(!c)return null;const target=this.targetMap(c.map);if(!target)return null;return {target,x:x-c.offset,y:direction==='up'?y+target.height:y-m.height};}
 canMove(body:Body,direction:Facing,scripted=false){
  const d=DIRECTIONS[direction],x=body.x+d.x,y=body.y+d.y,m=this.renderer.map;
  if(x<0||y<0||x>=m.width||y>=m.height){if(body!==this.player||!this.connected(x,y))return false;}
  const cell=this.renderer.cell(x,y),a=this.behavior(body.x,body.y),b=this.behavior(x,y);
  if(cell.collision||this.bundle.blockedDirections[direction].includes(a)||this.bundle.blockedDirections[opposite[direction]].includes(b))return false;
  if(body.elevation!==0&&cell.elevation!==0&&cell.elevation!==15&&body.elevation!==cell.elevation)return false;
  if(!scripted&&body.source&&(Math.abs(x-body.source.x)>body.source.movement_range_x||Math.abs(y-body.source.y)>body.source.movement_range_y))return false;
  return ![this.player,...this.objects].some(o=>o!==body&&(o.elevation===0||body.elevation===0||o.elevation===body.elevation)&&((o.x===x&&o.y===y)||(o.previousX===x&&o.previousY===y)));
 }
 private start(body:Body,direction:Facing,force=false,scripted=false){body.facing=direction;if(!force&&!this.canMove(body,direction,scripted))return false;const d=DIRECTIONS[direction];body.previousX=body.x;body.previousY=body.y;body.x+=d.x;body.y+=d.y;body.step=16;body.leg^=1;return true;}
 stepActor(body:Body,direction:Facing){return !body.step&&this.start(body,direction,false,true);}
 advanceActor(body:Body){this.advance(body);}
 actorRaster(body:Body){return this.rasterObject(body);}
 restorePlayer(name:string,x:number,y:number,facing:Facing){
  if(this.renderer.map.name!==name||this.player.x!==x||this.player.y!==y){this.initialX=x;this.initialY=y;this.renderer=new EmeraldRenderer(this.bundle,name,x,y);this.loadObjects();}
  Object.assign(this.player,{x,y,previousX:x,previousY:y,step:0,facing});this.transition=null;
 }
 private advance(body:Body){if(!body.step)return;const d=DIRECTIONS[body.facing];if(body===this.player)this.renderer.moveCamera(d.x,d.y);body.step--;if(!body.step){body.previousX=body.x;body.previousY=body.y;const e=this.renderer.cell(body.x,body.y).elevation;if(e!==0&&e!==15)body.elevation=e;}}
 private startWarp(warp:SourceWarp){if(!this.targetMap(warp.dest_map)){this.notice=`Destination outside this slice: ${warp.dest_map}`;return false;}this.transition={warp,phase:0};return true;}
 private loadWarp(warp:SourceWarp){
  const target=this.targetMap(warp.dest_map)!,anchor=target.events.warp_events[Number(warp.dest_warp_id)]!;
  this.initialX=anchor.x;this.initialY=anchor.y;this.renderer=new EmeraldRenderer(this.bundle,target.name,anchor.x,anchor.y);
  Object.assign(this.player,{x:anchor.x,y:anchor.y,previousX:anchor.x,previousY:anchor.y,step:0,elevation:this.renderer.cell(anchor.x,anchor.y).elevation||this.player.elevation});this.loadObjects();
  // Task_ExitDoor walks south; Task_ExitNonDoor keeps the source destination tile.
  if(this.behavior(anchor.x,anchor.y)===this.bundle.behaviors.MB_ANIMATED_DOOR){this.arrival=true;this.start(this.player,'south',true);}
 }
 tick(direction?:Facing){
  if(this.paused)return;this.frame++;this.renderer.animate(this.frame);
  if(this.transition){this.transition.phase++;if(this.transition.phase===16)this.loadWarp(this.transition.warp);if(this.transition.phase>=32)this.transition=null;return;}
  if(this.player.step){this.advance(this.player);if(!this.player.step){
   if(this.arrival)this.arrival=false;
   const c=this.connected(this.player.x,this.player.y);if(c){this.initialX=c.x;this.initialY=c.y;this.renderer=new EmeraldRenderer(this.bundle,c.target.name,c.x,c.y);Object.assign(this.player,{x:c.x,y:c.y,previousX:c.x,previousY:c.y});this.loadObjects();}
  }}else if(direction){
   this.player.facing=direction;const d=DIRECTIONS[direction],next=this.warpAt(this.player.x+d.x,this.player.y+d.y),current=this.warpAt(this.player.x,this.player.y);
   if(direction==='north'&&next&&this.behavior(next.x,next.y)===this.bundle.behaviors.MB_ANIMATED_DOOR){this.startWarp(next);}
   else if(direction==='south'&&current&&this.behavior(current.x,current.y)===this.bundle.behaviors.MB_SOUTH_ARROW_WARP){this.startWarp(current);}
   else if(next&&this.behavior(next.x,next.y)===this.bundle.behaviors.MB_NON_ANIMATED_DOOR){this.startWarp(next);}
   else if(this.start(this.player,direction))this.advance(this.player);
  }
  for(const o of this.objects){if(o.step){this.advance(o);if(!o.step)o.delay=[32,64,96,128][this.random()%4]!;}
   else if(o.source?.movement_type==='MOVEMENT_TYPE_WANDER_AROUND'&&!this.controlledObjects.has(o.source)&&--o.delay<=0){const facing=(['south','north','west','east'] as const)[this.random()&3]!;if(!this.start(o,facing))o.delay=[32,64,96,128][this.random()%4]!;}}
 }
 private rasterObject(o:Body):RasterObject {
  const actor=this.bundle.actors[o.gfx]!,label=`ANIM_STD_${o.step?'GO':'FACE'}_${o.facing.toUpperCase()}`,sequence=actor.animations[label];
  // Each normal step is 16 logical frames; source GO has 8-frame poses/idle.
  const index=o.step?((o.leg?0:2)+Math.floor((16-o.step)/8))%4:0,pose=sequence?.[index%sequence.length]??{frame:0,hFlip:false};
  const d=DIRECTIONS[o.facing],px=o.step?o.previousX*16+d.x*(16-o.step):o.x*16,py=o.step?o.previousY*16+d.y*(16-o.step):o.y*16;
  const c=this.renderer.camera;
  const x=px+(7-this.initialX)*16+8-actor.width/2+c.totalX-c.panX,y=py+(7-this.initialY)*16+16-actor.height+c.totalY-c.panY-8;
  const subpriority=(subpriorities[o.elevation]!+((16-(((y+actor.height+8)&255)>>>4))<<1)+1)&255;
  return {x,y,width:actor.width,height:actor.height,pixels:actor.frames[pose.frame]!,palette:actor.palette,flip:pose.hFlip,priority:priorities[o.elevation]!,subpriority,oamOrder:o===this.player?0:this.objects.indexOf(o)+1};
 }
 pixels(){const pixels=this.renderer.render([...this.objects,this.player].map(o=>this.rasterObject(o)));if(this.transition){const phase=this.transition.phase,amount=phase<16?16-phase:phase-16;for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++){const v=pixels[i+c]!>>>3,p=Math.floor(v*amount/16);pixels[i+c]=(p<<3)|(p>>>2);}}if(this.interactionShade<16){for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++){const v=Math.floor((pixels[i+c]!>>>3)*this.interactionShade/16);pixels[i+c]=(v<<3)|(v>>>2);}}return pixels;}
 manifest(){return {sourceCommit:this.bundle.sourceCommit,interaction:{...this.interaction},checkpoint:this.bundle.state.checkpoint,map:this.renderer.map.name,gender:this.bundle.state.gender,weather:this.bundle.state.weather,scriptState:'selected ON_LOAD metatile subset executed; story VM not replayed',initialOrigin:{x:this.initialX,y:this.initialY},player:{x:this.player.x,y:this.player.y,facing:this.player.facing,elevation:this.player.elevation,step:this.player.step,leg:this.player.leg,previousX:this.player.previousX,previousY:this.player.previousY},camera:{...this.renderer.camera},flags:this.bundle.state.flags,vars:this.bundle.state.vars,logicalFrame:this.frame,rng:this.rng,objects:this.objects.map(o=>({gfx:o.gfx,x:o.x,y:o.y,previousX:o.previousX,previousY:o.previousY,elevation:o.elevation,facing:o.facing,step:o.step,leg:o.leg,delay:o.delay})),transition:this.transition,limitations:['declared diagnostic checkpoint, not emulator replay','door transition pacing and wander task scheduling are adapters, not cycle-proven','script VM, second floors, ledge jumps, weather effects outside initial slice']};}
}
