'use client';
import { useEffect,useRef } from 'react';
import type { GameBridge } from '../runtime/gameBridge';
import type { EmeraldUi } from '../core/emerald/ui';
import {gameAssetUrl,validateEmeraldUi} from '../runtime/emeraldAssets';
/** App owns the dynamic Phaser import. UI receives only the typed bridge and host. */
export function BattleRendererHost({bridge,onReady}:{bridge:GameBridge;onReady:()=>void}) {
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let disposed=false;let destroy:(()=>void)|undefined;const remove=bridge.onEvent('battleReady',onReady);
  const sourceCharacters=async()=>{
   const response=await fetch(gameAssetUrl('ui'));
   if(!response.ok)throw new Error('Emerald battle assets unavailable. Configure asset delivery.');
   const ui=await response.json() as EmeraldUi;validateEmeraldUi(ui);return ui;
  };
  void Promise.all([import('../game/boot'),sourceCharacters()]).then(([{mountBattleGame},ui])=>{if(!disposed&&host.current)destroy=mountBattleGame(host.current,bridge,ui?.player,ui?.opponent);}).catch(error=>bridge.emit({type:'assetFailed',key:'battle-boot',message:String(error)}));
  return ()=>{disposed=true;remove();destroy?.();};
 },[bridge,onReady]);
 return <div ref={host} role="img" aria-label="Original Pokefolio battle landscape" className="absolute inset-0"/>;
}
