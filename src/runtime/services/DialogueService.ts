export interface DialogueRequest {
  text: string;
  resolve: () => void;
}

export class DialogueService {
  private queue: DialogueRequest[] = [];
  private active: DialogueRequest | null = null;
  private subscribers: Array<(req: DialogueRequest | null) => void> = [];

  public request(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ text, resolve });
      this.pump();
    });
  }

  // Called natively by the DialogueBox UI exactly when Enter advances past the final page smoothly identically 
  public completeActive() {
    if (this.active) {
      const { resolve } = this.active;
      this.active = null;
      resolve();
      this.notify();
      this.pump();
    }
  }

  public subscribe(fn: (req: DialogueRequest | null) => void) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  public getActive() {
    return this.active;
  }

  private pump() {
    if (this.active) return;
    if (this.queue.length === 0) return;

    this.active = this.queue.shift()!;
    this.notify();
  }

  private notify() {
    this.subscribers.forEach(fn => fn(this.active));
  }
}

export const globalDialogueService = new DialogueService();
