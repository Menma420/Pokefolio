import type { Direction } from '../domain/map';
import type { WorldEntity } from '../core/world/types';
import { DEFAULT_STEP_TICKS } from '../core/world/worldSim';

export const WORLD_TILE_SIZE = 16;
export const WORLD_ART_BOX = { width: 16, height: 32 } as const;
export const WORLD_TEXTURES = { tiles: 'pokefolio-town-tiles', characters: 'pokefolio-town-characters' } as const;
export type CharacterArt = 'player' | 'npc-guide' | 'npc-neighbor' | 'challenger';
export const CHARACTER_ART: readonly CharacterArt[] = ['player', 'npc-guide', 'npc-neighbor', 'challenger'];
export const CHARACTER_DIRECTIONS: readonly Direction[] = ['down', 'left', 'right', 'up'];

/** Stand → left-foot → stand → right-foot, sampled from authoritative movement ticks. */
export function characterFrame(entity: WorldEntity, art: CharacterArt) {
  if (!entity.movement) return `${art}-${entity.facing}-idle`;
  const phase = Math.min(3, Math.floor(entity.movement.elapsedTicks * 4 / DEFAULT_STEP_TICKS));
  const cycle = [0, 1, 0, 2] as const;
  return `${art}-${entity.facing}-${cycle[phase]}`;
}

/** Bottom-centre origin; art extends one tile above the unchanged collision footprint. */
export function characterPosition(entity: WorldEntity) {
  const amount = entity.movement ? Math.min(1, entity.movement.elapsedTicks / DEFAULT_STEP_TICKS) : 0;
  const x = entity.x + ((entity.movement?.to.x ?? entity.x) - entity.x) * amount;
  const y = entity.y + ((entity.movement?.to.y ?? entity.y) - entity.y) * amount;
  return { x: Math.round(x * WORLD_TILE_SIZE) + 8, y: Math.round(y * WORLD_TILE_SIZE) + 16 };
}

export function characterArt(id: string, playerId: string): CharacterArt {
  return id === playerId ? 'player' : id === 'challenger' ? 'challenger' : id === 'route-guide' ? 'npc-guide' : 'npc-neighbor';
}
