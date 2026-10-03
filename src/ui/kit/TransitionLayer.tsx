'use client';
import { ReactNode,useContext,useEffect,useState } from 'react';
import { useStore } from 'zustand';
import { settingsStore,uiStore } from '../../runtime/stores';
import { TransitionDirector,transitionFrame,TransitionKind } from '../../runtime/TransitionDirector';
import { Clock } from '../../core/clock';
import { isReducedMotion } from '../../runtime/motion';
import { PixelContext,ClockContext } from './PixelContext';
import { globalInputRouter } from '../../core/input';
import { palette } from './palette';
export function TransitionLayer({active,type='battle-wipe',clock,onComplete,children}:{active:boolean;type?:TransitionKind;clock?:Clock;onComplete?:()=>void;children?:ReactNode}) {
 const pixels=useContext(PixelContext);
 const sharedClock=useContext(ClockContext);const preference=useStore(settingsStore,s=>s.reducedMotion);const reduced=preference||isReducedMotion();
 const ownedFrame=useStore(uiStore,s=>s.transitionType===type?s.transitionFrame:null);
 const managed=ownedFrame!==null;
 const [local,setLocal]=useState(transitionFrame(type,0,reduced));
 useEffect(()=>{
  if(!active||managed)return;
  globalInputRouter.register('transition-preview','MODAL',()=>{});
  const stop=new TransitionDirector(clock??sharedClock).play(type,reduced,setLocal,()=>{globalInputRouter.unregister('transition-preview');onComplete?.();});
  return ()=>{stop();globalInputRouter.unregister('transition-preview');};
 },[active,type,clock,sharedClock,reduced,onComplete,managed]);
 if(!active)return null;const state=ownedFrame??local;
 return <div aria-hidden="true" data-transition={type} data-frame={state.frame} className="absolute inset-0 z-40 pointer-events-none" style={{transition:'none'}}>
  {type==='battle-wipe'&&!reduced?Array.from({length:10},(_,i)=><div key={i} style={{position:'absolute',top:`calc(${i*16}*var(--u))`,height:'calc(16*var(--u))',width:`calc(${state.coverage}*var(--u))`,[i%2?'right':'left']:0,background:palette.black}}/>):type==='slide'||type==='slide-close'?<PixelContext.Provider value={{...pixels,motionFrame:state.frame}}><div style={{position:'absolute',right:`calc(${-state.offset}*var(--u))`,top:0}}>{children}</div></PixelContext.Provider>:<div className="absolute inset-0" style={{background:state.flash?palette.onDark:palette.black,opacity:state.flash?1:state.opacity}}/>}
 </div>;
}
