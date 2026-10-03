import { COLLISION_SOLID, collisionAt, MapData, Direction } from '../../../domain/map';
import { TilePosition } from '../types';

export interface LineOfSightQuery {
  map: MapData;
  origin: TilePosition;
  facing: Direction;
  target: TilePosition;
  blockers?: readonly TilePosition[];
  range?: number;
}

export function hasLineOfSight({ map, origin, facing, target, blockers = [], range = 3 }: LineOfSightQuery): boolean {
  if (!Number.isInteger(range) || range < 1) return false;
  const dx = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
  const dy = facing === 'down' ? 1 : facing === 'up' ? -1 : 0;
  if (dx === 0 && dy === 0) return false;
  for (let distance = 1; distance <= range; distance += 1) {
    const tile = { x: origin.x + dx * distance, y: origin.y + dy * distance };
    if ((collisionAt(map, tile.x, tile.y) & COLLISION_SOLID) !== 0) return false;
    if (tile.x === target.x && tile.y === target.y) return true;
    if (blockers.some((blocker) => blocker.x === tile.x && blocker.y === tile.y)) return false;
  }
  return false;
}
