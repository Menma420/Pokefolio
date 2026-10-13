# Product architecture correction

Emerald is now the default product runtime in development **and production**.
The development-only diagnostic harness remains `/dev/emerald`; the normal game
uses `/api/game-assets/*`. Production requires separately authorized asset
delivery and never silently selects the old world when those assets are absent.
See [product asset delivery](../../docs/EMERALD-PRODUCT-ASSET-DELIVERY.md) for the
offline release packager, deployment configuration and private production tests.
The earlier local-only reconstruction notes below describe the diagnostic and
extraction history; they no longer define production runtime selection.

---

# Private source-driven Littleroot slice

This is a working local reconstruction increment, **not an exact Emerald release**.
Pinned upstream: `pret/pokeemerald` commit
`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.
The normal root game uses this same source world in every environment.
Production asset delivery is configured separately; portfolio content is shared.

## Reproduce

From the PokéFolio repository, with its existing Node/pnpm dependencies:

```sh
pnpm emerald:extract
pnpm emerald:test
pnpm game:local
```

Open **http://127.0.0.1:3101/** for normal title → intro → source-world gameplay.
`/dev/emerald` remains a separate diagnostic/reference harness. To compare the
old world, open `/?world=legacy`, or launch with `POKEFOLIO_WORLD=legacy pnpm game:local`.
Arrow keys walk; X opens the existing
portfolio menu; Y opens Bag. Walking north toward a source entrance starts its
warp without A. At an interior exit arrow, press south to return. The destination
is the actual source warp index; exiting an exterior door then walks south.

Walk north out of Littleroot into Route 101. The original blue-hat Youngster
at `(16,8)` is bound to PokéFolio's challenger role by source object event 1,
graphics ID and script, without replacing the player or relocating any event.
His source trainer type is NONE: the interview is a PokéFolio-specific adapter,
not a claim about the Emerald script. The existing LOS evaluator detects the
first encounter within three tiles; subsequent encounters use adjacent A.
Audience, VS, battle, question trees, Party and exact return use the existing
orchestrators. Only `EmeraldWorld` simulates movement; the runtime session
projects a read-only snapshot for the shared encounter/UI interfaces.

The read-only upstream checkout defaults to `./pokeemerald`. The extractor refuses
any other commit or dirty checkout. To override paths:

```sh
python3 tools/emerald-reconstruction/run.py extract --repo /path/to/pokeemerald --out-dir artifacts/emerald-source
```

Python must have Pillow. The wrapper uses the existing bundled Codex runtime when
available, or `EMERALD_PYTHON`, then the current Python. It installs nothing. GCC
is used for isolated host harnesses containing upstream conversion/draw/camera
functions. The upstream repository is never modified.

Browser tests and native pixel checks:

```sh
pnpm emerald:e2e
$EMERALD_PYTHON tools/emerald-reconstruction/reference_frame.py
$EMERALD_PYTHON tools/emerald-reconstruction/compare_frames.py --actual artifacts/emerald-source/screenshots/town-1x-native.png --reference artifacts/emerald-source/screenshots/independent-native.png --out artifacts/emerald-source/screenshots/independent-diff --kind independent-renderer --state artifacts/emerald-source/screenshots/town-1x.state.json
$EMERALD_PYTHON tools/emerald-reconstruction/verify_captures.py
$EMERALD_PYTHON tools/emerald-reconstruction/verify_determinism.py
$EMERALD_PYTHON tools/emerald-reconstruction/finalize_manifest.py
```

Set `EMERALD_PYTHON` to your existing Pillow-enabled Python for those commands.
Capture queries accept a source map name and valid `x`/`y`. `?paused=1` holds the
initial logical frame for deterministic inspection. Tests require local extracted
data explicitly; `pnpm emerald:test` fails if it is absent. Normal public tests
skip the private-data group and still run synthetic renderer tests.

## Source interactions

In normal local gameplay, face an adjacent NPC/sign/furniture target and press
Enter/A. Source object events, background events and metatile behavior share one
resolver; the source script selects the original text and required flag/variable
branch. Enter/A reveals/advances pages; Backspace/B cancels and releases movement.
The current checkpoint supports all eight ordinary NPCs, twenty background events,
both TVs and the running-shoes manual. The Route101 Youngster remains the separate
portfolio challenger adapter. No ordinary actor is turned into a trainer.

`pnpm emerald:extract` also compiles reachable interaction programs/texts from the
pinned source into the ignored bundle. Unknown active commands are reported with
source file/label, never filtered out. This is a bounded interaction subset, not
a full story VM; later TV/news, item/Pokédex/Match Call branches remain explicit
limitations. The declared completed-intro checkpoint includes `FLAG_SYS_TV_HOME`,
matching its source initialization. Source Pokémon healing/fanfares have explicit
diagnostics because the portfolio has neither Pokémon HP nor a source audio driver.
See [the interaction report](../../docs/EMERALD-SOURCE-INTERACTIONS-REPORT.md) for
identities, tests, screenshots and exact unsupported scope.

## Scope and provenance

Five source maps are decoded: Littleroot (20×20), Route 101 (20×20), both houses'
first floors (11×9), and Birch's Lab (13×13). Five tilesets and ten visible actor
graphics are extracted. `bundle.json` contains indexed data, palette RGB555 words,
metatile entries/attributes, original map words, source events/scripts/connections,
actor animation commands and the explicit diagnostic state. The selected ON_LOAD
metatile subset is interpreted from source scripts; it places the running-shoes
manual in the male player house. Raw map words remain unchanged. The runtime composes
three scrolling BG ring buffers and objects; it never displays the preview PNG as
a map background.

`manifest.json` records source paths, commit, SHA256, transformations, toolchain
hashes and output hashes. CSV grids, BG planes, layer-type overlays, used-metatile
atlases, tile/palette previews and a full-map preview are alongside each map.
`validation.json`, `gbagfx-checks.json` and `camera-oracle.json` contain executed
source-function checks. Each browser screenshot has a frame-state sidecar;
scale captures also have viewport CSS/DPR/scale sidecars.

All extracted original assets, previews and captures live only in ignored
`artifacts/emerald-source/`. They are never copied into `public/`, imported into
source modules, or committed. Next's output tracing explicitly excludes them.
Both page/data routes require development mode plus `EMERALD_LOCAL=1`; the data
handler also requires a loopback hostname. The launch command binds loopback.
The opted-in server uses ignored `.next-emerald-local/` so production builds and
local hot-reload manifests cannot overwrite one another. Production returns 404
even if the environment variable is set. Local webpack
development needs `unsafe-eval` for source maps; that CSP exception is enabled
only for this opted-in development server, never production.
The local webpack watcher also excludes the separate cache, private extraction
outputs and upstream checkout. Otherwise the filesystem context dependency could
watch Next's own generated manifests and repeatedly reload the live scene.

## Fidelity levels and continuation point

Proven by executed checks: original map words and dimensions; upstream 4bpp
conversion/roundtrip; source DrawMetatile BG entries; camera arithmetic over
204 frames; actual browser output against an independent compositor at one
native state; physical nearest-neighbor scaling and palette preservation.

The current named state is **LT-04-FREE**, a declared male, post-running-shoes
exploration diagnostic. It is not a replayed save or a claim that LT-00–LT-04
story scripts ran. Its flags derive from new-game initialization with explicit
visibility/progress overrides. Source event coordinates/scripts remain intact.
NPC wandering uses source direction order, ranges, delays and RNG, with adapter
task scheduling. Walk poses/flip commands and 16-frame normal steps are sourced.

Still unproven/unimplemented: full script VM beyond the selected ON_LOAD/interaction subsets and LT-00–LT-04 cutscenes, source
door graphic/task-cycle timing, turn-in-place timing, exact OAM allocation and
field-effect/shadow scheduling, weather/palette fade lifecycle, second-floor
warps, Route101→Oldale and ledge jumps. Unsupported interior destinations are
reported and never rewritten to invented destinations. No exact gameplay or
all-checkpoint PASS is claimed.

The authentic frame oracle is blocked: a source build in a temporary Git archive
copy failed at missing `png.h`/libpng development files. ARM assembler/linker and
agbcc are also absent. mGBA is installed but no source-built Emerald ROM/save/
capture exists. No ROM was downloaded. See `source-build-attempt.log`.

Next exactness step: provision the documented source build prerequisites in a
separate build directory, build the pinned source, replay and record LT-04/LT-05/
LT-06/LT-07 states, then compare using `--kind authentic-emulator`. Such manifests
must also contain emulator identity and ROM SHA256. The comparison writes an
exact pixel count and a magenta mismatch PNG; it rejects non-native dimensions.
After this gate, port the missing script/transition task subset and LT-00–LT-03.

### Original PokéFolio NPC dialogue profile

Normal local gameplay replaces only the eight ordinary NPCs' displayed messages
with [`src/content/world/npc-easter-eggs.json`](../../src/content/world/npc-easter-eggs.json).
These are original PokéFolio-authored Easter eggs, not Emerald source dialogue.
The interpreter supplies each executed source text label to its host; the runtime
adapter verifies map/event/graphic/script identity and substitutes authored pages.
Source programs, flags, effects and extracted strings remain unchanged. Mom's
`TakeCareHoney` message uses the post-rest slot, including on repeat visits.
First/repeat history is local to the world session, survives map changes, and is
recorded only after successful completion. The Route 101 challenger is excluded.

`pnpm emerald:test` includes the override regressions. Regenerate the private NPC
location/source/displayed-dialogue catalogue with:

```sh
node --import tsx tools/emerald-reconstruction/write_npc_catalogue.mjs
```

The report and screenshots remain in the existing
`artifacts/emerald-source/phase-p0-interactions/` folder.
