import { BLOCKING_COLLISION_FLAGS, collisionAt, getMapRoom, MapData, MapObject, NpcObject, NpcRoute, Direction, DoorObject } from '../../domain/map';
import { WorldCommand, WorldDirection, WorldEntity, WorldEvent, WorldMapState, WorldNpc, WorldSnapshot, WorldState, WorldStepResult, TilePosition } from './types';

export const WORLD_TICK_MS = 50;
export const DEFAULT_STEP_TICKS = 8;

export function getWorldStepDurationMs(tickMs = WORLD_TICK_MS, stepTicks = DEFAULT_STEP_TICKS): number {
  return tickMs * stepTicks;
}

function cloneMapState(state: WorldMapState): WorldMapState {
  return {
    ...state,
    player: { ...state.player, movement: state.player.movement ? { ...state.player.movement, to: { ...state.player.movement.to } } : null },
    npcs: state.npcs.map((npc) => ({ ...npc, movement: npc.movement ? { ...npc.movement, to: { ...npc.movement.to } } : null, route: { ...npc.route, points: npc.route.points.map((point) => ({ ...point })) } })),
  };
}

function cloneState(state: WorldState): WorldState {
  return { current: cloneMapState(state.current), mapStack: state.mapStack.map((frame) => ({ ...frame, mapState: cloneMapState(frame.mapState) })), paused: state.paused };
}

function spawnEntity(map: MapData, spawn: Extract<MapObject, { type: 'spawn' }>): WorldEntity {
  return { id: spawn.id, x: spawn.x, y: spawn.y, facing: spawn.facing, movement: null };
}

function npcFromObject(object: NpcObject): WorldNpc {
  return { id: object.id, x: object.x, y: object.y, facing: object.facing, movement: null, route: object.route, routeIndex: 0, routeDirection: 1, waitTicksLeft: 0, blockedTicks: 0 };
}

function createMapState(map: MapData, arrival?: { x: number; y: number; facing: Direction }): WorldMapState {
  const spawn = map.objects.find((object): object is Extract<MapObject, { type: 'spawn' }> => object.type === 'spawn');
  if (!spawn) throw new Error(`Map ${map.id} does not define a spawn`);
  const position = arrival ?? spawn;
  const room = getMapRoom(map, position.x, position.y);
  return {
    mapId: map.id,
    tick: 0,
    player: { ...spawnEntity(map, spawn), x: position.x, y: position.y, facing: position.facing ?? spawn.facing },
    npcs: map.objects.filter((object): object is NpcObject => object.type === 'npc').map(npcFromObject),
    cameraRoomId: room.id,
    talkingNpcId: null,
  };
}

export function createWorldState(maps: ReadonlyMap<string, MapData>, startMapId: string): WorldState {
  const map = maps.get(startMapId);
  if (!map) throw new Error(`Unknown start map ${startMapId}`);
  return { current: createMapState(map), mapStack: [], paused: false };
}

function tileKey(point: TilePosition): string { return `${point.x},${point.y}`; }
function isBlocked(map: MapData, point: TilePosition): boolean { return (collisionAt(map, point.x, point.y) & BLOCKING_COLLISION_FLAGS) !== 0; }
function entityBlocks(point: TilePosition, entities: readonly WorldEntity[], exceptId?: string): boolean {
  const key = tileKey(point);
  return entities.some((entity) => entity.id !== exceptId && (tileKey({ x: entity.x, y: entity.y }) === key || (entity.movement && tileKey(entity.movement.to) === key)));
}

function targetFromFacing(entity: WorldEntity): TilePosition {
  switch (entity.facing) {
    case 'up': return { x: entity.x, y: entity.y - 1 };
    case 'right': return { x: entity.x + 1, y: entity.y };
    case 'down': return { x: entity.x, y: entity.y + 1 };
    case 'left': return { x: entity.x - 1, y: entity.y };
  }
}

function directionFor(from: TilePosition, to: TilePosition): Direction {
  if (to.x > from.x) return 'right';
  if (to.x < from.x) return 'left';
  if (to.y > from.y) return 'down';
  return 'up';
}

function movePoint(point: TilePosition, direction: WorldDirection): TilePosition | null {
  if (!direction) return null;
  switch (direction) {
    case 'up': return { x: point.x, y: point.y - 1 };
    case 'right': return { x: point.x + 1, y: point.y };
    case 'down': return { x: point.x, y: point.y + 1 };
    case 'left': return { x: point.x - 1, y: point.y };
  }
}

function nextRouteIndex(npc: WorldNpc): number {
  if (npc.route.points.length <= 1) {
    npc.routeDirection = 1;
    return 0;
  }
  const next = npc.routeIndex + npc.routeDirection;
  if (npc.route.mode === 'loop') return (npc.routeIndex + 1) % npc.route.points.length;
  if (next < 0 || next >= npc.route.points.length) {
    npc.routeDirection = npc.routeDirection === 1 ? -1 : 1;
    return npc.routeIndex + npc.routeDirection;
  }
  return next;
}

function completeMovement(entity: WorldEntity, stepTicks: number): boolean {
  if (!entity.movement) return false;
  entity.movement.elapsedTicks += 1;
  if (entity.movement.elapsedTicks < stepTicks) return false;
  entity.x = entity.movement.to.x;
  entity.y = entity.movement.to.y;
  entity.movement = null;
  return true;
}

function updateCamera(map: MapData, state: WorldMapState, events: WorldEvent[], entityId: string) {
  const room = getMapRoom(map, state.player.x, state.player.y);
  state.cameraRoomId = room.id;
  events.push({ type: 'stepCompleted', mapId: map.id, entityId, tile: { x: state.player.x, y: state.player.y }, cameraRoomId: room.id });
}

function createInitialMapState(maps: ReadonlyMap<string, MapData>, mapId: string, arrival: DoorObject['arrival']): WorldMapState {
  const map = maps.get(mapId);
  if (!map) throw new Error(`Door targets unknown map ${mapId}`);
  if (isBlocked(map, arrival)) throw new Error(`Door arrival in ${mapId} is blocked`);
  return createMapState(map, arrival);
}

function transitionThroughDoor(state: WorldState, maps: ReadonlyMap<string, MapData>, door: DoorObject, events: WorldEvent[], returnTile?: TilePosition): WorldState {
  const next = cloneState(state);
  const saved = next.mapStack[next.mapStack.length - 1];
  if (saved && saved.mapState.mapId === door.targetMapId && saved.enteredThroughDoorId === door.targetDoorId) {
    const returned = next.mapStack.pop()!;
    next.current = cloneMapState(returned.mapState);
  } else {
    const target = maps.get(door.targetMapId);
    const targetDoor = target?.objects.find((object): object is DoorObject => object.type === 'door' && object.id === door.targetDoorId);
    if (!target || !targetDoor) throw new Error(`Door pair missing: ${door.targetMapId}/${door.targetDoorId}`);
    const exterior = cloneMapState(next.current);
    if (returnTile) {
      exterior.player = { ...exterior.player, ...returnTile, movement: null };
      exterior.cameraRoomId = getMapRoom(maps.get(exterior.mapId)!, returnTile.x, returnTile.y).id;
    }
    next.mapStack.push({ enteredThroughDoorId: door.id, mapState: exterior });
    next.current = createInitialMapState(maps, target.id, door.arrival);
  }
  next.current.cameraRoomId = getMapRoom(maps.get(next.current.mapId)!, next.current.player.x, next.current.player.y).id;
  events.push({ type: 'mapArrived', mapId: next.current.mapId, roomId: next.current.cameraRoomId });
  return next;
}

function restoreParent(state: WorldState, maps: ReadonlyMap<string, MapData>, events: WorldEvent[]): WorldState {
  if (state.mapStack.length === 0) return state;
  const next = cloneState(state);
  next.current = cloneMapState(next.mapStack.pop()!.mapState);
  const map = maps.get(next.current.mapId)!;
  next.current.cameraRoomId = getMapRoom(map, next.current.player.x, next.current.player.y).id;
  events.push({ type: 'mapArrived', mapId: map.id, roomId: next.current.cameraRoomId });
  return next;
}

function tickNpc(npc: WorldNpc, map: MapData, state: WorldMapState, stepTicks: number, events: WorldEvent[]): void {
  if (state.talkingNpcId === npc.id) return;
  if (npc.movement) {
    if (completeMovement(npc, stepTicks)) {
      const arrivedIndex = npc.routeIndex;
      npc.routeIndex = nextRouteIndex(npc);
      npc.waitTicksLeft = npc.route.points[arrivedIndex]!.waitTicks;
      npc.blockedTicks = 0;
      events.push({ type: 'stepCompleted', mapId: map.id, entityId: npc.id, tile: { x: npc.x, y: npc.y }, cameraRoomId: getMapRoom(map, npc.x, npc.y).id });
    }
    return;
  }
  if (npc.waitTicksLeft > 0) { npc.waitTicksLeft -= 1; return; }
  const target = npc.route.points[npc.routeIndex]!;
  if (target.x === npc.x && target.y === npc.y) {
    npc.waitTicksLeft = target.waitTicks;
    npc.routeIndex = nextRouteIndex(npc);
    return;
  }
  const blocked = isBlocked(map, target) || entityBlocks(target, [state.player, ...state.npcs], npc.id);
  if (blocked) { npc.blockedTicks += 1; return; }
  npc.facing = directionFor({ x: npc.x, y: npc.y }, target);
  npc.movement = { to: { x: target.x, y: target.y }, elapsedTicks: 1 };
  if (stepTicks <= 1 && completeMovement(npc, stepTicks)) {
    const arrivedIndex = npc.routeIndex;
    npc.routeIndex = nextRouteIndex(npc);
    npc.waitTicksLeft = npc.route.points[arrivedIndex]!.waitTicks;
    events.push({ type: 'stepCompleted', mapId: map.id, entityId: npc.id, tile: { x: npc.x, y: npc.y }, cameraRoomId: getMapRoom(map, npc.x, npc.y).id });
  }
}

export function tickWorld(state: WorldState, maps: ReadonlyMap<string, MapData>, direction: WorldDirection, stepTicks = DEFAULT_STEP_TICKS): WorldStepResult {
  if (!Number.isInteger(stepTicks) || stepTicks < 1) throw new Error('stepTicks must be a positive integer');
  if (state.paused) return { state, events: [] };
  const next = cloneState(state);
  const current = next.current;
  const map = maps.get(current.mapId);
  if (!map) throw new Error(`Missing runtime map ${current.mapId}`);
  const events: WorldEvent[] = [];
  current.tick += 1;
  const returnTile = { x: current.player.x, y: current.player.y };
  let playerStepped = false;

  if (current.player.movement) {
    playerStepped = completeMovement(current.player, stepTicks);
    if (playerStepped) updateCamera(map, current, events, current.player.id);
  } else if (!current.talkingNpcId && direction) {
    current.player.facing = direction;
    const target = movePoint({ x: current.player.x, y: current.player.y }, direction);
    // Authored door portals are enterable even when their building tile is solid.
    const doorway = target && map.objects.some((object) => object.type === 'door' && object.x === target.x && object.y === target.y);
    if (target && (!isBlocked(map, target) || doorway) && !entityBlocks(target, [...current.npcs], undefined)) {
      current.player.movement = { to: target, elapsedTicks: 1 };
      playerStepped = stepTicks <= 1 && completeMovement(current.player, stepTicks);
      if (playerStepped) updateCamera(map, current, events, current.player.id);
    }
  }

  for (const npc of [...current.npcs].sort((a, b) => a.id.localeCompare(b.id))) tickNpc(npc, map, current, stepTicks, events);
  if (playerStepped) {
    const door = map.objects.find((object): object is DoorObject => object.type === 'door' && object.x === current.player.x && object.y === current.player.y);
    if (door) return { state: transitionThroughDoor(next, maps, door, events, returnTile), events };
  }
  return { state: next, events };
}

export function tickWorldNpc(state: WorldState, maps: ReadonlyMap<string, MapData>, entityId: string, stepTicks = DEFAULT_STEP_TICKS): WorldStepResult {
  if (!Number.isInteger(stepTicks) || stepTicks < 1) throw new Error('stepTicks must be a positive integer');
  const next = cloneState(state);
  const map = maps.get(next.current.mapId);
  if (!map) throw new Error(`Missing runtime map ${next.current.mapId}`);
  const npc = next.current.npcs.find((candidate) => candidate.id === entityId);
  if (!npc) throw new Error(`Missing scripted NPC ${entityId}`);
  next.current.tick += 1;
  const events: WorldEvent[] = [];
  tickNpc(npc, map, next.current, stepTicks, events);
  return { state: next, events };
}

function faceToward(entity: WorldEntity, target: TilePosition) { entity.facing = directionFor({ x: entity.x, y: entity.y }, target); }

export function interactWorld(state: WorldState, maps: ReadonlyMap<string, MapData>): WorldStepResult {
  if (state.paused || state.current.player.movement || state.current.talkingNpcId) return { state, events: [] };
  const next = cloneState(state);
  const current = next.current;
  const map = maps.get(current.mapId)!;
  const target = targetFromFacing(current.player);
  const npc = current.npcs.find((candidate) => candidate.x === target.x && candidate.y === target.y);
  if (npc) {
    faceToward(npc, { x: current.player.x, y: current.player.y });
    current.talkingNpcId = npc.id;
    return { state: next, events: [{ type: 'interactionRequested', mapId: map.id, targetId: npc.id, targetType: 'npc' }] };
  }
  const object = map.objects.find((candidate): candidate is Extract<MapObject, { type: 'object' | 'sign' }> => candidate.x === target.x && candidate.y === target.y && (candidate.type === 'object' || candidate.type === 'sign'));
  if (!object) return { state, events: [] };
  return { state: next, events: [{ type: 'interactionRequested', mapId: map.id, targetId: object.id, targetType: object.type }] };
}

export function endWorldInteraction(state: WorldState): WorldStepResult {
  if (!state.current.talkingNpcId) return { state, events: [] };
  const next = cloneState(state);
  const targetId = next.current.talkingNpcId!;
  next.current.talkingNpcId = null;
  return { state: next, events: [{ type: 'interactionEnded', targetId }] };
}

export function pressWorldB(state: WorldState, maps: ReadonlyMap<string, MapData>): WorldStepResult {
  if (state.paused) return { state, events: [] };
  if (state.current.talkingNpcId) return endWorldInteraction(state);
  if (state.current.player.movement) return { state, events: [] };
  const map = maps.get(state.current.mapId)!;
  const exitDoor = map.objects.find((object): object is DoorObject => object.type === 'door' && Boolean(object.exitTile && object.exitTile.x === state.current.player.x && object.exitTile.y === state.current.player.y));
  if (!exitDoor || state.mapStack.length === 0) return { state, events: [] };
  const events: WorldEvent[] = [];
  return { state: restoreParent(state, maps, events), events };
}

export function faceWorldEntity(state: WorldState, entityId: string, facing: Direction): WorldState {
  const next = cloneState(state);
  const entity = entityId === next.current.player.id ? next.current.player : next.current.npcs.find((npc) => npc.id === entityId);
  if (entity) entity.facing = facing;
  return next;
}

export function setWorldNpcRoute(state: WorldState, entityId: string, route: NpcRoute): WorldState {
  const next = cloneState(state);
  const npc = next.current.npcs.find((candidate) => candidate.id === entityId);
  if (npc) { npc.route = route; npc.routeIndex = 0; npc.routeDirection = 1; npc.waitTicksLeft = 0; npc.blockedTicks = 0; npc.movement = null; }
  return next;
}

export function reduceWorld(state: WorldState, maps: ReadonlyMap<string, MapData>, command: WorldCommand): WorldStepResult {
  switch (command.type) {
    case 'tick': return tickWorld(state, maps, command.direction);
    case 'interact': return interactWorld(state, maps);
    case 'endInteraction': return endWorldInteraction(state);
    case 'pressB': return pressWorldB(state, maps);
    case 'pause': return { state: { ...state, paused: true }, events: [] };
    case 'resume': return { state: { ...state, paused: false }, events: [] };
    case 'faceEntity': return { state: faceWorldEntity(state, command.entityId, command.facing), events: [] };
    case 'setNpcRoute': return { state: setWorldNpcRoute(state, command.entityId, command.route), events: [] };
  }
}

export class WorldSim {
  private _state: WorldState;
  constructor(private readonly maps: ReadonlyMap<string, MapData>, startMapId: string, private readonly stepTicks = DEFAULT_STEP_TICKS) {
    this._state = createWorldState(maps, startMapId);
  }
  get state(): WorldState { return this._state; }
  getSnapshot(): WorldSnapshot { return { tick: this._state.current.tick, map: this.maps.get(this._state.current.mapId)!, state: this._state.current, paused: this._state.paused, stackDepth: this._state.mapStack.length }; }
  restoreAnchor(anchor: import('./types').WorldAnchor): void {
    const map = this.maps.get(anchor.mapId);
    if (!map) throw new Error(`Cannot restore missing map ${anchor.mapId}`);
    const room = map.rooms.find((candidate) => candidate.id === anchor.roomId);
    if (!room || anchor.tile.x < room.x || anchor.tile.y < room.y || anchor.tile.x >= room.x + room.width || anchor.tile.y >= room.y + room.height) throw new Error('Encounter anchor room does not contain its tile');
    if (isBlocked(map, anchor.tile)) throw new Error('Encounter anchor tile is blocked');
    const current = cloneState(this._state).current;
    if (current.mapId !== anchor.mapId) throw new Error(`Cannot restore anchor from ${anchor.mapId} while in ${current.mapId}`);
    current.player = { ...current.player, x: anchor.tile.x, y: anchor.tile.y, facing: anchor.facing, movement: null };
    current.talkingNpcId = null;
    current.cameraRoomId = anchor.roomId;
    this._state = { ...this._state, current, paused: true };
  }
  advanceScriptedNpc(entityId: string): WorldEvent[] {
    const result = tickWorldNpc(this._state, this.maps, entityId, this.stepTicks);
    this._state = result.state;
    return result.events;
  }
  dispatch(command: WorldCommand): WorldEvent[] {
    const result = command.type === 'tick' ? tickWorld(this._state, this.maps, command.direction, this.stepTicks) : reduceWorld(this._state, this.maps, command);
    this._state = result.state;
    return result.events;
  }
}
