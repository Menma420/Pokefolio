import type { Clock, ScheduledTask } from '../clock';
import type { Direction } from '../../domain/map';
import type { TilePosition } from '../world/types';

export type EncounterStep =
  | { type: 'wait'; durationMs: number }
  | { type: 'face'; entityId: string; facing: Direction }
  | { type: 'exclaim'; entityId: string }
  | { type: 'move'; entityId: string; to: TilePosition }
  | { type: 'say'; text: string }
  | { type: 'choice'; prompt: string; choices: Array<{ id: string; label: string }> }
  | { type: 'camera'; roomId: string }
  | { type: 'vs'; audienceId: string; durationMs: number; transitionMs?: number }
  | { type: 'startBattle'; audienceId: string };

export interface EncounterCancellation { readonly aborted: boolean; onAbort(listener: () => void): () => void }
export type EncounterStepHandler = (step: EncounterStep, signal: EncounterCancellation) => void | string | Promise<void | string>;
export interface EncounterHandlers {
  face: EncounterStepHandler;
  exclaim: EncounterStepHandler;
  move: EncounterStepHandler;
  say: EncounterStepHandler;
  choice: EncounterStepHandler;
  camera: EncounterStepHandler;
  vs: EncounterStepHandler;
  vsTransition?: EncounterStepHandler;
  startBattle: EncounterStepHandler;
}
export interface EncounterSnapshot { active: boolean; stepIndex: number; step: EncounterStep | null }

class CancellationToken implements EncounterCancellation {
  aborted = false;
  private listeners = new Set<() => void>();
  onAbort(listener: () => void): () => void {
    if (this.aborted) { listener(); return () => undefined; }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  abort() {
    this.aborted = true;
    for (const listener of this.listeners) listener();
    this.listeners.clear();
  }
}

function abortError(): Error {
  const error = new Error('Encounter aborted');
  error.name = 'AbortError';
  return error;
}

export class EncounterMachine {
  private controller: CancellationToken | null = null;
  private waitTask: ScheduledTask | null = null;
  private snapshotValue: EncounterSnapshot = { active: false, stepIndex: -1, step: null };
  private listeners = new Set<(snapshot: EncounterSnapshot) => void>();

  constructor(private readonly clock: Clock) {}
  get snapshot(): EncounterSnapshot { return this.snapshotValue; }

  subscribe(listener: (snapshot: EncounterSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshotValue);
    return () => this.listeners.delete(listener);
  }

  private publish(snapshot: EncounterSnapshot) {
    this.snapshotValue = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  async run(steps: readonly EncounterStep[], handlers: EncounterHandlers): Promise<string[]> {
    if (this.controller) throw new Error('EncounterMachine is already running');
    const controller = new CancellationToken();
    this.controller = controller;
    const choices: string[] = [];
    try {
      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index]!;
        if (controller.aborted) throw abortError();
        this.publish({ active: true, stepIndex: index, step });
        if (step.type === 'wait') await this.wait(step.durationMs, controller);
        else {
          const result = await this.withAbort(handlers[step.type](step, controller), controller);
          if (step.type === 'choice' && typeof result === 'string') choices.push(result);
          if (step.type === 'vs' && step.durationMs > 0) {
            const transitionMs = Math.min(step.transitionMs ?? 0, step.durationMs);
            await this.wait(step.durationMs - transitionMs, controller);
            if (transitionMs > 0) {
              await this.withAbort(handlers.vsTransition?.(step, controller), controller);
              await this.wait(transitionMs, controller);
            }
          }
        }
      }
      return choices;
    } finally {
      if (this.controller === controller) this.controller = null;
      this.waitTask?.cancel();
      this.waitTask = null;
      this.publish({ active: false, stepIndex: -1, step: null });
    }
  }

  abort(): void {
    if (!this.controller) return;
    this.controller.abort();
    this.waitTask?.cancel();
    this.waitTask = null;
  }

  private wait(durationMs: number, signal: EncounterCancellation): Promise<void> {
    if (!Number.isFinite(durationMs) || durationMs < 0) return Promise.reject(new Error('Encounter wait duration must be non-negative'));
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise<void>((resolve, reject) => {
      const removeAbort = signal.onAbort(() => { this.waitTask?.cancel(); this.waitTask = null; reject(abortError()); });
      this.waitTask = this.clock.schedule(() => {
        removeAbort();
        this.waitTask = null;
        resolve();
      }, durationMs);
    });
  }

  private withAbort<T>(value: T | Promise<T>, signal: EncounterCancellation): Promise<T> {
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise<T>((resolve, reject) => {
      const removeAbort = signal.onAbort(() => reject(abortError()));
      Promise.resolve(value).then(
        (result) => { removeAbort(); resolve(result); },
        (error: unknown) => { removeAbort(); reject(error); },
      );
    });
  }
}
