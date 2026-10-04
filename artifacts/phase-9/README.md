# P9 — Final World Build-Out and Map Finalization

## Status

**PASS: implementation, automated checks and rendered screenshot inspection. Ready for human visual review.** P10 has not begun. Human approval of the continuous-world feel remains the review checkpoint.

## Final world and camera

- Exterior: **36×22 tiles**, **576×352 native pixels**, 792 tiles. The approved viewport remains 240×160 (15×10 visible tiles).
- The two original area IDs remain metadata: west x0–14 and east x15–35, both covering the full world height. They do not control camera bounds or trigger a transition.
- Camera follows WorldSim's authoritative eight-tick movement; **2 native pixels per 50 ms tick**, no easing or independent camera clock.
- Scroll clamps to **X 0–336, Y 0–192**. Coordinates remain integers; the viewport never extends beyond the map. Exhaustive movement tests verify the entire 16×32 player art box stays visible.
- Old boundary crossing (x14→15): offsets **112, 114, 116, 118, 120, 122, 124, 126, 128**, with no fade, room load or jump.
- The real-time movie starts at the town center, steps onto the northern walking lane, then holds Right continuously through the former boundary to tile (19,4). This is actual keyboard movement, not restored positions or a simulated camera movie.

## Geography and interiors

The map contains a central town, residential home/garden, workshop, cottage, connected paths and bypasses, pond/stream, two tall-grass areas, an eastern woodland loop, a grand tree, three signs and two optional discoveries. Fourteen named landmarks are validated. Buildings and waterways shape the routes; expansion is not an empty-grass border or a mandatory maze.

| Building | Exterior doorway | Interior | Interior dimensions |
| --- | --- | --- | --- |
| Player's home (no HOME label) | (22,5) | m1-interior-test | 15×10 |
| Workshop | (8,14) | m1-workshop | 15×10 |
| Route cottage | (26,16) | m1-cottage | 15×10 |

All three doors activate by walking onto the tile, with **no Enter/A input**. Each interior has a paired walking exit and B return. The exact exterior approach tile, facing and resulting camera position are restored. The original home anchor (21,5), facing right, remains covered by the existing browser regression. All facade/roof cells are solid; side porch cells remain walkable.

Interiors are complete navigable rooms with optional flavor objects, existing approved wall/floor/plant artwork and exits. They contain no exclusive professional information. Detailed furnishings and final art/audio polish remain later scope.

## NPCs, interactions and persistence

- Exactly two ordinary NPCs: route-guide follows the preserved three-point route; route-neighbor follows a separate three-point route near the cottage. Existing collision resolves movement; deterministic 500-tick replay tests cover both.
- Exactly one visually distinct challenger at (18,7), stationary until the encounter. The existing 1–3 tile LOS, solid blocking, approach, one-tile stop, audience choice, VS, battle and later challenge ownership are retained.
- Enter/A still interacts with NPCs, signs and optional objects. The existing DialogueService, Clock, Window and bitmap text present flavor. B dismisses it; world movement pauses while speaking.
- Two discoveries use the existing session progress store, with an optional defaulted discoveries field. Old saved progress remains valid; discoveries persist across reload and other progress writes without duplicate records.
- X/Y locking during encounter, VS, battle and dialogue is covered by the browser regressions.

## Placement validation

`pnpm validate:world` checks schemas, map bounds, complete/non-overlapping area coverage, reachable walkable tiles and required landmarks, exactly three distinct paired interiors, exterior/interior anchors, solid building facades, exact NPC counts, walkable adjacent NPC routes, stationary challenger geometry and its three-tile encounter lane. Water/grass/tree/sign/secret descriptors must correspond to actual geometry/art or interactions. LOS blocker tests verify solids cannot be seen through. CI runs placement validation.

## Architecture and preservation

The existing Tiled-to-JSON compiler remains the map pipeline. The new authored map composer reuses the approved original B1 atlas; `pnpm author:world` regenerates all four production maps. The original pixel-art builder skips these finalized map layouts so art regeneration cannot overwrite them.

The camera selector is pure core code; Phaser applies its whole-pixel scroll to the existing world scene. React continues to own UI. WorldSim movement/collision resolution, LOS implementation, physical-pixel rasterizer, integer scaling, sprite atlas pixels, palette, font, Window/Cursor, title/intro/VS/battle UI, question trees, Party definitions, portfolio data and P8 routes are unchanged.

The compact test-town/interior-test fixtures retain their old fixed camera and historical screenshot baseline. ADR-12 records the user's P9 continuous-camera requirement superseding the older fixed-screen decision. No dependencies were added.

## Verification

| Check | Result |
| --- | --- |
| Unit/component/runtime/content tests | **181 passed, 31 files** |
| Full browser matrix | **42 unique tests passed**; see interruption note below |
| New P9 browser cases | 4 passed: rendered camera/landmarks/edges, three doors/flavor/persistence, real-time crossing, P8 no-JS integration |
| Camera and world unit cases | 6 passed; boundary ticks, exhaustive visibility/bounds, all door approaches/exits, deterministic NPC replay, LOS blockers, validator mutation failures |
| Map compiler parity | All six Tiled sources match compiled checked-in maps |
| Typecheck | PASS |
| Lint | PASS, zero errors; two inherited unused-import warnings on P8 Resume/Skills routes |
| Dependency/boundary check | PASS, 136 modules / 473 dependencies |
| Content validation | PASS, 18 existing authored question trees |
| World placement validation | PASS |
| Production build | PASS, 27 static outputs including all 12 project pages |
| Diff whitespace check | PASS |
| Screenshot pixel blocks | All 21 PNG captures have zero within-native-pixel block mismatches |

The final full browser run passed 33 cases before its separately hosted server received SIGTERM. The remaining nine reported connection refusal, not assertion failures. All nine passed on a Playwright-owned production-server rerun. Logs retain both the interruption and successful rerun; there are no outstanding failed checks. The camera capture case was rerun once more after fixing evidence collection to wait for the expected scale after viewport resize.

The browser matrix covers approved title/intro persistence, world fixtures, production assets, automatic doors, P6 encounter/golden path and exact battle return, audiences/VS, authored battle/Party flow, P7 keyboard/touch menus and resources, controls/scaling/typography, and P8 pages. The additional P8 case reads root fallback, About, Projects, Skills, Experience, Resume and every project detail with JavaScript disabled, checks native Q&A, invalid-slug 404, sitemap/robots and actual PDF availability.

Two legacy test adjustments preserve their original assertions: the touch battle reader uses the controlled Clock to avoid a typewriter reveal/advance race; the web skills selector follows P8's category/skill heading hierarchy. Home-door routes now approach via the walkable porch instead of crossing a visible facade.

## Files/modules changed

- Map authoring: assets-src/maps/finalize-world.py; m1-town.tmj; m1-interior-test.tmj; new m1-workshop.tmj and m1-cottage.tmj.
- Pipeline: assets-src/world/build.py and README.md; scripts/lib/compileTiledMaps.ts; package.json author:world/validate:world commands.
- Content contracts: src/domain/map.ts; src/content/maps.ts; four corresponding compiled map JSON files; new src/content/worldFlavor.ts.
- Camera/render integration: new src/core/world/camera.ts; src/game/WorldScene.ts.
- Runtime flavor/discoveries: src/runtime/Orchestrator.ts; src/runtime/stores/index.ts; src/app/GameShell.tsx.
- Validation: new src/domain/worldValidation.ts; scripts/validate-world.ts; .github/workflows/ci.yml.
- Tests: new tests/core/world-camera.spec.ts, tests/runtime/world-discovery.spec.ts and tests/e2e/final-world.spec.ts; updated world-art, map-compiler, m1-flow, overworld-art, battle and portfolio-production regressions.
- Decision/evidence: docs/adr/ADR-12.md and this single artifacts/phase-9 folder. Earlier phase artifact folders were restored byte-for-byte to their pre-P9 contents after legacy tests regenerated evidence.

## Remaining art / deviations / blockers

- **No new placeholder art.** Existing approved B1 world/player/NPC/building assets are reused unchanged. The three interiors intentionally use sparse approved furnishings; detailed interior art, final music and final polish belong to later phases.
- Optional flavor is fictional exploration material, not invented portfolio claims. Professional content/question-tree completion was not attempted.
- No unapproved product or architecture deviation. The camera rule change is expressly required by P9 and documented in ADR-12.
- No technical blockers remain. Two existing P8 lint warnings remain outside this phase. Human visual acceptance is pending.

## Visual evidence

The PNGs below come from the actual production game. CSS viewport, DPR, native scale and state/camera metadata are also recorded in captures.json and interior-captures.json. PNGs are the pixel-inspection reference; the encoded WebM is for movement continuity.

| Screenshot | Viewport CSS | DPR | Integer scale | Camera native X,Y |
| --- | --- | --- | --- | --- |
| [town-center-1x.png](town-center-1x.png) | 240×160 | 1 | 1× | 0,8 |
| [town-center-3x.png](town-center-3x.png) | 720×480 | 1 | 3× | 0,8 |
| [town-center-4x.png](town-center-4x.png) | 960×640 | 1 | 4× | 0,8 |
| [boundary-before-4x.png](boundary-before-4x.png) | 960×640 | 1 | 4× | 112,0 |
| [boundary-15-4x.png](boundary-15-4x.png) | 960×640 | 1 | 4× | 128,0 |
| [boundary-16-4x.png](boundary-16-4x.png) | 960×640 | 1 | 4× | 144,0 |
| [largest-fit-desktop-5x.png](largest-fit-desktop-5x.png) | 1440×900 | 1 | 5× | 144,0 |
| [grand-tree-green-4x.png](grand-tree-green-4x.png) | 960×640 | 1 | 4× | 0,192 |
| [pond-workshop-4x.png](pond-workshop-4x.png) | 960×640 | 1 | 4× | 80,168 |
| [forest-grass-4x.png](forest-grass-4x.png) | 960×640 | 1 | 4× | 336,88 |
| [cottage-neighbor-4x.png](cottage-neighbor-4x.png) | 960×640 | 1 | 4× | 320,192 |
| [camera-edge-0-0-4x.png](camera-edge-0-0-4x.png) | 960×640 | 1 | 4× | 0,0 |
| [camera-edge-336-0-4x.png](camera-edge-336-0-4x.png) | 960×640 | 1 | 4× | 336,0 |
| [camera-edge-336-192-4x.png](camera-edge-336-192-4x.png) | 960×640 | 1 | 4× | 336,192 |
| [camera-edge-0-192-4x.png](camera-edge-0-192-4x.png) | 960×640 | 1 | 4× | 0,192 |
| [ordinary-npc-dialogue-4x.png](ordinary-npc-dialogue-4x.png) | 960×640 | 1 | 4× | 16,8 |
| [home-interior-4x.png](home-interior-4x.png) | 960×640 | 1 | 4× | 0,0 |
| [workshop-interior-4x.png](workshop-interior-4x.png) | 960×640 | 1 | 4× | 0,0 |
| [cottage-interior-4x.png](cottage-interior-4x.png) | 960×640 | 1 | 4× | 0,0 |
| [tree-secret-dialogue-4x.png](tree-secret-dialogue-4x.png) | 960×640 | 1 | 4× | 0,192 |
| [forest-discovery-4x.png](forest-discovery-4x.png) | 960×640 | 1 | 4× | 336,24 |

[Continuous-walking movie](boundary-real-time-4x.webm): CSS 960×640, DPR 1, 4×. 323 actual frame samples over 5353.8 ms; X 0–192, Y 0–0; maximum adjacent delta 2 native pixels; zero transitions.

Boundary checks: [tick samples](boundary-camera-ticks.json), [live frame samples](real-time-camera-frames.json). Before/at/after PNGs are checkpoints in the same movement sequence, not separate maps.

Manual rendered-image inspection confirmed the approved original sprite/tile language, readable paths and landmark layering, crisp integer pixel blocks, natural edge clamps and a flat black desktop letterbox. Three interior captures show the canonical sparse rooms and exits. Review the walking movie for the final subjective continuity check.

## Review recommendation

P9 is ready for review. Start the game, leave the center by one tile north, then hold Right across x14→15. The camera should reveal a larger continuous world without a screen transition. Review the southern green, stream/workshop and eastern loop, and walk into each doorway. Stop after P9; no P10 work is included.
