import { Clock, FRAME_MS, gameClock, ScheduledTask } from '../core/clock';
export type TransitionKind='battle-wipe'|'switch-short'|'exit-short'|'fade'|'fade-in'|'cut'|'slide'|'slide-close'|'flash'|'door'|'title-start'|'intro-reveal';
export interface TransitionFrame { frame:number;opacity:number;coverage:number;flash:boolean;offset:number;blink:boolean }
export const transitionFrames:Record<TransitionKind,number>={
 'battle-wipe':40,'switch-short':16,'exit-short':16,fade:16,'fade-in':8,cut:1,slide:4,'slide-close':4,flash:8,door:12,'title-start':28,'intro-reveal':126,
};
export const transitionRows={
 'loading-title':'fade-in','title-intro':'title-start','title-town':'title-start','intro-world':'intro-reveal',
 'dialogue-open':'cut','dialogue-close':'cut','player-menu-open':'slide','player-menu-close':'slide-close',
 'list-screen':'fade','door-interior':'door','interior-exterior':'door','audience-vs':'flash','vs-battle':'battle-wipe',
 'battle-party':'fade','project-switch':'switch-short','battle-exit':'exit-short',
} as const;
export function transitionDuration(type:TransitionKind,reduced=false) { return reduced?(type==='cut'||type==='slide'||type==='slide-close'?1:type==='battle-wipe'?4:2):transitionFrames[type]; }
export function transitionFrame(type:TransitionKind,frame:number,reduced=false):TransitionFrame {
 const duration=transitionDuration(type,reduced),f=Math.max(0,Math.min(frame,duration));
 let opacity=0,coverage=0,flash=false,offset=0,blink=false;
 if(reduced) opacity=f>0&&f<duration?1:0;
 else if(type==='battle-wipe') coverage=f<=10?f*24:f<=14?240:f<=24?(24-f)*24:0;
 else if(type==='slide'||type==='slide-close') offset=type==='slide'?104-f*26:f*26;
 else if(type==='flash') flash=f<4;
 else if(type==='cut') opacity=f===0?1:0;
 else if(type==='fade-in') opacity=[1,0.67,0.34,0][Math.min(3,Math.floor(f/2))]!;
 else if(type==='title-start') {blink=f<12&&Math.floor(f/3)%2===1; if(f>=12)opacity=fadeOpacity(f-12,8);}
 else if(type==='intro-reveal') opacity=(f<2||f>=42&&f<44||f>=84&&f<86)?1:0;
 else opacity=fadeOpacity(f,type==='door'?6:8);
 return {frame:f,opacity,coverage,flash,offset,blink};
}
function fadeOpacity(frame:number,half:number) {
 const step=Math.max(1,half/4);
 const out=[0,0.34,0.67,1];
 return frame<half?out[Math.min(3,Math.floor(frame/step))]!:frame<half*2?out[Math.max(0,3-Math.floor((frame-half)/step))]!:0;
}
export class TransitionDirector {
 constructor(private readonly clock:Clock=gameClock){}
 play(type:TransitionKind,reduced:boolean,render:(state:TransitionFrame)=>void,complete:()=>void,onCovered?:()=>void):()=>void {
  const duration=transitionDuration(type,reduced),start=this.clock.now();let task:ScheduledTask|null=null;let watchdog:ScheduledTask|null=null;let settled=false,covered=false;
  const finish=()=>{if(settled)return;settled=true;task?.cancel();watchdog?.cancel();try{if(!covered){covered=true;onCovered?.();}render(transitionFrame(type,duration,reduced));}finally{complete();}};
  const step=()=>{
   if(settled)return;
   const frame=Math.min(duration,Math.floor((this.clock.now()-start)/FRAME_MS+0.0001));
   const state=transitionFrame(type,frame,reduced);render(state);
   const coverAt=reduced?1:type==='battle-wipe'?10:type==='title-start'?20:type==='door'?6:type==='fade-in'?0:8;
   if(!covered&&frame>=coverAt){covered=true;onCovered?.();}
   if(frame>=duration)finish();else task=this.clock.schedule(step,Math.max(1,(frame+1)*FRAME_MS-(this.clock.now()-start)));
  };
  watchdog=this.clock.schedule(finish,(duration+12)*FRAME_MS);step();
  return ()=>{if(settled)return;settled=true;task?.cancel();watchdog?.cancel();};
 }
}
