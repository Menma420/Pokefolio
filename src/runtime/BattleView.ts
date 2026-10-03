import type { GameBridge } from './gameBridge';
/** Lifecycle has no prose or battle reducer state. Existing bridge watchdog bounds every ack. */
export function attachBattleView(bridge:GameBridge,onError:(error:Error)=>void,onReady:()=>void=()=>{}):()=>void {
 let cancelled=false;
 void bridge.send({type:'loadBattleScene'}).then(async()=>{
  if(cancelled){await bridge.send({type:'unloadBattleScene'});return;}
  await bridge.send({type:'sleepWorldScene'});if(!cancelled)onReady();
 }).catch(error=>{if(!cancelled)onError(error instanceof Error?error:new Error(String(error)));});
 return ()=>{cancelled=true;void bridge.send({type:'unloadBattleScene'}).then(()=>bridge.send({type:'wakeWorldScene'})).catch(error=>onError(error instanceof Error?error:new Error(String(error))));};
}
export type BattleArtBeat='initial'|'switch'|'idle';
/** Frame zero is arrival (frame 40 of the locked entry table), or switch FTB frame zero. */
export function battleArtFrame(beat:BattleArtBeat,frame:number,reduced=false) {
 const f=reduced?100:Math.max(0,Math.floor(frame));
 const arriving=beat==='initial';const switching=beat==='switch';
 const slide=arriving?Math.max(0,8-Math.floor(f/2))*8:0;
 const departure=arriving?Math.min(64,Math.max(0,Math.floor((f-32)/2))*8):64;
 const revealAt=switching?40:40;
 return {
  visitor:{x:24-slide,y:48,visible:true},
  opponent:{x:160+slide+departure,y:8,visible:arriving&&f<48},
  logo:arriving&&f<40?'hidden':(arriving||switching)&&f>=revealAt&&f<revealAt+4?'flash':(arriving||switching)&&f>=revealAt+4&&f<revealAt+6?'silhouette':'full',
  oldLogo:switching&&f<40,withdrawY:switching?Math.min(48,Math.max(0,Math.floor((f-16)/4)+1)*8):0,
  plateOffset:arriving?Math.min(4,Math.max(0,4-Math.floor((f-48)/2))):0,
  message:arriving?(f>=16?'sendout':null):switching?(f<16?null:f<40?'withdraw':'sendout'):null,
  complete:!arriving&&!switching||f>=(arriving?56:70),
 } as const;
}
