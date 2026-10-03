import { COLLISION_GRASS, COLLISION_SOLID, COLLISION_WATER, MapData, MapDataSchema, MapObject, MapRoom, NpcRouteSchema } from '../../src/domain/map';

type TiledProperty = { name: string; value: unknown };
type TiledLayer = { type: string; name: string; width?: number; height?: number; data?: number[]; objects?: TiledObject[] };
type TiledObject = { id: number; name?: string; type?: string; class?: string; x: number; y: number; width?: number; height?: number; properties?: TiledProperty[] };
type TiledMap = { width: number; height: number; tilewidth: number; tileheight: number; layers: TiledLayer[]; properties?: TiledProperty[] };

const DIRECTIONS = new Set(['up', 'right', 'down', 'left']);

function propertiesOf(object: TiledObject): Record<string, unknown> {
  return Object.fromEntries((object.properties ?? []).map(({ name, value }) => [name, value]));
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${field} must be a non-empty string`);
  return value;
}

function asDirection(value: unknown, field: string): 'up' | 'right' | 'down' | 'left' {
  if (typeof value !== 'string' || !DIRECTIONS.has(value)) throw new Error(`${field} must be up, right, down, or left`);
  return value as 'up' | 'right' | 'down' | 'left';
}

function routeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { throw new Error('npc route property must contain valid JSON'); }
  }
  return value;
}

function tileCoordinate(value: number, tileSize: number, label: string): number {
  const tiles = value / tileSize;
  if (!Number.isInteger(tiles)) throw new Error(`${label} must align to the ${tileSize}px tile grid`);
  return tiles;
}

function findLayer(layers: TiledLayer[], name: string, cellCount: number): number[] {
  const layer = layers.find((candidate) => candidate.type === 'tilelayer' && candidate.name === name);
  if (!layer) return Array<number>(cellCount).fill(0);
  if (!Array.isArray(layer.data) || layer.data.length !== cellCount) throw new Error(`${name} layer must be an uncompressed Tiled JSON tile layer with width × height values`);
  return [...layer.data];
}

function objectsFrom(layers: TiledLayer[], tileSize: number): { objects: MapObject[]; rooms: MapRoom[] } {
  const objects: MapObject[] = [];
  const rooms: MapRoom[] = [];
  for (const layer of layers.filter((candidate) => candidate.type === 'objectgroup')) {
    for (const object of layer.objects ?? []) {
      const props = propertiesOf(object);
      const kind = String(object.class ?? object.type ?? props.kind ?? '').toLowerCase();
      const id = String(props.id ?? object.name ?? `${kind}-${object.id}`);
      const x = tileCoordinate(object.x, tileSize, `${id}.x`);
      const y = tileCoordinate(object.y, tileSize, `${id}.y`);
      if (kind === 'room') {
        rooms.push({ id, x, y, width: tileCoordinate(object.width ?? tileSize, tileSize, `${id}.width`), height: tileCoordinate(object.height ?? tileSize, tileSize, `${id}.height`) });
      } else if (kind === 'spawn') {
        objects.push({ type: 'spawn', id, x, y, facing: asDirection(props.facing ?? 'down', `${id}.facing`) });
      } else if (kind === 'door') {
        objects.push({
          type: 'door', id, x, y,
          targetMapId: asString(props.targetMapId, `${id}.targetMapId`),
          targetDoorId: asString(props.targetDoorId, `${id}.targetDoorId`),
          arrival: {
            x: Number(props.arrivalX), y: Number(props.arrivalY),
            facing: asDirection(props.arrivalFacing ?? 'down', `${id}.arrivalFacing`),
          },
          exitTile: props.exitTile === true ? { x: Number(props.exitTileX), y: Number(props.exitTileY) } : undefined,
        });
      } else if (kind === 'npc') {
        const route = routeValue(props.route);
        let parsedRoute;
        try { parsedRoute = NpcRouteSchema.parse(route); }
        catch { throw new Error(`${id}.route must define a loop or pingpong route with valid points`); }
        objects.push({ type: 'npc', id, x, y, facing: asDirection(props.facing ?? 'down', `${id}.facing`), route: parsedRoute });
      } else if (kind === 'sign' || kind === 'object') {
        objects.push({ type: kind, id, x, y });
      } else {
        throw new Error(`unsupported Tiled object class "${kind}" on ${id}`);
      }
    }
  }
  return { objects, rooms };
}

export function compileTiledMaps(sources: Array<{ id: string; input: unknown }>): MapData[] {
  if (sources.length === 0) throw new Error('at least one Tiled map is required');
  const compiled = sources.map(({ id, input }) => {
    if (!input || typeof input !== 'object') throw new Error(`${id}: invalid Tiled JSON`);
    const tiled = input as TiledMap;
    if (!Number.isInteger(tiled.width) || !Number.isInteger(tiled.height) || tiled.width <= 0 || tiled.height <= 0) throw new Error(`${id}: map width and height must be positive integers`);
    if (tiled.tilewidth !== 16 || tiled.tileheight !== 16) throw new Error(`${id}: Tiled maps must use 16×16 tiles`);
    const cellCount = tiled.width * tiled.height;
    const { objects, rooms } = objectsFrom(tiled.layers ?? [], 16);
    const screenRooms = rooms.length ? rooms : [{ id: `${id}-room-0-0`, x: 0, y: 0, width: tiled.width, height: tiled.height }];
    const candidate = {
      id,
      width: tiled.width,
      height: tiled.height,
      tileSize: 16 as const,
      layers: {
        ground: findLayer(tiled.layers ?? [], 'ground', cellCount),
        decor: findLayer(tiled.layers ?? [], 'decor', cellCount),
        above: findLayer(tiled.layers ?? [], 'above', cellCount),
      },
      collision: findLayer(tiled.layers ?? [], 'collision', cellCount),
      objects,
      rooms: screenRooms,
    };
    try { return MapDataSchema.parse(candidate); }
    catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${id}: ${detail}`);
    }
  });

  const mapsById = new Map(compiled.map((map) => [map.id, map]));
  if (mapsById.size !== compiled.length) throw new Error('map ids must be unique');
  for (const map of compiled) {
    for (const object of map.objects) {
      if (object.type !== 'door') continue;
      const targetMap = mapsById.get(object.targetMapId);
      if (!targetMap) throw new Error(`${map.id}: door ${object.id} targets missing map ${object.targetMapId}`);
      const targetDoor = targetMap.objects.find((candidate): candidate is Extract<MapObject, { type: 'door' }> => candidate.type === 'door' && candidate.id === object.targetDoorId);
      if (!targetDoor || targetDoor.targetMapId !== map.id || targetDoor.targetDoorId !== object.id) {
        throw new Error(`${map.id}: door ${object.id} is not paired reciprocally with ${object.targetMapId}/${object.targetDoorId}`);
      }
      if (object.arrival.x >= targetMap.width || object.arrival.y >= targetMap.height) throw new Error(`${map.id}: door ${object.id} arrival is outside ${targetMap.id}`);
    }
  }
  return compiled;
}

export const TILED_COLLISION_ENCODING = { none: 0, solid: COLLISION_SOLID, water: COLLISION_WATER, grass: COLLISION_GRASS } as const;
