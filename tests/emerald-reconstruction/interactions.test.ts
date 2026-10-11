import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it} from 'vitest';
import {EmeraldWorld} from '../../src/core/emerald/world';
import {resolveSourceInteraction,runSourceInteraction,type SourceInteractionTarget} from '../../src/core/emerald/interactions';
import type {EmeraldBundle} from '../../src/core/emerald/types';
import {FakeClock,FRAME_MS} from '../../src/core/clock';
import {InputRouter} from '../../src/core/input';
import {createGameBridge} from '../../src/runtime/gameBridge';
import {GameOrchestrator} from '../../src/runtime/Orchestrator';
import {EmeraldWorldSession} from '../../src/runtime/world/EmeraldWorldSession';
import {LOCAL_SOURCE_CHALLENGER} from '../../src/runtime/world/sourceChallenger';
import {progressStore,uiStore} from '../../src/runtime/stores';
import {globalDialogueService} from '../../src/runtime/services/DialogueService';
import {paginateDialogue} from '../../src/ui/kit/text';
const load=()=>JSON.parse(readFileSync('artifacts/emerald-source/bundle.json','utf8')) as EmeraldBundle;
const maps=['LittlerootTown','LittlerootTown_BrendansHouse_1F','LittlerootTown_MaysHouse_1F','LittlerootTown_ProfessorBirchsLab'];
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const instances:GameOrchestrator<EmeraldWorldSession>[]=[];
afterEach(()=>{for(const r of instances.splice(0))r.dispose();globalDialogueService.cancelAll();uiStore.getState().endTransition();progressStore.setState({introSeen:false,firstEncounterDone:false});});
function target(world:EmeraldWorld,id:number){const m=world.renderer.map,o=m.events.object_events[id-1]!,actor=world.objects.find(a=>a.source===o)!;return {id:`source:${m.name}:${id}`,kind:'npc' as const,script:o.script,actor,x:actor.x,y:actor.y};}
async function read(world:EmeraldWorld,t:SourceInteractionTarget){const messages:string[]=[],effects:string[]=[];await runSourceInteraction(world,t,{say:async text=>{messages.push(text);},facePlayer:()=>{if(t.actor)t.actor.facing='south';},cancelled:()=>false,effect:async(op,args)=>{effects.push(`${op} ${args.join(',')}`);}});return {messages,effects};}
describe.skipIf(process.env.EMERALD_TEST_SOURCE!=='1')('source NPC/background interaction dispatcher',()=>{
 it('executes every ordinary visible source NPC at the declared checkpoint',async()=>{
  const seen:string[]=[];
  for(const map of maps){const world=new EmeraldWorld(load(),map,5,5);
   for(const actor of world.objects){const id=world.renderer.map.events.object_events.indexOf(actor.source!)+1,t=target(world,id);const {messages}=await read(world,t);expect(messages.length,t.script).toBeGreaterThan(0);for(const text of messages)expect(paginateDialogue(text,210,8).length).toBeGreaterThan(0);seen.push(t.id);}
  }
  expect(seen).toHaveLength(8);
 });
 it('resolves and executes every source background event with its exact facing/elevation',async()=>{
  let count=0;
  for(const map of [...maps,'Route101']){const world=new EmeraldWorld(load(),map,5,5);
   for(const bg of world.renderer.map.events.bg_events){
    let t:SourceInteractionTarget|null=null;
    for(const [dx,dy,facing] of [[0,1,'north'],[0,-1,'south'],[1,0,'west'],[-1,0,'east']] as const){
     Object.assign(world.player,{x:bg.x+dx,y:bg.y+dy,facing,step:0,elevation:bg.elevation||3});
     if(world.renderer.cell(world.player.x,world.player.y).collision)continue;
     const candidate=resolveSourceInteraction(world);if(candidate?.script===bg.script){t=candidate;break;}
    }
    expect(t,`${map} (${bg.x},${bg.y})`).not.toBeNull();expect((await read(world,t!)).messages.length).toBeGreaterThan(0);count++;
   }
  }
  expect(count).toBe(20);
 });
 it('uses source Twin branches, player/rival gender strings and house signs',async()=>{
  const world=new EmeraldWorld(load());const t=target(world,1);world.bundle.state.flags=world.bundle.state.flags.filter(f=>f!=='FLAG_RESCUED_BIRCH');world.bundle.state.vars.VAR_LITTLEROOT_TOWN_STATE=0;
  expect((await read(world,t)).messages.join(' ')).toContain('jump out');
  world.bundle.state.vars.VAR_LITTLEROOT_TOWN_STATE=1;expect((await read(world,t)).messages.join(' ')).toContain('Can you go see');expect(world.bundle.state.vars.VAR_LITTLEROOT_TOWN_STATE).toBe(2);
  world.bundle.state.gender='FEMALE';world.bundle.state.flags.push('FLAG_RESCUED_BIRCH');expect((await read(world,t)).messages.join(' ')).toContain('You saved PROF. BIRCH');
  world.bundle.state.flags.push('FLAG_ADVENTURE_STARTED');expect((await read(world,t)).messages.join(' ')).toContain('Good luck');
  const bg=world.renderer.map.events.bg_events.find(o=>o.script.endsWith('BrendansHouseSign'))!;
  const sign={id:'sign',kind:'sign' as const,script:bg.script,x:bg.x,y:bg.y};
  expect((await read(world,sign)).messages.join()).toContain('PROF. BIRCH');world.bundle.state.gender='MALE';expect((await read(world,sign)).messages.join()).toContain('BRENDAN');
 });
 it('persists the aide first/repeat flag within this world, across map warps, without mutating input data',async()=>{
  const bundle=load(),world=new EmeraldWorld(bundle,'LittlerootTown_ProfessorBirchsLab',6,8);world.bundle.state.vars.VAR_BIRCH_LAB_STATE=0;const t=target(world,1);
  const first=await read(world,t);expect(world.bundle.state.flags).toContain('FLAG_BIRCH_AIDE_MET');const repeat=await read(world,t);expect(first.messages.join().length).toBeGreaterThan(repeat.messages.join().length);expect(first.messages.join()).toContain('fieldwork');
  world.restorePlayer('LittlerootTown',10,10,'south');world.restorePlayer('LittlerootTown_ProfessorBirchsLab',6,8,'north');expect(world.bundle.state.flags).toContain('FLAG_BIRCH_AIDE_MET');expect(bundle.state.flags).not.toContain('FLAG_BIRCH_AIDE_MET');
 });
 it('honors rival Mom flag/variable branches and source multi-page text',async()=>{
  const world=new EmeraldWorld(load(),'LittlerootTown_MaysHouse_1F',7,7),t=target(world,4);
  world.bundle.state.vars.VAR_LITTLEROOT_RIVAL_STATE=3;const busy=(await read(world,t)).messages.join();expect(busy).toContain('busy');
  world.bundle.state.flags.push('FLAG_SYS_POKEMON_GET');expect((await read(world,t)).messages.join()).toContain('103');
  world.bundle.state.flags.push('FLAG_DEFEATED_RIVAL_ROUTE103');expect((await read(world,t)).messages.join()).toContain('home');
  const sibling=await read(world,target(world,6));expect(sibling.messages.join()).toContain('Hi, neighbor!');expect(sibling.messages.join()).toContain('\f');
  expect(paginateDialogue('FIRST\fSECOND\nTHIRD',210)).toEqual(['FIRST','SECOND\nTHIRD']);
 });
 it('rejects absent, wrong-facing, wrong-elevation and obstructed targets; resolves source moving actors',()=>{
  const world=new EmeraldWorld(load(),'LittlerootTown_ProfessorBirchsLab',10,8);Object.assign(world.player,{facing:'north',elevation:3});expect(resolveSourceInteraction(world)?.script).toContain('Machine');
  Object.assign(world.player,{x:10,y:6,facing:'south'});expect(resolveSourceInteraction(world)).toBeNull();
  world.restorePlayer('LittlerootTown',16,11,'north');const actor=world.objects.find(o=>o.source===world.renderer.map.events.object_events[0])!;
  expect(resolveSourceInteraction(world)?.actor).toBe(actor);actor.elevation=5;expect(resolveSourceInteraction(world)).toBeNull();actor.elevation=3;actor.step=1;expect(resolveSourceInteraction(world)?.actor).toBe(actor);actor.step=0;
  Object.assign(world.player,{y:12});expect(resolveSourceInteraction(world)).toBeNull();
  const at=(actor.y+7)*world.renderer.grid.width+actor.x+7;world.renderer.grid.words[at]!|=0xc00;Object.assign(world.player,{y:11});expect(resolveSourceInteraction(world)).toBeNull();
 });
 it('implements source counter reach only, never arbitrary two-tile proximity',()=>{
  const world=new EmeraldWorld(load());Object.assign(world.player,{x:16,y:12,facing:'north'});expect(resolveSourceInteraction(world)).toBeNull();
  const definition=world.renderer.definition(world.renderer.cell(16,11).metatileId);const old=definition.attr; // Test source-defined counter geometry using a private fixture behavior override.
  const original=world.behavior.bind(world);world.behavior=(x,y)=>x===16&&y===11?world.bundle.behaviors.MB_COUNTER!:original(x,y);
  expect(resolveSourceInteraction(world)?.actor?.source?.script).toContain('Twin');expect(definition.attr).toBe(old);
 });
 it('executes both source TV branches and the running-shoes manual; late TV commands fail visibly',async()=>{
  const home=new EmeraldWorld(load(),'LittlerootTown_BrendansHouse_1F',4,5);home.player.facing='north';const tv=resolveSourceInteraction(home)!;expect(tv.script).toBe('EventScript_TV');expect((await read(home,tv)).messages.join()).toContain('movie');
  Object.assign(home.player,{x:4,y:3,facing:'south'});expect(resolveSourceInteraction(home)).toBeNull();
  Object.assign(home.player,{x:3,y:8,facing:'north'});const manual=resolveSourceInteraction(home)!;expect(manual.script).toBe('EventScript_RunningShoesManual');expect((await read(home,manual)).messages.length).toBeGreaterThan(0);
  const rival=new EmeraldWorld(load(),'LittlerootTown_MaysHouse_1F',6,5);rival.player.facing='north';const rtv=resolveSourceInteraction(rival)!;const first=await read(rival,rtv);expect(first.messages.join()).toMatch(/MOM|DAD/);const temp=rival.bundle.state.vars.VAR_TEMP_3;expect([1,2]).toContain(temp);expect((await read(rival,rtv)).messages).toEqual(first.messages);
  home.bundle.state.flags.push('FLAG_SYS_TV_LATIAS_LATIOS');await expect(read(home,tv)).rejects.toThrow('Unsupported source special: InitRoamer');
 });
 it('fails explicitly on unknown active commands/text controls and can cancel between messages',async()=>{
  const world=new EmeraldWorld(load());const t=target(world,2);world.bundle.interactions!.programs[t.script]=['madeup_command','end'];await expect(read(world,t)).rejects.toThrow(/Unsupported source command.*madeup_command/);
  world.bundle.interactions!.programs[t.script]=['msgbox missing, MSGBOX_NPC','end'];await expect(read(world,t)).rejects.toThrow('Missing source text');
  const home=new EmeraldWorld(load(),'LittlerootTown_BrendansHouse_1F',3,6);let cancelled=false;let calls=0;await runSourceInteraction(home,target(home,1),{say:async()=>{calls++;cancelled=true;},cancelled:()=>cancelled,facePlayer:()=>{},effect:async()=>{throw new Error('effect after cancellation');}});expect(calls).toBe(1);
 });
 it('holds one interaction owner through dialogue, suppresses X/Y/world/LOS, then releases without moving the anchor',async()=>{
  progressStore.setState({introSeen:true,firstEncounterDone:false});const clock=new FakeClock(),input=new InputRouter(clock),bridge=createGameBridge(clock);input.isGameFocused=true;
  bridge.onCommand(c=>{if(c.type==='loadMap'){const s=bridge.getLatestSnapshot()!;bridge.emit({type:'mapArrived',mapId:s.map.id,roomId:s.state.cameraRoomId});}return c.type==='snapshot'?bridge.getLatestSnapshot():undefined;});const runtime=new GameOrchestrator(bridge,input,clock,(b,i,c)=>new EmeraldWorldSession(load(),LOCAL_SOURCE_CHALLENGER,b,i,c));instances.push(runtime);bridge.emit({type:'worldReady'});await flush();runtime.start();
  for(let i=0;i<90;i++){clock.tick(FRAME_MS);await flush();}expect(runtime.state.flow.mode).toBe('OVERWORLD');
  const world=runtime.world.world;world.restorePlayer('LittlerootTown',16,11,'north');const npc=world.objects.find(o=>o.source===world.renderer.map.events.object_events[0])!;npc.delay=999;npc.step=4;npc.previousX=npc.x-1;npc.facing='east';
  const camera={...world.renderer.camera};input.handlePress('A');input.handleRelease('A');await flush();expect(world.paused).toBe(true);expect(runtime.state.dialogue).toBeNull();for(let i=0;i<4;i++){clock.tick(FRAME_MS);await flush();}expect(npc.step).toBe(0);expect(runtime.state.dialogue).not.toBeNull();expect(npc.facing).toBe('south');expect(world.interaction.executions).toBe(1);
  input.handlePress('A');input.handleRelease('A');input.handlePress('RIGHT');input.handleRelease('RIGHT');input.handlePress('X');input.handleRelease('X');await flush();expect(world.interaction.executions).toBe(1);expect(world.player).toMatchObject({x:16,y:11});expect(runtime.state.flow.mode).toBe('OVERWORLD');
  runtime.cancelWorldDialogue();await flush();expect(runtime.state.dialogue).toBeNull();expect(world.paused).toBe(false);expect(world.renderer.camera).toEqual(camera);expect(runtime.world.getSnapshot().state.talkingNpcId).toBeNull();
  input.handlePress('LEFT');input.handleRelease('LEFT');for(let i=0;i<18;i++){clock.tick(FRAME_MS);await flush();}expect(world.player).toMatchObject({x:15,y:11,step:0});
 });
});
