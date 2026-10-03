import Phaser from 'phaser';
import type { MapData } from '../domain/map';
import type { WorldSnapshot } from '../core/world/types';
import { characterArt, characterFrame, characterPosition, WORLD_TEXTURES, WORLD_TILE_SIZE } from './worldArt';

/** Presentation only: compiled ground/decor/above layers never define collision. */
export class MapRenderer {
  private renderedMapId: string | null = null;
  private tiles: Phaser.GameObjects.Image[] = [];
  private characters = new Map<string, Phaser.GameObjects.Image>();
  private indicator: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.indicator = scene.add.graphics().setDepth(20000);
  }

  drawMap(map: MapData) {
    for (const tile of this.tiles) tile.destroy();
    this.tiles = [];
    for (const [layer, depth] of [[map.layers.ground, -2000], [map.layers.decor, -1000], [map.layers.above, 10000]] as const) {
      layer.forEach((frame, index) => {
        if (frame === 0) return;
        const image = this.scene.add.image(index % map.width * WORLD_TILE_SIZE, Math.floor(index / map.width) * WORLD_TILE_SIZE, WORLD_TEXTURES.tiles, String(frame));
        image.setOrigin(0, 0).setDepth(depth);
        this.tiles.push(image);
      });
    }
    this.renderedMapId = map.id;
  }

  drawEntities(snapshot: WorldSnapshot, exclaimEntityId: string | null) {
    if (this.renderedMapId !== snapshot.map.id) this.drawMap(snapshot.map);
    const entities = [snapshot.state.player, ...snapshot.state.npcs];
    const present = new Set(entities.map(entity => entity.id));
    for (const [id, sprite] of this.characters) {
      if (!present.has(id)) { sprite.destroy(); this.characters.delete(id); }
    }
    this.indicator.clear();
    for (const entity of entities) {
      const art = characterArt(entity.id, snapshot.state.player.id);
      const frame = characterFrame(entity, art);
      const position = characterPosition(entity);
      let sprite = this.characters.get(entity.id);
      if (!sprite) {
        sprite = this.scene.add.image(position.x, position.y, WORLD_TEXTURES.characters, frame).setOrigin(0.5, 1);
        this.characters.set(entity.id, sprite);
      }
      sprite.setPosition(position.x, position.y).setFrame(frame).setDepth(position.y);
      // Diagnostic attributes mirror rendered frames, without influencing gameplay.
      this.scene.game.canvas.dataset[`frame${art.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`] = frame;
      if (exclaimEntityId === entity.id) this.drawExclaim(position.x - 8, position.y - 48);
    }
    this.scene.game.canvas.dataset.worldArt = 'original-pokefolio';
  }

  private drawExclaim(x: number, y: number) {
    // Original pixel bubble, whole native pixels, no font rasterization.
    this.indicator.fillStyle(0x283d38).fillRect(x + 2, y, 12, 14).fillRect(x, y + 2, 16, 10);
    this.indicator.fillStyle(0xf3e7c6).fillRect(x + 2, y + 2, 12, 10);
    this.indicator.fillStyle(0x283d38).fillRect(x + 7, y + 3, 2, 5).fillRect(x + 7, y + 9, 2, 2).fillRect(x + 7, y + 14, 2, 2);
  }
}
