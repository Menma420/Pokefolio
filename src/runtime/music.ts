import type {FlowMode} from '../core/flow';

export const SOURCE_MUSIC_IDS = ['MUS_TITLE','MUS_ROUTE122','MUS_LITTLEROOT','MUS_BIRCH_LAB','MUS_ROUTE101','MUS_ENCOUNTER_MALE','MUS_ENCOUNTER_CHAMPION','MUS_VS_RIVAL','MUS_VS_CHAMPION','MUS_VS_TRAINER','MUS_VICTORY_LEAGUE','MUS_VICTORY_TRAINER'] as const;
export type SourceMusicId = typeof SOURCE_MUSIC_IDS[number];
export type MusicId = SourceMusicId|'silent'|'town'|'battle'|'victory';
export interface MusicAsset {
 src:string|null; present:boolean; validated:boolean; loop:boolean; gain:number;
 loopStart:number|null; loopEnd:number|null;
 /** Missing recordings explicitly excluded from the current local scope. */
 notRequired?:boolean; scopeReason?:string|null;
}
export interface SourceMusicManifest {
 sourceCommit:string;
 maps:Record<string,SourceMusicId>;
 tracks:Record<SourceMusicId,MusicAsset & {constant:SourceMusicId;numericId:number;title:string;filename:string|null;sha256:string|null}>;
}
export interface MusicState {mode:FlowMode;mapId:string|null;opponent:'steven'|'generic'}

/** Pure presentation adapter. The Route101 Youngster is not an Emerald trainer;
 * its recognition cue is a PokéFolio adaptation. Steven's actual Emerald trainer
 * class is RIVAL, not CHAMPION (pokemon.c:GetBattleBGM).
 */
export function musicForState(state:MusicState,manifest:SourceMusicManifest):MusicId {
 switch(state.mode){
  case 'TITLE':return 'MUS_TITLE';
  case 'INTRO':return 'MUS_ROUTE122';
  case 'ENCOUNTER':case 'AUDIENCE':case 'VS':return 'MUS_ENCOUNTER_MALE';
  case 'BATTLE':return state.opponent==='steven'?'MUS_VS_RIVAL':'MUS_VS_TRAINER';
  case 'OVERWORLD':case 'INTERIOR':return state.mapId?manifest.maps[state.mapId]??'silent':'silent';
  default:return 'silent';
 }
}
