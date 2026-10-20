import {FRAME_MS,type Clock,type ScheduledTask} from '../../core/clock';
import type {EncounterCancellation} from '../../core/encounter';
import {EmeraldWorld,type Body} from '../../core/emerald/world';
import type {EmeraldBundle,Facing,SourceObject} from '../../core/emerald/types';
import type {WorldAnchor,WorldSnapshot,WorldEntity,WorldNpc,TilePosition} from '../../core/world/types';
import type {InputRouter,InputAction} from '../../core/input';
import type {Direction,MapData} from '../../domain/map';
import type {GameBridge} from '../gameBridge';
import type {WorldSessionContract} from './WorldSessionContract';
import {resolveSourceInteraction,runSourceInteraction,type SourceInteractionTarget} from '../../core/emerald/interactions';
import {createNpcDialogueOverride} from './npcDialogueOverrides';

export const toSourceFacing:Record<Direction,Facing>={up:'north',down:'south',left:'west',right:'east'};
export const fromSourceFacing:Record<Facing,Direction>={north:'up',south:'down',west:'left',east:'right'};
const actionFacing:Partial<Record<InputAction,Facing>>={UP:'north',DOWN:'south',LEFT:'west',RIGHT:'east'};
export interface SourceChallengerBinding {map:string;objectEventId:number;graphicsId:string;script:string}

/** PokéFolio encounter role adapter. EmeraldWorld remains the only simulation. */
export class EmeraldWorldSession implements WorldSessionContract {
 readonly startMapId='LittlerootTown';
 readonly world:EmeraldWorld;
 private timer:ScheduledTask|undefined;
 private nextTick=0;
 // A suspended event loop is not elapsed play time. Ordinary late callbacks
 // catch up at 60 fixed ticks/s; a >=1s stall starts a fresh input timeline.
 private readonly suspendGapMs=1000;
 private resetTimeline=()=>{
  this.input.clearHeld();this.pendingDirection=undefined;
  this.nextTick=this.clock.now()+FRAME_MS;
  if(this.timer){this.timer.cancel();if(!this.disposed)this.schedule();}
 };
 private started=false;private disposed=false;private pendingDirection:Facing|undefined;
 private talkingNpcId:string|null=null;private removeReady:()=>void;
 private maps=new Map<string,MapData>();
 private cancelScript:(()=>void)|undefined;
 private interactionTarget:SourceInteractionTarget|null=null;
 private interactionCancelled=false;
 private interactionTasks=new Map<ScheduledTask,()=>void>();
 private completedNpcDialogues=new Set<string>();
 constructor(bundle:EmeraldBundle,readonly challenger:SourceChallengerBinding|null,private bridge:GameBridge,private input:InputRouter,private clock:Clock){
  const source=challenger?bundle.maps[challenger.map]?.events.object_events[challenger.objectEventId-1]:undefined;
  if(challenger&&(!source||source.graphics_id!==challenger.graphicsId||source.script!==challenger.script))throw new Error('Source challenger metadata does not match the pinned actor');
  this.world=new EmeraldWorld(bundle);this.world.paused=true;
  if(source)this.world.controlledObjects.add(source);
  this.removeReady=bridge.onEvent('worldReady',()=>{void this.initialize();});
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.resetTimeline);
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
  try{await this.bridge.send({type:'loadMap',mapId:this.world.renderer.map.name});await this.bridge.snapshot();if(!this.disposed){this.nextTick=this.clock.now()+FRAME_MS;this.schedule();}}
  catch(error){if(!this.disposed)this.bridge.emit({type:'assetFailed',key:'emerald-world-init',message:String(error)});}
 }
 private schedule(){this.timer=this.clock.schedule(()=>{
  if(this.disposed)return;
  const now=this.clock.now();
  if((typeof document!=='undefined'&&document.hidden)||now-this.nextTick>=this.suspendGapMs){this.resetTimeline();return;}
  let changed=false;
  // Snapshot/raster work can exceed FRAME_MS on a phone. Advance every due
  // source tick, not one tick per callback, and paint only the latest state.
  // Capture `now` once: time spent presenting this batch belongs to the next.
  while(!this.disposed&&this.nextTick<=now+0.001){
   this.nextTick+=FRAME_MS;
   const p=this.world.player,previousMap=this.world.renderer.map.name,previousStep=p.step,previousFrame=this.world.frame;
   const direction=this.input.getActiveHandler()?.context==='WORLD'?(actionFacing[this.input.getHeldDirection()??'A']??this.pendingDirection):undefined;
   this.pendingDirection=undefined;this.world.tick(direction);
   changed ||= this.world.frame!==previousFrame;
   // Preserve publication/event ordering at semantic boundaries. Encounter
   // ownership can pause the world here, before the next fixed tick is attempted.
   if(previousMap!==this.world.renderer.map.name||previousStep&&p.step===0){if(changed)this.publish();changed=false;}
   if(previousMap!==this.world.renderer.map.name)this.bridge.emit({type:'mapArrived',mapId:this.world.renderer.map.name,roomId:this.world.renderer.map.name});
   if(previousStep&&p.step===0)this.bridge.emit({type:'stepCompleted',mapId:this.world.renderer.map.name,entityId:'player',tile:{x:p.x,y:p.y},cameraRoomId:this.world.renderer.map.name});
  }
  // Paused title/menu/battle frames have no change. Scripted actor steps still
  // publish separately on their existing Clock choreography.
  if(changed)this.publish();
  this.schedule();
 },Math.max(0,this.nextTick-this.clock.now()));}
 private handleInput(action:InputAction){
  if(this.world.paused||this.world.player.step||this.world.transition||this.interactionTarget)return;
  if(actionFacing[action])this.pendingDirection=actionFacing[action];
  if(action==='B'){this.endInteraction();return;}
  if(action!=='A')return;
  const target=resolveSourceInteraction(this.world);if(!target)return;
  this.talkingNpcId=target.actor?this.entityId(target.actor):target.id;
  if(this.talkingNpcId==='challenger'){
   target.actor!.facing=({north:'south',south:'north',west:'east',east:'west'} as const)[this.world.player.facing];
  }else this.interactionTarget=target;
  this.publish();this.bridge.emit({type:'interactionRequested',mapId:this.world.renderer.map.name,targetId:this.talkingNpcId,targetType:target.kind});
 }
 endInteraction(){this.interactionTarget=null;this.talkingNpcId=null;this.publish();}
 cancelInteraction(){this.interactionCancelled=true;for(const [task,resolve] of this.interactionTasks){task.cancel();resolve();}this.interactionTasks.clear();}
 private waitInteraction(frames:number){
  if(this.interactionCancelled||this.disposed)return Promise.resolve();
  return new Promise<void>(resolve=>{const task=this.clock.schedule(()=>{this.interactionTasks.delete(task);resolve();},frames*FRAME_MS);this.interactionTasks.set(task,resolve);});
 }
 async runInteraction(targetId:string,present:(text:string)=>Promise<void>){
  const target=this.interactionTarget;
  if(!target||target.id!==targetId)throw new Error('Source interaction target no longer owned');
  this.interactionCancelled=false;Object.assign(this.world.interaction,{active:true,lastTarget:targetId,error:null});this.world.interaction.executions++;
  this.publish();
  const originalFacing=target.actor?.facing;
  try{
   while(target.actor?.step&&!this.interactionCancelled&&!this.disposed){await this.waitInteraction(1);this.world.advanceActor(target.actor);this.publish();}
   const override=createNpcDialogueOverride(this.world,target,this.completedNpcDialogues);
   await runSourceInteraction(this.world,target,{
    say:(text,label)=>present(override?.text(label)??text),cancelled:()=>this.interactionCancelled||this.disposed,
    facePlayer:()=>{if(target.actor){target.actor.facing=({north:'south',south:'north',west:'east',east:'west'} as const)[this.world.player.facing];this.publish();}},
    effect:async(command,args)=>{
     this.world.interaction.effects.push(`${command} ${args.join(', ')}`);
     if(command==='fadescreen'){
      if(!['FADE_TO_BLACK','FADE_FROM_BLACK'].includes(args[0]!))throw new Error(`Unsupported fade ${args[0]}`);
      for(let i=1;i<=16&&!this.interactionCancelled&&!this.disposed;i++){this.world.interactionShade=args[0]==='FADE_TO_BLACK'?16-i:i;this.publish();await this.waitInteraction(1);}
     }else if(command==='applywaitmovement'){
      const program=this.world.bundle.interactions!.programs[args[1]!];
      if(!target.actor||args[0]!==target.actor.source?.local_id||program?.join(',')!=='face_original_direction,step_end')throw new Error(`Unsupported source movement ${args.join(',')}`);
      target.actor.facing=this.world.bundle.interactions!.initialFacings[target.actor.source!.movement_type]!;this.publish();await this.waitInteraction(1);
     }else if(command==='delay')await this.waitInteraction(Number(args[0]));
     else if(command==='playfanfare'){
      // No source fanfare/audio driver in this slice. Expose the omission; don't
      // substitute a UI click or mutate the approved audio/battle implementation.
      this.world.interaction.effects.push(`AUDIO_UNAVAILABLE: ${args[0]}`);
     }else if(command==='waitfanfare')return;
     else if(command==='incrementgamestat'){const key=args[0]!;this.world.gameStats[key]=(this.world.gameStats[key]??0)+1;}
     else if(command==='special'&&args[0]==='HealPlayerParty')this.world.interaction.effects.push('NO_POKEMON_PARTY: source heal has no interview-Party HP equivalent');
     else throw new Error(`Unsupported source effect ${command} ${args.join(',')}`);
    },
   });
   if(override&&!this.interactionCancelled&&!this.disposed)this.completedNpcDialogues.add(target.id);
  }catch(error){this.world.interaction.error=String(error);throw error;}
  finally{
   this.world.interaction.active=false;this.world.interactionShade=16;
   // Stationary source movement patterns resume facing their original direction.
   // Wandering actors keep the conversation-facing pose until their next step.
   if(target.actor&&originalFacing&&target.actor.source?.movement_type.startsWith('MOVEMENT_TYPE_FACE_'))target.actor.facing=originalFacing;
   this.publish();
  }
 }
 async pause(){this.world.paused=true;this.pendingDirection=undefined;this.publish();return this.bridge.send({type:'pauseWorld'});}
 async resume(){await this.bridge.send({type:'resumeWorld'});this.world.paused=false;this.publish();}
 forceResume(){this.cancelScript?.();this.cancelInteraction();this.interactionTarget=null;this.world.paused=false;this.talkingNpcId=null;this.pendingDirection=undefined;this.publish();}
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
 dispose(){this.disposed=true;this.timer?.cancel();this.cancelScript?.();this.cancelInteraction();this.removeReady();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.resetTimeline);this.input.unregister('emerald-world-session');}
}
