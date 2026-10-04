import { WORLD_TEST_MAPS, M1_TOWN_MAP_ID } from '../src/content/maps';
import { validateWorldPlacement } from '../src/domain/worldValidation';

const errors = validateWorldPlacement(WORLD_TEST_MAPS, M1_TOWN_MAP_ID);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const map = WORLD_TEST_MAPS.get(M1_TOWN_MAP_ID)!;
  console.log(
    `P9 placement PASS: ${map.width}x${map.height} contiguous world; two areas; three interiors; two ordinary NPCs; one challenger; all walkable tiles/landmarks/anchors reachable.`,
  );
}
