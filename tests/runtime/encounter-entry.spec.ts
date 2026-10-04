import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../src/core/clock';
import { InputRouter } from '../../src/core/input';
import { COLLISION_SOLID } from '../../src/domain/map';
import { GameOrchestrator } from '../../src/runtime/Orchestrator';
import { createGameBridge } from '../../src/runtime/gameBridge';
import { progressStore, uiStore } from '../../src/runtime/stores';
import { M1_TOWN_MAP_ID, WORLD_TEST_MAPS } from '../../src/content/maps';

// Test-only map copies allow solid-LOS safety fixtures without editing P9 geometry.
vi.mock('../../src/content/maps', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/content/maps')>();
  return { ...actual, WORLD_TEST_MAPS: new Map([...actual.WORLD_TEST_MAPS].map(([id, map]) => [id, structuredClone(map)])) };
});
const instances: GameOrchestrator[] = [];
const town = WORLD_TEST_MAPS.get(M1_TOWN_MAP_ID)!;
const originalCollision = [...town.collision];
async function flush() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
async function setup(firstEncounterDone = false) {
  progressStore.setState({ introSeen: true, firstEncounterDone });
  const clock = new FakeClock();
  const bridge = createGameBridge(clock);
  bridge.onCommand(command => {
    if (command.type === 'loadMap') {
      const snapshot = bridge.getLatestSnapshot()!;
      bridge.emit({ type: 'mapArrived', mapId: snapshot.map.id, roomId: snapshot.state.cameraRoomId });
    }
    return command.type === 'snapshot' ? bridge.getLatestSnapshot() : undefined;
  });
  const input = new InputRouter(clock);
  input.isGameFocused = true;
  const runtime = new GameOrchestrator(bridge, input, clock);
  instances.push(runtime);
  bridge.emit({ type: 'worldReady' });
  await flush();
  runtime.start();
  for (let i = 0; i < 60; i++) { clock.tick(20); await flush(); }
  expect(runtime.state.flow.mode).toBe('OVERWORLD');
  const place = (x: number, y: number, facing: 'left' | 'right' = 'left') => {
    runtime.world.sim.restoreAnchor({ mapId: M1_TOWN_MAP_ID, roomId: 'east-room', tile: { x, y }, facing });
    runtime.world.sim.dispatch({ type: 'resume' });
    bridge.publishSnapshot(runtime.world.sim.getSnapshot());
  };
  const interaction = () => bridge.emit({ type: 'interactionRequested', mapId: M1_TOWN_MAP_ID, targetId: 'challenger', targetType: 'npc' });
  return { runtime, input, bridge, place, interaction };
}
beforeEach(() => { town.collision = [...originalCollision]; uiStore.getState().endTransition(); });
afterEach(async () => {
  for (const runtime of instances.splice(0)) runtime.dispose();
  await flush();
  town.collision = [...originalCollision];
  uiStore.getState().endTransition();
  progressStore.setState({ introSeen: false, firstEncounterDone: false });
});

describe('WorldSession → authoritative encounter evaluator integration', () => {
  it('A behind the challenger evaluates the newly turned WorldSim facing immediately', async () => {
    const { runtime, input, bridge, place } = await setup();
    place(19, 7);
    expect(bridge.getLatestSnapshot()!.state.npcs.find(n => n.id === 'challenger')!.facing).toBe('left');
    input.handlePress('A');
    // The bridge snapshot was previously left-facing; interaction events run before publish.
    expect(runtime.world.sim.state.current.npcs.find(n => n.id === 'challenger')!.facing).toBe('right');
    expect(runtime.state.flow.mode).toBe('ENCOUNTER');
    expect(runtime.state.returnAnchor).toMatchObject({ tile: { x: 19, y: 7 }, facing: 'left' });
    expect(runtime.world.sim.state.current.talkingNpcId).toBeNull();
  });

  it('a turned challenger beyond three tiles cannot start a first encounter, even on a stale interaction event', async () => {
    const { runtime, input, place, interaction } = await setup();
    place(22, 7);
    runtime.world.sim.dispatch({ type: 'faceEntity', entityId: 'challenger', facing: 'right' });
    input.handlePress('A');
    interaction();
    expect(runtime.state.flow.mode).toBe('OVERWORLD');
    expect(runtime.state.returnAnchor).toBeNull();
  });

  it('the same interaction evaluator rejects a solid between a turned challenger and player', async () => {
    const { runtime, place, interaction } = await setup();
    place(21, 7);
    town.collision[7 * town.width + 20] = COLLISION_SOLID;
    runtime.world.sim.dispatch({ type: 'faceEntity', entityId: 'challenger', facing: 'right' });
    interaction();
    expect(runtime.state.flow.mode).toBe('OVERWORLD');
    expect(runtime.state.returnAnchor).toBeNull();
  });

  it('ordinary movement LOS still starts the first encounter without interaction', async () => {
    const { runtime, bridge, place } = await setup();
    place(15, 7, 'right');
    bridge.emit({ type: 'stepCompleted', mapId: M1_TOWN_MAP_ID, entityId: runtime.world.sim.state.current.player.id, tile: { x: 15, y: 7 }, cameraRoomId: 'east-room' });
    expect(runtime.state.flow.mode).toBe('ENCOUNTER');
  });

  it('subsequent encounters ignore automatic LOS and still start through direct A interaction', async () => {
    const { runtime, bridge, input, place } = await setup(true);
    place(15, 7, 'right');
    bridge.emit({ type: 'stepCompleted', mapId: M1_TOWN_MAP_ID, entityId: runtime.world.sim.state.current.player.id, tile: { x: 15, y: 7 }, cameraRoomId: 'east-room' });
    expect(runtime.state.flow.mode).toBe('OVERWORLD');
    place(19, 7);
    input.handlePress('A');
    expect(runtime.state.flow.mode).toBe('ENCOUNTER');
  });
});
