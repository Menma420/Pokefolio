# Source-informed music (private/local)

## P1.8 supplied recordings / reduced scope

The actual new files are `1-03 Title Theme.mp3`,
`1-10 Professor Birch's Laboratory.mp3`, and `1-11. Route 101 - 103.mp3`.
Their ID3 titles confirm Title Theme, Professor Birch's Laboratory and Route 101.
They are preserved byte-for-byte in the ignored `audio/imports/` directory.
**There is no supplied MUS_ROUTE122 introduction recording in the rescanned tree.**
Title Theme must not be mislabelled as Birch's introduction.

Run `pnpm emerald:import-audio` after updating the explicit `audio/imports.json`.
The importer validates embedded text tags using the ID3v2.3/v2.4 size rules,
records metadata/provenance/hash, and deterministically generates the runtime manifest.
The manifest's `notRequired` / `scopeReason` fields distinguish excluded recordings
from missing required recordings. Recognition (`MUS_ENCOUNTER_MALE`) and Steven's
battle (`MUS_VS_RIVAL`) are scoped out of the recording requirement; their semantic
requests remain intact and silence is explicit, with no generic-music substitution.
The three champion catalogue entries are also unused by this product flow.

Littleroot and both houses, lab, Route 101, Title, generic trainer and inactive
trainer-victory recordings now decode locally. GameShell attempts audio startup
on mount, allowing title BGM without input when the browser permits audible
autoplay. If blocked, the first keyboard/pointer gesture retries without requiring
Start, so an arrow can leave title music playing while idle. Confirmation still
enters the existing opening flow. Saved music mute is respected in both cases.
No new conversion pipeline is needed or built for these recordings.

Current evidence is in the single `artifacts/emerald-source/phase-p1-8-audio/`
folder. The P1.7 evidence below is historical. Whole-recording repeat is verified
through two rendered buffer cycles; this does **not** prove seamless musical loops
or authentic GBA mixer parity. Custom recording loop timestamps remain null.

## P1.7 source audit and baseline

Pinned source: `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.
No browser scraping, downloading, generic SoundFont, or fabricated source song.

## Commands

```sh
pnpm emerald:import-audio
pnpm emerald:audit-audio
pnpm game:local
# http://127.0.0.1:3101/
EMERALD_TEST_SOURCE=1 pnpm exec vitest run tests/emerald-reconstruction/music.test.ts
pnpm exec playwright test --config tools/emerald-reconstruction/playwright.config.ts music.e2e.ts
```

The importer requires the existing extracted world bundle and pinned checkout.
The audit builds upstream `mid2agb` and `wav2agb` with the existing host `g++`,
without modifying upstream or installing packages. It converts all 12 catalogued
MIDI sequences using **the original midi.cfg options**, traverses original voicegroups,
converts referenced samples with original tuning/loop metadata, and retains the
original programmable-wave data. Every input/output is hashed in
`artifacts/emerald-source/audio/source/audit.json`.
This is M4A sequence/sample conversion, **not PCM audio rendering**.

## Explicit local imports

Put supplied recordings directly in ignored `artifacts/emerald-source/audio/imports/`.
Edit `artifacts/emerald-source/audio/imports.json` to map each exact filename to its
semantic source ID and exact catalogued title. Record original provenance.
Run the importer again and refresh the local game session. It refuses path traversal, incorrect title mappings,
wrong source revisions, malformed containers and undocumented loop intervals.
It does not guess filenames or silently substitute other songs.

For documented/verified recording loop points, set:

```json
{"loop":{"start":0.0,"end":42.0,"evidence":"replace with actual measured/verified evidence"}}
```

Those numbers are illustrative **and are not the loop points of any track**.
Leave `loop: null` until a real interval is validated. The runtime validates the
interval against decoded duration before starting playback. Whole-file repeat
is explicitly labelled unverified, including the album fade-out gap risk.
Source MIDI loop ticks are not automatically MP3 timestamps.

The product runtime fetches `/api/game-assets/music` once per session, and present
tracks resolve to `/api/game-assets/MUS_*`. Development reads the ignored local
imports; production requires separately authorized release delivery. See
[product asset delivery](../../docs/EMERALD-PRODUCT-ASSET-DELIVERY.md).
The old `/dev/emerald/audio?track=MUS_*` endpoint remains diagnostic-only, requiring
development, `EMERALD_LOCAL=1` and loopback; it still returns 404 in production.
Both product and diagnostic routes exclude the private tree from deployment traces.

## State mapping / verified corrections

| Actual state | Source ID | Evidence |
|---|---|---|
| Title active | MUS_TITLE (413) | title_screen.c m4aSongNumStart; original Start uses FadeOutBGM(4) |
| Birch speech | MUS_ROUTE122 (374) | main_menu.c Task_NewGameBirchSpeech_Init |
| Littleroot / both implemented houses | MUS_LITTLEROOT (405) | each map.json music field |
| Lab | MUS_BIRCH_LAB (383) | lab map.json |
| Route101 | MUS_ROUTE101 (359) | Route101 map.json |
| Youngster recognition through audience/VS | MUS_ENCOUNTER_MALE (380) | battle_setup.c PlayTrainerEncounterMusic; **Pokefolio adaptation**, source actor is not a trainer |
| Steven presentation battle | MUS_VS_RIVAL (481) | trainers.h TRAINER_STEVEN class RIVAL; pokemon.c GetBattleBGM |
| Explicit generic trainer | MUS_VS_TRAINER (476) | pokemon.c GetBattleBGM default trainer class |
| Ordinary EXIT | current map-header ID | **No victory**: interview has no explicit win state |

The requested Champion Encountered/Battle/Defeated songs are catalogued but not
selected for Steven. Emerald scripts MUS_ENCOUNTER_CHAMPION for **Wallace**;
TRAINER_STEVEN uses RIVAL battle music. Champion victory constant is
MUS_VICTORY_LEAGUE (355), not MUS_VICTORY_CHAMPION (which does not exist).
Source evidence takes precedence over the initial requested album mapping.
Rival Battle is disc 1 track **66** in the supplied Emerald listing.

## Single owner / timing

The existing MusicService consumes real GameOrchestrator state notifications.
A pure adapter resolves effective source music ID. Same ID is a no-op, even
through repeated dialogue, menu, movement, camera and answer state changes.
A change stops/disconnects the previous BGM before starting the replacement.
Pending decodes are coalesced; generation guards prevent stale asynchronous
starts. Source Ready/intro/music cannot block input if a recording is unavailable.

Title music is armed on activation, with an immediate AudioContext start/resume
attempt. A suspended or rejected attempt never blocks game startup or polls for
permission. Browsers that require user activation retain the existing first-input
fallback; application code cannot override that browser policy. The existing title/intro/battle/warp
choreography owns transitions; this phase does not port the original GBA
mixer's frame-by-frame fade envelope. Source transitions select IDs at those
existing flow/map boundaries, with non-overlapping stop/start playback.
Music mute/visibility preserve offsets. Unlock or explicit retry can recover a
failed playback. SFX remain on AudioService and do not replace BGM.
`playVictory()` remains a tested compatibility API for explicit legacy completion;
**GameShell does not call it**. No soundtrack victory is selected on interview EXIT.

Automatic-start verification uses `autoplay.playwright.config.ts`: independent
Chromium instances explicitly allow or block autoplay, with no page input before
the initial assertions. Zero-input reads use CDP `userGesture:false` because
Playwright evaluations themselves grant user activation. Tests verify title playback without input, blocked-policy
gesture recovery, one active track, intro routing and persisted mute/unmute.
These policy flags are test-only; they are never passed to visitors' browsers.
See [Chrome's autoplay policy](https://developer.chrome.com/blog/autoplay).
Evidence: `artifacts/emerald-source/phase-audio-autoplay/`.

## Native sound feasibility / outstanding gate

Source samples, envelopes, PSG definitions, M4A loop markers and original mixer
sources are present. m4aSoundInit uses 8-bit DirectSound, 13379Hz, master volume12,
max5channels. `src/m4a_1.s` is ARM/Thumb assembly and uses GBA hardware registers;
it cannot run in Web Audio merely by parsing MIDI. Host generic MIDI playback
would change PSG timbre, sample envelopes, reverb, mixing and timing.

This environment has g++ and mGBA, but lacks ARM assembler/linker, agbcc and
libpng development headers; no pinned source-built ROM is available. Native PCM
rendering/listening therefore remains blocked. A faithful next step is an
isolated pinned source build followed by emulator/m4a recording, preserving
source loop markers and recording provenance. Do not download an unverified ROM.
No converted output is falsely marked as playable audio.

## Evidence

One phase folder: `artifacts/emerald-source/phase-p1-7-audio/`.
Contains baseline/results, actual game-state/music traces, decoded-file/seam
measurements, screenshots and report. Source conversion output lives in the
shared ignored `audio/source/` tree, not a competing phase folder.
All supplied/extracted music is excluded from public/production output. The
previous public MP3 copies were preserved privately and removed from the working
tree; repository history was not rewritten. Production uses the existing original
Pokefolio WAV scores and original UI cues, never source music substitutions.
