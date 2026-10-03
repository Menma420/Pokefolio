import {describe,it,expect,vi} from 'vitest';
import {FakeClock,FRAME_MS,Clock} from '../../src/core/clock';
import {InputRouter,globalInputRouter} from '../../src/core/input';
import {navigate} from '../../src/core/input/navigation';
import {TransitionDirector,transitionRows,transitionFrames,transitionDuration,transitionFrame} from '../../src/runtime/TransitionDirector';
import {playTransition,cancelTransition} from '../../src/runtime/TransitionService';
import {uiStore,settingsStore} from '../../src/runtime/stores';
import {AudioService} from '../../src/runtime/AudioService';
describe('Phase A remediation gates',()=>{
 it('repeats navigation at 250/100ms, resolves the latest axis, resumes the prior axis and cancels on release',()=>{
  const clock=new FakeClock(),router=new InputRouter(clock),press=vi.fn();router.register('menu','MENU',press);
  router.handlePress('UP');router.handlePress('RIGHT');expect(router.getHeldDirection()).toBe('RIGHT');
  clock.tick(249);expect(press).toHaveBeenCalledTimes(2);clock.tick(1);expect(press).toHaveBeenLastCalledWith('RIGHT');
  clock.tick(100);expect(press).toHaveBeenCalledTimes(4);router.handleRelease('RIGHT');expect(router.getHeldDirection()).toBe('UP');
  clock.tick(250);expect(press).toHaveBeenLastCalledWith('UP');router.clearHeld();clock.tick(1000);expect(press).toHaveBeenCalledTimes(5);
  router.unregister('menu');router.register('world','WORLD',press);router.handlePress('DOWN');clock.tick(1000);expect(press).toHaveBeenCalledTimes(6);router.clearHeld();
 });
 it('clamps spatial navigation without wrapping',()=>{
  expect(navigate(0,4,2,'LEFT')).toBe(0);expect(navigate(1,4,2,'RIGHT')).toBe(1);expect(navigate(1,4,2,'DOWN')).toBe(3);expect(navigate(3,4,2,'DOWN')).toBe(3);expect(navigate(3,4,2,'UP')).toBe(1);
 });
 it('completes every frame-table primitive, reduced variant and covered callback exactly once',()=>{
  for(const type of new Set(Object.values(transitionRows)))for(const reduced of [false,true]){
   const clock=new FakeClock(),covered=vi.fn(),done=vi.fn(),render=vi.fn();new TransitionDirector(clock).play(type,reduced,render,done,covered);
   clock.tick((transitionDuration(type,reduced)+13)*FRAME_MS);expect(done).toHaveBeenCalledOnce();expect(covered).toHaveBeenCalledOnce();expect(render).toHaveBeenLastCalledWith(transitionFrame(type,transitionDuration(type,reduced),reduced));
  }
  expect(transitionFrames['battle-wipe']).toBe(40);expect(transitionFrames.door).toBe(12);expect(transitionFrames['title-start']).toBe(28);expect(transitionFrames['intro-reveal']).toBe(126);
 });
 it('watchdog releases a dropped choreography and covers once',()=>{
  const tasks:{fn:()=>void;delay:number}[]=[];const clock:Clock={now:()=>0,schedule:(fn,delay)=>{tasks.push({fn,delay});return {cancel:()=>{}};}};
  const done=vi.fn(),covered=vi.fn();new TransitionDirector(clock).play('fade',false,()=>{},done,covered);
  tasks.find(t=>t.delay===28*FRAME_MS)!.fn();expect(done).toHaveBeenCalledOnce();expect(covered).toHaveBeenCalledOnce();tasks.forEach(t=>t.fn());expect(done).toHaveBeenCalledOnce();
 });
 it('owns the modal lock, cancels safely, and caps flashes globally',()=>{
  settingsStore.setState({reducedMotion:false});const clock=new FakeClock();
  for(let i=0;i<4;i++){playTransition('flash',()=>{},undefined,clock);expect(uiStore.getState().transitionType).toBe(i===3?'cut':'flash');expect(globalInputRouter.getActiveHandler()?.context).toBe('MODAL');clock.tick(9*FRAME_MS);}
  playTransition('fade',()=>{},undefined,clock);cancelTransition();expect(uiStore.getState().isTransitioning).toBe(false);expect(globalInputRouter.getActiveHandler()?.context).not.toBe('MODAL');
 });
 it('watchdog unlocks runtime input after a scene-swap callback fails',()=>{
  const clock=new FakeClock(),done=vi.fn();playTransition('fade',done,()=>{throw new Error('scene swap failed');},clock);
  expect(()=>clock.tick(9*FRAME_MS)).toThrow('scene swap failed');clock.tick(21*FRAME_MS);expect(done).toHaveBeenCalledOnce();expect(uiStore.getState().isTransitioning).toBe(false);expect(globalInputRouter.getActiveHandler()?.context).not.toBe('MODAL');
 });
 it('plays original square-wave hooks and honors mute/unlock',()=>{
  const start=vi.fn(),stop=vi.fn(),connect=vi.fn();const oscillator={type:'',frequency:{value:0},connect,start,stop,disconnect:vi.fn()};const gain={gain:{value:0},connect,disconnect:vi.fn()};
  const audio={state:'running',currentTime:4,destination:{},createOscillator:vi.fn(()=>oscillator),createGain:()=>gain} as unknown as AudioContext;
  let muted=false;const service=new AudioService(()=>audio,()=>muted);for(const name of ['cursor.move','ui.confirm','ui.cancel','ui.buzz','text.tick'] as const)service.play(name);
  expect(start).toHaveBeenCalledTimes(5);expect(oscillator.type).toBe('square');expect(stop).toHaveBeenLastCalledWith(4.018);for(const name of ['world.door','world.bump','encounter.alert','vs.cue','battle.sendout','link.open','page','menu.open','title.start'] as const)service.play(name);expect(start).toHaveBeenCalledTimes(14);expect(stop.mock.calls.every(call=>call[0]-4<=0.2)).toBe(true);muted=true;service.play('ui.confirm');expect(start).toHaveBeenCalledTimes(14);
  new AudioService(()=>null).play('ui.confirm');expect(start).toHaveBeenCalledTimes(14);
 });
});
