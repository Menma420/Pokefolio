'use client';
import { useContext,useEffect,useRef,useState } from 'react';
import { ClockContext } from '../kit/PixelContext';
import { FRAME_MS,type ScheduledTask } from '../../core/clock';
import { type BattleArtBeat,battleArtFrame } from '../../runtime/BattleView';
import type { ProjectId } from '../../domain/types';
import type { BattleContext } from '../../core/battle/types';
import { isReducedMotion } from '../../runtime/motion';
export function useBattleArt(ctx:BattleContext,switching:boolean) {
 const clock=useContext(ClockContext),oldProject=useRef(ctx.projectId);
 const [sequence,setSequence]=useState<{beat:BattleArtBeat;oldProjectId:ProjectId;start:number}|null>(null);
 const [frame,setFrame]=useState(0);const initial=useRef(false);const switchWasActive=useRef(false);
 useEffect(()=>{
  if(switching&&!switchWasActive.current){setFrame(0);setSequence({beat:'switch',oldProjectId:oldProject.current,start:clock.now()});}
  else if(ctx.view==='sendout'&&!initial.current){initial.current=true;setFrame(0);setSequence({beat:'initial',oldProjectId:ctx.projectId,start:clock.now()});}
  switchWasActive.current=switching;oldProject.current=ctx.projectId;
 },[switching,ctx.view,ctx.projectId,clock]);
 useEffect(()=>{
  if(!sequence)return;let task:ScheduledTask;const duration=sequence.beat==='initial'?56:70;
  const step=()=>{const f=isReducedMotion()?duration:Math.min(duration,Math.floor((clock.now()-sequence.start)/FRAME_MS+0.0001));setFrame(f);if(f<duration)task=clock.schedule(step,FRAME_MS);};step();return ()=>task?.cancel();
 },[sequence,clock]);
 const beat=sequence?.beat??'idle';const visual=battleArtFrame(beat,frame,isReducedMotion());
 return {beat,frame,oldProjectId:sequence?.oldProjectId??ctx.projectId,...visual};
}
export type BattleArtPresentation=ReturnType<typeof useBattleArt>;
