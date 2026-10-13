import type {EmeraldBundle} from '../core/emerald/types';
import type {EmeraldUi} from '../core/emerald/ui';
import {SOURCE_MUSIC_IDS,type SourceMusicManifest} from './music';

export const EMERALD_SOURCE_COMMIT='731ad5bfd6e6f265508d0efcca0ba42f9dcf5881';
export const GAME_ASSET_IDS=['world','ui','music',...SOURCE_MUSIC_IDS] as const;
export type GameAssetId=typeof GAME_ASSET_IDS[number];
export const gameAssetUrl=(asset:GameAssetId)=>`/api/game-assets/${asset}`;
export function productMusicManifest(manifest:SourceMusicManifest):SourceMusicManifest {
 return {...manifest,tracks:Object.fromEntries(Object.entries(manifest.tracks).map(([id,track])=>[id,{...track,src:track.present&&track.validated?gameAssetUrl(id as GameAssetId):null}])) as SourceMusicManifest['tracks']};
}
export function validateEmeraldWorld(bundle:EmeraldBundle){
 if(bundle.sourceCommit!==EMERALD_SOURCE_COMMIT)throw new Error('Emerald world source revision mismatch.');
 for(const map of ['LittlerootTown','Route101','LittlerootTown_BrendansHouse_1F','LittlerootTown_MaysHouse_1F','LittlerootTown_ProfessorBirchsLab'])if(!bundle.maps?.[map])throw new Error(`Emerald map missing: ${map}`);
 if(!bundle.state?.player||!bundle.actors||!bundle.tilesets)throw new Error('Emerald world assets incomplete.');
}
export function validateEmeraldUi(ui:EmeraldUi){
 if(ui.sourceCommit!==EMERALD_SOURCE_COMMIT)throw new Error('Emerald UI source revision mismatch.');
 for(const field of ['title','intro','player','opponent','portfolio','fonts','frame','bag','battle'] as const)if(!ui[field])throw new Error(`Emerald UI asset missing: ${field}`);
}
export async function loadEmeraldGameAssets(load:typeof fetch=fetch){
 const read=async(asset:'world'|'ui')=>{
  const response=await load(gameAssetUrl(asset));
  if(!response.ok){const detail=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(detail?.error??`Emerald ${asset} assets unavailable (${response.status}).`);}
  return response.json();
 };
 const [bundle,ui]=await Promise.all([read('world') as Promise<EmeraldBundle>,read('ui') as Promise<EmeraldUi>]);
 validateEmeraldWorld(bundle);validateEmeraldUi(ui);return {bundle,ui};
}
