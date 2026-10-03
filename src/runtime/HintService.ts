import type { Clock, ScheduledTask } from '../core/clock';
import { hintsStore } from './stores';

export type HintKey = 'seenFirstMove' | 'seenFirstInteract';

export class HintService {
  private hideTask: ScheduledTask | null = null;
  constructor(private readonly clock: Clock, private readonly show: (text: string | null) => void) {}

  firstMove(): void { this.showOnce('seenFirstMove', 'Arrow Keys: Move'); }
  firstInteract(): void { this.showOnce('seenFirstInteract', 'Enter: Interact'); }

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
