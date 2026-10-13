import type {Clock} from '../core/clock';
import {getAudioContext,onAudioUnlock} from './AudioUnlocker';
import {settingsStore} from './stores';
import manifest from '../../assets-src/audio/manifest.json';
import type {MusicAsset,MusicId,MusicState,SourceMusicManifest} from './music';
import {musicForState} from './music';
export type MusicScene='silent'|'town'|'battle';
export const VICTORY_DURATION_SECONDS=4;
export interface MusicTrace {time:number;event:string;id:MusicId;src:string|null;detail?:string}
/** Single BGM transport. Web Audio owns sample timing; the existing Clock stamps
 * choreography. No UI component creates its own music instance.
 */
export class MusicService {
 private scene:MusicId='silent';private victory=false;private disposed=false;private generation=0;
 private source:AudioBufferSourceNode|null=null;private gain:GainNode|null=null;
 private buffers=new Map<MusicId,AudioBuffer>();private pending=new Map<MusicId,Promise<AudioBuffer>>();private failed=new Set<MusicId>();
 private started=0;private offset=0;private removeUnlock:(()=>void)|null=null;private removeSettings:(()=>void)|null=null;
 private sourceManifest:SourceMusicManifest|null=null;
 private trace:MusicTrace[]=[];private omitted=new Set<MusicId>();
 constructor(private readonly clock:Clock,private readonly context=getAudioContext,private readonly load:typeof fetch=(...args)=>fetch(...args),private readonly onTrace?:(trace:readonly MusicTrace[])=>void){}
 mount(){this.removeUnlock=onAudioUnlock(()=>{this.failed.clear();this.record('unlock');void this.refresh();});this.removeSettings=settingsStore.subscribe(()=>void this.refresh());document.addEventListener('visibilitychange',this.visibility);return ()=>this.dispose();}
 configureSource(manifest:SourceMusicManifest){this.sourceManifest=manifest;this.failed.clear();this.omitted.clear();this.record('configure',manifest.sourceCommit);void this.refresh();}
 /** Consume real orchestrator states. Menu/dialogue/step snapshots resolve to the
  * same ID and therefore never stop/restart an active or pending track.
  */
 sync(state:MusicState){
  if(this.sourceManifest)this.setMusic(musicForState(state,this.sourceManifest),`${state.mode}:${state.mapId??''}`);
  else this.setMusic(['OVERWORLD','INTERIOR'].includes(state.mode)?'town':['ENCOUNTER','AUDIENCE','VS','BATTLE'].includes(state.mode)?'battle':'silent',state.mode);
 }
 setScene(scene:MusicScene){this.setMusic(scene);}
 setMusic(id:MusicId,reason?:string){if(this.disposed||id===this.scene)return;this.pause();this.offset=0;this.scene=id;this.victory=false;this.record('request',reason);void this.refresh();}
 /** Compatibility API for an explicit completed legacy event. The interview EXIT
  * handler never calls it; there is no victory/completion state in that flow.
  */
 playVictory(){if(this.disposed||this.victory)return;this.pause();this.offset=0;this.scene='town';this.victory=true;this.record('request','explicit legacy completion');void this.refresh();}
 retry(){this.failed.delete(this.track);this.record('retry');void this.refresh();}
 private get track():MusicId{return this.victory?'victory':this.scene;}
 private asset(id=this.track):MusicAsset|null {
  if(id==='silent')return null;
  if(id.startsWith('MUS_'))return this.sourceManifest?.tracks[id as keyof SourceMusicManifest['tracks']]??null;
  const legacy=manifest[id as 'town'|'battle'|'victory'];
  return {src:legacy.src,present:true,validated:true,loop:legacy.loop,gain:0.22,loopStart:null,loopEnd:null};
 }
 private record(event:string,detail?:string){this.trace.push({time:this.clock.now(),event,id:this.track,src:this.asset()?.src??null,...detail?{detail}:{}});if(this.trace.length>512)this.trace.shift();this.onTrace?.([...this.trace]);}
 getTrace(){return [...this.trace];}
 getStatus(){return {scene:this.scene,track:this.track,playing:!!this.source,failed:[...this.failed],time:this.clock.now()};}
 private visibility=()=>{this.record(document.hidden?'hidden':'visible');void this.refresh();};
 private pause(){
  this.generation++;const audio=this.context();
  if(this.source&&audio)this.offset+=Math.max(0,audio.currentTime-this.started);
  if(this.source){this.record('stop');this.source.onended=null;}
  try{this.source?.stop();this.source?.disconnect();this.gain?.disconnect();}catch{}
  this.source=null;this.gain=null;
 }
 private finishVictory(){this.victory=false;this.offset=0;void this.refresh();}
 private async refresh(){
  const audio=this.context();
  if(this.disposed||this.scene==='silent'||!audio||audio.state!=='running'||document.hidden||settingsStore.getState().musicMuted){this.pause();return;}
  const track=this.track,asset=this.asset(track);
  if(this.source||this.failed.has(track)||this.omitted.has(track))return;
  if(!asset?.present||!asset.validated||!asset.src){
   if(asset?.notRequired){this.omitted.add(track);this.record('not-required',asset.scopeReason??'Recording excluded from current scope; no substitute');}
   else{this.failed.add(track);this.record('unavailable','No validated local recording; no substitute');}
   return;
  }
  const generation=++this.generation;
  try{
   let buffer=this.buffers.get(track);
   if(!buffer){
    let loading=this.pending.get(track);
    if(!loading){this.record('load');loading=(async()=>{const response=await this.load(asset.src!);if(!response.ok)throw new Error(`Audio unavailable (${response.status})`);return audio.decodeAudioData(await response.arrayBuffer());})();this.pending.set(track,loading);}
    try{buffer=await loading;this.buffers.set(track,buffer);}finally{if(this.pending.get(track)===loading)this.pending.delete(track);}
   }
   if(this.disposed||generation!==this.generation||document.hidden||settingsStore.getState().musicMuted)return;
   const duration=track==='victory'?Math.min(buffer.duration,VICTORY_DURATION_SECONDS):buffer.duration;
   if(track==='victory'&&this.offset>=duration){this.finishVictory();return;}
   if(asset.loopStart!==null&&asset.loopEnd!==null&&!(asset.loopStart>=0&&asset.loopEnd>asset.loopStart&&asset.loopEnd<=buffer.duration))throw new Error('Verified loop interval outside decoded recording');
   const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;source.loop=asset.loop;gain.gain.value=asset.gain;
   if(asset.loopStart!==null&&asset.loopEnd!==null){source.loopStart=asset.loopStart;source.loopEnd=asset.loopEnd;}
   this.started=audio.currentTime;this.source=source;this.gain=gain;source.connect(gain);gain.connect(audio.destination);
   if(track==='victory')source.onended=()=>{if(this.source!==source||this.disposed)return;source.disconnect();gain.disconnect();this.source=null;this.gain=null;this.record('ended');this.finishVictory();};
   let offset=this.offset;
   if(source.loop){const start=asset.loopStart??0,end=asset.loopEnd??buffer.duration;if(offset>=end)offset=start+(offset-start)%(end-start);}
   if(track==='victory')source.start(0,offset,duration-offset);else source.start(0,offset);
   this.started=audio.currentTime;this.offset=offset;this.source=source;this.gain=gain;this.record('start',`offset=${offset};loop=${source.loop}`);
  }catch(error){if(generation===this.generation){this.failed.add(track);this.record('error',String(error));this.pause();if(track==='victory')this.finishVictory();}}
 }
 dispose(){this.disposed=true;this.pause();this.removeUnlock?.();this.removeSettings?.();document.removeEventListener('visibilitychange',this.visibility);this.record('dispose');}
}
