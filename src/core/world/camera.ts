import type { MapData } from '../../domain/map';
import type { WorldEntity } from './types';
import { DEFAULT_STEP_TICKS } from './worldSim';

export const WORLD_VIEWPORT = { width: 240, height: 160 } as const;

/** No camera clock or easing: sample the same authoritative step as the sprite. */
export function followWorldCamera(map: Pick<MapData, 'width' | 'height'>, player: WorldEntity) {
  const progress = player.movement
    ? Math.min(1, player.movement.elapsedTicks / DEFAULT_STEP_TICKS)
    : 0;
  const centerX =
    Math.round((player.x + ((player.movement?.to.x ?? player.x) - player.x) * progress) * 16) + 8;
  const centerY =
    Math.round((player.y + ((player.movement?.to.y ?? player.y) - player.y) * progress) * 16) + 8;
  return {
    x: Math.max(
      0,
      Math.min(map.width * 16 - WORLD_VIEWPORT.width, centerX - WORLD_VIEWPORT.width / 2),
    ),
    y: Math.max(
      0,
      Math.min(map.height * 16 - WORLD_VIEWPORT.height, centerY - WORLD_VIEWPORT.height / 2),
    ),
  };
}
