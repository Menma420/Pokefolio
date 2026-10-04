import type {Clock,ScheduledTask} from '../core/clock';
import {getAudioContext,onAudioUnlock} from './AudioUnlocker';
import {settingsStore} from './stores';
/** Original 32-step quiet square-wave phrase. All choreography belongs to Clock. */
const notes=[262,0,330,392,0,330,294,0,262,330,440,0,392,330,294,0,349,0,440,523,0,440,392,0,330,392,494,0,440,349,294,0];
export class MusicService {
 private task:ScheduledTask|null=null;private removeUnlock:(()=>void)|null=null;private removeSettings:(()=>void)|null=null;private stopped=false;private step=0;
 private voices=new Set<OscillatorNode>();
 constructor(private readonly clock:Clock,private readonly context=getAudioContext){}
 mount(){this.removeUnlock=onAudioUnlock(()=>this.begin());this.removeSettings=settingsStore.subscribe(state=>{if(state.musicMuted)this.silence();});if(this.context()?.state==='running')this.begin();return ()=>this.dispose();}
 private begin(){if(this.stopped||this.task)return;this.tick();}
 private tick(){if(this.stopped)return;const audio=this.context(),frequency=notes[this.step++%notes.length]!;
  if(audio?.state==='running'&&!settingsStore.getState().musicMuted&&frequency){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='square';oscillator.frequency.value=frequency;gain.gain.value=0.004;oscillator.connect(gain);gain.connect(audio.destination);this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(audio.currentTime);oscillator.stop(audio.currentTime+0.16);}
  this.task=this.clock.schedule(()=>{this.task=null;this.tick();},250);
 }
 private silence(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 dispose(){this.stopped=true;this.task?.cancel();this.removeUnlock?.();this.removeSettings?.();this.silence();}
}
