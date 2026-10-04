import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileTiledMaps } from '../../scripts/lib/compileTiledMaps';

function source(id: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), `assets-src/maps/${id}.tmj`), 'utf8')) as Record<string, unknown>;
}
function pair() { return [{ id: 'interior-test', input: source('interior-test') }, { id: 'test-town', input: source('test-town') }]; }

describe('Tiled map compiler', () => {
  it('keeps every finalized Tiled source consistent with its checked-in runtime map', () => {
    const ids = ['test-town', 'interior-test', 'm1-town', 'm1-interior-test', 'm1-workshop', 'm1-cottage'];
    const compiled = compileTiledMaps(ids.map(id => ({ id, input: source(id) })));
    for (const map of compiled) {
      const runtime = JSON.parse(readFileSync(resolve(process.cwd(), `src/content/maps/${map.id}.json`), 'utf8'));
      expect(JSON.parse(JSON.stringify(map))).toEqual(runtime);
    }
  });

  it('normalizes both valid Tiled maps into room-aware MapData', () => {
    const maps = compileTiledMaps(pair());
    expect(maps.map((map) => map.id)).toEqual(['interior-test', 'test-town']);
    expect(maps[1]).toMatchObject({ width: 30, height: 10, tileSize: 16, rooms: [{ id: 'west-room', width: 15 }, { id: 'east-room', x: 15, width: 15 }] });
    expect(maps[1]!.layers.ground).toHaveLength(300);
    expect(maps[1]!.collision).toHaveLength(300);
  });

  it('rejects a map with no spawn', () => {
    const inputs = pair();
    const map = inputs.find((entry) => entry.id === 'interior-test')!.input as { layers: Array<{ objects?: Array<{ class?: string }> }> };
    map.layers.flatMap((layer) => layer.objects ?? []).forEach((object) => { if (object.class === 'spawn') object.class = 'object'; });
    expect(() => compileTiledMaps(inputs)).toThrow(/exactly one spawn/);
  });

  it('rejects a blocked spawn', () => {
    const inputs = pair();
    const map = inputs.find((entry) => entry.id === 'test-town')!.input as { layers: Array<{ name: string; data?: number[] }> };
    const collision = map.layers.find((layer) => layer.name === 'collision')!.data!;
    collision[5 * 30 + 7] = 1;
    expect(() => compileTiledMaps(inputs)).toThrow(/spawn .* is blocked/);
  });

  it('rejects a missing reciprocal door pair', () => {
    const inputs = pair();
    const map = inputs.find((entry) => entry.id === 'test-town')!.input as { layers: Array<{ objects?: Array<{ class?: string; properties?: Array<{ name: string; value: unknown }> }> }> };
    const door = map.layers.flatMap((layer) => layer.objects ?? []).find((object) => object.class === 'door')!;
    door.properties!.find((property) => property.name === 'targetDoorId')!.value = 'missing-door';
    expect(() => compileTiledMaps(inputs)).toThrow(/not paired reciprocally/);
  });
});
