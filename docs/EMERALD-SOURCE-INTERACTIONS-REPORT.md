# P0 — Source-world NPC and object interactions

> Canonical local phase report, screenshots and checks: [open the phase folder](../artifacts/emerald-source/phase-p0-interactions/REPORT.md). The full NPC location/dialogue catalogue is included in the private P0 report. This source-safe repository copy preserves the implementation history; extracted dialogue/assets stay ignored.

## Status

**PASS WITH CAVEATS — implemented for the current local/private checkpoint:** eight ordinary NPCs, twenty background events and three metatile furniture targets. Battle/menu visuals and the special Route101 challenger remain unchanged. Repository-wide regression caveats and later-story limitations are listed below; this is not an authentic-emulator fidelity claim.

## Root cause

`InputRouter` reached `EmeraldWorldSession.handleInput`, which searched only adjacent actors, emitted `interactionRequested`, and immediately called `endInteraction` for every non-challenger. There was no background-event or metatile-object resolver. `GameOrchestrator` handled only `challenger` or IDs in the legacy `WORLD_FLAVOR` table; source actor IDs had neither a script dispatcher nor a dialogue owner. The renderer and keyboard handler were working.

## Implementation

- One pure source resolver follows the pinned `field_control_avatar.c` ordering: object events, counter reach, background events, then metatile behavior. It uses current source actor coordinates, adjacent facing geometry, source elevation matching, directional barriers and actual source event definitions. A solid sign is interactable; an arbitrary wall does not extend NPC reach.
- A bounded interpreter executes extracted commands, source labels/text, gender substitutions, flag/variable branches, calls/jumps and page breaks. Active unknown commands, missing labels/text and unresolved text controls raise diagnostics with their original file/label location. Budget: 512 commands, 16 nested calls.
- The existing world session remains the only simulation. A selected moving NPC finishes its current source step through the shared Clock before turning. The orchestrator owns one paused interaction and the existing `DialogueService`/`DialogueBox` owns keyboard/touch A/B presentation. A advances/reveals; B cancels the remaining interaction. Movement, menus and encounter initiation cannot leak through the interaction lock.
- Source `\p` becomes an explicit page boundary; `\n`/`\l` retain source line breaks within existing two-line pagination. The Route101 up-arrow control uses the existing bitmap ▲ glyph. No font, window, palette or battle/menu composition was changed.
- Required flags/vars live in the existing per-world checkpoint; caller input data is copied so one session cannot contaminate another. Source temporary vars clear at map load; persistent flags survive interior transitions. The aide's first/repeat flag and other tested conditions remain source-defined.
- Mom's rest executes the source messages, integer RGB555 fade and rest statistic. Pokémon healing has no interview-Party HP equivalent and is explicitly recorded rather than mutating portfolio Party data. Source fanfare playback is recorded as unavailable, not replaced with invented audio.
- TVs use the verified `CheckForPlayersHouseNews` and Mom/Dad text conditions. The player's declared post-intro checkpoint previously omitted `FLAG_SYS_TV_HOME`, set in `data/scripts/players_house.inc` during the already-completed intro (state 7). That flag is now included; it selects the source movie instead of an inconsistent late-game news path. Rival-house TV repeats its source Mom/Dad choice through `VAR_TEMP_3`; turning it off updates the source grid and redraws without moving the camera.

## Exact identities

| Map | Source object-event ID | Graphics | Source tile | Script |
| --- | --- | --- | --- | --- |
| LittlerootTown | 1 | OBJ_EVENT_GFX_TWIN | (16,10), elevation 3 | LittlerootTown_EventScript_Twin |
| LittlerootTown | 2 | OBJ_EVENT_GFX_FAT_MAN | (12,13), elevation 3 | LittlerootTown_EventScript_FatMan |
| LittlerootTown | 3 | OBJ_EVENT_GFX_BOY_2 | (14,17), elevation 3 | LittlerootTown_EventScript_Boy |
| LittlerootTown_BrendansHouse_1F | 1 | OBJ_EVENT_GFX_MOM | (2,6), elevation 3 | PlayersHouse_1F_EventScript_Mom |
| LittlerootTown_MaysHouse_1F | 4 | OBJ_EVENT_GFX_WOMAN_4 | (8,7), elevation 3 | RivalsHouse_1F_EventScript_RivalMom |
| LittlerootTown_MaysHouse_1F | 6 | OBJ_EVENT_GFX_NINJA_BOY | (9,5), elevation 3 | RivalsHouse_1F_EventScript_RivalSibling |
| LittlerootTown_ProfessorBirchsLab | 1 | OBJ_EVENT_GFX_SCIENTIST_1 | (9,8), elevation 3 | LittlerootTown_ProfessorBirchsLab_EventScript_Aide |
| LittlerootTown_ProfessorBirchsLab | 2 | OBJ_EVENT_GFX_PROF_BIRCH | (6,4), elevation 3 | LittlerootTown_ProfessorBirchsLab_EventScript_Birch |

| Map | Event IDs / source tiles | Script |
| --- | --- | --- |
| LittlerootTown | 1: (15,13) | LittlerootTown_EventScript_TownSign |
| LittlerootTown | 2: (6,17) | LittlerootTown_EventScript_BirchsLabSign |
| LittlerootTown | 3: (7,8) | LittlerootTown_EventScript_BrendansHouseSign |
| LittlerootTown | 4: (12,8) | LittlerootTown_EventScript_MaysHouseSign |
| Route101 | 1: (5,9) | Route101_EventScript_RouteSign |
| LittlerootTown_ProfessorBirchsLab | 1: (10,7); 2: (11,7) | LittlerootTown_ProfessorBirchsLab_EventScript_Machine |
| LittlerootTown_ProfessorBirchsLab | 3: (7,1); 4: (8,1) | LittlerootTown_ProfessorBirchsLab_EventScript_Book |
| LittlerootTown_ProfessorBirchsLab | 5: (1,1); 6: (0,7); 7: (1,7); 8: (2,7); 9: (3,7) | LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf |
| LittlerootTown_ProfessorBirchsLab | 10: (4,1); 11: (3,1); 12: (1,10); 13: (1,9); 14: (11,10); 15: (11,9) | LittlerootTown_ProfessorBirchsLab_EventScript_PC |

Metatile furniture: Brendan 1F TV (4,4), running-shoes manual (3,7); May 1F TV (6,4). TVs require facing north. Background-event elevations/facing constraints are preserved verbatim in the private event data.

The Route101 Youngster, object-event 1 at (16,8), remains exclusively the PokéFolio challenger override. Its source graphic/palette and authoritative encounter evaluator are unchanged. Ordinary actors and signs never enter that override.

Pinned upstream: `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`. Upstream was not edited. Extracted programs, strings, assets and screenshots remain ignored under `artifacts/emerald-source/`; none are static imports or public assets.

## Checks

| Check | Actual result | Evidence under `artifacts/emerald-source/` |
| --- | --- | --- |
| Source reconstruction and interaction tests | PASS: 6 Python + 35 TypeScript | `interactions-reconstruction-final.log` |
| Private real-browser combined suite | 19 passed; one new test checked a nonexistent Bag heading after successfully opening Bag | `interactions-complete-browser.log` |
| Corrected touch NPC/Bag browser case | PASS: 1/1; assertion now checks the existing named Bag region | `interactions-touch-npc-browser.log` |
| New interaction browser cases together (before the fifth touch-NPC case was added) | PASS: 4/4 | `interactions-browser-final.log` |
| Full existing production browser suite | 50 passed, 2 pre-existing failures / 52 | `interactions-full-browser.log` |
| Complete unit suite | 240 passed, 1 pre-existing failure, 28 skipped / 269 | `interactions-unit-final.log` |
| Typecheck | PASS | `interactions-typecheck-final.log` |
| Changed-file ESLint | PASS | `interactions-changed-lint-final.log` |
| Repository lint | FAIL: pre-existing `debug-audio.js` require import; 3 existing unused-variable warnings | `interactions-lint-final.log` |
| Dependency boundaries | PASS: 162 modules, 586 dependencies | `interactions-boundaries-final.log` |
| Production build + strict content validation | PASS: 12 projects, 18 trees, 394 questions, 387 verbatim answers | `interactions-build.log` |
| Production privacy | PASS: both private endpoints 404; 20 deployment traces, zero private references or copied source assets | `interactions-production-isolation.json` |
| Full extraction rebuild | PASS: 218 source inputs; decoded bundle equals the running private bundle | `interactions-extraction-rebuild.log`, `interactions-extraction-rebuild.json` |
| Source invariants | PASS: all 5 maps retain original words, dimensions, object/warp/background events; upstream clean at pin | `interactions-source-invariants.json` |
| Artifact preservation | PASS: 325 originals verified; 253 regenerated tracked captures preserved privately, then restored byte-for-byte | `interactions-artifact-preservation.json` |

All twenty private browser cases pass across the combined run and corrected single-case rerun. This includes the diagnostic harness, actual-root challenger/battle/return integration, four keyboard/touch interaction cases and the touch NPC case. It is not a claim of one uninterrupted green twenty-case run.

Pre-existing failures remain exactly identified:

1. `tests/ui/p11-production.spec.tsx:108`: victory-audio resume expects offsets `(0,5)`, receives `(0,0)`. Documented in the preceding integration report; unchanged by this task.
2. `tests/e2e/portfolio-menus.spec.ts:66`: full P7 touch-path timeout at 180 seconds, inside its A-confirm driver. Previously documented; new source-world touch NPC/sign/menu tests pass.
3. `tests/e2e/release-entry.spec.ts:74`: legacy production LOS path fails the greeting-text assertion at line 39. Previously documented; the source-world actual-root battle path passes.
4. Repository lint: `debug-audio.js:1` uses a forbidden require import. Existing warnings remain in resume, skills and content-completion tests.

The 28 unit skips are opt-in private-data groups, covered explicitly by the source test command where applicable. The complete ordinary suite is therefore **not green**. No existing assertion was removed or weakened. The only corrected assertion belonged to this task's new touch test and now targets the already-existing semantic Bag region.

Runtime tests cover all eight actors/twenty background events, actual source condition branches, gender substitutions, first/repeat flags, counter-only reach, invalid facing/elevation/blocked targets, moving-actor completion, single ownership, source pages, TVs/manual, cancellation, input release and movement. Browser tests use actual source identities and walk through every implemented map; the retained integration cases also verify the special challenger's first/repeat battle flow, Route101, all three interiors and exact return.


Existing assertions were preserved. Intermediate browser iterations included test-navigation races and a source-edit/HMR interruption; those are not final acceptance runs. Final evidence is from runs without source edits. The browser tests walk through normal `/` gameplay, source doors and Route101 connections, rather than teleporting the player or using `/dev/emerald` as the gameplay entry.

## Screenshots

All captures below are actual normal-game states with source-state/viewport sidecars in the same folder. Desktop captures are 960×640 CSS, DPR1, integer scale4; touch captures are 400×800 CSS, DPR1, with the exact scale in their sidecars.

- [Ordinary Twin](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-obj_event_gfx_twin.png)
- [Town sign](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-town-sign.png)
- [Mom](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-obj_event_gfx_mom.png)
- [Lab machine](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-lab-machine.png)
- [Lab PC](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-lab-pc.png)
- [Route101 sign](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-route-sign.png)
- [Player-house TV](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-LittlerootTown_BrendansHouse_1F-tv.png)
- [Running-shoes manual](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-running-shoes-manual.png)
- [Touch sign](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-touch-sign.png)
- [Touch NPC](/home/menma/Downloads/Portfolio/artifacts/emerald-source/phase-p0-interactions/screenshots/interaction-touch-npc.png)

Inspected the rendered Twin, town sign, lab machine and touch-NPC captures: source characters remain distinct, the NPC turns to the player, original text is readable through the existing two-line window, and pixel edges remain crisp. Later pages use the existing advance cursor; long source text is not squeezed into a smaller font.

## Unsupported conditional behavior

At the selected checkpoint all eight ordinary NPCs, twenty background events, both TVs and the manual respond. Later-story branches are explicitly bounded, not represented as a complete VM:

- TV Lati news eventually calls `InitRoamer`; roaming-Pokémon/story behavior is unsupported and reports its exact source command. Normal checkpoint TV branches work.
- Broadcast-TV save/show machinery, Pokédex rating specials, item gifting/inventory, starter selection, Match Call screens and other inactive story/minigame commands are not implemented by this interaction subset. Activating their source conditions fails visibly and releases input; commands are never silently filtered by extraction.
- Source `MUS_HEAL`/registration fanfares are not available in the current audio driver. The rest dialogue/fade/state works; missing audio is recorded in `sourceState.interaction.effects`. No Pokémon HP was invented for portfolio projects.

No P1 visual work, new framework/dependency, world re-layout, portfolio content change or battle reducer change was made.

## Files changed

- `src/core/emerald/interactions.ts` — new pure resolver and bounded source command interpreter.
- `src/core/emerald/{types,world}.ts` — interaction contracts, isolated checkpoint state, diagnostics and source rest/TV presentation state.
- `src/runtime/world/{EmeraldWorldSession,WorldSessionContract}.ts` — one source interaction owner, shared-Clock effects, cancellation and release.
- `src/runtime/Orchestrator.ts` — source dialogue dispatch and encounter/input ownership guards.
- `src/app/GameShell.tsx` — existing dialogue B cancellation wiring.
- `src/ui/kit/text.ts` — explicit source page boundaries through existing pagination.
- `tools/emerald-reconstruction/{extract_interactions,extract,finalize_manifest}.py` — private deterministic source compiler, verified checkpoint flag and provenance coverage.
- `tools/emerald-reconstruction/{playwright.config.ts,README.md}` and `package.json` — test discovery, reproducible commands and supported scope.
- `tests/emerald-reconstruction/{interactions.test.ts,interactions.e2e.ts,test_extract_interactions.py}` — source/runtime/browser regressions and extraction hash-seed determinism.
- `docs/EMERALD-SOURCE-INTERACTIONS-REPORT.md` and `docs/EMERALD-LITTLEROOT-INTEGRATION-REPORT.md` — current report and historical-report pointer.

Private generated bundle, provenance, rebuild diagnostics, logs, screenshots and sidecars are ignored in the existing `artifacts/emerald-source/` folder. No source text or extracted assets were added to tracked application data or `public/`.


## Reproduction commands used

```sh
pnpm emerald:test
pnpm exec playwright test --config tools/emerald-reconstruction/playwright.config.ts
pnpm exec playwright test --config tools/emerald-reconstruction/playwright.config.ts interactions.e2e.ts --grep 'touch NPC'
pnpm exec playwright test --workers=2
pnpm test --maxWorkers=1
pnpm typecheck
pnpm lint
pnpm check:deps
pnpm build
pnpm emerald:extract --out-dir artifacts/emerald-source/interactions-rebuild-check
```

Changed-file ESLint was also run explicitly against the modified TypeScript modules/tests. Production privacy was checked with real HTTP responses, `.nft.json` deployment traces and source-asset path scanning. The final extractor includes a cross-process hash-seed determinism test. Decoded rebuilt data equals the existing runtime bundle; JSON key order differs from the earlier incremental output without changing data.

## Run

```sh
cd /home/menma/Downloads/Portfolio
export PATH=/home/menma/.nvm/versions/node/v22.23.3/bin:$PATH
pnpm game:local
```

Open http://127.0.0.1:3101/. Approach an ordinary NPC/sign/object and press Enter/A. Use Enter/A for pages and Backspace/B to close. `pnpm emerald:extract` regenerates the private interaction data on a fresh checkout with the pinned upstream present. Legacy fallback remains `/?world=legacy`; `/dev/emerald` remains the diagnostic harness.

No commit or push performed for this task.


### Original PokéFolio NPC dialogue follow-up

Normal local gameplay now uses eight original authored NPC Easter-egg overrides from
`src/content/world/npc-easter-eggs.json`. Source scripts and effects remain unchanged;
Mom retains her post-rest message and the Route 101 challenger is excluded.
The canonical private report includes locations, first/repeat pages, source diagnostics,
64 focused source/unit test results, four browser checks and screenshots:
[Updated P0 report](../artifacts/emerald-source/phase-p0-interactions/REPORT.md).
