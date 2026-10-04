import {
  BLOCKING_COLLISION_FLAGS,
  COLLISION_WATER,
  COLLISION_GRASS,
  COLLISION_SOLID,
  collisionAt,
  MapDataSchema,
  type MapData,
  type DoorObject,
} from './map';

/** Pure geometry checks, independent of React, Phaser and runtime state. */
export function validateWorldPlacement(
  maps: ReadonlyMap<string, MapData>,
  worldId: string,
): string[] {
  const errors: string[] = [];
  const map = maps.get(worldId);
  if (!map) return [`Missing world ${worldId}`];
  if (map.width < 30 || map.height < 20)
    errors.push('World must be substantially larger than its viewport');
  if (map.cameraMode !== 'follow') errors.push('Production world must use follow camera');
  if (map.rooms.length !== 2) errors.push('World must retain exactly two areas');
  const playable = [
    map,
    ...map.objects
      .filter((object): object is DoorObject => object.type === 'door')
      .map((door) => maps.get(door.targetMapId))
      .filter((target): target is MapData => !!target),
  ];
  for (const area of playable) {
    const parsed = MapDataSchema.safeParse(area);
    if (!parsed.success) {
      errors.push(`${area.id}: ${parsed.error.message}`);
      continue;
    }
    if (area.width < 15 || area.height < 10)
      errors.push(`${area.id}: map is smaller than camera viewport`);
    const doors = area.objects.filter((object): object is DoorObject => object.type === 'door');
    const walkable = (x: number, y: number) =>
      !(collisionAt(area, x, y) & BLOCKING_COLLISION_FLAGS) ||
      doors.some((door) => door.x === x && door.y === y);
    const spawn = area.objects.find((object) => object.type === 'spawn')!;
    const reached = new Set<string>([`${spawn.x},${spawn.y}`]);
    const queue = [{ x: spawn.x, y: spawn.y }];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const x = current.x + dx,
          y = current.y + dy,
          key = `${x},${y}`;
        if (
          x >= 0 &&
          y >= 0 &&
          x < area.width &&
          y < area.height &&
          walkable(x, y) &&
          !reached.has(key)
        ) {
          reached.add(key);
          queue.push({ x, y });
        }
      }
    }
    const reachable = (x: number, y: number) => reached.has(`${x},${y}`);
    const adjacentReachable = (x: number, y: number) =>
      (
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ] as const
      ).some(([dx, dy]) => reachable(x + dx, y + dy));
    for (let y = 0; y < area.height; y++)
      for (let x = 0; x < area.width; x++) {
        const containing = area.rooms.filter(
          (room) =>
            x >= room.x && y >= room.y && x < room.x + room.width && y < room.y + room.height,
        );
        if (containing.length !== 1)
          errors.push(`${area.id}: tile ${x},${y} has ${containing.length} areas`);
        if (!(collisionAt(area, x, y) & BLOCKING_COLLISION_FLAGS) && !reachable(x, y))
          errors.push(`${area.id}: unreachable walkable tile ${x},${y}`);
        if (
          (x === 0 || y === 0 || x === area.width - 1 || y === area.height - 1) &&
          !(collisionAt(area, x, y) & BLOCKING_COLLISION_FLAGS)
        )
          errors.push(`${area.id}: open world edge ${x},${y}`);
      }
    const occupied = new Set<string>();
    for (const object of area.objects) {
      if (object.type === 'npc' || object.type === 'spawn') {
        const key = `${object.x},${object.y}`;
        if (occupied.has(key)) errors.push(`${area.id}: overlapping entity at ${key}`);
        occupied.add(key);
        const points = object.type === 'npc' ? [object, ...object.route.points] : [object];
        for (const point of points)
          if (
            collisionAt(area, point.x, point.y) & BLOCKING_COLLISION_FLAGS ||
            !reachable(point.x, point.y) ||
            doors.some((door) => door.x === point.x && door.y === point.y)
          )
            errors.push(
              `${area.id}: invalid entity/route tile for ${object.id}: ${point.x},${point.y}`,
            );
      }
      if (object.type === 'sign' || object.type === 'object') {
        if (!adjacentReachable(object.x, object.y))
          errors.push(`${area.id}: unreachable interaction ${object.id}`);
      }
      if (object.type !== 'door') continue;
      if (!adjacentReachable(object.x, object.y))
        errors.push(`${area.id}: unreachable door ${object.id}`);
      const target = maps.get(object.targetMapId);
      const pair = target?.objects.find(
        (candidate): candidate is DoorObject =>
          candidate.type === 'door' && candidate.id === object.targetDoorId,
      );
      if (!target || !pair || pair.targetMapId !== area.id || pair.targetDoorId !== object.id)
        errors.push(`${area.id}: invalid reciprocal destination for ${object.id}`);
      if (
        target &&
        (collisionAt(target, object.arrival.x, object.arrival.y) & BLOCKING_COLLISION_FLAGS ||
          target.objects.some(
            (candidate) =>
              candidate.type === 'door' &&
              candidate.x === object.arrival.x &&
              candidate.y === object.arrival.y,
          ))
      )
        errors.push(`${area.id}: invalid arrival anchor for ${object.id}`);
      if (
        object.exitTile &&
        (!reachable(object.exitTile.x, object.exitTile.y) ||
          Math.abs(object.exitTile.x - object.x) + Math.abs(object.exitTile.y - object.y) !== 1)
      )
        errors.push(`${area.id}: invalid interior exit tile ${object.id}`);
      if (pair && Math.abs(pair.arrival.x - object.x) + Math.abs(pair.arrival.y - object.y) !== 1)
        errors.push(`${area.id}: exterior/interior return anchor not adjacent to ${object.id}`);
    }
    const landmarkIds = new Set<string>();
    for (const landmark of area.landmarks ?? []) {
      if (landmarkIds.has(landmark.id))
        errors.push(`${area.id}: duplicate landmark ${landmark.id}`);
      landmarkIds.add(landmark.id);
      if (landmark.x + landmark.width > area.width || landmark.y + landmark.height > area.height)
        errors.push(`${area.id}: out-of-bounds landmark ${landmark.id}`);
      const found = queue.some(
        (point) =>
          point.x >= landmark.x - 1 &&
          point.x <= landmark.x + landmark.width &&
          point.y >= landmark.y - 1 &&
          point.y <= landmark.y + landmark.height,
      );
      if (!found) errors.push(`${area.id}: unreachable landmark ${landmark.id}`);
      const cells: number[] = [];
      for (let y = landmark.y; y < Math.min(area.height, landmark.y + landmark.height); y++)
        for (let x = landmark.x; x < Math.min(area.width, landmark.x + landmark.width); x++)
          cells.push(y * area.width + x);
      if (
        landmark.kind === 'water' &&
        !cells.some((index) => area.collision[index]! & COLLISION_WATER)
      )
        errors.push(`${area.id}: water landmark has no water ${landmark.id}`);
      if (
        landmark.kind === 'grass' &&
        !cells.some((index) => area.collision[index]! & COLLISION_GRASS)
      )
        errors.push(`${area.id}: grass landmark has no grass ${landmark.id}`);
      if (
        ['home', 'building'].includes(landmark.kind) &&
        doors.filter(
          (door) =>
            door.x >= landmark.x &&
            door.x < landmark.x + landmark.width &&
            door.y >= landmark.y &&
            door.y < landmark.y + landmark.height,
        ).length !== 1
      )
        errors.push(`${area.id}: building landmark must contain one doorway ${landmark.id}`);
      if (['home', 'building'].includes(landmark.kind)) {
        for (let y = landmark.y; y < landmark.y + landmark.height - 1; y++) {
          for (let x = landmark.x; x < landmark.x + landmark.width; x++) {
            if (!(collisionAt(area, x, y) & COLLISION_SOLID)) errors.push(`${area.id}: walkable building facade ${landmark.id}: ${x},${y}`);
          }
        }
      }
      if (
        ['forest', 'grand-tree'].includes(landmark.kind) &&
        (!cells.some((index) => area.layers.above[index]! > 0) ||
          !cells.some((index) => area.collision[index]! & COLLISION_SOLID))
      )
        errors.push(`${area.id}: missing tree artwork/collision ${landmark.id}`);
      if (
        ['sign', 'secret'].includes(landmark.kind) &&
        !area.objects.some(
          (object) =>
            object.id === landmark.id &&
            ['sign', 'object'].includes(object.type) &&
            object.x === landmark.x &&
            object.y === landmark.y,
        )
      )
        errors.push(`${area.id}: missing landmark interaction ${landmark.id}`);
    }
  }
  const doors = map.objects.filter((object) => object.type === 'door');
  if (doors.length !== 3 || new Set(doors.map((door) => door.targetMapId)).size !== 3)
    errors.push('World must have exactly three buildings with distinct interiors');
  const npcs = map.objects.filter((object) => object.type === 'npc');
  if (
    npcs.filter((npc) => npc.id !== 'challenger').length !== 2 ||
    npcs.filter((npc) => npc.id === 'challenger').length !== 1
  )
    errors.push('World must have two ordinary NPCs and one challenger');
  for (const kind of [
    'town',
    'home',
    'building',
    'water',
    'grass',
    'forest',
    'grand-tree',
    'sign',
    'secret',
  ]) {
    if (!map.landmarks?.some((landmark) => landmark.kind === kind))
      errors.push(`Missing required landmark ${kind}`);
  }
  if (
    map.landmarks?.filter((landmark) => landmark.kind === 'home').length !== 1 ||
    map.landmarks?.filter((landmark) => ['home', 'building'].includes(landmark.kind)).length !== 3
  )
    errors.push('Landmarks must identify three buildings including one home');
  const challenger = npcs.find((npc) => npc.id === 'challenger');
  if (challenger) {
    if (
      challenger.route.points.length !== 1 ||
      challenger.route.points[0]!.x !== challenger.x ||
      challenger.route.points[0]!.y !== challenger.y
    )
      errors.push('Challenger must be stationary before encounter');
    const dx = challenger.facing === 'left' ? -1 : challenger.facing === 'right' ? 1 : 0;
    const dy = challenger.facing === 'up' ? -1 : challenger.facing === 'down' ? 1 : 0;
    for (let distance = 1; distance <= 3; distance++) {
      const x = challenger.x + dx * distance,
        y = challenger.y + dy * distance;
      if (
        collisionAt(map, x, y) & BLOCKING_COLLISION_FLAGS ||
        npcs.some((npc) => npc.id !== challenger.id && npc.x === x && npc.y === y)
      )
        errors.push(`Blocked challenger encounter lane ${x},${y}`);
    }
  }
  return errors;
}
