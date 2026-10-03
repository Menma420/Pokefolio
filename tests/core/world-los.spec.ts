import { describe, expect, it } from 'vitest';
import { COLLISION_SOLID, MapData } from '../../src/domain/map';
import { WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, M1_TOWN_MAP_ID } from '../../src/content/maps';
import { hasLineOfSight } from '../../src/core/world/los';

const map = WORLD_TEST_MAPS.get(TEST_TOWN_MAP_ID)!;
const solidAt = (source: MapData, x: number, y: number): MapData => {
  const next = structuredClone(source);
  next.collision[y * next.width + x] = COLLISION_SOLID;
  return next;
};

describe('D8 tile line of sight core', () => {
  it.each([
    ['clear right lane', map, { x: 7, y: 5 }, 'right', { x: 10, y: 5 }, [], 3, true],
    ['adjacent target', map, { x: 7, y: 5 }, 'right', { x: 8, y: 5 }, [], 1, true],
    ['range boundary', map, { x: 7, y: 5 }, 'right', { x: 10, y: 5 }, [], 2, false],
    ['target outside facing line', map, { x: 7, y: 5 }, 'up', { x: 8, y: 5 }, [], 3, false],
    ['entity blocks lane', map, { x: 7, y: 5 }, 'right', { x: 10, y: 5 }, [{ x: 9, y: 5 }], 3, false],
    ['solid tile blocks lane', solidAt(map, 9, 5), { x: 7, y: 5 }, 'right', { x: 10, y: 5 }, [], 3, false],
    ['map boundary is solid', map, { x: 28, y: 5 }, 'right', { x: 29, y: 5 }, [], 3, false],
  ] as const)('%s', (_label, testMap, origin, facing, target, blockers, range, expected) => {
    expect(hasLineOfSight({ map: testMap, origin, facing, target, blockers, range })).toBe(expected);
  });

  it('detects the authored M1 challenger from the test-room route at the range boundary', () => {
    const m1 = WORLD_TEST_MAPS.get(M1_TOWN_MAP_ID)!;
    expect(hasLineOfSight({ map: m1, origin: { x: 18, y: 7 }, facing: 'left', target: { x: 15, y: 7 }, range: 3 })).toBe(true);
    expect(hasLineOfSight({ map: m1, origin: { x: 18, y: 7 }, facing: 'left', target: { x: 14, y: 7 }, range: 3 })).toBe(false);
  });
});
