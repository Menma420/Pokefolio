let audioContext: AudioContext | null = null;
const unlockListeners=new Set<()=>void>();
export function onAudioUnlock(listener:()=>void):()=>void {unlockListeners.add(listener);return ()=>{unlockListeners.delete(listener);};}

export function getAudioContext(): AudioContext | null { return audioContext; }

/** Try immediately when requested; browsers that block audible autoplay retain
 * the first-gesture fallback without also confirming PRESS START. A pending or
 * failed resume never delays game startup or schedules polling retries.
 */
export function listenForAudioUnlock({autoplay=false}:{autoplay?:boolean}={}):()=>void {
 const remove=()=>{window.removeEventListener('pointerdown',gesture,true);window.removeEventListener('keydown',gesture,true);};
 const gesture=()=>unlockAudio(remove);
 window.addEventListener('pointerdown',gesture,true);window.addEventListener('keydown',gesture,true);
 if(autoplay)gesture();
 return remove;
}

export function unlockAudio(onReady?:()=>void): void {
  if (typeof window === 'undefined') return;
  try {
    const Context = window.AudioContext;
    if (!Context) return;
    audioContext ??= new Context();
    const ready=()=>{if(audioContext?.state!=='running')return;for(const listener of unlockListeners)listener();onReady?.();};
    if (audioContext.state === 'suspended') void audioContext.resume().then(ready).catch(()=>{});
    else ready();
  } catch {
    // Audio is optional in this milestone; input still begins on devices without Web Audio.
  }
}
