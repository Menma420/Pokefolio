import type { Direction, MapData, NpcRoute } from '../../domain/map';

export interface TilePosition { x: number; y: number }
export interface WorldAnchor { mapId: string; roomId: string; tile: TilePosition; facing: Direction }
export interface EntityMovement { to: TilePosition; elapsedTicks: number }
export interface WorldEntity {
  id: string;
  x: number;
  y: number;
  facing: Direction;
  movement: EntityMovement | null;
}
export interface WorldNpc extends WorldEntity {
  route: NpcRoute;
  routeIndex: number;
  routeDirection: 1 | -1;
  waitTicksLeft: number;
  blockedTicks: number;
}
export interface WorldMapState {
  mapId: string;
  tick: number;
  player: WorldEntity;
  npcs: WorldNpc[];
  cameraRoomId: string;
  talkingNpcId: string | null;
}
export interface WorldReturnFrame {
  enteredThroughDoorId: string;
  mapState: WorldMapState;
}
export interface WorldState {
  current: WorldMapState;
  mapStack: WorldReturnFrame[];
  paused: boolean;
}
export interface WorldSnapshot {
  tick: number;
  map: MapData;
  state: WorldMapState;
  paused: boolean;
  stackDepth: number;
}
export type WorldDirection = Direction | null;
export type WorldEvent =
  | { type: 'stepCompleted'; mapId: string; entityId: string; tile: TilePosition; cameraRoomId: string }
  | { type: 'interactionRequested'; mapId: string; targetId: string; targetType: 'npc' | 'door' | 'object' | 'sign' }
  | { type: 'mapArrived'; mapId: string; roomId: string }
  | { type: 'interactionEnded'; targetId: string };
export type WorldCommand =
  | { type: 'tick'; direction: WorldDirection }
  | { type: 'interact' }
  | { type: 'endInteraction' }
  | { type: 'pressB' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'faceEntity'; entityId: string; facing: Direction }
  | { type: 'setNpcRoute'; entityId: string; route: NpcRoute };

export interface WorldStepResult { state: WorldState; events: WorldEvent[] }
