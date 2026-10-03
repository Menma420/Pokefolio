import { Clock, gameClock } from '../../core/clock';
import { GameAck, GameBridge, GameCommand, GameCommandHandler, GameEvent, IdentifiedGameCommand, SnapshotListener } from './types';
import { WorldSnapshot } from '../../core/world/types';

export * from './types';

export function createGameBridge(clock: Clock = gameClock, timeoutMs = 1500): GameBridge {
  let commandSequence = 0;
  let latestSnapshot: WorldSnapshot | null = null;
  const commandHandlers = new Set<GameCommandHandler>();
  const snapshotListeners = new Set<SnapshotListener>();
  const eventListeners = new Map<GameEvent['type'], Set<(event: GameEvent) => void>>();

  const bridge: GameBridge = {
    send(command: GameCommand): Promise<GameAck> {
      const handler = [...commandHandlers][0];
      if (!handler) return Promise.reject(new Error(`No Phaser view is attached for ${command.type}`));
      const identified = { ...command, commandId: `game-command-${++commandSequence}` } as IdentifiedGameCommand;
      return new Promise<GameAck>((resolve, reject) => {
        let settled = false;
        const timer = clock.schedule(() => {
          if (settled) return;
          settled = true;
          reject(new Error(`GameBridge ${command.type} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        Promise.resolve().then(() => handler(identified)).then((value) => {
          if (settled) return;
          settled = true;
          timer.cancel();
          resolve({ commandId: identified.commandId, commandType: command.type, value });
        }, (error: unknown) => {
          if (settled) return;
          settled = true;
          timer.cancel();
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    },
    async snapshot() {
      const ack = await bridge.send({ type: 'snapshot' });
      if (!ack.value || typeof ack.value !== 'object' || !('map' in ack.value)) throw new Error('Phaser snapshot acknowledgement did not include a WorldSnapshot');
      return ack.value as WorldSnapshot;
    },
    emit(event) { for (const listener of eventListeners.get(event.type) ?? []) listener(event); },
    onEvent(type, listener) {
      const listeners = eventListeners.get(type) ?? new Set();
      listeners.add(listener as (event: GameEvent) => void);
      eventListeners.set(type, listeners);
      return () => listeners.delete(listener as (event: GameEvent) => void);
    },
    onCommand(handler) { commandHandlers.add(handler); return () => commandHandlers.delete(handler); },
    publishSnapshot(snapshot) {
      latestSnapshot = snapshot;
      for (const listener of snapshotListeners) listener(snapshot);
    },
    onSnapshot(listener) {
      snapshotListeners.add(listener);
      if (latestSnapshot) listener(latestSnapshot);
      return () => snapshotListeners.delete(listener);
    },
    getLatestSnapshot() { return latestSnapshot; },
  };
  return bridge;
}
