import { describe, expect, it } from 'vitest';
import { WORLD_TEST_MAPS, M1_TOWN_MAP_ID } from '../../src/content/maps';
import { followWorldCamera } from '../../src/core/world/camera';
import { WorldSim } from '../../src/core/world';
import { hasLineOfSight } from '../../src/core/world/los';
import { BLOCKING_COLLISION_FLAGS, collisionAt, type Direction } from '../../src/domain/map';
import { validateWorldPlacement } from '../../src/domain/worldValidation';

const map = WORLD_TEST_MAPS.get(M1_TOWN_MAP_ID)!;
const player = { id: 'player', x: 14, y: 7, facing: 'right' as const, movement: null };
const anchor = (sim: WorldSim, x: number, y: number, facing: Direction) => {
  sim.restoreAnchor({
    mapId: map.id,
    roomId: x < 15 ? 'west-room' : 'east-room',
    tile: { x, y },
    facing,
  });
  sim.dispatch({ type: 'resume' });
};

describe('P9 continuous world camera and geometry', () => {
  it('follows every movement tick through the old room boundary with no snap', () => {
    const offsets = [followWorldCamera(map, player).x];
    for (let tick = 1; tick < 8; tick++)
      offsets.push(
        followWorldCamera(map, { ...player, movement: { to: { x: 15, y: 7 }, elapsedTicks: tick } })
          .x,
      );
    offsets.push(followWorldCamera(map, { ...player, x: 15 }).x);
    expect(offsets).toEqual([112, 114, 116, 118, 120, 122, 124, 126, 128]);
    expect(followWorldCamera(map, player).y).toBe(40);
  });

  it('clamps at all four edges and keeps the complete sprite visible on every walkable tile', () => {
    expect(followWorldCamera(map, { ...player, x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
    expect(followWorldCamera(map, { ...player, x: 34, y: 20 })).toEqual({ x: 336, y: 192 });
    for (let y = 1; y < map.height - 1; y++)
      for (let x = 1; x < map.width - 1; x++) {
        if (collisionAt(map, x, y) & BLOCKING_COLLISION_FLAGS) continue;
        for (const direction of ['up', 'right', 'down', 'left'] as const) {
          const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
          const dy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
          if (collisionAt(map, x + dx, y + dy) & BLOCKING_COLLISION_FLAGS) continue;
          for (let elapsedTicks = 0; elapsedTicks <= 8; elapsedTicks++) {
            const camera = followWorldCamera(map, {
              ...player,
              x,
              y,
              movement: { to: { x: x + dx, y: y + dy }, elapsedTicks },
            });
            expect(Number.isInteger(camera.x) && Number.isInteger(camera.y)).toBe(true);
            expect(camera.x).toBeGreaterThanOrEqual(0);
            expect(camera.y).toBeGreaterThanOrEqual(0);
            expect(camera.x + 240).toBeLessThanOrEqual(map.width * 16);
            expect(camera.y + 160).toBeLessThanOrEqual(map.height * 16);
            const spriteX = x * 16 + dx * elapsedTicks * 2 - camera.x;
            const spriteY = y * 16 + dy * elapsedTicks * 2 - camera.y;
            expect(spriteX).toBeGreaterThanOrEqual(0);
            expect(spriteX + 16).toBeLessThanOrEqual(240);
            expect(spriteY - 16).toBeGreaterThanOrEqual(0);
            expect(spriteY + 16).toBeLessThanOrEqual(160);
          }
        }
      }
  });

  it('has exactly three paired automatic doorways and restores exact tile, facing and camera', () => {
    const doors = map.objects.filter((object) => object.type === 'door');
    expect(doors).toHaveLength(3);
    for (const door of doors) {
      for (const [facing, dx, dy] of [
        ['right', 1, 0],
        ['left', -1, 0],
        ['up', 0, -1],
        ['down', 0, 1],
      ] as const) {
        const from = { x: door.x - dx, y: door.y - dy, facing };
        if (collisionAt(map, from.x, from.y) & BLOCKING_COLLISION_FLAGS) continue;
        for (const exit of ['B', 'walk'] as const) {
          const sim = new WorldSim(WORLD_TEST_MAPS, map.id, 8);
          anchor(sim, from.x, from.y, from.facing);
          const camera = followWorldCamera(map, sim.state.current.player);
          for (let tick = 0; tick < 8; tick++)
            sim.dispatch({ type: 'tick', direction: from.facing });
          expect(sim.state.current.mapId).toBe(door.targetMapId);
          expect(sim.state.mapStack).toHaveLength(1);
          expect(sim.state.current.player).toMatchObject(door.arrival);
          if (exit === 'B') sim.dispatch({ type: 'pressB' });
          else
            for (let tick = 0; tick < 8; tick++) sim.dispatch({ type: 'tick', direction: 'down' });
          expect(sim.state.current.mapId).toBe(map.id);
          expect(sim.state.current.player).toMatchObject({ ...from, movement: null });
          expect(followWorldCamera(map, sim.state.current.player)).toEqual(camera);
        }
      }
    }
  });

  it('replays both ordinary NPC routes deterministically and keeps the challenger fixed', () => {
    const a = new WorldSim(WORLD_TEST_MAPS, map.id),
      b = new WorldSim(WORLD_TEST_MAPS, map.id);
    const ordinary = map.objects.filter(
      (object) => object.type === 'npc' && object.id !== 'challenger',
    );
    expect(ordinary).toHaveLength(2);
    const visits = new Map(ordinary.map((npc) => [npc.id, new Set<string>()]));
    for (let tick = 0; tick < 500; tick++) {
      a.dispatch({ type: 'tick', direction: null });
      b.dispatch({ type: 'tick', direction: null });
      expect(a.state).toEqual(b.state);
      for (const npc of a.state.current.npcs) {
        expect(collisionAt(map, npc.x, npc.y) & BLOCKING_COLLISION_FLAGS).toBe(0);
        if (npc.id === 'challenger') expect(npc).toMatchObject({ x: 18, y: 7, movement: null });
        else visits.get(npc.id)!.add(`${npc.x},${npc.y}`);
      }
    }
    for (const visited of visits.values()) expect(visited.size).toBe(3);
  });

  it('detects the full three-tile lane and never sees through a solid tile', () => {
    for (let distance = 1; distance <= 3; distance++) {
      const query = {
        map,
        origin: { x: 18, y: 7 },
        target: { x: 18 - distance, y: 7 },
        facing: 'left' as const,
        range: 3,
      };
      expect(hasLineOfSight(query)).toBe(true);
      for (let wall = 1; wall <= distance; wall++) {
        const blocked = structuredClone(map);
        blocked.collision[7 * map.width + 18 - wall] = 1;
        expect(hasLineOfSight({ ...query, map: blocked })).toBe(false);
      }
    }
  });

  it('validates every landmark and rejects broken placements, lanes, routes, bounds and exits', () => {
    expect(validateWorldPlacement(WORLD_TEST_MAPS, map.id)).toEqual([]);
    const facade = structuredClone(map);
    facade.collision[4 * facade.width + 21] = 0;
    expect(validateWorldPlacement(new Map([...WORLD_TEST_MAPS, [map.id, facade]]), map.id).join()).toContain('walkable building facade');
    const corrupt = (change: (copy: typeof map) => void) => {
      const copy = structuredClone(map);
      change(copy);
      return validateWorldPlacement(new Map([...WORLD_TEST_MAPS, [map.id, copy]]), map.id);
    };
    expect(
      corrupt((copy) => {
        copy.objects = copy.objects.filter((object) => object.id !== 'route-neighbor');
      }),
    ).toContain('World must have two ordinary NPCs and one challenger');
    expect(
      corrupt((copy) => {
        copy.collision[7 * copy.width + 16] = 1;
      }).join(),
    ).toContain('Blocked challenger encounter lane');
    expect(
      corrupt((copy) => {
        copy.landmarks = copy.landmarks!.filter((landmark) => landmark.kind !== 'forest');
      }),
    ).toContain('Missing required landmark forest');
    expect(
      corrupt((copy) => {
        copy.objects.find((object) => object.type === 'door')!.x = 40;
      }).join(),
    ).toContain('outside map bounds');
    expect(
      corrupt((copy) => {
        const door = copy.objects.find((object) => object.type === 'door')!;
        if (door.type === 'door') door.targetMapId = 'missing';
      }).join(),
    ).toContain('invalid reciprocal');
    expect(
      corrupt((copy) => {
        copy.collision[5 * copy.width + 9] = 1;
      }).join(),
    ).toContain('invalid entity/route');
  });
});
