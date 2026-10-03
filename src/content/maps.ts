import { MapDataSchema } from '../domain/map';
import townData from './maps/test-town.json';
import interiorData from './maps/interior-test.json';
import m1TownData from './maps/m1-town.json';
import m1InteriorData from './maps/m1-interior-test.json';

export const TEST_TOWN_MAP_ID = 'test-town';
export const TEST_INTERIOR_MAP_ID = 'interior-test';
export const M1_TOWN_MAP_ID = 'm1-town';
export const M1_INTERIOR_MAP_ID = 'm1-interior-test';

const maps = [MapDataSchema.parse(townData), MapDataSchema.parse(interiorData), MapDataSchema.parse(m1TownData), MapDataSchema.parse(m1InteriorData)];
export const WORLD_TEST_MAPS = new Map(maps.map((map) => [map.id, map]));
export function getWorldMap(mapId: string) { return WORLD_TEST_MAPS.get(mapId); }
