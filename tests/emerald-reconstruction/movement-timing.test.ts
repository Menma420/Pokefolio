import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it} from 'vitest';
import type {Clock} from '../../src/core/clock';
import {InputRouter} from '../../src/core/input';
import {EmeraldWorld} from '../../src/core/emerald/world';
import type {EmeraldBundle} from '../../src/core/emerald/types';
import {createGameBridge} from '../../src/runtime/gameBridge';
import {EmeraldWorldSession} from '../../src/runtime/world/EmeraldWorldSession';
import {LOCAL_SOURCE_CHALLENGER} from '../../src/runtime/world/sourceChallenger';
import {GameOrchestrator} from '../../src/runtime/Orchestrator';
import {progressStore,uiStore} from '../../src/runtime/stores';

/** Delivers overdue callbacks at actual wake-up time, unlike FakeClock's ideal
 * deadline delivery. This reproduces a slow/blocked browser event loop. */
class DeliveryClock implements Clock {
 time=0;
 tasks=new Set<{at:number;fn:()=>void}>();
 now(){return this.time;}
 schedule(fn:()=>void,delay:number){const task={at:this.time+delay,fn};this.tasks.add(task);return {cancel:()=>{this.tasks.delete(task);}};}
 wake(time:number){this.time=time;const due=[...this.tasks].filter(t=>t.at<=time+0.001).sort((a,b)=>a.at-b.at);for(const task of due)if(this.tasks.delete(task))task.fn();}
}
const source=process.env.EMERALD_TEST_SOURCE==='1';
const load=()=>JSON.parse(readFileSync('artifacts/emerald-source/bundle.json','utf8')) as EmeraldBundle;
const cleanups:(()=>void)[]=[];
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function setup(){
 const clock=new DeliveryClock(),input=new InputRouter(clock),bridge=createGameBridge(clock),session=new EmeraldWorldSession(load(),LOCAL_SOURCE_CHALLENGER,bridge,input,clock);
 cleanups.push(()=>session.dispose());
 bridge.onCommand(c=>c.type==='snapshot'?session.getSnapshot():undefined);
 bridge.emit({type:'worldReady'});await flush();session.world.paused=false;
 const completions:{frame:number;time:number;x:number;y:number}[]=[];
 bridge.onEvent('stepCompleted',e=>completions.push({frame:session.world.frame,time:clock.now(),...e.tile}));
 return {clock,input,bridge,session,completions};
}
afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();uiStore.getState().endTransition();progressStore.setState({introSeen:false,firstEncounterDone:false});});

describe.skipIf(!source)('source movement timing under late callback delivery',()=>{
 it.each([60,35,20,10])('completes six tiles in 1600ms at %i callback deliveries/s with identical source state',async rate=>{
  const {clock,input,session,completions,bridge}=await setup(),reference=new EmeraldWorld(load());
  let paints=0;bridge.onSnapshot(()=>paints++);input.handlePress('UP');
  for(let t=1000/rate;t<1600-0.001;t+=1000/rate)clock.wake(t);clock.wake(1600);
  for(let frame=0;frame<96;frame++)reference.tick('north');
  expect(completions.map(e=>e.frame)).toEqual([16,32,48,64,80,96]);
  expect(completions.at(-1)?.time).toBe(1600);
  expect(session.world.manifest()).toEqual(reference.manifest());
  expect(session.world.pixels()).toEqual(reference.pixels());
  if(rate===35)expect(paints).toBeLessThan(80); // no raster per overdue tick
 });
 it('advances every due pixel and source walk pose together, retaining integer camera coordinates',async()=>{
  const {clock,input,session}=await setup(),reference=new EmeraldWorld(load());input.handlePress('UP');clock.wake(150);
  for(let i=0;i<9;i++)reference.tick('north');
  expect(session.world.player.step).toBe(7);expect(session.world.actorRaster(session.world.player)).toEqual(reference.actorRaster(reference.player));
  expect(session.world.renderer.camera).toEqual(reference.renderer.camera);expect(Object.values(session.world.renderer.camera).every(Number.isInteger)).toBe(true);
 });
 it('retains a released one-tile tap and collision/facing without queueing extra tiles',async()=>{
  const {clock,input,session,completions}=await setup();input.handlePress('LEFT');input.handleRelease('LEFT');clock.wake(300);
  expect(session.world.player).toMatchObject({x:9,y:10,step:0,facing:'west'});expect(completions).toHaveLength(1);
  session.world.restorePlayer('LittlerootTown',4,9,'south');input.handlePress('UP');clock.wake(600);
  // The source facade beside the door remains impassable.
  expect(session.world.player).toMatchObject({x:4,y:9,step:0,facing:'north'});
 });
 it('emits each tile completion before further catch-up; a synchronous encounter pause stops movement',async()=>{
  const {clock,input,session,bridge,completions}=await setup();bridge.onEvent('stepCompleted',()=>{session.world.paused=true;input.clearHeld();});input.handlePress('UP');clock.wake(600);
  expect(completions).toHaveLength(1);expect(session.world.player).toMatchObject({x:10,y:9,step:0});expect(session.world.frame).toBe(16);
 });
 it('does not replay suspended time or held input; finishes the in-flight tile on fresh ticks',async()=>{
  const {clock,input,session,completions}=await setup();input.handlePress('UP');clock.wake(100);const before=session.world.manifest();
  clock.wake(8100);expect(session.world.manifest()).toEqual(before);expect(input.getHeldDirection()).toBeUndefined();
  clock.wake(8300);expect(session.world.player).toMatchObject({x:10,y:9,step:0});expect(completions).toHaveLength(1);
  input.handleRelease('UP');input.handlePress('RIGHT');clock.wake(8600);input.handleRelease('RIGHT');clock.wake(8900);
  expect(session.world.player.step).toBe(0);expect(session.world.player.facing).toBe('east');
 });
 it('suspends on visibility changes, rebases on resume and removes its listener on dispose',async()=>{
  const {clock,input,session}=await setup();input.handlePress('UP');clock.wake(100);const before=session.world.manifest();
  Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  try{clock.wake(900);expect(session.world.manifest()).toEqual(before);expect(input.getHeldDirection()).toBeUndefined();}
  finally{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));}
  clock.wake(1100);expect(session.world.player).toMatchObject({x:10,y:9,step:0});
  session.dispose();const pending=clock.tasks.size;document.dispatchEvent(new Event('visibilitychange'));expect(clock.tasks.size).toBe(pending);
 });
 it('keeps source connection and automatic door phase ordering through delayed callbacks',async()=>{
  const {clock,input,session,bridge}=await setup(),maps:string[]=[];bridge.onEvent('mapArrived',e=>maps.push(e.mapId));
  session.world.restorePlayer('LittlerootTown',10,0,'north');input.handlePress('UP');input.handleRelease('UP');clock.wake(300);
  expect(session.world.player).toMatchObject({x:10,y:19,step:0});expect(maps).toEqual(['Route101']);
  session.world.restorePlayer('LittlerootTown',5,9,'north');input.handlePress('UP');input.handleRelease('UP');clock.wake(600);clock.wake(900);
  expect(session.world.renderer.map.name).toBe('LittlerootTown_BrendansHouse_1F');expect(session.world.transition).toBeNull();
  clock.wake(1200);expect(session.world.player).toMatchObject({x:8,y:8,step:0});
 });
 it('the real encounter evaluator owns the first in-range completion, even inside a late batch',async()=>{
  const clock=new DeliveryClock(),input=new InputRouter(clock),bridge=createGameBridge(clock);progressStore.setState({introSeen:true,firstEncounterDone:false});
  const runtime=new GameOrchestrator(bridge,input,clock,(b,i,c)=>new EmeraldWorldSession(load(),LOCAL_SOURCE_CHALLENGER,b,i,c));cleanups.push(()=>runtime.dispose());
  bridge.onCommand(c=>{if(c.type==='loadMap'){const s=runtime.world.getSnapshot();bridge.emit({type:'mapArrived',mapId:s.map.id,roomId:s.map.id});}return c.type==='snapshot'?runtime.world.getSnapshot():undefined;});
  bridge.emit({type:'worldReady'});await flush();runtime.start();for(let t=25;t<=1000;t+=25){clock.wake(t);await flush();}
  expect(runtime.state.flow.mode).toBe('OVERWORLD');runtime.world.world.restorePlayer('Route101',16,12,'north');
  input.handlePress('UP');clock.wake(1600);
  expect(runtime.state.flow.mode).toBe('ENCOUNTER');expect(runtime.state.returnAnchor).toMatchObject({mapId:'Route101',tile:{x:16,y:11},facing:'up'});
  expect(runtime.world.world.player).toMatchObject({x:16,y:11,step:0});expect(input.getHeldDirection()).toBeUndefined();
 });
});
