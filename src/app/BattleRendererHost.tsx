'use client';
import { useEffect,useRef } from 'react';
import type { GameBridge } from '../runtime/gameBridge';
import type { EmeraldUi } from '../core/emerald/ui';
/** App owns the dynamic Phaser import. UI receives only the typed bridge and host. */
export function BattleRendererHost({bridge,onReady}:{bridge:GameBridge;onReady:()=>void}) {
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let disposed=false;let destroy:(()=>void)|undefined;const remove=bridge.onEvent('battleReady',onReady);
  const sourceCharacters=async()=>{
   if(process.env.NODE_ENV!=='development')return undefined;
   // The existing endpoint enforces local opt-in and loopback privacy. The
   // standalone diagnostic must use the same character assets as normal local play.
   try{const response=await fetch('/dev/emerald/ui');if(response.ok)return await response.json() as EmeraldUi;}catch{}
   return undefined;
  };
  void Promise.all([import('../game/boot'),sourceCharacters()]).then(([{mountBattleGame},ui])=>{if(!disposed&&host.current)destroy=mountBattleGame(host.current,bridge,ui?.player,ui?.opponent);}).catch(error=>bridge.emit({type:'assetFailed',key:'battle-boot',message:String(error)}));
  return ()=>{disposed=true;remove();destroy?.();};
 },[bridge,onReady]);
 return <div ref={host} role="img" aria-label="Original Pokefolio battle landscape" className="absolute inset-0"/>;
}
