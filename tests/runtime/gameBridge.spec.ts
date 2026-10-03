import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../src/core/clock';
import { WorldSnapshot } from '../../src/core/world/types';
import { WORLD_TEST_MAPS, TEST_TOWN_MAP_ID } from '../../src/content/maps';
import { createGameBridge } from '../../src/runtime/gameBridge';
import { WorldSession } from '../../src/runtime/world/WorldSession';
import { InputRouter } from '../../src/core/input';
import { createWorldState } from '../../src/core/world/worldSim';

function snapshot(): WorldSnapshot {
  const state = createWorldState(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID);
  return { tick: 0, map: WORLD_TEST_MAPS.get(TEST_TOWN_MAP_ID)!, state: state.current, paused: false, stackDepth: 0 };
}

describe('typed GameBridge and WorldSession', () => {
  it('acknowledges view commands and returns the authoritative WorldSim snapshot', async () => {
    const bridge = createGameBridge(new FakeClock(), 100);
    bridge.publishSnapshot(snapshot());
    bridge.onCommand((command) => command.type === 'snapshot' ? bridge.getLatestSnapshot() : command.type);
    const ack = await bridge.send({ type: 'loadMap', mapId: TEST_TOWN_MAP_ID });
    expect(ack).toMatchObject({ commandId: 'game-command-1', commandType: 'loadMap', value: 'loadMap' });
    expect(await bridge.snapshot()).toMatchObject({ map: { id: TEST_TOWN_MAP_ID }, state: { player: { x: 7, y: 5 } } });
  });

  it('rejects a command when the view does not acknowledge before the injected-clock timeout', async () => {
    const clock = new FakeClock();
    const bridge = createGameBridge(clock, 40);
    bridge.onCommand(() => new Promise(() => undefined));
    const pending = bridge.send({ type: 'pauseWorld' });
    clock.tick(40);
    await expect(pending).rejects.toThrow('timed out after 40ms');
  });

  it('pause/resume through the bridge preserves exact logical state', async () => {
    const clock = new FakeClock();
    const bridge = createGameBridge(clock, 100);
    bridge.onCommand((command) => command.type === 'snapshot' ? bridge.getLatestSnapshot() : undefined);
    const input = new InputRouter();
    const session = new WorldSession(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, bridge, input, clock);
    bridge.emit({ type: 'worldReady' });
    for (let pass = 0; pass < 5; pass += 1) await Promise.resolve();
    const before = structuredClone(session.sim.state.current);
    await session.pause();
    clock.tick(500);
    expect(session.sim.state.current).toEqual(before);
    await session.resume();
    expect(session.sim.state.current).toEqual(before);
    expect(session.sim.state.paused).toBe(false);
    session.dispose();
  });
});
