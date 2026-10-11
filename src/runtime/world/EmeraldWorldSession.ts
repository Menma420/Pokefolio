import {FRAME_MS,type Clock,type ScheduledTask} from '../../core/clock';
import type {EncounterCancellation} from '../../core/encounter';
import {EmeraldWorld,type Body,DIRECTIONS} from '../../core/emerald/world';
import type {EmeraldBundle,Facing,SourceObject} from '../../core/emerald/types';
import type {WorldAnchor,WorldSnapshot,WorldEntity,WorldNpc,TilePosition} from '../../core/world/types';
import type {InputRouter,InputAction} from '../../core/input';
import type {Direction,MapData} from '../../domain/map';
import type {GameBridge} from '../gameBridge';
import type {WorldSessionContract} from './WorldSessionContract';

export const toSourceFacing:Record<Direction,Facing>={up:'north',down:'south',left:'west',right:'east'};
export const fromSourceFacing:Record<Facing,Direction>={north:'up',south:'down',west:'left',east:'right'};
const actionFacing:Partial<Record<InputAction,Facing>>={UP:'north',DOWN:'south',LEFT:'west',RIGHT:'east'};
export interface SourceChallengerBinding {map:string;objectEventId:number;graphicsId:string;script:string}

/** PokéFolio encounter role adapter. EmeraldWorld remains the only simulation. */
export class EmeraldWorldSession implements WorldSessionContract {
 readonly startMapId='LittlerootTown';
 readonly world:EmeraldWorld;
 private timer:ScheduledTask|undefined;
 private started=false;private disposed=false;private pendingDirection:Facing|undefined;
 private talkingNpcId:string|null=null;private removeReady:()=>void;
 private maps=new Map<string,MapData>();
 private cancelScript:(()=>void)|undefined;
 constructor(bundle:EmeraldBundle,readonly challenger:SourceChallengerBinding|null,private bridge:GameBridge,private input:InputRouter,private clock:Clock){
  const source=challenger?bundle.maps[challenger.map]?.events.object_events[challenger.objectEventId-1]:undefined;
  if(challenger&&(!source||source.graphics_id!==challenger.graphicsId||source.script!==challenger.script))throw new Error('Source challenger metadata does not match the pinned actor');
  this.world=new EmeraldWorld(bundle);this.world.paused=true;
  if(source)this.world.controlledObjects.add(source);
  this.removeReady=bridge.onEvent('worldReady',()=>{void this.initialize();});
  input.register('emerald-world-session','WORLD',action=>this.handleInput(action));
 }
 isInterior(mapId:string){return mapId!=='LittlerootTown'&&mapId!=='Route101';}
 private entityId(body:Body){if(body===this.world.player)return 'player';const map=this.world.renderer.map;const index=map.events.object_events.indexOf(body.source!)+1;return this.challenger&&map.name===this.challenger.map&&index===this.challenger.objectEventId?'challenger':`source:${map.name}:${index}`;}
 private entity(body:Body):WorldEntity{return {id:this.entityId(body),x:body.x,y:body.y,facing:fromSourceFacing[body.facing],movement:body.step?{to:{x:body.x,y:body.y},elapsedTicks:16-body.step}:null};}
 private map(){
  const {renderer}=this.world,m=renderer.map;let map=this.maps.get(m.name);
  if(!map){map={id:m.name,width:m.width,height:m.height,tileSize:16,cameraMode:'follow',layers:{ground:m.words.map(w=>w&1023),decor:m.words.map(()=>0),above:m.words.map(()=>0)},collision:m.words.map((_,i)=>renderer.cell(i%m.width,Math.floor(i/m.width)).collision?1:0),objects:[],rooms:[{id:m.name,x:0,y:0,width:m.width,height:m.height}]};this.maps.set(m.name,map);}
  return map;
 }
 getSnapshot():WorldSnapshot {
  const map=this.map();return {tick:this.world.frame,map,paused:this.world.paused,stackDepth:this.isInterior(map.id)?1:0,state:{mapId:map.id,tick:this.world.frame,cameraRoomId:map.id,talkingNpcId:this.talkingNpcId,player:this.entity(this.world.player),npcs:this.world.objects.map(body=>({...this.entity(body),route:{mode:'pingpong',points:[{x:body.x,y:body.y,waitTicks:0}]},routeIndex:0,routeDirection:1,waitTicksLeft:body.delay,blockedTicks:0} as WorldNpc))}};
 }
 private publish(){this.bridge.publishSnapshot(this.getSnapshot());}
 private async initialize(){
  if(this.started||this.disposed)return;this.started=true;this.publish();
  try{await this.bridge.send({type:'loadMap',mapId:this.world.renderer.map.name});await this.bridge.snapshot();if(!this.disposed)this.schedule(this.clock.now()+FRAME_MS);}
  catch(error){if(!this.disposed)this.bridge.emit({type:'assetFailed',key:'emerald-world-init',message:String(error)});}
 }
 private schedule(deadline:number){this.timer=this.clock.schedule(()=>{
  if(this.disposed)return;
  const p=this.world.player,previousMap=this.world.renderer.map.name,previousStep=p.step,previousFrame=this.world.frame;
  const direction=this.input.getActiveHandler()?.context==='WORLD'?(actionFacing[this.input.getHeldDirection()??'A']??this.pendingDirection):undefined;
  this.pendingDirection=undefined;this.world.tick(direction);
  // Paused title/menu/battle frames have no simulation change. Scripted actor
  // steps publish separately; don't repaint the sleeping source scene at 60Hz.
  if(this.world.frame!==previousFrame)this.publish();
  if(previousMap!==this.world.renderer.map.name)this.bridge.emit({type:'mapArrived',mapId:this.world.renderer.map.name,roomId:this.world.renderer.map.name});
  if(previousStep&&p.step===0)this.bridge.emit({type:'stepCompleted',mapId:this.world.renderer.map.name,entityId:'player',tile:{x:p.x,y:p.y},cameraRoomId:this.world.renderer.map.name});
  this.schedule(deadline+FRAME_MS);
 },Math.max(0,deadline-this.clock.now()));}
 private handleInput(action:InputAction){
  if(this.world.paused||this.world.player.step||this.world.transition)return;
  if(actionFacing[action])this.pendingDirection=actionFacing[action];
  if(action==='B'){this.endInteraction();return;}
  if(action!=='A')return;
  const p=this.world.player,d=DIRECTIONS[p.facing],actor=this.world.objects.find(o=>!o.step&&o.x===p.x+d.x&&o.y===p.y+d.y&&(o.elevation===p.elevation||o.elevation===0));
  if(!actor)return;
  actor.facing=({north:'south',south:'north',west:'east',east:'west'} as const)[p.facing];
  this.talkingNpcId=this.entityId(actor);this.publish();
  this.bridge.emit({type:'interactionRequested',mapId:this.world.renderer.map.name,targetId:this.talkingNpcId,targetType:'npc'});
  // Non-portfolio source scripts are diagnostic data, not invented dialogue.
  if(this.talkingNpcId!=='challenger')this.endInteraction();
 }
 endInteraction(){this.talkingNpcId=null;this.publish();}
 async pause(){this.world.paused=true;this.pendingDirection=undefined;this.publish();return this.bridge.send({type:'pauseWorld'});}
 async resume(){await this.bridge.send({type:'resumeWorld'});this.world.paused=false;this.publish();}
 forceResume(){this.cancelScript?.();this.world.paused=false;this.talkingNpcId=null;this.pendingDirection=undefined;this.publish();}
 private body(id:string){const b=this.world.objects.find(o=>this.entityId(o)===id);if(!b)throw new Error(`Unknown source actor ${id}`);return b;}
 async faceEntity(id:string,facing:Direction){this.body(id).facing=toSourceFacing[facing];this.publish();await this.bridge.send({type:'faceEntity',entityId:id,facing});}
 showExclaim(entityId:string){return this.bridge.send({type:'showExclaim',entityId});}
 async moveEntityTo(id:string,tile:TilePosition,signal:EncounterCancellation){
  const body=this.body(id);
  while(body.x!==tile.x||body.y!==tile.y||body.step){
   if(signal.aborted||this.disposed)throw new Error('Source scripted movement aborted');
   if(!body.step){const dx=tile.x-body.x,dy=tile.y-body.y;const facing:Facing=dx?dx<0?'west':'east':dy<0?'north':'south';if(!this.world.stepActor(body,facing))throw new Error('Source challenger approach is blocked');}
   await new Promise<void>((resolve,reject)=>{
    let settled=false;
    const task=this.clock.schedule(()=>{if(settled)return;settled=true;removeAbort();this.cancelScript=undefined;this.world.advanceActor(body);this.publish();resolve();},FRAME_MS);
    const cancel=()=>{if(settled)return;settled=true;task.cancel();removeAbort();reject(new Error('Source scripted movement aborted'));};
    const removeAbort=signal.onAbort(cancel);this.cancelScript=cancel;
   });
  }
 }
 async restoreAnchor(anchor:WorldAnchor){
  if(!this.world.bundle.maps[anchor.mapId])throw new Error('Unknown source return map');
  this.world.restorePlayer(anchor.mapId,anchor.tile.x,anchor.tile.y,toSourceFacing[anchor.facing]);this.talkingNpcId=null;this.pendingDirection=undefined;this.publish();
  await this.bridge.send({type:'loadMap',mapId:anchor.mapId});await this.bridge.send({type:'setCameraRoom',roomId:anchor.roomId});await this.resume();
 }
 sourceObject(id:string):SourceObject|undefined{return this.body(id).source;}
 dispose(){this.disposed=true;this.timer?.cancel();this.cancelScript?.();this.removeReady();this.input.unregister('emerald-world-session');}
}
