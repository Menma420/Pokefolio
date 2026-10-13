let audioContext: AudioContext | null = null;
const unlockListeners=new Set<()=>void>();
export function onAudioUnlock(listener:()=>void):()=>void {unlockListeners.add(listener);return ()=>{unlockListeners.delete(listener);};}

export function getAudioContext(): AudioContext | null { return audioContext; }

/** A first gesture may unlock title BGM without also confirming PRESS START.
 * Keep listening after a failed resume, and release handlers with the game shell.
 */
export function listenForAudioUnlock():()=>void {
 const remove=()=>{window.removeEventListener('pointerdown',gesture,true);window.removeEventListener('keydown',gesture,true);};
 const gesture=()=>unlockAudio(remove);
 window.addEventListener('pointerdown',gesture,true);window.addEventListener('keydown',gesture,true);
 return remove;
}

export function unlockAudio(onReady?:()=>void): void {
  if (typeof window === 'undefined') return;
  try {
    const Context = window.AudioContext;
    if (!Context) return;
    audioContext ??= new Context();
    if (audioContext.state === 'suspended') void audioContext.resume().then(()=>{for(const listener of unlockListeners)listener();onReady?.();}).catch(()=>{});
    else {for(const listener of unlockListeners)listener();onReady?.();}
  } catch {
    // Audio is optional in this milestone; input still begins on devices without Web Audio.
  }
}
