import { describe, expect, it } from 'vitest';
import { HistorySentinel, HistorySentinelPort } from '../../src/runtime/HistorySentinel';

class FakeHistory implements HistorySentinelPort {
  state: unknown = { route: 'before-game' };
  pushed: unknown[] = [];
  replaced: unknown[] = [];
  backs = 0;
  pushState(data: unknown) { this.state = structuredClone(data); this.pushed.push(this.state); }
  replaceState(data: unknown) { this.state = structuredClone(data); this.replaced.push(this.state); }
  back() { this.backs += 1; this.state = { route: 'before-game' }; }
}

class FakeEvents {
  private listeners = new Set<() => void>();
  addEventListener(_name: string, listener: EventListenerOrEventListenerObject) { this.listeners.add(listener as () => void); }
  removeEventListener(_name: string, listener: EventListenerOrEventListenerObject) { this.listeners.delete(listener as () => void); }
  pop() { for (const listener of this.listeners) listener(); }
}

describe('HistorySentinel', () => {
  it('maps browser Back to one game Back and removes the sentinel without navigating on close', () => {
    const history = new FakeHistory();
    const events = new FakeEvents();
    let backs = 0;
    const sentinel = new HistorySentinel(() => { backs += 1; }, history, () => 'http://game.test/', events);
    expect(sentinel.open()).toBe(true);
    events.pop();
    expect(backs).toBe(1);
    expect(history.pushed).toHaveLength(2);
    sentinel.close();
    expect(history.replaced).toEqual([{ route: 'before-game' }]);
    expect(history.backs).toBe(0);
    events.pop();
    expect(backs).toBe(1);
  });
});
