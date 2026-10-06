import { getAudioContext } from './AudioUnlocker';
import { settingsStore } from './stores';
import manifest from '../../assets-src/audio/manifest.json';
export type UiSound = Exclude<keyof typeof manifest,'town'|'battle'|'victory'>;
/** Live playback of our exported cue scores. Short envelopes prevent clicks. */
export class AudioService {
 private voices=new Map<OscillatorNode,GainNode>();
 private silence=()=>{for(const [voice,gain] of this.voices){try{voice.stop();voice.disconnect();gain.disconnect();}catch{}}this.voices.clear();};
 mount(){const remove=settingsStore.subscribe(state=>{if(state.soundMuted)this.silence();});const hidden=()=>{if(document.hidden)this.silence();};document.addEventListener('visibilitychange',hidden);return ()=>{remove();document.removeEventListener('visibilitychange',hidden);this.silence();};}
 constructor(private readonly context=getAudioContext,private readonly muted=()=>settingsStore.getState().soundMuted){}
 play(name:UiSound):void {
  const audio=this.context();if(!audio||audio.state!=='running'||this.muted()||typeof document!=='undefined'&&document.hidden)return;
  try{
   const cue=manifest[name],oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='square';
   const start=audio.currentTime;oscillator.frequency.value=cue.frequencies[0]!;
   cue.frequencies.forEach((frequency,i)=>oscillator.frequency.setValueAtTime?.(frequency,start+i*cue.duration/cue.frequencies.length));
   gain.gain.value=name==='text.tick'?0.007:0.014;
   gain.gain.setValueAtTime?.(gain.gain.value,start);gain.gain.linearRampToValueAtTime?.(0,start+cue.duration);
   oscillator.connect(gain);gain.connect(audio.destination);this.voices.set(oscillator,gain);oscillator.onended=()=>{if(!this.voices.delete(oscillator))return;oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+cue.duration);
  }catch{/* Optional audio failures never affect game input or schedule retries. */}
 }
}
export const audioService=new AudioService();
