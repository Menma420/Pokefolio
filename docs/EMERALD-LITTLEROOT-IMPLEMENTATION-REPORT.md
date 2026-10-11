# Source-driven Littleroot implementation — 2026-10-11

> Canonical local phase report, screenshots and checks: [open the phase folder](../artifacts/emerald-source/phase-reconstruction/REPORT.md). The full NPC location/dialogue catalogue is included in the private P0 report. This source-safe repository copy preserves the implementation history; extracted dialogue/assets stay ignored.

> **Latest normal-game integration:** see [Littleroot integration report](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/REPORT.md). The report below records the earlier diagnostic-only increment.

## Status

**Working private/local increment; exact Emerald acceptance remains BLOCKED.**
The source-driven town, three ground-floor interiors, Route 101 connection,
walking, collision, scrolling and entrance/return warps run inside PokéFolio.
This is not a completed story-engine port or an emulator-pixel-proven release.
The normal public game is preserved; the reconstruction is `/dev/emerald`.

The reconstruction-specific checks pass: 5 Python tests, 19 runtime tests and
8 real-browser tests. The production build passes. The complete existing test
suite still has the failures detailed below. Zero native differences against an
independent compositor do not establish equality with an authentic emulator.

## Review files

| Evidence | File |
| --- | --- |
| Reproduction guide | [README](/home/menma/Downloads/Portfolio/tools/emerald-reconstruction/README.md) |
| Source audit and assumption corrections | [Source audit](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/support/SOURCE_AUDIT.md) |
| Source and generated-output provenance | [Manifest](/home/menma/Downloads/Portfolio/artifacts/emerald-source/manifest.json) |
| Consolidated check results | [Check results](/home/menma/Downloads/Portfolio/artifacts/emerald-source/check-results.json) |
| Native-resolution capture | [240×160 screenshot](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/screenshots/town-1x-native.png) |
| Rendered town at 4× | [Town screenshot](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/screenshots/town-4x.png) |
| Full source map preview | [Full map](/home/menma/Downloads/Portfolio/artifacts/emerald-source/LittlerootTown/metatile-map.png) |
| Decoded metatile atlas | [Atlas](/home/menma/Downloads/Portfolio/artifacts/emerald-source/LittlerootTown/metatile-atlas.png) |
| Native comparison counts | [Pixel comparison](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/screenshots/independent-diff.json) |
| Native comparison image | [Zero-difference image](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/screenshots/independent-diff.png) |
| Physical-scale and color checks | [Physical validation](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/screenshots/physical-validation.json) |
| Authentic source-build blocker | [Build log](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-reconstruction/checks/source-build-attempt.log) |

These evidence files are private local outputs. Sharing the Markdown file alone
does not include the extracted assets or screenshots.

## Repositories and source pin

- PokéFolio root: `/home/menma/Downloads/Portfolio`.
- Initial PokéFolio HEAD: `b96016c52072d72e604d5d62572577e7ced49beb`.
- Initial tracked worktree was clean; only `?? pokeemerald/` was present.
- Read-only upstream: `/home/menma/Downloads/Portfolio/pokeemerald`.
- Upstream origin: `https://github.com/pret/pokeemerald.git`.
- Pinned commit: **`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`**.
- Upstream was clean before extraction and remains unmodified. No commit/push.

The full supplied specification, starter README/decoder and relevant upstream C
were audited before implementation. The original two starter tests passed first.
Evidence and corrected assumptions are in
`artifacts/emerald-source/SOURCE_AUDIT.md`.

## Extracted source and transformations

`manifest.json` records 198 upstream inputs and 538 private outputs with
commit/path/SHA256, transformations and toolchain hashes. Final verification found
zero input/output hash mismatches. Everything extracted is
under the single ignored `artifacts/emerald-source/` directory.

| Source | Extracted/validated information |
| --- | --- |
| `data/maps/{LittlerootTown,Route101,LittlerootTown_BrendansHouse_1F,LittlerootTown_MaysHouse_1F,LittlerootTown_ProfessorBirchsLab}/map.json` and `scripts.inc` | Metadata, events, scripts, object positions, flags, warps, connections |
| `data/layouts/layouts.json`, corresponding `map.bin` / `border.bin` | Dimensions, little-endian grid words, borders, collision and elevation |
| `src/data/tilesets/{headers,graphics,metatiles}.h`, `src/graphics.c` | Actual primary/secondary graphics and metatile references |
| `data/tilesets/primary/{general,building}/` and `secondary/{petalburg,brendans_mays_house,lab}/` | Indexed tiles, 4bpp binaries, RGB555 palettes, metatiles, attributes and relevant animation frames |
| `src/fieldmap.c`, `src/field_camera.c`, `src/overworld.c` | Shared tile slots, palette placement, BG draw order, ring-buffer and camera arithmetic |
| `src/event_object_movement.c`, object graphics/animation tables and `graphics/object_events/` | Ten actor graphics, dimensions, palettes, directional poses, flips, anchors and priority tables |
| `src/tileset_anims.c`, `src/field_player_avatar.c`, `src/field_screen_effect.c`, `src/metatile_behavior.c`, `src/scrcmd.c`, source constants | Animation transfers, walk/warp rules, behavior masks and selected ON_LOAD edits |

Important corrections: tileset declarations are under `src/data/tilesets`, tile
entries address shared VRAM slots, normal camera panY is 32 with an additional
8-pixel BG offset, and source door entries may legitimately reference transparent
unloaded bank-14 pixels. The post-running-shoes checkpoint also needs the source
running-shoes flag and house manual metatile. These were verified against code,
not inferred from screenshots.

## Runtime implementation

| Map | Source dimensions | Implemented access |
| --- | --- | --- |
| Littleroot Town | 20×20 | Spawn `(10,10)`, south-facing, elevation 3 |
| Route 101 | 20×20 | Continuous north/south connection |
| Brendan's house 1F | 11×9 | Town `(5,8)` → source warp 1 `(8,8)` |
| May's house 1F | 11×9 | Town `(14,8)` → source warp 1 `(2,8)` |
| Birch's lab | 13×13 | Town `(7,16)` → source warp 0 `(6,12)` |

The pure indexed renderer composes three BG ring buffers, flipped 8×8 tiles,
transparent pixels, source palettes and elevation-prioritized objects. Phaser
displays the resulting native surface; the existing physical-pixel renderer and
240×160 viewport remain unchanged. Preview PNGs are diagnostics, not backgrounds.

The named state is **LT-04-FREE**, a declared male post-running-shoes diagnostic,
not an emulator save or replayed story checkpoint. The selected house ON_LOAD
branches are interpreted from source with a fail-closed opcode subset. Original
map words remain immutable; derived edits preserve elevation.

The adapter uses the shared Clock and input router, with keyboard/touch parity
and existing X-menu / Y-Bag access. Portfolio content, battle/reducer/encounter
logic, original WorldSim, routes and public assets were not changed.

Source entrance movement automatically starts the warp. All three ground-floor
returns use source warp anchors, followed by the exterior southward door step.
Second-floor and Oldale destinations remain explicitly outside the slice.

## Commands executed and reproduction

```sh
cd /home/menma/Downloads/Portfolio
export PATH=/home/menma/.nvm/versions/node/v22.23.3/bin:$PATH
export EMERALD_PYTHON=/home/menma/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3

pnpm emerald:extract
pnpm emerald:test
pnpm emerald:e2e
"$EMERALD_PYTHON" tools/emerald-reconstruction/reference_frame.py
"$EMERALD_PYTHON" tools/emerald-reconstruction/compare_frames.py --actual artifacts/emerald-source/screenshots/town-1x-native.png --reference artifacts/emerald-source/screenshots/independent-native.png --out artifacts/emerald-source/screenshots/independent-diff --kind independent-renderer --state artifacts/emerald-source/screenshots/town-1x.state.json
"$EMERALD_PYTHON" tools/emerald-reconstruction/verify_captures.py
"$EMERALD_PYTHON" tools/emerald-reconstruction/verify_determinism.py
pnpm test
pnpm test:e2e --workers=2
pnpm test:e2e --last-failed --workers=1
pnpm typecheck
pnpm lint
pnpm check:deps
pnpm build
"$EMERALD_PYTHON" tools/emerald-reconstruction/finalize_manifest.py
pnpm emerald:dev
```

Open **http://127.0.0.1:3101/dev/emerald**. Arrows walk, X opens the portfolio menu,
Y opens Bag. Walk north into a door; press south from an interior exit arrow.
For a frozen initial frame: `/dev/emerald?paused=1`.

Extraction defaults to the pinned local `pokeemerald/` checkout, rejects a dirty
or different revision, and installs no dependencies. The README documents path
overrides and how to supply an existing Pillow-enabled Python.

## Tests and engineering evidence

| Check | Actual result |
| --- | --- |
| Original starter decoder | 2/2 passed before adaptation |
| Decoder + selected ON_LOAD Python tests | 5/5 passed |
| Reconstruction TypeScript tests with private data enabled | 19/19 passed |
| Reconstruction real-browser integration | **8/8 passed**, including no-reload watcher regression |
| Source gbagfx conversion and roundtrip harness | 43 checks, zero mismatches |
| Executed upstream DrawMetatile harness | 1,018 cases, zero tile-entry mismatches |
| Executed upstream camera arithmetic | 204 frames, matched by runtime tests |
| Five map-grid roundtrips | Zero mismatches; dimensions/binary lengths validated |
| All source warp destinations | Validated against destination metadata, including explicitly unsupported second floors |
| Repeated extraction | 166 data/preview artifacts, zero changed hashes |
| Native browser vs independent compositor | **0 / 38,400 mismatched pixels**, zero channel differences |
| Physical scaling / palette | Five viewport/DPR combinations, zero pixel mismatches or intermediate colors |
| Typecheck | PASS |
| Reconstruction ESLint | PASS |
| Dependency boundaries | PASS: 157 modules, 557 dependencies |
| Production build | PASS: 27 static pages plus dynamic local endpoints |
| Production isolation | Both source endpoints 404 even with `EMERALD_LOCAL=1`; `/about` 200; no unsafe-eval in production CSP |
| Deployment file traces | 20 traces inspected; zero private-asset references |
| Complete existing unit suite | **237 passed, 1 failed, 12 skipped** |
| Complete existing browser suite | **46 passed, 6 failed** on the full run |
| Repository-wide lint | FAIL in unchanged `debug-audio.js` (`no-require-imports`); three existing warnings |

The 12 normal-suite skips require private extracted data; the explicit
`emerald:test` run executes those cases. The unit failure is the unchanged
victory-audio resume test at `tests/ui/p11-production.spec.tsx:108`, expecting
`start(0,5)` and receiving `start(0,0)`. No audio behavior/assertion was changed.

The full browser run failed two greeting-text assertions and four timeouts:
Brendan golden-pose capture, M1 golden path, M1 route-change aborts, P7 touch
direct paths, release-entry LOS battle, and the DPR text spike. These are failures
in unchanged test/game modules; this report does not assert a clean full regression.
Initial-run diagnostics are preserved in `existing-browser-results/` and
`regression-evidence/`. Generated tracked captures were backed up and restored
to their initially clean HEAD bytes; no pre-existing work was discarded.

The sequential retry recovered the Brendan, M1 golden-path and route-abort tests.
P7 touch and production battle entry still timed out. The text-spike retry was
invalidated by a concurrent production rebuild; its stable-build recheck is
**1/1 PASS**, recorded in `text-spike-stable-retry.log`. Thus four of the six
full-run failures recovered on isolated rechecks; the P7 touch and battle-entry
timeouts remain unresolved. This is not a new complete 52-test green run.
Earlier interrupted source-browser diagnostics are retained separately;
the local watcher was corrected to ignore its own separate cache and private
output tree, with a no-reload regression added. No existing assertion was weakened.

## Screenshot and pixel evidence

All paths below are relative to private `artifacts/emerald-source/`. Screenshots
have source/frame-state sidecars; scale captures also have geometry sidecars.

| Capture | CSS viewport | DPR | Integer scale |
| --- | --- | --- | --- |
| `screenshots/town-1x.png` | 240×160 | 1 | 1 |
| `screenshots/town-3x.png` | 720×480 | 1 | 3 |
| `screenshots/town-4x.png` | 960×640 | 1 | 4 |
| `screenshots/town-largest-fit.png` | 1440×900 | 1 | 5 |
| `screenshots/town-dpr3-scale10.png` | 800×600 | 3 | 10 |

Additional captures: doorway approach, Brendan/May/lab interiors, town-edge →
midstep → Route101, portfolio menu over the source town, and touch menu.
Full-map and atlas diagnostics: `LittlerootTown/metatile-map.png` and
`LittlerootTown/metatile-atlas.png` (plus individual BG/tile/palette previews).
The rendered town/interiors/connection captures were visually inspected.

`screenshots/independent-diff.json` reports zero native mismatches;
`independent-diff.png` is the corresponding black zero-difference image.
`physical-validation.json` records dimensions, crops, color histograms and zero
mismatch counts for all five scales. **These are independent-renderer checks,
not authentic emulator comparisons.**

## Exactness boundary and blocked gate

**Proven by executed source/data checks:** binary grid interpretation, dimensions,
tile conversion, metatile composition entries, camera arithmetic, deterministic
extraction, and browser/native/physical-raster consistency for the tested state.

**Source-derived and tested, but not emulator-pixel-proven:** selected checkpoint
visibility, object animation/priority, movement/collision/elevation, connection
scrolling and warp destination geometry.

**Missing implementation:** general script VM and LT-00–LT-03 story/cutscene
replay, exact door graphic/task-cycle timing, source turn-in-place timing, exact
OAM allocation/field-effect/shadow scheduling, weather/fade lifecycle, second
floors, Oldale connection and ledge jumps. Door fades and NPC task scheduling are
explicit compatibility adapters. Source NPC/sign scripts are extracted but their
full dialogue/event execution is not implemented. No fake replacement dialogue
or destinations were substituted.

**Authentic frame oracle BLOCKED:** an actual `make -j2` in a temporary Git-archive
copy failed at missing `png.h` / libpng development files. ARM assembler/linker
and agbcc are absent too. mGBA is installed, but there is no source-built Emerald
ROM, matching save or reference capture. No ROM was downloaded; upstream was
not built or modified in place. See `source-build-attempt.json` and `.log`.

Continuation: provision the upstream build prerequisites in a separate build
directory, build the pinned source, record reproducible LT-04/LT-05/LT-06/LT-07
emulator states (ROM hash, emulator identity, flags/vars, coordinates, camera,
animation and frame), then run `compare_frames.py --kind authentic-emulator`.
Only those comparisons can establish native emulator equality. Port the missing
script/transition subset and early story states after establishing that oracle.

## Files created or modified

- New `tools/emerald-reconstruction/`: pin, decoder, extractor, source-load subset,
  source harness validation, previews, provenance, deterministic/pixel comparisons,
  browser config/capture tool and reproduction README.
- New `src/core/emerald/{types,renderer,world}.ts`.
- New `src/game/emerald/boot.ts`.
- New `src/app/dev/emerald/{page,EmeraldClient}.tsx` and `data/route.ts`.
- New `tests/emerald-reconstruction/`: Python, pure runtime and browser tests.
- New `docs/adr/ADR-14-emerald-source.md` and this report.
- Updated `.gitignore`, `eslint.config.mjs`, `next.config.ts`, `package.json`,
  `tsconfig.json` for private assets, isolated local development, commands and types.
- Local generated outputs only: `artifacts/emerald-source/` and ignored cache.

No upstream source, existing game assets/content, normal world topology, gameplay
reducers, or existing regression assertions were edited. No assets were put in
`public/`. No commit or push was performed.
