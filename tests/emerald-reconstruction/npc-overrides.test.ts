import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,describe,expect,it} from 'vitest';
import content from '../../src/content/world/npc-easter-eggs.json';
import {FakeClock,FRAME_MS} from '../../src/core/clock';
import {InputRouter} from '../../src/core/input';
import type {EmeraldBundle} from '../../src/core/emerald/types';
import {resolveSourceInteraction,runSourceInteraction,type SourceInteractionTarget} from '../../src/core/emerald/interactions';
import {EmeraldWorldSession} from '../../src/runtime/world/EmeraldWorldSession';
import {createNpcDialogueOverride} from '../../src/runtime/world/npcDialogueOverrides';
import {LOCAL_SOURCE_CHALLENGER} from '../../src/runtime/world/sourceChallenger';
import {createGameBridge} from '../../src/runtime/gameBridge';
import {paginateDialogue} from '../../src/ui/kit/text';

const load=()=>JSON.parse(readFileSync('artifacts/emerald-source/bundle.json','utf8')) as EmeraldBundle;
const sessions:EmeraldWorldSession[]=[];
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
afterEach(()=>{for(const session of sessions.splice(0))session.dispose();});
function setup(map:string,id:number){
 const clock=new FakeClock(),input=new InputRouter(clock),bridge=createGameBridge(clock);
 const session=new EmeraldWorldSession(load(),LOCAL_SOURCE_CHALLENGER,bridge,input,clock);sessions.push(session);
 const world=session.world;world.restorePlayer(map,5,5,'north');
 const source=world.renderer.map.events.object_events[id-1]!,actor=world.objects.find(o=>o.source===source)!;
 const target:SourceInteractionTarget={id:`source:${map}:${id}`,kind:'npc',actor,script:source.script,x:actor.x,y:actor.y};
 async function settle<T>(promise:Promise<T>){
  let done=false;promise.finally(()=>{done=true;}).catch(()=>{});
  for(let i=0;i<250&&!done;i++){await flush();clock.tick(FRAME_MS);}expect(done).toBe(true);return promise;
 }
 async function talk(onMessage?:(text:string)=>void){
  const live=world.objects.find(o=>o.source===source)!;target.actor=live;
  // Resolve through real interaction geometry / InputRouter, never inject a target.
  let found=false;
  for(const [dx,dy,facing] of [[0,1,'north'],[0,-1,'south'],[1,0,'west'],[-1,0,'east']] as const){
   Object.assign(world.player,{x:live.x+dx,y:live.y+dy,facing,elevation:live.elevation,step:0});
   if(!world.renderer.cell(world.player.x,world.player.y).collision&&resolveSourceInteraction(world)?.actor===live){found=true;break;}
  }
  expect(found).toBe(true);world.paused=false;input.isGameFocused=true;input.handlePress('A');input.handleRelease('A');world.paused=true;
  const messages:string[]=[];
  await settle(session.runInteraction(target.id,async text=>{messages.push(text);onMessage?.(text);}));session.endInteraction();
  return messages;
 }
 return {session,world,target,clock,input,bridge,talk,settle};
}
const messages=(interaction:typeof content.npcs[number]['firstInteraction'])=>interaction.messages.map(m=>m.pages.map(p=>p.join('\n')).join('\f'));

describe.skipIf(process.env.EMERALD_TEST_SOURCE!=='1')('original PokéFolio NPC Easter-egg overrides',()=>{
 it('preserves the supplied machine-readable text verbatim, with exact two-line game pages',()=>{
  expect(createHash('sha256').update(readFileSync('src/content/world/npc-easter-eggs.json')).digest('hex')).toBe('7d8a32f6f738f0a6914075254138f76c00545c7d8f2ba698affb3e38c01e27b9');
  expect(content.npcs).toHaveLength(8);expect(new Set(content.npcs.map(n=>`${n.map}:${n.objectEventId}`)).size).toBe(8);
  for(const npc of content.npcs)for(const mode of [npc.firstInteraction,npc.repeatInteraction])for(const message of mode.messages){
   expect(paginateDialogue(message.pages.map(p=>p.join('\n')).join('\f'),210,8)).toEqual(message.pages.map(p=>p.join('\n')));
   for(const page of message.pages){expect(page.length).toBeLessThanOrEqual(2);expect(page.every(line=>line.length>0)).toBe(true);}
  }
 });
 it.each(content.npcs)('$name: verified source identity, first and repeat pages, geometry and source data intact',async npc=>{
  const {world,target,talk}=setup(npc.map,npc.objectEventId),original=JSON.stringify(world.bundle.maps),programs=JSON.stringify(world.bundle.interactions),actor={...target.actor};
  expect(world.bundle.sourceCommit).toBe(content.sourceCommit);expect(target.actor!.source).toMatchObject({graphics_id:npc.graphicsId,script:npc.script});
  expect(await talk()).toEqual(messages(npc.firstInteraction));expect(await talk()).toEqual(messages(npc.repeatInteraction));
  expect(JSON.stringify(world.bundle.maps)).toBe(original);expect(JSON.stringify(world.bundle.interactions)).toBe(programs);
  expect(target.actor).toMatchObject({x:actor.x,y:actor.y,elevation:actor.elevation,gfx:actor.gfx,step:actor.step,source:actor.source});
  // Complete history survives leaving the map, independently of source flags.
  world.restorePlayer('Route101',10,20,'north');world.restorePlayer(npc.map,5,5,'north');
  expect(await talk()).toEqual(messages(npc.repeatInteraction));
 });
 it('keeps both Mom messages around the complete rest sequence, on first and repeat interactions',async()=>{
  const npc=content.npcs.find(n=>n.id==='brendans-house-mom')!,{world,talk}=setup(npc.map,npc.objectEventId);
  for(let count=1;count<=2;count++){
   const start=world.interaction.effects.length,events:string[]=[];
   await talk(text=>{events.push(text);if(events.length===1){expect(world.interaction.effects).toHaveLength(start);expect(world.gameStats.GAME_STAT_RESTED_AT_HOME??0).toBe(count-1);}else{
    expect(world.interaction.effects.slice(start)).toEqual(['fadescreen FADE_TO_BLACK','playfanfare MUS_HEAL','AUDIO_UNAVAILABLE: MUS_HEAL','waitfanfare ','special HealPlayerParty','NO_POKEMON_PARTY: source heal has no interview-Party HP equivalent','fadescreen FADE_FROM_BLACK','incrementgamestat GAME_STAT_RESTED_AT_HOME']);
    expect(world.gameStats.GAME_STAT_RESTED_AT_HOME).toBe(count);expect(world.interactionShade).toBe(16);
   }});
   expect(events).toEqual(messages(count===1?npc.firstInteraction:npc.repeatInteraction));
  }
 });
 it('still executes Twin and aide conditional branches and flag/variable changes',async()=>{
  const twin=setup('LittlerootTown',1);twin.world.bundle.state.flags=twin.world.bundle.state.flags.filter(f=>f!=='FLAG_RESCUED_BIRCH');twin.world.bundle.state.vars.VAR_LITTLEROOT_TOWN_STATE=1;
  expect(await twin.talk()).toEqual(messages(content.npcs[0]!.firstInteraction));expect(twin.world.bundle.state.vars.VAR_LITTLEROOT_TOWN_STATE).toBe(2);
  expect(twin.world.interaction.effects).toEqual(['applywaitmovement LOCALID_LITTLEROOT_TWIN, Common_Movement_FaceOriginalDirection']);
  const aide=setup('LittlerootTown_ProfessorBirchsLab',1);aide.world.bundle.state.vars.VAR_BIRCH_LAB_STATE=0;
  await aide.talk();expect(aide.world.bundle.state.flags).toContain('FLAG_BIRCH_AIDE_MET');await aide.talk();expect(aide.world.bundle.state.flags.filter(f=>f==='FLAG_BIRCH_AIDE_MET')).toHaveLength(1);
 });
 it('does not invent a rest effect for a Mom branch that has none',async()=>{
  const {world,talk}=setup('LittlerootTown_BrendansHouse_1F',1);world.bundle.state.vars.VAR_LITTLEROOT_HOUSES_STATE_BRENDAN=4;
  expect(await talk()).toEqual([messages(content.npcs[3]!.firstInteraction)[0]]);expect(world.interaction.effects).toEqual([]);expect(world.gameStats).toEqual({});
 });
 it.each([
  ['LittlerootTown',1,'town state 0'],['LittlerootTown',1,'town state 1'],['LittlerootTown',1,'adventure started'],
  ['LittlerootTown_MaysHouse_1F',4,'rival busy'],['LittlerootTown_MaysHouse_1F',4,'Pokemon obtained'],['LittlerootTown_MaysHouse_1F',4,'Route103 defeated'],
  ['LittlerootTown_ProfessorBirchsLab',1,'aide first meeting'],
 ] as const)('preserves source branch state and effects: %s event %i (%s)',async(map,id,condition)=>{
  const overridden=setup(map,id),raw=setup(map,id);
  for(const {world} of [overridden,raw]){
   const state=world.bundle.state;
   if(condition.startsWith('town state')){state.flags=state.flags.filter(f=>f!=='FLAG_RESCUED_BIRCH');state.vars.VAR_LITTLEROOT_TOWN_STATE=condition.endsWith('1')?1:0;}
   if(condition==='adventure started')state.flags.push('FLAG_ADVENTURE_STARTED');
   if(condition==='rival busy')state.vars.VAR_LITTLEROOT_RIVAL_STATE=3;
   if(condition==='Pokemon obtained')state.flags.push('FLAG_SYS_POKEMON_GET');
   if(condition==='Route103 defeated')state.flags.push('FLAG_SYS_POKEMON_GET','FLAG_DEFEATED_RIVAL_ROUTE103');
   if(condition==='aide first meeting')state.vars.VAR_BIRCH_LAB_STATE=0;
  }
  const effects:string[]=[];
  await runSourceInteraction(raw.world,raw.target,{say:async()=>{},facePlayer:()=>{},cancelled:()=>false,effect:async(op,args)=>{effects.push(`${op} ${args.join(', ')}`);}});
  const npc=content.npcs.find(n=>n.map===map&&n.objectEventId===id)!;
  expect(await overridden.talk()).toEqual(messages(npc.firstInteraction));
  expect(overridden.world.bundle.state).toEqual(raw.world.bundle.state);expect(overridden.world.interaction.effects).toEqual(effects);
 });
 it('cancellation keeps first dialogue available and prevents post-rest effects/messages',async()=>{
  const {session,world,talk}=setup('LittlerootTown_BrendansHouse_1F',1);const first=await talk(()=>session.cancelInteraction());
  expect(first).toEqual([messages(content.npcs[3]!.firstInteraction)[0]]);expect(world.interaction.effects).toEqual([]);
  expect(await talk()).toEqual(messages(content.npcs[3]!.firstInteraction));
 });
 it('rejects identity mismatches and leaves non-NPC targets unmodified',()=>{
  const {world,target}=setup('LittlerootTown',1);
  expect(createNpcDialogueOverride(world,{...target,script:'wrong'},new Set())).toBeNull();
  expect(createNpcDialogueOverride(world,{...target,id:'source:LittlerootTown:2'},new Set())).toBeNull();
  expect(createNpcDialogueOverride(world,{...target,kind:'sign'},new Set())).toBeNull();
 });
 it('excludes the Route101 Youngster and dispatches its existing challenger event exactly once',()=>{
  const {world,target,input,bridge,session}=setup('Route101',1);expect(createNpcDialogueOverride(world,target,new Set())).toBeNull();
  expect(content.npcs.some(n=>n.map==='Route101')).toBe(false);
  Object.assign(world.player,{x:16,y:7,facing:'south',step:0});world.paused=false;input.isGameFocused=true;
  const events:string[]=[];bridge.onEvent('interactionRequested',e=>events.push(e.targetId));input.handlePress('A');input.handleRelease('A');
  expect(events).toEqual(['challenger']);expect(session.getSnapshot().state.talkingNpcId).toBe('challenger');expect(world.objects[0]!.facing).toBe('north');expect(world.interaction.executions).toBe(0);
 });
 it('retains raw source dialogue by default in the source interpreter',async()=>{
  const {world,target}=setup('LittlerootTown',2),texts:string[]=[],labels:string[]=[];
  await runSourceInteraction(world,target,{say:async(text,label)=>{texts.push(text);labels.push(label);},facePlayer:()=>{},effect:async()=>{},cancelled:()=>false});
  expect(texts.join()).toContain('PC');expect(texts.join()).not.toContain('Uttkarsh');expect(labels).toEqual(['LittlerootTown_Text_CanUsePCToStoreItems']);
 });
});
