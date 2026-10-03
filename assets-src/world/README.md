# Original Pokefolio world artwork

`build.py` is the editable pixel-art source: every silhouette, leaf cluster, shingle course, doorway, facial pixel and walking pose is constructed with integer coordinates. It reads no external artwork. The generated PNGs use fully transparent or fully opaque pixels, with no antialiasing, gradient or shading dither.

Regenerate from the repository root:

```sh
python3 assets-src/world/build.py
pnpm compile:maps
```

The builder writes content-hashed lossless PNG/JSON-hash atlases plus `public/assets/world/manifest.json`, records the palettes, and repaints only the ground/decor/above layers in the existing four Tiled sources. It preserves collision arrays, objects, routes and camera rooms. The tileset is referenced by the Tiled sources; the existing map compiler remains the single source of collision truth.

Character sheets contain four original designs (`player`, `npc-guide`, `npc-neighbor`, `challenger`), each with four directions and three authored walk poses. Idle tags alias pose zero. Frames are untrimmed 16×32, bottom-centre anchored; the collision footprint remains 16×16. The view samples `stand → left foot → stand → right foot` from authoritative WorldSim movement ticks, without introducing a second animation clock. The second ordinary-NPC design is available in the atlas but is not spawned by the current map.

Tile palettes use at most four colours plus outline; character palettes use at most six plus outline. Palette ramps belong to artwork and do not modify Phase A's canonical UI palette. Canopies and roofs occupy the existing above layer; facades, trunks and ground details sit beneath Y-sorted characters. House visuals use the existing home/door coordinates, and no new buildings, doors, interiors or navigation routes are introduced.

The first B1 review uses `artifacts/phase-b/` exclusively. Rendered evidence and the remaining-art scope are indexed in its report. Art here is submitted for visual review; automated pixel/atlas checks do not declare visual approval.
