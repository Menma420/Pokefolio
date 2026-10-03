import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../src/core/clock';
import { EncounterHandlers, EncounterMachine, EncounterStep } from '../../src/core/encounter';

const idleHandlers: EncounterHandlers = {
  face: () => undefined,
  exclaim: () => undefined,
  move: () => undefined,
  say: () => undefined,
  choice: () => 'ENGINEER',
  camera: () => undefined,
  vs: () => undefined,
  vsTransition: () => undefined,
  startBattle: () => undefined,
};

async function flushMicrotasks() { for (let index = 0; index < 100; index += 1) await Promise.resolve(); }

describe('deterministic EncounterMachine step runner', () => {
  it('runs all authored action types in order and waits on the injected Clock', async () => {
    const clock = new FakeClock();
    const machine = new EncounterMachine(clock);
    const calls: string[] = [];
    const steps: EncounterStep[] = [
      { type: 'wait', durationMs: 20 },
      { type: 'face', entityId: 'challenger', facing: 'left' },
      { type: 'exclaim', entityId: 'challenger' },
      { type: 'move', entityId: 'challenger', to: { x: 4, y: 5 } },
      { type: 'say', text: 'Hello' },
      { type: 'choice', prompt: 'Audience?', choices: [{ id: 'ENGINEER', label: 'Engineer' }] },
      { type: 'camera', roomId: 'east-room' },
      { type: 'vs', audienceId: 'ENGINEER', durationMs: 30, transitionMs: 10 },
      { type: 'startBattle', audienceId: 'ENGINEER' },
    ];
    const handlers: EncounterHandlers = {
      face: () => { calls.push('face'); }, exclaim: () => { calls.push('exclaim'); }, move: () => { calls.push('move'); },
      say: () => { calls.push('say'); }, choice: () => { calls.push('choice'); return 'ENGINEER'; }, camera: () => { calls.push('camera'); },
      vs: () => { calls.push('vs'); }, vsTransition: () => { calls.push('transition'); }, startBattle: () => { calls.push('battle'); },
    };
    const running = machine.run(steps, handlers);
    await flushMicrotasks();
    expect(machine.snapshot).toMatchObject({ active: true, stepIndex: 0, step: steps[0] });
    clock.tick(20);
    await flushMicrotasks();
    expect(calls).toEqual(['face', 'exclaim', 'move', 'say', 'choice', 'camera', 'vs']);
    clock.tick(20);
    await flushMicrotasks();
    expect(calls).toContain('transition');
    clock.tick(10);
    await expect(running).resolves.toEqual(['ENGINEER']);
    expect(calls.at(-1)).toBe('battle');
    expect(machine.snapshot).toEqual({ active: false, stepIndex: -1, step: null });
  });

  it('cancels Clock waits and pending UI acknowledgements on interruption', async () => {
    const clock = new FakeClock();
    const machine = new EncounterMachine(clock);
    const waiting = machine.run([{ type: 'wait', durationMs: 400 }], idleHandlers);
    await flushMicrotasks();
    machine.abort();
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    clock.tick(400);
    expect(machine.snapshot.active).toBe(false);

    const pending = machine.run([{ type: 'say', text: 'interrupt me' }], {
      ...idleHandlers,
      say: () => new Promise<void>(() => undefined),
    });
    await flushMicrotasks();
    machine.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
