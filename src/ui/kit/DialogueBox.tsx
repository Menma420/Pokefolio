'use client';
import { useEffect, useState, useRef, useContext } from 'react';
import { useStore } from 'zustand';
import { Clock, FRAME_MS, ScheduledTask } from '../../core/clock';
import { globalInputRouter } from '../../core/input';
import { settingsStore } from '../../runtime/stores';
import { Cursor } from './Cursor';
import { Window } from './Window';
import { paginateDialogue } from './text';
import { ClockContext } from './PixelContext';
import { BitmapText } from './BitmapText';
import {globalDialogueService} from '../../runtime/services/DialogueService';
import { audioService } from '../../runtime/AudioService';
import {ActionHints} from './ActionHints';
import {isReducedMotion} from '../../runtime/motion';
interface DialogueBoxProps { text:string; onComplete:()=>void; onBack?:()=>void; summary?:boolean; speaker?:string; clock?:Clock; disableInputContext?:boolean; variant?:'field'|'battle'; dismissible?:boolean; speed?:'slow'|'normal'|'fast'|'instant'; awaitInput?:boolean }
export function DialogueBox(props:DialogueBoxProps) {
 // Remount presentation on prose changes; old scheduled tasks are cancelled on unmount.
 return <DialoguePage key={props.text} {...props}/>;
}
function DialoguePage({text,onComplete,onBack,summary,speaker,clock: injectedClock,disableInputContext=false,variant='field',dismissible=false,speed,awaitInput=true}:DialogueBoxProps) {
 const sharedClock=useContext(ClockContext);
 const clock=injectedClock??sharedClock;
 const settings=useStore(settingsStore);
 const reduced=settings.reducedMotion||settings.animationReduced||isReducedMotion();
 const pages=paginateDialogue(text,variant==='field'?210:226,variant==='field'?8:0);
 const [page,setPage]=useState(0); const [length,setLength]=useState(0); const [bob,setBob]=useState(0);
 const releasePresentation=useRef<(()=>void)|null>(null);
 useEffect(()=>{if(globalDialogueService.getActive()?.text===text)return;const owner=globalDialogueService.present(text);releasePresentation.current=owner.release;return ()=>{owner.release();if(releasePresentation.current===owner.release)releasePresentation.current=null;};},[text]);
 const complete=()=>{releasePresentation.current?.();onComplete();};
 const typingTask=useRef<ScheduledTask|null>(null);
 const current=pages[page]??'';
 const delay=({slow:6,normal:3,fast:1,instant:0}[speed??settings.textSpeed])*FRAME_MS;
 const visibleLength=delay===0?current.length:length;
 const done=visibleLength>=current.length;
 useEffect(()=>{
  let count=0; let printable=0; let task:ScheduledTask;
  const step=()=>{
   while(count<current.length && /\s/.test(current[count]!)) count++;
   if(count>=current.length){setLength(count);return;}
   count=Math.min(current.length,count+1); setLength(count);
   if(++printable%2===0) audioService.play('text.tick');
   if(count<current.length) { task=clock.schedule(step,delay); typingTask.current=task; }
  };
  if(delay===0)return;
  task=clock.schedule(step,delay); typingTask.current=task;
  return ()=>task.cancel();
 },[clock,current,delay]);
 useEffect(()=>{
  if(!done || reduced) return;
  const task=clock.schedule(()=>setBob(value=>1-value),16*FRAME_MS);
  return ()=>task.cancel();
 },[bob,clock,done,reduced]);
 const advance=()=>{
  audioService.play('ui.confirm');
  if(!done) { typingTask.current?.cancel(); setLength(current.length); }
  else if(page+1<pages.length) {audioService.play('page');setPage(page+1);setLength(0);setBob(0);}
  else complete();
 };
 useEffect(()=>{
  if(disableInputContext||!awaitInput) return;
  globalInputRouter.register('dialogue-box','DIALOGUE',action=>{
   if(action==='A') advance();
   if(action==='B' && onBack) { audioService.play('ui.cancel'); releasePresentation.current?.(); onBack(); }
   else if(action==='B' && dismissible) { audioService.play('ui.cancel'); complete(); }
  });
  return ()=>globalInputRouter.unregister('dialogue-box');
 });
 return <Window frame="message" className="absolute z-30" style={{left:`calc(${variant==='field'?8:0}*var(--u))`,top:'calc(112*var(--u))',width:`calc(${variant==='field'?224:240}*var(--u))`,height:`calc(${variant==='field'?40:48}*var(--u))`}}>
  {speaker&&<Window frame="plate" style={{position:'absolute',left:'calc(8*var(--u))',top:'calc(-14*var(--u))',width:'calc(70*var(--u))',height:'calc(18*var(--u))',minHeight:'calc(18*var(--u))',padding:'calc(5*var(--u))'}}><BitmapText text={speaker}/></Window>}
  <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{done?current:''}</div>
  <div data-typed aria-hidden="true" className="whitespace-pre"><BitmapText text={current.slice(0,visibleLength)} semantic={false}/></div>
  {awaitInput&&<button type="button" aria-label={done?'Continue dialogue':'Reveal dialogue'} onClick={advance} style={{position:'absolute',left:`calc(${variant==='field'?209:225}*var(--u))`,top:`calc(${variant==='field'?25:33}*var(--u))`,width:'calc(8*var(--u))',height:'calc(8*var(--u))'}}>
   {done && <Cursor direction="down" style={{position:'absolute',left:0,top:reduced?0:`calc(${bob}*var(--u))`}}/>}
  </button>}
 {variant==='battle'&&(onBack||dismissible)&&<div style={{position:'absolute',left:0,top:'calc(-112*var(--u))'}}><ActionHints a={summary&&done&&page===pages.length-1?'CONTINUE':'NEXT'} right={20}/></div>}
 {variant==='field'&&awaitInput&&<div style={{position:'absolute',left:'calc(-8*var(--u))',top:'calc(-112*var(--u))'}}><ActionHints a="NEXT" b={onBack||dismissible?'BACK':null} y={152}/></div>}
 </Window>;
}
