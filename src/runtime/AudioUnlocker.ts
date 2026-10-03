let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null { return audioContext; }

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const Context = window.AudioContext;
    if (!Context) return;
    audioContext ??= new Context();
    if (audioContext.state === 'suspended') void audioContext.resume();
  } catch {
    // Audio is optional in this milestone; input still begins on devices without Web Audio.
  }
}
