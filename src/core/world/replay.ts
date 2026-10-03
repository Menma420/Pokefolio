import { MapData } from '../../domain/map';
import { WorldDirection, WorldState } from './types';
import { createWorldState, tickWorld } from './worldSim';

export function replayWorld(maps: ReadonlyMap<string, MapData>, mapId: string, input: readonly WorldDirection[], stepTicks = 8): WorldState {
  return input.reduce((state, direction) => tickWorld(state, maps, direction, stepTicks).state, createWorldState(maps, mapId));
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashWorldState(state: WorldState): string {
  const serialized = canonical(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
