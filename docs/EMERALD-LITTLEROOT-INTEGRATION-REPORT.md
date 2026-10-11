# Littleroot normal-game integration

> Canonical local phase report, screenshots and checks: [open the phase folder](../artifacts/emerald-source/phase-integration/REPORT.md). The full NPC location/dialogue catalogue is included in the private P0 report. This source-safe repository copy preserves the implementation history; extracted dialogue/assets stay ignored.

Latest interaction follow-up: [Source NPC and object interactions](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/REPORT.md). The original integration results below are retained as historical evidence.

Status: working local/private integration; repository-wide checks have the caveats below. This does not establish emulator-pixel equality.

## Run

```sh
cd /home/menma/Downloads/Portfolio
export PATH=/home/menma/.nvm/versions/node/v22.23.3/bin:$PATH
pnpm game:local
```

Open http://127.0.0.1:3101/ — normal title/intro/gameplay, with Littleroot as the opted-in local default. Existing extracted data is reused. If absent, run `pnpm emerald:extract` first. No extractor rebuild was performed for integration.

Fallback: http://127.0.0.1:3101/?world=legacy or `POKEFOLIO_WORLD=legacy pnpm game:local`. `/dev/emerald` remains the independent diagnostic harness. Ordinary production stays on the approved custom world.

## Actor confirmed with owner

Pinned upstream: `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

| Field | Source-backed identity |
| --- | --- |
| Map/object | Route101, generated object-event ID 1 (array index 0) |
| Graphics | OBJ_EVENT_GFX_YOUNGSTER |
| Source coordinate | (16,8), elevation 3 |
| Movement | MOVEMENT_TYPE_LOOK_AROUND, range 0/0 |
| Original script | Route101_EventScript_Youngster |
| Original trainer type | TRAINER_TYPE_NONE; trainer sight 0 |
| Palette | OBJ_EVENT_PAL_TAG_NPC_1 / PALSLOT_NPC_1; npc_1.pal |
| Art box | 16×32; original source anchor and indexed pixels |
| Animation | sAnimTable_Standard / sPicTable_Youngster; source FACE/GO sequences, east uses west hFlip |
| Diagnostic facing | South; existing declared exploration checkpoint |

Source paths: `data/maps/Route101/{map.json,scripts.inc}`, `src/data/object_events/{object_event_graphics_info,object_event_pic_tables,object_event_graphics,object_event_anims}.h`, `graphics/object_events/pics/people/youngster.png`, `graphics/object_events/palettes/npc_1.pal`. Identity, palette, animation and hashes: `artifacts/emerald-source/challenger-identity.json`.

The owner confirmed the intended actor is on Route 101. No town actor was guessed or substituted. Brendan remains the separate player. The interview role is an explicit PokéFolio override, not an original Emerald trainer script; no source event is moved or rewritten. The Youngster approaches from (16,8) to (16,10) for the tested first encounter at player (16,11), stops one tile away, and remains available for subsequent direct interaction.

## Integration

`GameShell` selects one world session at startup. A small `WorldSessionContract` allows the existing GameOrchestrator to consume source snapshots without depending on WorldSim internals. Legacy WorldSession still wraps the unchanged WorldSim. EmeraldWorldSession wraps the existing EmeraldWorld; there is no second simulation of the source world.

Movement, source collision/elevation, camera ring scrolling, indexed rendering, Route101 connection and the three ground-floor warps remain owned by the source core. The shared Clock and InputRouter drive it. The bridge-compatible Phaser scene displays decoded pixels and preloads the existing battle artwork before world readiness, then launches/sleeps/wakes the existing battle scene through GameBridge.

The original single LOS evaluator, encounter machine, dialogue, audience/VS, battle reducer, question trees, Party, menus and routes are reused. Interaction turns the source actor before the common encounter evaluator runs. Return restores source map/tile/facing and preserves the current camera/NPC state when the anchor is unchanged.

## Privacy

All extracted data and captures remain under ignored `artifacts/emerald-source/`; none were copied into public or source imports. The private endpoint still requires development mode, explicit opt-in and loopback host. Production returns 404 for both private routes even with EMERALD_LOCAL=1. Production root has sourceWorld=false. Twenty deployment traces contain zero private paths; hash checks found no copied source PNG/bin assets in public/build output. Production CSP has no unsafe-eval.

The opted-in webpack watcher excludes both build caches, upstream and generated artifacts, preventing concurrent build/test evidence writes from hot-reloading the private scene. The unsafe-eval source-map exception remains development-only.

## Baseline and checks

Baseline before integration edits: 236 unit passes, 2 failures, 12 skips. Failures were the unchanged victory-audio resume assertion and a 5-second battle-art label test timeout. Repository lint already failed in debug-audio.js with three existing warnings. Selected production browser baseline: 2 passed, 1 failed (release-entry greeting assertion); P7 touch passed that isolated baseline.

| Check | Actual result | Evidence under artifacts/emerald-source/ |
| --- | --- | --- |
| Reconstruction/extraction tests | PASS: 5 Python tests | integration-source-tests-final.log |
| Source runtime + integration adapter | PASS: 25 TypeScript tests (19 existing + 6 new) | integration-source-tests-final.log |
| Original diagnostic browser cases | PASS: all 8 diagnostic cases; combined intermediate run had one HMR-interrupted integration case, superseded below | integration-browser-stable.log |
| Normal-root browser integration | PASS: 7/7 | integration-root-browser-verified.log |
| Complete unit suite, quiet serial run | 240 PASS, 1 FAIL, 18 SKIP / 259 | integration-unit-quiet-final.log |
| Existing full browser suite | 46 PASS, 6 FAIL / 52; retry recovered 4 of those 6 | integration-full-browser.log; integration-regression-retry.log |
| Typecheck after final build | PASS | integration-typecheck-final.log |
| Changed-file ESLint | PASS | integration-changed-lint.log |
| Repository lint | FAIL: pre-existing debug-audio.js require import; 3 existing unused-variable warnings | integration-lint-final.log |
| Dependency boundaries | PASS: 161 modules, 583 dependencies | integration-boundaries-verified.log |
| Final strict content validation + production build | PASS | integration-build-final.log |
| Final actual production privacy verification | PASS: private routes 404 even with opt-in; root sourceWorld=false; 20 traces, zero private references/copied assets | integration-production-isolation.json |
| Upstream asset preservation | PASS: 198 source inputs, zero hash mismatches | integration-source-preservation.json |
| Source diagnostic pixel checks | PASS: zero intermediate colors / physical mismatches at 1×, 3×, 4×, desktop 5× and DPR3 scale10 | integration-pixel-checks.log |
| Normal-root physical rendering | PASS: zero nonuniform native-pixel blocks in six entry/battle/return captures | screenshots/integrated-physical-validation.json |

Remaining regression failures, explicitly not a green full-suite claim:

1. `tests/ui/p11-production.spec.tsx:108`: existing victory-audio resume test expects start offsets 0,5; receives 0,0. This also failed before integration.
2. `tests/e2e/portfolio-menus.spec.ts:66`: existing P7 complete touch-path test times out at 180 seconds. It is listed in the previous report, passed the isolated baseline, but failed the full run and retry. New normal-root touch integration passes.
3. `tests/e2e/release-entry.spec.ts:74`: legacy production LOS path fails its greeting text assertion in `readText` at line 39. It also failed the pre-edit selected baseline. New source-world actual-root battle entry passes.

The 18 ordinary-suite skips include private-data tests executed explicitly in `pnpm emerald:test`; they are not counted as passing in the ordinary suite. The old battle-art unit timeout recovered in the quiet final run. Foundation, M1 golden path, M1 abort and P7 keyboard browser failures recovered on sequential retry. Saved failure contexts and generated old-phase evidence are preserved privately, with original tracked captures restored byte-for-byte.

Commands used (Node 22.23.3 on PATH):

```sh
pnpm emerald:test
pnpm emerald:e2e
pnpm emerald:e2e -- integrated.e2e.ts
pnpm test --maxWorkers=1
pnpm test:e2e --workers=2
pnpm test:e2e --last-failed --workers=1
pnpm typecheck
pnpm lint
pnpm check:deps
pnpm build
EMERALD_LOCAL=1 pnpm start --hostname 127.0.0.1 --port 3103
```

The diagnostic cases passed in the retained combined browser log; the integration cases were subsequently run together without editing/HMR and all seven passed. Actual production HTTP, trace and hash verification was repeated against the final build, then the temporary production server was stopped. The local opted-in server remains at port 3101.

The new browser cases cover: first encounter after turning from behind; real town→Route101→LOS→audience→VS→Phaser battle→summary/topics/answer→EXIT and exact tile/facing return; repeat direct interaction; all three automatic interior doors and exterior anchors; legacy fallback; touch movement/X/Y/B; fresh intro and persistence; and original PDF safe opening plus six conventional portfolio routes. Runtime tests cover source identity, map invariants, invalid distance/blocked LOS, single encounter ownership, movement, scripted approach and return.

No existing assertions were weakened or deleted. New browser drivers wait for existing transitions and speaking-surface ownership, and use paths outside wandering NPC ranges. Intermediate development runs interrupted by hot reload are retained in private logs and are not final evidence.

## Evidence

All new evidence uses the one existing `artifacts/emerald-source/` directory. Normal-root screenshots have source-state, viewport, DPR and integer-scale sidecars:

- screenshots/integrated-town-1x.png — 240×160 CSS, DPR1, 1×.
- screenshots/integrated-town-4x.png — 960×640 CSS, DPR1, 4×.
- screenshots/integrated-town-largest-fit.png — 1440×900 CSS, DPR1, 5×.
- screenshots/integrated-behind-immediate.png — source actor interaction from behind.
- screenshots/integrated-challenger-detection.png and integrated-challenger-dialogue.png.
- screenshots/integrated-audience.png and integrated-vs.png.
- screenshots/integrated-actual-battle.png — actual root gameplay, not /dev/battle.
- screenshots/integrated-topics.png and integrated-answer.png.
- screenshots/integrated-exact-return.png and integrated-repeat.png.
- screenshots/integrated-LittlerootTown_* — all three ground floors.
- screenshots/integrated-touch-bag.png — 400×800 CSS touch viewport, DPR1, scale recorded in sidecar.

Visual review: inspected actual normal-root town, challenger dialogue, audience, battle, answer and exact-return captures. Town uses decoded source tiles and distinct source Brendan/NPCs; the blue-cap Youngster is visibly separate from the player. Its alert is anchored above the opaque head pixels. Existing portfolio dialogue/battle windows remain intact. Edges are crisp at the captured integer scales. The battle screenshot is the existing project composition reached through the full game flow; it is not an Emerald battle reconstruction. Independent source composition comparison has **0 / 38,400 native pixel mismatches**, with a generated diff; this is not authentic emulator evidence. See the earlier report for that oracle's blocked prerequisites.

Review links:

- [Normal local entry, 4×](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-town-4x.png)
- [Route101 challenger](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-challenger-dialogue.png)
- [Actual battle entry](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-actual-battle.png)
- [Answer navigation](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-answer.png)
- [Exact world return](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-exact-return.png)
- [Native 1×](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-town-1x.png)
- [Largest-fit desktop](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-integration/screenshots/integrated-town-largest-fit.png)

## Files changed in this integration

- src/app/{page,GameShell}.tsx
- src/runtime/Orchestrator.ts
- src/runtime/world/{WorldSession,WorldSessionContract,EmeraldWorldSession,sourceChallenger}.ts
- src/core/emerald/world.ts
- src/game/emerald/GameScene.ts
- next.config.ts, package.json
- tools/emerald-reconstruction/{playwright.config.ts,README.md,finalize_manifest.py}
- tests/emerald-reconstruction/{integrated-runtime.test.ts,integrated.e2e.ts,privacy.spec.ts}
- docs/EMERALD-LITTLEROOT-INTEGRATION-REPORT.md; prior implementation report points here.

Earlier extraction files and unrelated work were preserved. Regression-generated older tracked captures are backed up privately and restored to their initial bytes after the tests. Upstream is still clean at the pinned commit. No commit/push was performed.

## Remaining limitations

This integration does not port the full Emerald script VM, source turn-in-place/door-task cycle timing, second floors, Route101→Oldale, ledge jumps, weather/field-effect scheduling or an authentic emulator oracle. These are inherited, explicitly reported slice limitations. Source NPC/sign scripts other than the portfolio actor adapter remain data rather than invented dialogue. Missing ARM/agbcc/libpng build prerequisites still block authentic Emerald frame comparison; no new ROM was downloaded.
