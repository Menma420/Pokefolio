import { getAudioContext } from './AudioUnlocker';
import { settingsStore } from './stores';
export type UiSound = 'cursor.move' | 'ui.confirm' | 'ui.cancel' | 'ui.buzz' | 'text.tick' | 'world.door' | 'world.bump' | 'encounter.alert' | 'vs.cue' | 'battle.sendout' | 'link.open' | 'page' | 'menu.open' | 'title.start';
const tones: Record<UiSound, readonly [number, number]> = {
  'cursor.move': [960, 35], 'ui.confirm': [1280, 70], 'ui.cancel': [640, 60],
  'ui.buzz': [160, 90], 'text.tick': [1600, 18],
  'world.door':[320,140], 'world.bump':[120,40], 'encounter.alert':[1440,100],
  'vs.cue':[720,120], 'battle.sendout':[1120,120], 'link.open':[1360,90],
  page:[800,25], 'menu.open':[1040,50], 'title.start':[880,150],
};
/** Original square-wave UI sounds. Audio stays silent until the explicit unlock gesture. */
export class AudioService {
  constructor(private readonly context = getAudioContext, private readonly muted = () => settingsStore.getState().soundMuted) {}
  play(name: UiSound): void {
    const audio = this.context();
    if (!audio || audio.state !== 'running' || this.muted()) return;
    const [frequency, milliseconds] = tones[name];
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'square'; oscillator.frequency.value = frequency;
    gain.gain.value = name === 'text.tick' ? 0.012 : 0.025;
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(audio.currentTime); oscillator.stop(audio.currentTime + milliseconds / 1000);
  }
}
export const audioService = new AudioService();
