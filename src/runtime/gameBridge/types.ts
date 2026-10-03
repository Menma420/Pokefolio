import type { NpcRoute } from '../../domain/map';
import type { WorldEvent, WorldSnapshot } from '../../core/world/types';

export type GameCommand =
  | { type: 'loadMap'; mapId: string }
  | { type: 'setCameraRoom'; roomId: string }
  | { type: 'pauseWorld' }
  | { type: 'resumeWorld' }
  | { type: 'playEntityRoute'; entityId: string; steps: NpcRoute }
  | { type: 'faceEntity'; entityId: string; facing: 'up' | 'right' | 'down' | 'left' }
  | { type: 'showExclaim'; entityId: string }
  | { type: 'snapshot' }
  | { type: 'loadBattleScene' }
  | { type: 'unloadBattleScene' }
  | { type: 'sleepWorldScene' }
  | { type: 'wakeWorldScene' }
  | { type: 'setBattleSprites'; animationKey: 'arrival' | 'sendout' | 'idle'; visitor: {x:number;y:number;visible:boolean}; opponent: {x:number;y:number;visible:boolean} };

export type IdentifiedGameCommand = GameCommand & { commandId: string };
export interface GameAck { commandId: string; commandType: GameCommand['type']; value?: unknown }
export type GameEvent = WorldEvent | { type: 'worldReady' } | { type: 'battleReady' } | { type: 'assetFailed'; key: string; message: string };
export type GameEventListener<K extends GameEvent['type']> = (event: Extract<GameEvent, { type: K }>) => void;
export type GameCommandHandler = (command: IdentifiedGameCommand) => void | unknown | Promise<void | unknown>;
export type SnapshotListener = (snapshot: WorldSnapshot) => void;

export interface GameBridge {
  send(command: GameCommand): Promise<GameAck>;
  snapshot(): Promise<WorldSnapshot>;
  emit(event: GameEvent): void;
  onEvent<K extends GameEvent['type']>(type: K, listener: GameEventListener<K>): () => void;
  onCommand(handler: GameCommandHandler): () => void;
  publishSnapshot(snapshot: WorldSnapshot): void;
  onSnapshot(listener: SnapshotListener): () => void;
  getLatestSnapshot(): WorldSnapshot | null;
}
