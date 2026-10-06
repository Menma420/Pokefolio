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

  constructor(private readonly scene: Phaser.Scene,private readonly reducedMotion:()=>boolean=()=>false) {
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

  drawEntities(snapshot: WorldSnapshot, exclaimEntityId: string | null, rise=0) {
    if (this.renderedMapId !== snapshot.map.id) this.drawMap(snapshot.map);
    const entities = [snapshot.state.player, ...snapshot.state.npcs];
    const present = new Set(entities.map(entity => entity.id));
    for (const [id, sprite] of this.characters) {
      if (!present.has(id)) { sprite.destroy(); this.characters.delete(id); }
    }
    this.indicator.clear();
    for (const entity of entities) {
      const art = characterArt(entity.id, snapshot.state.player.id);
      const frame = this.reducedMotion()?`${art}-${entity.facing}-idle`:characterFrame(entity, art);
      const position = characterPosition(entity);
      let sprite = this.characters.get(entity.id);
      if (!sprite) {
        sprite = this.scene.add.image(position.x, position.y, WORLD_TEXTURES.characters, frame).setOrigin(0.5, 1);
        this.characters.set(entity.id, sprite);
      }
      sprite.setPosition(position.x, position.y).setFrame(frame).setDepth(position.y);
      // Diagnostic attributes mirror rendered frames, without influencing gameplay.
      this.scene.game.canvas.dataset[`frame${art.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`] = frame;
      if (exclaimEntityId === entity.id) this.drawExclaim(position.x - 10, position.y - 49 - rise);
    }
    this.scene.game.canvas.dataset.worldArt = 'original-pokefolio';
  }

  private drawExclaim(x: number, y: number) {
    // Original pixel bubble, whole native pixels, no font rasterization.
    this.indicator.fillStyle(0x283d38).fillRect(x+3,y,14,17).fillRect(x+1,y+2,18,13).fillRect(x+8,y+17,4,3);
    this.indicator.fillStyle(0xf3e7c6).fillRect(x+4,y+2,12,13).fillRect(x+3,y+4,14,9).fillRect(x+9,y+16,2,2);
    this.indicator.fillStyle(0xeec786).fillRect(x+4,y+12,12,2);
    this.indicator.fillStyle(0x283d38).fillRect(x+8,y+4,4,6).fillRect(x+9,y+10,2,1).fillRect(x+9,y+12,2,2);

  }
}
