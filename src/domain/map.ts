import { z } from 'zod';

export const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
export const DirectionSchema = z.enum(DIRECTIONS);
export type Direction = z.infer<typeof DirectionSchema>;

export const COLLISION_SOLID = 1;
export const COLLISION_WATER = 2;
export const COLLISION_GRASS = 4;
export const BLOCKING_COLLISION_FLAGS = COLLISION_SOLID | COLLISION_WATER;

const TilePointSchema = z.object({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative() });
const RoutePointSchema = TilePointSchema.extend({ waitTicks: z.number().int().nonnegative().default(0) });
export const NpcRouteSchema = z.object({
  mode: z.enum(['loop', 'pingpong']),
  points: z.array(RoutePointSchema).min(1),
});

const SpawnObjectSchema = z.object({ type: z.literal('spawn'), id: z.string().min(1), x: z.number().int().nonnegative(), y: z.number().int().nonnegative(), facing: DirectionSchema });
const DoorObjectSchema = z.object({
  type: z.literal('door'),
  id: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  targetMapId: z.string().min(1),
  targetDoorId: z.string().min(1),
  arrival: TilePointSchema.extend({ facing: DirectionSchema }),
  exitTile: TilePointSchema.optional(),
});
const NpcObjectSchema = z.object({
  type: z.literal('npc'),
  id: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  facing: DirectionSchema,
  route: NpcRouteSchema,
});
const InteractiveObjectSchema = z.object({
  type: z.enum(['sign', 'object']),
  id: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

export const MapObjectSchema = z.discriminatedUnion('type', [SpawnObjectSchema, DoorObjectSchema, NpcObjectSchema, InteractiveObjectSchema]);
export type MapObject = z.infer<typeof MapObjectSchema>;
export type SpawnObject = z.infer<typeof SpawnObjectSchema>;
export type DoorObject = z.infer<typeof DoorObjectSchema>;
export type NpcObject = z.infer<typeof NpcObjectSchema>;
export type NpcRoute = z.infer<typeof NpcRouteSchema>;

export const MapRoomSchema = z.object({ id: z.string().min(1), x: z.number().int().nonnegative(), y: z.number().int().nonnegative(), width: z.number().int().positive(), height: z.number().int().positive() });
export type MapRoom = z.infer<typeof MapRoomSchema>;

export const MapDataSchema = z.object({
  id: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileSize: z.literal(16),
  cameraMode: z.enum(['rooms', 'follow']).optional(),
  landmarks: z.array(z.object({
    id: z.string().min(1), kind: z.enum(['town', 'home', 'building', 'water', 'grass', 'forest', 'grand-tree', 'sign', 'secret']),
    x: z.number().int().nonnegative(), y: z.number().int().nonnegative(),
    width: z.number().int().positive(), height: z.number().int().positive(),
  })).optional(),
  layers: z.object({
    ground: z.array(z.number().int().nonnegative()),
    decor: z.array(z.number().int().nonnegative()),
    above: z.array(z.number().int().nonnegative()),
  }),
  collision: z.array(z.number().int().nonnegative()),
  objects: z.array(MapObjectSchema),
  rooms: z.array(MapRoomSchema).min(1),
}).superRefine((map, ctx) => {
  const cellCount = map.width * map.height;
  for (const layerName of ['ground', 'decor', 'above'] as const) {
    if (map.layers[layerName].length !== cellCount) ctx.addIssue({ code: 'custom', path: ['layers', layerName], message: `${layerName} layer must contain ${cellCount} tiles` });
  }
  if (map.collision.length !== cellCount) ctx.addIssue({ code: 'custom', path: ['collision'], message: `collision layer must contain ${cellCount} flags` });
  map.collision.forEach((flags, index) => {
    if ((flags & ~7) !== 0) ctx.addIssue({ code: 'custom', path: ['collision', index], message: `unknown collision flag ${flags}` });
  });
  const ids = new Set<string>();
  map.objects.forEach((object, index) => {
    if (ids.has(object.id)) ctx.addIssue({ code: 'custom', path: ['objects', index, 'id'], message: `duplicate object id ${object.id}` });
    ids.add(object.id);
    const points = object.type === 'npc' ? [...object.route.points] : object.type === 'door' && object.exitTile ? [object.exitTile] : [];
    if ('x' in object && (object.x >= map.width || object.y >= map.height)) ctx.addIssue({ code: 'custom', path: ['objects', index], message: `object ${object.id} is outside map bounds` });
    for (const point of points) if (point.x >= map.width || point.y >= map.height) ctx.addIssue({ code: 'custom', path: ['objects', index], message: `object ${object.id} has a point outside map bounds` });
    if (object.type === 'npc') {
      const routePoints = [object, ...object.route.points];
      for (let routeIndex = 1; routeIndex < routePoints.length; routeIndex += 1) {
        const previous = routePoints[routeIndex - 1]!;
        const current = routePoints[routeIndex]!;
        const distance = Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y);
        const initialWait = routeIndex === 1 && distance === 0 && current.x === object.x && current.y === object.y;
        if (distance !== 1 && !initialWait) ctx.addIssue({ code: 'custom', path: ['objects', index, 'route', 'points', routeIndex - 1], message: `NPC route ${object.id} must use adjacent tile steps (except its initial wait tile)` });
      }
      if (object.route.mode === 'loop' && object.route.points.length > 1) {
        const first = object.route.points[0]!;
        const last = object.route.points[object.route.points.length - 1]!;
        if (Math.abs(first.x - last.x) + Math.abs(first.y - last.y) !== 1) ctx.addIssue({ code: 'custom', path: ['objects', index, 'route', 'points'], message: `loop route ${object.id} must close back to its first tile` });
      }
    }
  });
  const spawns = map.objects.filter((object): object is SpawnObject => object.type === 'spawn');
  if (spawns.length !== 1) ctx.addIssue({ code: 'custom', path: ['objects'], message: 'map must contain exactly one spawn' });
  const spawn = spawns[0];
  if (spawn && (map.collision[spawn.y * map.width + spawn.x]! & BLOCKING_COLLISION_FLAGS) !== 0) {
    ctx.addIssue({ code: 'custom', path: ['objects'], message: `spawn ${spawn.id} is blocked` });
  }
  map.rooms.forEach((room, index) => {
    if (room.x + room.width > map.width || room.y + room.height > map.height) ctx.addIssue({ code: 'custom', path: ['rooms', index], message: `room ${room.id} is outside map bounds` });
  });
});

export type MapData = z.infer<typeof MapDataSchema>;

export function collisionAt(map: MapData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return BLOCKING_COLLISION_FLAGS;
  return map.collision[y * map.width + x] ?? BLOCKING_COLLISION_FLAGS;
}

export function getMapRoom(map: MapData, x: number, y: number): MapRoom {
  return map.rooms.find((room) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) ?? map.rooms[0]!;
}
