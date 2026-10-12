# Private Emerald UI reconstruction

This adapter reconstructs the field Start Menu, field Bag, and normal battle
message/action/move-window family. It is available only with the existing local
source-world profile. Production and `/?world=legacy` retain the approved
PokéFolio presentation. No source graphics are bundled into application code.

## Rebuild and run

From the repository root, after the existing world extraction:

```sh
pnpm emerald:extract-ui
pnpm game:local
```

Open `http://127.0.0.1:3101/`. X opens the Player Menu; Y opens Bag. The Route 101
challenger opens the existing interview pipeline. `/dev/emerald` remains the
world diagnostic harness. The UI extractor requires the exact clean upstream
revision recorded in `artifacts/emerald-source/manifest.json` and
`tools/emerald-reconstruction/source-pin.json`.

The Python launcher selects the existing Pillow-capable runtime. GCC compiles
isolated host-side conversion oracles from the pinned upstream C source; it
does not build or modify the upstream repository.

## Source authority

| Surface | Source rules | Source assets |
| --- | --- | --- |
| Start | `src/start_menu.c`, `src/menu.c`, `src/text_window.c`, `src/text.c`, `src/fonts.c` | `graphics/text_window/1.png`, `message_box.png`, `graphics/fonts/latin_normal.png`, `latin_narrow.png` |
| Bag | `src/item_menu.c`, `src/item_menu_icons.c`, `src/list_menu.c` | `graphics/bag/menu.png`, `menu.bin`, `menu_male.pal`, `bag_male.png`, `bag.pal`, `graphics/interface/scroll_indicator.png`, `red.pal` |
| Battle | `src/battle_bg.c`, `src/battle_controller_player.c`, `src/battle_message.c`, `src/battle_main.c` | `graphics/battle_interface/textbox.png`, `textbox_map.bin`, `textbox_0.pal`, `textbox_1.pal`, `text.pal`, `graphics/fonts/down_arrow.png` |

The manifest also hashes the audited headers, graphics declarations, charmap,
font converter and build rules. It records each input SHA256, output SHA256,
conversion and command. Asset decoding uses original indexed tiles, little-endian
tilemap words, H/V flips and RGB555 palette banks. Font pixels and advances come
from the original sheets and width tables, verified against the upstream Latin
font packer. No browser font renders visible source-profile text on these screens.

`LoadBattleMenuWindowGfx` is significant: after loading the textbox, it replaces
both nine-tile frame banks at tile offsets `0x12` and `0x22`, replaces BG palette
1 with the selected user frame palette, and loads the text palette into BG bank
5. The extractor applies these writes; rendering only the unmodified textbox PNG
would give the wrong runtime frames/palette. Cursor calls pass `0x11` to
`CopyToBgTilemapBufferRect_ChangePalette`: `bg.c` treats this as **preserve the
source word**, not palette bank 1. Cursor words 1/2 therefore use BG bank 0.
Battle text selects `down_arrow_alt.png`; Bag uses the ordinary down arrow and
standard menu palette. Escaped apostrophes in `charmap.txt` are decoded to the
original B4 glyph, with the same advance as the typographic apostrophe.

## Geometry and portfolio adaptations

* Start: inner rectangle `(176,8,56,128)`, outer frame `(168,0,72,144)`,
  text `(8,9)` relative to the window, 16px row pitch; source cursor glyph.
  Seven owner-locked entries remain in order. EXPERIENCE alone uses the original
  narrow font and a 7px inset to fit its 49px ink within the original window.
  Other rows use the original normal font and 8px inset. Up/down wrap.
* Bag: source field templates: list `(112,16,120,128)`, description
  `(0,104,112,48)`, pocket name `(32,8,64,16)`, message `(16,120,216,32)`.
  Four configured portfolio pockets replace five inventory categories. Existing
  portfolio item icons remain; no invented Pokémon items are added. Long
  descriptions page three lines at a time through the shared Clock. Pocket
  changes reproduce `DrawItemListBgRow`'s 16-row tile-11/tile-17 wipe, the
  128px pocket-name buffer's one-tile slice movement every other frame, and the
  closed bag sprite's `y2=-5..0` sequence. Scroll arrows use the source Q8.8
  sine table, amplitude 2 and frequency ±8; reduced motion suppresses these
  presentation animations. A retains
  immediate safe-open/document behavior, B retains the logical screen stack.
  Source secondary message frames display unavailable/open notices and documents;
  no new inventory USE/CANCEL action layer is invented.
* Battle: source tilemap pages selected by BG offsets 0/160/320. Message
  `(16,120,208,32)`; action prompt `(8,120,112,32)`; commands
  `(136,120,96,32)`, text columns 136/192, rows 121/137. Command cursor columns
  128/184. Topic cells use original move columns 16/88, rows 121/137, cursor
  columns 8/80. The former PP/type pane shows the selected topic's full label
  in two-line Clock-driven pages. Long labels receive whole-glyph ellipses in
  cells. Accessible labels retain full questions. Additional topics page in
  groups of four; battle reducer, question trees and B/back semantics are intact.

All visible pixels use the existing physical-pixel raster presentation. Native
coordinates are integers; scaling repeats each pixel into an integer block.
Semantic HTML and live-region text remain alongside aria-hidden raster surfaces.

## Privacy

Outputs are under ignored `artifacts/emerald-source/ui/`; phase evidence lives
in `artifacts/emerald-source/phase-p1-ui/` (P1) and
`artifacts/emerald-source/phase-p1-2-ui/` (P1.2). `/dev/emerald/ui` requires
development mode, `EMERALD_LOCAL=1`, and a loopback host, matching the existing
world-data endpoint. Other hosts and production return 404. Existing Next output
tracing exclusions cover private assets. Do not move these assets into `public/`,
commit them, or publish the screenshots/source previews.

## Verification and fidelity limits

```sh
pnpm emerald:test
EMERALD_TEST_SOURCE=1 pnpm exec vitest run tests/emerald-reconstruction
EMERALD_EVIDENCE_DIR=artifacts/emerald-source/phase-p1-ui/regression pnpm emerald:e2e
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

The UI browser suite walks the actual normal root into the challenger/battle,
captures 1×/3×/4× screens with state sidecars, checks keyboard/touch return paths
and axe, and compares screenshot pixels with the physical raster at DPR 1/2/3
and scales 1–8. Those comparisons prove browser fidelity to the raster, not
fidelity to an authentic emulator frame.

The native source previews and before/after differences are reconstruction
diagnostics. An authentic full-screen oracle remains unavailable: the recorded
source build failed on missing libpng development headers; ARM tools/agbcc and a
source-built ROM/save capture are absent. Do not call a same-renderer comparison
an authentic zero-difference result. The Bag's affine item-selection shake and
rotating-ball effect are not implemented. Exact task-cycle/affine-OAM parity and
full-screen pixel acceptance remain open; they require the separate
source-build/emulator gate rather than guessed BIOS-affine sampling.

## P1.2 portfolio menu reconstruction

The same bundle now includes optional `portfolio` data for the remaining local
menu screens. Rebuild with the same `pnpm emerald:extract-ui` command. There is
no second renderer or asset endpoint. Old bundles without this extension retain
the previous presentation; newly extracted local bundles select the source
presentation. Production remains unchanged.

| PokéFolio state | Source counterpart / adaptation |
| --- | --- |
| Skill list/category | `pokedex.c` LoadPokedexListPage: `menu.png`, `list_underlay.bin`, `list.bin`, Hoenn palette; centered 16px rows and foreground mask |
| Skill detail / related projects | Task_LoadInfoScreen / PrintMonInfo: `info_screen.bin`; emblem replaces Pokémon picture, type replaces category, related projects replace measurements |
| Project catalogue / details / tech / links | Same Pokédex list/info grammar, explicitly a portfolio adaptation; existing project emblems and verified content retained |
| Experience list | `option_menu.c` source frame/list templates, company/period rows; a portfolio record catalogue, not an original Emerald work-history screen |
| Experience detail / section | Pokédex info/description page; real company/role/period and original portfolio record icon |
| Trainer Card | `trainer_card.c` Hoenn non-link front: `tiles.png`, `bg.bin`, `front.bin`, `green.pal`, actual 30x20 tilemaps; original portfolio portrait in source portrait region |
| Options | `option_menu.c` header (16,8,208,16), list (16,40,208,112), 16px row pitch, values at window X104, WIN0 selected row, BLDY4 RGB555 truncation |
| Controls | Options frame with original small-font reading text; no invented settings |
| Exit confirmation | `menu.c` sYesNo_WindowTemplates (168,72,40,32), source normal font/cursor and standard frame |
| Project Party | `party_menu.c` / `data/party_menu.h` single layout: one 80x56 slot at (8,24), five 144x24 slots at X96 / Y8,32,56,80,104; original no-HP slot bitmaps and selection palette writes |
| Battle project summary | Pokédex info identity region plus existing P1 battle message/summary behavior |

The real Pokémon-only fields/actions (caught/seen counts, dex numbers, height,
weight, footprints, AREA/CRY/SIZE, trainer ID, money, playtime, badges, HP/levels)
are omitted rather than fabricated. Trainer Card BADGES/numbered wells are baked
into the front tilemap: that region reuses the exact source interior stripe tile.
No source graphics are approximated with CSS. Existing project/skill emblems and
Uttkarsh portrait remain original portfolio art; they are content substitutions,
not claims that the portfolio itself exists in Emerald.

`SourcePortfolio.tsx` consumes the same selectors as the existing screens. Pure
`portfolioUi.ts` renders indexed BGs/text/palette effects; UI components supply
semantic buttons/descriptions. PlayerMenu remains the sole navigation owner.
PartyScreen retains its input/confirmation/project-switch owner. No reducer,
WorldSim, map, actor, interaction, audio, content, route or input-contract changes.
Pokédex list scroll uses source 16px integer steps and source 8/4/2/1-frame timing
through the shared Clock; arrows use the source sine/64 truncation. Reduced
motion suppresses presentation movement. Portfolio input restrictions remain
unchanged, so this is not a cycle-exact reproduction of the original task engine.

Additional conversion rules: multi-bank Trainer Card/Party PNG indices encode
palette hints in high bits; 4bpp conversion masks with 15, verified by upstream C.
Palettes retain all banks. Party slot files are byte tile indices, not u16 maps.
Original `FONT_SMALL` glyphs/advances are now independently font.c-verified too.

P1.2 evidence lives in one ignored folder:
`artifacts/emerald-source/phase-p1-2-ui/`. `menus.e2e.ts` captures normal-root
keyboard/touch paths, detail/selection states, axe and 1x/3x/4x evidence. Set
`EMERALD_UI_EVIDENCE_DIR` when running older P1 UI tests to redirect their evidence
without overwriting the accepted P1 report. This does not change assertions.
The authentic-emulator/full-screen oracle and pre-existing P1 affine/task-cycle
gaps documented above remain open; reconstructed screenshots are not golden ROM
frames. No external assets or dependencies are introduced.

## P1.3 player identity assets

The private UI bundle now also carries original Emerald Brendan (not RS Brendan):
`graphics/trainers/front_pics/brendan.png` (64×64),
`graphics/trainers/back_pics/brendan.png` (64×256, four 64×64 frames), and
`graphics/trainers/palettes/brendan.pal`. Both PNGs pass the same independent
upstream C 4bpp converter checks as the UI tiles. Manifest hashes include the
front/back tables and animation declarations, `src/data.c`, `src/pokemon.c`,
`src/trainer_pokemon_sprites.c`, and the controller/card sources.

The Trainer Card blits the front image at its actual `(152,40)` source window
plus Hoenn male `(1,0)` offset. The VS player identity uses the same original
front graphic: Emerald has no equivalent portfolio VS screen, so this is an
explicit adaptation. Its sprite alone sits eight pixels above the old portrait
anchor to keep Brendan's shoes clear of the unchanged name row. Audience
portraits remain untouched. The back image uses source idle frame **3**,
verified from `sBackAnims_Brendan` and `sAnim_GeneralFrame3`; throw frame durations
are retained as provenance, without replacing existing battle choreography.
Its 32×32 center anchor translates to the existing 64×64 visitor slot; battle
positions, visibility and timing remain owned by the existing bridge/Clock.
The local standalone battle diagnostic uses the same private player data.

Source-profile startup requires the new extraction and fails with an actionable
rebuild message if it is missing. Production and the intentional `world=legacy`
fallback retain their non-source artwork; original Brendan is never copied into
public build assets. The intro host/opponent Uttkarsh art is a separate identity,
as are Recruiter/Engineer/Friend portraits, NPCs and project emblems.

P1.3 evidence and the complete retained/replaced inventory live together in the
ignored `artifacts/emerald-source/phase-p1-3-avatar/` folder. Reproduce with:

```sh
pnpm emerald:extract-ui
EMERALD_TEST_SOURCE=1 pnpm exec vitest run tests/emerald-reconstruction
EMERALD_TEST_SOURCE=1 python3 tools/emerald-reconstruction/run.py test
pnpm exec playwright test --config tools/emerald-reconstruction/playwright.config.ts avatars.e2e.ts
```

The tests compare all front/back source indices and RGB555 palette entries,
rendered opaque sprite pixels at 1×/3×/4× in actual gameplay for every audience,
and portrait screenshots at DPR 1/2/3 × native integer scales 1 through 8.
These are asset/slot proofs, not authentic-emulator full-screen equality.

### P1.4 opening and remaining windows

`pnpm emerald:extract-ui` now also reads `src/main_menu.c` and
`src/field_effect.c` to extract the actual `sSpriteTemplate_NewGameBirch` single
64×64 frame (`graphics/birch_speech/birch.png`), its embedded palette, shadow
BG tiles/map and bg0/bg1/bg2 palettes. The welcome snapshot is centered at
(136,60), top-left (104,28), with FadePlatformOut's settled palette index 0.
The source dialogue template is (2,15,27,4) tiles: (16,120,216,32).
PokéFolio retains its own title/intro timing and all three original narration
lines; it does not add Emerald's Lotad, gender/name selection or 216-frame delay.
The welcome `Welcome to the world of Uttkarsh.` is prepended; the original
`Here, you play as Uttkarsh.` line is retained immediately after it.

`openingUi.ts` paints the original intro and message window. Audience selection
is an explicitly adapted `script_menu.c` standard-frame/PrintMenuTable screen:
16px rows, source arrow glyph, source field text palette, existing portraits and
labels. VS retains its art/timing and uses the same source standard outer frame
for the portfolio nameplate, and the source field message family below it.
Production/legacy mode has no extracted assets; its original background and
original UI remain, but the old custom intro character is no longer rendered.

The battle red/teal message and purple command frame are **verified source
colors**, not stale custom CSS. `textbox_0.pal` contains the message colors;
`LoadBattleMenuWindowGfx` in `src/battle_bg.c:744` loads user frame option 0
(`graphics/text_window/1.png`) into 0x12/0x22 and palette bank 1. These accepted
P1 render rules remain unchanged. The P1.4 request explicitly permits colors
verified for the corresponding source context.

Evidence: `artifacts/emerald-source/phase-p1-4-ui/`. Run:

```sh
EMERALD_TEST_SOURCE=1 pnpm exec vitest run tests/emerald-reconstruction/opening-ui.test.tsx
pnpm exec playwright test --config tools/emerald-reconstruction/playwright.config.ts opening-ui.e2e.ts
EMERALD_TEST_SOURCE=1 python3 tools/emerald-reconstruction/run.py test
```

Python compares decoded indices against the original PNG and actual browser
Birch pixels against that independent source image at 1×/3×/4×. Full-screen
emulator equality remains unproven without an authentic independent reference.
All extracted assets remain ignored and served only by development/loopback
endpoints, with production tracing exclusions unchanged.

## P1.5 opposing trainer

The private UI extraction additionally provides `opponent.front`: original Emerald
`TRAINER_PIC_STEVEN` (81), from `graphics/trainers/front_pics/steven.png`. Both
`gTrainerFrontPic_Steven` and `gTrainerPalette_Steven` reference that indexed PNG
in `src/data/graphics/trainers.h`. The front picture table selects one 64×64
frame; `sAnims_Steven` selects `sAnim_GeneralFrame0` (frame 0, duration 0, END).
The source coordinate record is size 8, y_offset 1.

`trainerSpriteImage` retains all indexed pixels, RGB555 colors and index-zero
transparency. Its existing `playerSpriteImage` API remains compatible. Normal
local gameplay and the standalone battle diagnostic preload Steven into the
existing opponent texture key, without changing its 64×64 slot, position or
choreography. VS uses that same frame at the existing opponent coordinates.
The owner-requested follow-up also uses this same Steven front in the audience
choice portrait slot (16,35), preserving all three perspective choices. Brendan,
the Route 101 Youngster, the audience portrait registry and project art remain
unchanged. PokéFolio's accepted composition/timing remains an adaptation,
not an authentic Emerald full-screen reference.

Run `pnpm emerald:extract-ui`, then `pnpm game:local`. Evidence and the complete
replacement inventory are in `artifacts/emerald-source/phase-p1-5-opponent/`.
No source asset is imported by application modules or copied into public assets.
Production retains the existing original PokéFolio fallback, and the private
source endpoints still return 404.
