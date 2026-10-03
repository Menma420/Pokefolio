import { Clock, gameClock } from '../core/clock';
import { globalInputRouter } from '../core/input';
import { isReducedMotion } from './motion';
import { TransitionDirector, TransitionKind, TransitionFrame, transitionFrame } from './TransitionDirector';
import { uiStore } from './stores';
let currentCancel:(()=>void)|null=null;
let sequence=0;
let flashes:number[]=[];
/** Runtime owns frames, input lock, completion and watchdog even when React is unmounted. */
export function playTransition(type:TransitionKind,onComplete:()=>void=()=>{},onCovered?:()=>void,clock:Clock=gameClock,onFrame?:(frame:TransitionFrame)=>void):()=>void {
 currentCancel?.();
 if(type==='flash'){flashes=flashes.filter(time=>clock.now()-time>=0&&clock.now()-time<1000);if(flashes.length>=3)type='cut';else flashes.push(clock.now());}
 const id=`transition-runtime-${++sequence}`;let cancelled=false;
 const end=()=>{globalInputRouter.unregister(id);uiStore.getState().endTransition();};
 uiStore.getState().startTransition(type);globalInputRouter.register(id,'MODAL',()=>{});
 const cancelDirector=new TransitionDirector(clock).play(type,isReducedMotion(),
  frame=>{uiStore.getState().setTransitionFrame(frame);onFrame?.(frame);},()=>{end();currentCancel=null;if(!cancelled)onComplete();},onCovered);
 const cancel=()=>{if(cancelled)return;cancelled=true;cancelDirector();end();};
 currentCancel=cancel;return cancel;
}
export function cancelTransition() { currentCancel?.();currentCancel=null; }
export const initialTransitionFrame=transitionFrame('cut',0);
