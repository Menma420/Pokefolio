'use client';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FRAME_MS, ScheduledTask } from '../../core/clock';
import { ClockContext } from './PixelContext';
import { audioService } from '../../runtime/AudioService';
export function useConfirmation() {
 const clock=useContext(ClockContext);const task=useRef<ScheduledTask|null>(null);const [pressed,setPressed]=useState<number|null>(null);
 useEffect(()=>()=>task.current?.cancel(),[]);
 const confirm=useCallback((index:number,action:()=>void)=>{
  if(task.current)return;
  setPressed(index);audioService.play('ui.confirm');
  task.current=clock.schedule(()=>{task.current=null;setPressed(null);action();},6*FRAME_MS);
 },[clock]);
 return {pressed,confirm};
}
