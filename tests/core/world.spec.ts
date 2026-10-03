import { describe, expect, it } from 'vitest';
import { COLLISION_SOLID, COLLISION_WATER, Direction, NpcRoute } from '../../src/domain/map';
import { WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, TEST_INTERIOR_MAP_ID, M1_TOWN_MAP_ID, M1_INTERIOR_MAP_ID } from '../../src/content/maps';
import { hashWorldState, replayWorld, WorldSim } from '../../src/core/world';
import { interactWorld, pressWorldB, tickWorld } from '../../src/core/world/worldSim';
import { createWorldState } from '../../src/core/world/worldSim';

function walk(sim: WorldSim, direction: Direction, tiles: number, stepTicks = 1) {
  for (let tile = 0; tile < tiles; tile += 1) for (let tick = 0; tick < stepTicks; tick += 1) sim.dispatch({ type: 'tick', direction });
}

describe('WorldSim', () => {
  it('moves tile-by-tile on fixed ticks, changes facing, and blocks SOLID and WATER', () => {
    const sim = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 3);
    sim.dispatch({ type: 'tick', direction: 'right' });
    expect(sim.state.current.player).toMatchObject({ x: 7, y: 5, facing: 'right', movement: { to: { x: 8, y: 5 }, elapsedTicks: 1 } });
    sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.player.x).toBe(7);
    sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.player).toMatchObject({ x: 8, y: 5, movement: null });

    const fast = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 1);
    walk(fast, 'up', 3);
    walk(fast, 'left', 1);
    expect(fast.state.current.player).toMatchObject({ x: 6, y: 2, facing: 'left' });
    fast.dispatch({ type: 'tick', direction: 'left' });
    expect(fast.state.current.player).toMatchObject({ x: 6, y: 2, facing: 'left', movement: null });
    walk(fast, 'down', 3);
    walk(fast, 'left', 5);
    expect(fast.state.current.player.x).toBe(1);
    fast.dispatch({ type: 'tick', direction: 'left' });
    expect(fast.state.current.player).toMatchObject({ x: 1, facing: 'left', movement: null });
    expect(fast.getSnapshot().map.collision[2 * fast.getSnapshot().map.width + 5]).toBe(COLLISION_WATER);
    expect(fast.getSnapshot().map.collision[5 * fast.getSnapshot().map.width]).toBe(COLLISION_SOLID);
  });

  it('uses tile reservations to keep a player from entering an NPC step destination', () => {
    const map = WORLD_TEST_MAPS.get(TEST_TOWN_MAP_ID)!;
    const maps = WORLD_TEST_MAPS;
    const state = structuredClone(createWorldState(maps, TEST_TOWN_MAP_ID));
    state.current.player.x = 11;
    state.current.player.y = 5;
    state.current.npcs[0]!.x = 9;
    state.current.npcs[0]!.y = 5;
    state.current.npcs[0]!.movement = { to: { x: 10, y: 5 }, elapsedTicks: 1 };
    const result = tickWorld(state, maps, 'left', 4);
    expect(result.state.current.player).toMatchObject({ x: 11, y: 5, facing: 'left', movement: null });
    expect(map.width).toBe(30);
  });

  it.each([
    { mode: 'loop' as const, points: [{ x: 10, y: 5, waitTicks: 0 }, { x: 10, y: 6, waitTicks: 0 }, { x: 11, y: 6, waitTicks: 0 }], expected: [[10, 5], [10, 6], [11, 6], [10, 5]] },
    { mode: 'pingpong' as const, points: [{ x: 10, y: 5, waitTicks: 0 }, { x: 10, y: 6, waitTicks: 0 }, { x: 11, y: 6, waitTicks: 0 }], expected: [[10, 5], [10, 6], [11, 6], [10, 6]] },
  ])('runs an NPC $mode route deterministically', ({ mode, points, expected }) => {
    const sim = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 1);
    const route: NpcRoute = { mode, points };
    sim.dispatch({ type: 'setNpcRoute', entityId: 'route-guide', route });
    for (const [x, y] of expected) {
      sim.dispatch({ type: 'tick', direction: null });
      expect(sim.state.current.npcs[0]).toMatchObject({ x, y });
    }
  });

  it('keeps a one-point pingpong route stationary without producing an invalid index', () => {
    const sim = new WorldSim(WORLD_TEST_MAPS, M1_TOWN_MAP_ID, 1);
    for (let tick = 0; tick < 8; tick += 1) sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.npcs.find((npc) => npc.id === 'challenger')).toMatchObject({ x: 18, y: 7, routeIndex: 0, routeDirection: 1 });
  });

  it('observes route waits and lets an NPC resume after the player stops blocking its route', () => {
    const route: NpcRoute = { mode: 'loop', points: [{ x: 10, y: 5, waitTicks: 2 }, { x: 9, y: 5, waitTicks: 0 }] };
    const sim = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 1);
    sim.dispatch({ type: 'setNpcRoute', entityId: 'route-guide', route });
    sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.npcs[0]).toMatchObject({ x: 10, y: 5, waitTicksLeft: 2 });
    sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.npcs[0]?.waitTicksLeft).toBe(1);
    sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.npcs[0]?.waitTicksLeft).toBe(0);
    sim.dispatch({ type: 'tick', direction: null });
    expect(sim.state.current.npcs[0]).toMatchObject({ x: 9, y: 5 });

    const blockedRoute: NpcRoute = { mode: 'pingpong', points: [{ x: 8, y: 5, waitTicks: 0 }, { x: 9, y: 5, waitTicks: 0 }] };
    const blocked = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 4);
    blocked.dispatch({ type: 'setNpcRoute', entityId: 'route-guide', route: blockedRoute });
    blocked.dispatch({ type: 'tick', direction: 'right' });
    expect(blocked.state.current.npcs[0]!.blockedTicks).toBe(1);
    blocked.dispatch({ type: 'tick', direction: 'right' });
    blocked.dispatch({ type: 'tick', direction: 'right' });
    blocked.dispatch({ type: 'tick', direction: 'right' });
    expect(blocked.state.current.player).toMatchObject({ x: 8, y: 5 });
    for (let tick = 0; tick < 4; tick += 1) blocked.dispatch({ type: 'tick', direction: 'left' });
    for (let tick = 0; tick < 4; tick += 1) blocked.dispatch({ type: 'tick', direction: null });
    expect(blocked.state.current.npcs[0]).toMatchObject({ x: 8, y: 5 });
    expect(blocked.state.current.npcs[0]!.blockedTicks).toBe(0);
  });

  it('interacts only with the NPC on the tile in front and pauses its route until conversation ends', () => {
    const sim = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 2);
    const state = structuredClone(sim.state);
    state.current.player.x = 8;
    state.current.player.y = 5;
    state.current.player.facing = 'right';
    const result = interactWorld(state, WORLD_TEST_MAPS);
    expect(result.events).toContainEqual({ type: 'interactionRequested', mapId: TEST_TOWN_MAP_ID, targetId: 'route-guide', targetType: 'npc' });
    expect(result.state.current.npcs[0]?.facing).toBe('left');
    const before = result.state.current.npcs[0];
    const pausedRoute = tickWorld(result.state, WORLD_TEST_MAPS, null, 2).state.current.npcs[0];
    expect(pausedRoute).toEqual(before);
  });

  it('snaps the camera to the next room after crossing a room boundary', () => {
    const sim = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 1);
    walk(sim, 'down', 2);
    walk(sim, 'right', 8);
    expect(sim.state.current.player.x).toBe(15);
    expect(sim.state.current.cameraRoomId).toBe('east-room');
  });

  it.each([
    [TEST_TOWN_MAP_ID, TEST_INTERIOR_MAP_ID, 1],
    [TEST_TOWN_MAP_ID, TEST_INTERIOR_MAP_ID, 8],
    [M1_TOWN_MAP_ID, M1_INTERIOR_MAP_ID, 1],
    [M1_TOWN_MAP_ID, M1_INTERIOR_MAP_ID, 8],
  ])('walks into %s doorway without interaction and returns from %s (stepTicks=%i)', (town, interior, stepTicks) => {
    const before = structuredClone(createWorldState(WORLD_TEST_MAPS, town));
    before.current.player.x = 21;
    before.current.player.y = 5;
    before.current.player.facing = 'right';
    before.current.cameraRoomId = 'east-room';
    expect(interactWorld(before, WORLD_TEST_MAPS).events).toEqual([]);
    let result = tickWorld(before, WORLD_TEST_MAPS, 'right', stepTicks);
    for (let tick = 1; tick < stepTicks; tick += 1) {
      expect(result.state.current.mapId).toBe(town);
      expect(result.events.some((event) => event.type === 'mapArrived')).toBe(false);
      result = tickWorld(result.state, WORLD_TEST_MAPS, null, stepTicks);
    }
    expect(result.events).toContainEqual({ type: 'stepCompleted', mapId: town, entityId: before.current.player.id, tile: { x: 22, y: 5 }, cameraRoomId: 'east-room' });
    expect(result.events).toContainEqual({ type: 'mapArrived', mapId: interior, roomId: 'interior-room' });
    const entered = result.state;
    expect(entered.current).toMatchObject({ mapId: interior, player: { x: 7, y: 7 }, cameraRoomId: 'interior-room' });
    expect(entered.mapStack).toHaveLength(1);
    const returned = pressWorldB(entered, WORLD_TEST_MAPS).state;
    expect(returned.current).toEqual(entered.mapStack[0]!.mapState);
    expect(returned.current).toMatchObject({ player: { x: 21, y: 5, facing: 'right', movement: null }, cameraRoomId: 'east-room' });
    expect(returned.mapStack).toHaveLength(0);
    // Walking back through the reciprocal door restores the same saved exterior.
    const walkedOut = tickWorld(entered, WORLD_TEST_MAPS, 'down', 1).state;
    expect(walkedOut.current).toEqual(returned.current);
    expect(walkedOut.mapStack).toHaveLength(0);
  });

  it.each(['object', 'sign'] as const)('keeps explicit interaction for a %s', (type) => {
    const map = structuredClone(WORLD_TEST_MAPS.get(TEST_TOWN_MAP_ID)!);
    map.objects.push({ type, id: 'interaction-target', x: 8, y: 5 });
    const maps = new Map(WORLD_TEST_MAPS).set(map.id, map);
    const state = createWorldState(maps, map.id);
    state.current.player.facing = 'right';
    expect(tickWorld(state, maps, 'right', 1).events.some((event) => event.type === 'interactionRequested')).toBe(false);
    expect(interactWorld(state, maps).events).toContainEqual({ type: 'interactionRequested', mapId: map.id, targetId: 'interaction-target', targetType: type });
  });

  it('pause and resume do not change the deterministic world state', () => {
    const sim = new WorldSim(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, 1);
    const before = hashWorldState(sim.state);
    sim.dispatch({ type: 'pause' });
    for (let tick = 0; tick < 10; tick += 1) sim.dispatch({ type: 'tick', direction: 'right' });
    expect(hashWorldState({ ...sim.state, paused: false })).toBe(before);
    sim.dispatch({ type: 'resume' });
    expect(hashWorldState(sim.state)).toBe(before);
  });

  it('replays the same fixed-tick input log to an identical state hash', () => {
    const input = [...Array<Direction>(8).fill('down'), ...Array<Direction>(12).fill('right'), ...Array<Direction>(8).fill('up')];
    const a = replayWorld(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, input, 1);
    const b = replayWorld(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, input, 1);
    expect(hashWorldState(a)).toBe(hashWorldState(b));
  });

  it('restores an encounter anchor by exact map, room, tile, and facing', () => {
    const sim = new WorldSim(WORLD_TEST_MAPS, M1_TOWN_MAP_ID, 8);
    sim.dispatch({ type: 'pause' });
    sim.state.current.player.x = 15;
    sim.state.current.player.y = 7;
    sim.state.current.player.facing = 'right';
    sim.state.current.cameraRoomId = 'east-room';
    sim.state.current.npcs.find((npc) => npc.id === 'challenger')!.x = 16;
    sim.state.current.npcs.find((npc) => npc.id === 'challenger')!.y = 7;
    sim.restoreAnchor({ mapId: M1_TOWN_MAP_ID, roomId: 'east-room', tile: { x: 15, y: 7 }, facing: 'right' });
    expect(sim.state.current).toMatchObject({
      mapId: M1_TOWN_MAP_ID,
      cameraRoomId: 'east-room',
      player: { x: 15, y: 7, facing: 'right', movement: null },
    });
    expect(sim.state.paused).toBe(true);
  });
});
