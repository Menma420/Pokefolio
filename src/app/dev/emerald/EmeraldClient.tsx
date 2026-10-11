'use client';
import {useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useStore} from 'zustand';
import {GameViewport} from '../../../ui/kit/GameViewport';
import {TouchController} from '../../../ui/kit/TouchController';
import {DialogueBox} from '../../../ui/kit/DialogueBox';
import {TransitionLayer} from '../../../ui/kit/TransitionLayer';
import {ClockContext} from '../../../ui/kit/PixelContext';
import {PlayerMenu} from '../../../ui/portfolio/PlayerMenu';
import {globalInputRouter,KeyboardAdapter} from '../../../core/input';
import {EmeraldWorld} from '../../../core/emerald/world';
import type {EmeraldBundle,Facing} from '../../../core/emerald/types';
import {uiStore} from '../../../runtime/stores';

export function EmeraldClient(){
 const host=useRef<HTMLDivElement>(null),world=useRef<EmeraldWorld|null>(null),clock=useContext(ClockContext),router=useRouter();
 const [error,setError]=useState(''),[ready,setReady]=useState(false),[dialogue,setDialogue]=useState<string|null>(null);
 const transition=useStore(uiStore,s=>s.isTransitioning),transitionType=useStore(uiStore,s=>s.transitionType);
 const status=useRef<HTMLParagraphElement>(null),dialogueRef=useRef<string|null>(null);
 useEffect(()=>{dialogueRef.current=dialogue;},[dialogue]);
 useEffect(()=>{
  let disposed=false,destroy:(()=>void)|undefined;const keyboard=new KeyboardAdapter(globalInputRouter),previousFocus=globalInputRouter.isGameFocused;globalInputRouter.isGameFocused=true;keyboard.mount();
  let pendingDirection:Facing|undefined;
  const directions:Record<string,Facing>={UP:'north',DOWN:'south',LEFT:'west',RIGHT:'east'};
  globalInputRouter.register('emerald-local','WORLD',action=>{if(directions[action])pendingDirection=directions[action];if(action==='A'&&world.current?.notice){setDialogue(world.current.notice);world.current.notice=null;world.current.paused=true;}});
  const run=async()=>{
   const response=await fetch('/dev/emerald/data');if(!response.ok)throw new Error((await response.json()).error??'Local source endpoint unavailable');
   const bundle=await response.json() as EmeraldBundle;
   if(disposed)return;
   const params=new URLSearchParams(location.search),map=params.get('map')??bundle.state.map,x=Number(params.get('x')??bundle.state.player.x),y=Number(params.get('y')??bundle.state.player.y);
   const source=bundle.maps[map];if(!source||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=source.width||y>=source.height)throw new Error('Invalid source checkpoint');
   const sim=new EmeraldWorld(bundle,map,x,y);world.current=sim;
   if(params.get('paused')==='1')sim.paused=true;
   const {mountEmerald}=await import('../../../game/emerald/boot');if(disposed||!host.current)return;
   destroy=mountEmerald(host.current,sim,clock,()=>{if(globalInputRouter.getActiveHandler()?.context!=='WORLD'){pendingDirection=undefined;return;}const direction=directions[globalInputRouter.getHeldDirection()??'']??pendingDirection;pendingDirection=undefined;return direction;},()=>{
    const manifest=sim.manifest();if(host.current){host.current.dataset.state=JSON.stringify(manifest);host.current.dataset.ready='true';}
    if(status.current)status.current.textContent=`${manifest.map}. Player ${manifest.player.x}, ${manifest.player.y}, facing ${manifest.player.facing}. ${sim.notice??''}`;
   });setReady(true);document.querySelector<HTMLElement>('[aria-label="Game frame"]')?.focus();
  };void run().catch(e=>{if(!disposed)setError(String(e));});
  return ()=>{disposed=true;destroy?.();keyboard.unmount();globalInputRouter.unregister('emerald-local');globalInputRouter.isGameFocused=previousFocus;world.current=null;};
 },[clock]);
 const available=useCallback(()=>!!world.current&&!world.current.player.step&&!world.current.transition&&!dialogueRef.current,[]);
 const pause=useCallback(async()=>{if(world.current)world.current.paused=true;},[]);
 const resume=useCallback(async()=>{if(world.current)world.current.paused=false;},[]);
 return <GameViewport>
  <div ref={host} role="img" aria-label="Source-derived Littleroot Town" style={{position:'absolute',inset:0}}/>
  <p ref={status} className="sr-only" role="status" aria-live="polite">{ready?'Littleroot loaded. Arrow keys move; X opens portfolio; Y opens Bag.':'Loading local source data.'}</p>
  {error&&<p role="alert">{error}</p>}
  {dialogue&&<DialogueBox text={dialogue} dismissible onComplete={()=>{setDialogue(null);if(world.current)world.current.paused=false;}}/>}
  <PlayerMenu available={available} pause={pause} resume={resume} onExit={()=>router.push('/about')}/>
  <TransitionLayer active={transition} type={transitionType??undefined}/>
  <TouchController mode={dialogue?'dialogue':'world'}/>
  <a href="/about" className="sr-only focus:not-sr-only" onFocus={()=>{globalInputRouter.isGameFocused=false;}} onBlur={()=>{globalInputRouter.isGameFocused=true;}}>Portfolio About</a>
 </GameViewport>;
}
