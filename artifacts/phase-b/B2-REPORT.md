# Phase B — B2 opening visual production

Status: **implemented and ready for visual review; approval pending.** B1 remains approved. B3 has not started. All Phase B artifacts remain in this one folder; the approved B1 report is preserved in [B1-REPORT.md](B1-REPORT.md).

## Implementation

- Original authored 192×48 POKEFOLIO display wordmark, five flat sky bands, moon/cloud pixels and a 240×48 town silhouette with roofs, grand trees and pond edge. PRESS START uses the unchanged canonical bitmap font, centered near y=128. Removed the professional subtitle and ready/status decoration from the visual title. There is no title window, cursor or idle character.
- Title logo follows six discrete drop positions and the prompt blinks on the existing Clock. Existing preload, start confirmation, input/audio unlock and transitions retain their owners and timings. Semantic heading, button and live-region representation remain.
- Intro now uses the authored title background without the wordmark, with the existing canonical field dialogue window. Content-module narration, page completion, reveal sequence and introSeen persistence remain unchanged.
- Challenger encounter retains the approved B1 sprite and authored exclamation bubble, LOS, approach and dialogue behavior. Audience choice keeps the existing canonical window and cursor. No encounter state or choice logic changed.
- Original 64×64 visitor portrait and three original Uttkarsh challenger variants, authored 56×40 VS lettering, two-color stepped diagonal stripes and native title bar. Recruiter, Engineer and Visitor use their exact locked palette pairs. Presentation positions follow Clock frames; portraits, lettering and title bar use integer-pixel steps. Announcements use the canonical field window and locked wording.
- Existing flow owners still control VS locking, timing, white flash and battle wipe. Reduced-motion flow durations remain the approved existing behavior. No battle, Party, menu or project production art was added.
- Artwork is authored locally with integer-coordinate masks and original display-letter shapes; no Nintendo/Game Freak or third-party artwork is copied, traced, extracted or recolored.

## Files changed for B2

- `assets-src/opening/build.py`, `art.json`, `palette-sheet.json`, `README.md`: reproducible original art and production raster masks.
- Nine content-hashed authored PNG previews in `public/assets/opening/`.
- `src/ui/opening/PixelArtwork.tsx`, `TitleScreen.tsx`, `useArtFrame.ts`: authored image presentation through the existing physical-pixel Raster and shared Clock.
- `src/app/GameShell.tsx`: title and intro presentation integration only.
- `src/ui/battle/VsScreen.tsx`: original VS composition and Clock-stepped presentation.
- `src/content/audiences.ts`: locked announcement wording and Visitor-facing challenger title; internal IDs, parties and audience behavior unchanged.
- `tests/ui/opening-art.spec.tsx`, VS expectation in `tests/ui/battle.spec.tsx`, `tests/e2e/opening-production.spec.ts`: art dimensions/palettes/alpha, opening flow, rendered palette preservation and screenshot evidence.
- `docs/LICENSES.md`: original opening-art provenance; this folder's B2 evidence and indexes.

The repository already contained substantial Phase A/B1 uncommitted changes. This list describes B2 work, not every entry in git status.

## Preserved

WorldSim, collision, LOS, automatic doorway behavior, routes, encounter state, narration, progress persistence, question trees, battle reducer, Party membership and project content. The approved B1 overworld, 240×160 composition, physical-pixel renderer, integer scale formula, UI palette, bitmap font, canonical window/cursor primitives and Phaser/React boundary were not modified.

## Automated validation

- Unit suite: **121 passed**, 25 files.
- Opening production browser suite: **2 passed**. Verifies fresh-user exact narration/pagination, keyboard start, LOS encounter, audience selection, all three VS variants, battle wipe/arrival, canvas-tap return start and persisted intro skip; no page errors.
- Existing battle browser regression suite: **4 passed**, covering parties, authored interview, project switching, LINK/EXIT and touch-only topic navigation.
- Typecheck: **passed**.
- Lint and dependency boundaries: **passed**, 97 modules / 346 dependencies, zero violations.
- Production build: **passed**, including TypeScript and all eight generated routes.
- Authored masks have correct native dimensions and binary alpha, with restrained portrait palettes. Every production screenshot in the opening-sequence regression has uniform n×n native-pixel blocks (zero mismatches). Both locked background colors are present in every Engineer/Visitor scale capture.

## Screenshot evidence and visual observations

Exact filenames, CSS sizes, DPR and integer scales are listed in [B2-SCREENSHOTS.md](B2-SCREENSHOTS.md). The chronological actual-game run is linked in [OPENING-SEQUENCE.md](OPENING-SEQUENCE.md). Title, intro and all three VS variants have 1×, 3×, 4× and largest-fit 5× evidence. JSON files retain measured scale, game state and transition frame where relevant. Approved B1 screenshots remain alongside this evidence.

Actual rendered screenshots were inspected: the native title reads as a game title card; the intro omits the logo; the production challenger alert is visible; audience windows/cursor remain canonical; native VS captures clearly show stepped diagonal bands, original outlined portraits and lettering. Largest-fit intro preserves the native composition and black letterbox. No fractional UI scaling, antialiased text, smooth transitions or new placeholders were introduced.

## Remaining art and limitations

- Battle backgrounds/platforms, combat presentation sprites and project-specific battle artwork remain unfinished for later production.
- Party, Player Menu, project visual production and detailed interior furnishings remain outside B2.
- `b2-sequence-07-battle-arrival-unfinished.png` intentionally shows existing unfinished battle art. Its pre-existing CSS battle geometry produces 2160 nonuniform pixel-block samples at 4×. That result is explicitly recorded; the screenshot is flow continuity evidence, not a B2 production visual pass. No battle-renderer fix was made because battle production is excluded from this phase.
- B2 visual approval remains the user's review decision. No new technical blocker prevents review.

**Stopped after B2. No B3 work started.**
