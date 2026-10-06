import type {Clock} from '../core/clock';
import {getAudioContext,onAudioUnlock} from './AudioUnlocker';
import {settingsStore} from './stores';
import manifest from '../../assets-src/audio/manifest.json';
export type MusicScene='silent'|'town'|'battle';
type MusicTrack=Exclude<MusicScene,'silent'>|'victory';
/** One scene transport. Web Audio owns sample timing; Clock owns game choreography. */
export class MusicService {
 private scene:MusicScene='silent';private victory=false;private disposed=false;private generation=0;
 private source:AudioBufferSourceNode|null=null;private gain:GainNode|null=null;
 private buffers=new Map<MusicTrack,AudioBuffer>();private failed=new Set<MusicTrack>();
 private started=0;private offset=0;private removeUnlock:(()=>void)|null=null;private removeSettings:(()=>void)|null=null;
 constructor(private readonly clock:Clock,private readonly context=getAudioContext,private readonly load:typeof fetch=(...args)=>fetch(...args)){}
 mount(){this.removeUnlock=onAudioUnlock(()=>void this.refresh());this.removeSettings=settingsStore.subscribe(()=>void this.refresh());document.addEventListener('visibilitychange',this.visibility);return ()=>this.dispose();}
 setScene(scene:MusicScene){if(scene===this.scene)return;this.pause();this.offset=0;this.scene=scene;this.victory=false;void this.refresh();}
 /** A completed battle returns to the world immediately; its cue finishes before town resumes. */
 playVictory(){if(this.disposed||this.victory)return;this.pause();this.offset=0;this.scene='town';this.victory=true;void this.refresh();}
 getStatus(){return {scene:this.scene,track:this.victory?'victory':this.scene,playing:!!this.source,failed:[...this.failed],time:this.clock.now()};}
 private visibility=()=>{void this.refresh();};
 private pause(){
  this.generation++;const audio=this.context();
  if(this.source&&audio)this.offset+=Math.max(0,audio.currentTime-this.started);
  if(this.source)this.source.onended=null;
  try{this.source?.stop();this.source?.disconnect();this.gain?.disconnect();}catch{}
  this.source=null;this.gain=null;
 }
 private finishVictory(){this.victory=false;this.offset=0;void this.refresh();}
 private async refresh(){
  const audio=this.context();
  if(this.disposed||this.scene==='silent'||!audio||audio.state!=='running'||document.hidden||settingsStore.getState().musicMuted){this.pause();return;}
  const track:MusicTrack=this.victory?'victory':this.scene;
  if(this.source)return;
  if(this.failed.has(track)){if(this.victory)this.finishVictory();return;}
  const generation=++this.generation;
  try{
   let buffer=this.buffers.get(track);
   if(!buffer){const response=await this.load(manifest[track].src);if(!response.ok)throw new Error('Audio export unavailable');buffer=await audio.decodeAudioData(await response.arrayBuffer());this.buffers.set(track,buffer);}
   if(this.disposed||generation!==this.generation||document.hidden||settingsStore.getState().musicMuted)return;
   if(track==='victory'&&this.offset>=5){this.finishVictory();return;}
   const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;source.loop=manifest[track].loop;gain.gain.value=0.22;source.connect(gain);gain.connect(audio.destination);
   if(track==='victory')source.onended=()=>{
    if(this.source!==source||this.disposed)return;
    source.disconnect();gain.disconnect();this.source=null;this.gain=null;this.finishVictory();
   };
   const duration = track === 'victory' ? Math.max(0, 5 - this.offset) : undefined;
   if (duration !== undefined) {
      source.start(0,source.loop?this.offset%buffer.duration:this.offset, duration);
   } else {
      source.start(0,source.loop?this.offset%buffer.duration:this.offset);
   }
   this.started=audio.currentTime;this.source=source;this.gain=gain;
  }catch{if(generation===this.generation){this.failed.add(track);this.pause();if(track==='victory')this.finishVictory();}}
 }
 dispose(){this.disposed=true;this.pause();this.removeUnlock?.();this.removeSettings?.();document.removeEventListener('visibilitychange',this.visibility);}
}
