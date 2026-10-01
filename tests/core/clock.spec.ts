import { describe, it, expect, vi } from 'vitest';
import { FakeClock } from '../../src/core/clock';

describe('FakeClock', () => {
  it('advances synchronously and triggers scheduled sequences exactly identically', () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(0);

    const fn1 = vi.fn();
    const fn2 = vi.fn();

    clock.schedule(fn1, 100);
    clock.schedule(fn2, 200);

    clock.tick(50);
    expect(fn1).not.toHaveBeenCalled();
    
    clock.tick(50); // now is 100
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled();

    clock.tick(150); // now is 250
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(clock.now()).toBe(250);
  });

  it('honors task cancellations gracefully protecting sequences correctly reliably', () => {
    const clock = new FakeClock();
    const fn = vi.fn();

    const task = clock.schedule(fn, 50);
    task.cancel();

    clock.tick(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
