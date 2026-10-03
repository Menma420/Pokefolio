'use client';
import { useEffect,useRef } from 'react';
import type { GameBridge } from '../runtime/gameBridge';
/** App owns the dynamic Phaser import. UI receives only the typed bridge and host. */
export function BattleRendererHost({bridge,onReady}:{bridge:GameBridge;onReady:()=>void}) {
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let disposed=false;let destroy:(()=>void)|undefined;const remove=bridge.onEvent('battleReady',onReady);
  void import('../game/boot').then(({mountBattleGame})=>{if(!disposed&&host.current)destroy=mountBattleGame(host.current,bridge);}).catch(error=>bridge.emit({type:'assetFailed',key:'battle-boot',message:String(error)}));
  return ()=>{disposed=true;remove();destroy?.();};
 },[bridge,onReady]);
 return <div ref={host} role="img" aria-label="Original Pokefolio battle landscape" className="absolute inset-0"/>;
}
