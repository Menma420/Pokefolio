export interface ScheduledTask {
  cancel: () => void;
}

export interface Clock {
  now(): number;
  schedule(fn: () => void, delayMs: number): ScheduledTask;
}

export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }

  schedule(fn: () => void, delayMs: number): ScheduledTask {
    const id = setTimeout(fn, delayMs);
    return {
      cancel: () => clearTimeout(id)
    };
  }
}

export class FakeClock implements Clock {
  private _now: number = 0;
  private idCounter: number = 1;

  // Stored as [executionTime, id, callback, cancelled]
  private tasks: Array<{ execTime: number; id: number; fn: () => void; cancelled: boolean }> = [];

  now(): number {
    return this._now;
  }

  schedule(fn: () => void, delayMs: number): ScheduledTask {
    const id = this.idCounter++;
    const execTime = this._now + delayMs;
    this.tasks.push({ execTime, id, fn, cancelled: false });
    this.tasks.sort((a, b) => a.execTime - b.execTime);

    return {
      cancel: () => {
        const task = this.tasks.find(t => t.id === id);
        if (task) task.cancelled = true;
      }
    };
  }

  tick(ms: number) {
    const target = this._now + ms;
    while (this.tasks.length > 0 && this.tasks[0]!.execTime <= target) {
      const task = this.tasks.shift()!;
      this._now = task.execTime;
      if (!task.cancelled) {
        task.fn();
      }
    }
    this._now = target;
  }
}
