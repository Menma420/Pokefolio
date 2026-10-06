import type { Clock, ScheduledTask } from '../core/clock';
import { hintsStore } from './stores';

export type HintKey = 'seenFirstMove' | 'seenFirstInteract';

export class HintService {
  private hideTask: ScheduledTask | null = null;
  constructor(private readonly clock: Clock, private readonly show: (text: string | null) => void) {}

  arrival(): void {
    if (hintsStore.getState().seenHowToPlay) return;
    hintsStore.getState().markSeen('seenHowToPlay');
    this.hideTask?.cancel();
    const steps = ['X: MENU      Y: RESUME', 'X > MENU > EXIT', 'ENJOY MY WORLD'];
    const advance = (index: number) => {
      this.show(steps[index] ?? null);
      this.hideTask = index < steps.length ? this.clock.schedule(() => advance(index + 1), index < 2 ? 3000 : 2000) : null;
    };
    advance(0);
  }
  firstMove(): void { if (!hintsStore.getState().seenHowToPlay) this.arrival(); }
  firstInteract(): void { if (this.hideTask) return; this.showOnce('seenFirstInteract', 'Enter: Interact'); }

  dispose(): void {
    this.hideTask?.cancel();
    this.hideTask = null;
  }

  private showOnce(key: HintKey, text: string) {
    if (hintsStore.getState()[key]) return;
    hintsStore.getState().markSeen(key);
    this.hideTask?.cancel();
    this.show(text);
    this.hideTask = this.clock.schedule(() => {
      this.hideTask = null;
      this.show(null);
    }, 2400);
  }
}
