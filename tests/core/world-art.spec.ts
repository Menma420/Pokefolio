import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import manifest from '../../public/assets/world/manifest.json';
import { decodePng } from '../helpers/png';
import { characterFrame, characterPosition, CHARACTER_ART, CHARACTER_DIRECTIONS } from '../../src/game/worldArt';
import { WORLD_TEST_MAPS } from '../../src/content/maps';
import type { WorldEntity } from '../../src/core/world/types';

const asset = (url: string) => fs.readFileSync(path.join('public', url));
const atlas = JSON.parse(asset(manifest.characters.atlas).toString());
const tiles = JSON.parse(asset(manifest.tiles.atlas).toString());
const spritePng = decodePng(asset(manifest.characters.image));

describe('original production world artwork', () => {
  it('loads complete lossless atlases with 16×32 character frames and 16×16 tiles', () => {
    for (const art of CHARACTER_ART) for (const direction of CHARACTER_DIRECTIONS) {
      for (const pose of ['0', '1', '2', 'idle']) {
        const frame = atlas.frames[`${art}-${direction}-${pose}`];
        expect(frame.frame).toMatchObject({ w: 16, h: 32 });
        expect(frame.pivot).toEqual({ x: 0.5, y: 1 });
        expect(frame.trimmed).toBe(false);
      }
      expect(atlas.meta.frameTags[`${art}-${direction}`].frames).toEqual([0, 1, 0, 2].map(pose => `${art}-${direction}-${pose}`));
    }
    expect(spritePng.width).toBe(atlas.meta.size.w);
    expect(spritePng.height).toBe(atlas.meta.size.h);
    for (const frame of Object.values(tiles.frames) as Array<{ frame: { w: number; h: number } }>) expect(frame.frame).toMatchObject({ w: 16, h: 16 });
    for (const map of WORLD_TEST_MAPS.values()) for (const layer of Object.values(map.layers)) for (const id of layer) if (id) expect(tiles.frames[String(id)]).toBeDefined();
  });

  it('preserves alpha-only pixel edges and the authored per-character palette caps', () => {
    for (const art of CHARACTER_ART) for (const direction of CHARACTER_DIRECTIONS) for (const pose of [0, 1, 2]) {
      const f = atlas.frames[`${art}-${direction}-${pose}`].frame;
      const palette = new Set(Object.values(manifest.palettes.characters[art]).map(color => color.toUpperCase()));
      expect(palette.size).toBeLessThanOrEqual(7);
      let visible = 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
        const i = ((f.y + y) * spritePng.width + f.x + x) * 4;
        expect([0, 255]).toContain(spritePng.data[i + 3]);
        if (spritePng.data[i + 3]) {
          visible++;
          const color = '#' + [...spritePng.data.slice(i, i + 3)].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
          expect(palette.has(color)).toBe(true);
        }
      }
      expect(visible).toBeGreaterThan(100);
      expect(visible).toBeLessThan(16 * 32 * 0.65);
    }
    for (const palette of Object.values(manifest.palettes.tiles)) expect(palette.length).toBeLessThanOrEqual(5);
  });

  it('uses authoritative movement ticks for three walk poses and keeps bottom-centre anchors on whole pixels', () => {
    const player: WorldEntity = { id: 'player', x: 7, y: 5, facing: 'right', movement: null };
    expect(characterPosition(player)).toEqual({ x: 120, y: 96 });
    expect(characterFrame(player, 'player')).toBe('player-right-idle');
    const seen = new Set<string>();
    for (let elapsedTicks = 1; elapsedTicks < 8; elapsedTicks++) {
      const moving = { ...player, movement: { to: { x: 8, y: 5 }, elapsedTicks } };
      seen.add(characterFrame(moving, 'player'));
      expect(characterPosition(moving)).toEqual({ x: 120 + elapsedTicks * 2, y: 96 });
    }
    expect([...seen].sort()).toEqual(['player-right-0', 'player-right-1', 'player-right-2']);
  });

  it('retains approved B1 art and home doorway while expanding production geometry', () => {
    const map = WORLD_TEST_MAPS.get('m1-town')!;
    expect(map).toMatchObject({ width: 36, height: 22, cameraMode: 'follow' });
    expect(map.collision).toHaveLength(36 * 22);
    expect(map.objects.find(object => object.type === 'door')).toMatchObject({ id: 'home-front', x: 22, y: 5, targetMapId: 'm1-interior-test', arrival: { x: 7, y: 7, facing: 'up' } });
    expect(map.rooms).toHaveLength(2);
    expect(map.objects.filter(object => object.type === 'npc')).toHaveLength(3);
  });
});
