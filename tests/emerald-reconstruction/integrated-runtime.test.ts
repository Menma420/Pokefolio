import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it} from 'vitest';
import {FakeClock,FRAME_MS} from '../../src/core/clock';
import {InputRouter} from '../../src/core/input';
import type {EmeraldBundle} from '../../src/core/emerald/types';
import {GameOrchestrator} from '../../src/runtime/Orchestrator';
import {EmeraldWorldSession} from '../../src/runtime/world/EmeraldWorldSession';
import {LOCAL_SOURCE_CHALLENGER} from '../../src/runtime/world/sourceChallenger';
import {createGameBridge} from '../../src/runtime/gameBridge';
import {progressStore,uiStore} from '../../src/runtime/stores';

const load=()=>JSON.parse(readFileSync('artifacts/emerald-source/bundle.json','utf8')) as EmeraldBundle;
const instances:GameOrchestrator<EmeraldWorldSession>[]=[];
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function setup(repeat=false){
 progressStore.setState({introSeen:true,firstEncounterDone:repeat});const clock=new FakeClock(),input=new InputRouter(clock),bridge=createGameBridge(clock);input.isGameFocused=true;
 bridge.onCommand(command=>{if(command.type==='loadMap'){const s=bridge.getLatestSnapshot()!;bridge.emit({type:'mapArrived',mapId:s.map.id,roomId:s.state.cameraRoomId});}return command.type==='snapshot'?bridge.getLatestSnapshot():undefined;});
 const runtime=new GameOrchestrator(bridge,input,clock,(b,i,c)=>new EmeraldWorldSession(load(),LOCAL_SOURCE_CHALLENGER,b,i,c));instances.push(runtime);
 const advance=async(frames:number)=>{for(let i=0;i<frames;i++){clock.tick(FRAME_MS);await flush();}};
 bridge.emit({type:'worldReady'});await flush();runtime.start();await advance(90);expect(runtime.state.flow.mode).toBe('OVERWORLD');
 const place=(x:number,y:number,facing:'north'|'south'='north')=>{runtime.world.world.restorePlayer('Route101',x,y,facing);bridge.publishSnapshot(runtime.world.getSnapshot());};
 return {runtime,input,bridge,clock,advance,place};
}
afterEach(()=>{for(const r of instances.splice(0))r.dispose();uiStore.getState().endTransition();progressStore.setState({introSeen:false,firstEncounterDone:false});});
describe.skipIf(process.env.EMERALD_TEST_SOURCE!=='1')('normal gameplay source-world adapter',()=>{
 it('validates the source actor by generated event ID, graphic and script',()=>{
  const b=load(),o=b.maps.Route101!.events.object_events[0]!;expect(LOCAL_SOURCE_CHALLENGER).toEqual({map:'Route101',objectEventId:1,graphicsId:o.graphics_id,script:o.script});
  expect(o).toMatchObject({x:16,y:8,elevation:3,movement_type:'MOVEMENT_TYPE_LOOK_AROUND'});
  const a=b.actors[o.graphics_id]!;expect(a.source).toMatchObject({paletteTag:'OBJ_EVENT_PAL_TAG_NPC_1',paletteSlot:'PALSLOT_NPC_1',anims:'sAnimTable_Standard',images:'sPicTable_Youngster'});expect([a.width,a.height]).toEqual([16,32]);
  expect(()=>new EmeraldWorldSession(b,{...LOCAL_SOURCE_CHALLENGER,graphicsId:'wrong'},createGameBridge(),new InputRouter(),new FakeClock())).toThrow('metadata');
 });
 it('uses one source simulation, source geometry/collision and latched one-tile taps',async()=>{
  const {runtime,input,advance}=await setup(),s=runtime.world;
  expect('sim' in s).toBe(false);expect(s.getSnapshot()).toMatchObject({map:{id:'LittlerootTown',width:20,height:20},state:{player:{x:10,y:10}}});
  for(let y=0;y<20;y++)for(let x=0;x<20;x++)expect(s.getSnapshot().map.collision[y*20+x]).toBe(s.world.renderer.cell(x,y).collision?1:0);
  input.handlePress('LEFT');input.handleRelease('LEFT');await advance(18);expect(s.world.player).toMatchObject({x:9,y:10,facing:'west',step:0});
  expect(s.world.player.gfx).toBe('OBJ_EVENT_GFX_BRENDAN_NORMAL');expect(Object.values(s.world.renderer.camera).every(Number.isInteger)).toBe(true);
 });
 it('uses authoritative LOS once, approaches one tile away and retains original source graphics',async()=>{
  const {runtime,bridge,advance,place}=await setup();place(16,11);
  const before=JSON.stringify(runtime.world.world.bundle.actors.OBJ_EVENT_GFX_YOUNGSTER);
  const detect=()=>bridge.emit({type:'stepCompleted',mapId:'Route101',entityId:'player',tile:{x:16,y:11},cameraRoomId:'Route101'});
  detect();detect();expect(runtime.state.flow.mode).toBe('ENCOUNTER');expect(runtime.state.returnAnchor).toMatchObject({mapId:'Route101',tile:{x:16,y:11},facing:'up'});
  await advance(100);expect(runtime.world.getSnapshot().state.npcs.find(n=>n.id==='challenger')).toMatchObject({x:16,y:10,movement:null});
  expect(runtime.encounters.snapshot.step?.type).toBe('say');expect(JSON.stringify(runtime.world.world.bundle.actors.OBJ_EVENT_GFX_YOUNGSTER)).toBe(before);
 });
 it('A from behind evaluates the new facing immediately; repeated A cannot duplicate the encounter',async()=>{
  const {runtime,input,place}=await setup();place(16,7,'south');input.handlePress('A');input.handleRelease('A');expect(runtime.state.flow.mode).toBe('ENCOUNTER');
  expect(runtime.world.getSnapshot().state.npcs.find(n=>n.id==='challenger')?.facing).toBe('up');const anchor=runtime.state.returnAnchor;input.handlePress('A');expect(runtime.state.returnAnchor).toEqual(anchor);
 });
 it('rejects invalid distance and source solid blockers through the same LOS evaluator',async()=>{
  const {runtime,bridge,place}=await setup();place(16,12);const emit=()=>bridge.emit({type:'stepCompleted',mapId:'Route101',entityId:'player',tile:{...runtime.world.getSnapshot().state.player},cameraRoomId:'Route101'});emit();expect(runtime.state.flow.mode).toBe('OVERWORLD');
  place(16,11);runtime.world.getSnapshot().map.collision[10*20+16]=1;emit();expect(runtime.state.flow.mode).toBe('OVERWORLD');
 });
 it('keeps repeat LOS disabled, direct A enabled and exact return/camera/player animation intact',async()=>{
  const {runtime,input,place,advance}=await setup(true);place(16,9);await advance(2);expect(runtime.state.flow.mode).toBe('OVERWORLD');
  const camera={...runtime.world.world.renderer.camera};input.handlePress('A');input.handleRelease('A');expect(runtime.state.flow.mode).toBe('ENCOUNTER');
  const anchor=runtime.state.returnAnchor!;await runtime.world.restoreAnchor(anchor);expect(runtime.world.world.player).toMatchObject({x:16,y:9,facing:'north',step:0});expect(runtime.world.world.renderer.camera).toEqual(camera);
 });
});
