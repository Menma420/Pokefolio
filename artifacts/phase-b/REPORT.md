# Phase B4 — Player Menu / Portfolio OS production

Implemented and ready for visual review. Visual approval is pending. Work stops at B4; B5 has not started.

## Implementation

The seven-entry Player Menu opens with X and remembers its session cursor. Y opens Bag directly. All screens use the existing 240×160 native composition, canonical bitmap typography, Window, Cursor, palette and physical-pixel UI rendering. Menu opening/closing and screen fades use the existing Clock and transition service. World movement pauses beneath the menu and resumes at the same anchor.

- **POKÉDEX:** verified technologies, engineering concepts and hiring keywords; category filters, eight-row list, descriptions, sourced project relationships and category-emblem detail artwork. No proficiency scores, levels or invented statistics.
- **PROJECTS:** all twelve projects, independently of audience and battle Party; read-only overview, technology/impact and links pages. Project write-ups reuse authored content. Portfolio-only verified metadata does not mutate battle content.
- **EXPERIENCE:** Acko SDE Intern and IIIT Allahabad Summer Research Intern, with sourced dates and paged summary/ownership/engineering/impact sections.
- **BAG:** DOCUMENTS (RESUME, CERTIFICATES), PROFILES (GITHUB, LINKEDIN), CONTACT (EMAIL), EXTRAS (sourced achievements). Resume opens the unchanged original PDF. External links open directly during the input gesture.
- **UTTKARSH:** original Trainer Card portrait and condensed professional identity, role, focus, education and source-backed highlights. Location is omitted as explicitly directed by the source document.
- **OPTIONS:** Music, SFX, text speed, full/reduced animation, OS/forced reduced motion, controls and reset tips. Settings persist; reduced motion reaches existing choreography and dialogue indicators. Original quiet music uses the shared Clock and stops when muted or disposed.
- **EXIT:** canonical confirmation, cursor initially on NO. NO returns to the menu; YES routes to `/about`.

Semantic HTML, live announcements and keyboard/touch intents remain available. Server-rendered fallback routes `/about`, `/projects`, `/projects/[slug]`, `/skills`, `/experience` and `/resume` expose essential facts without loading Phaser.

## Content source

Identity, professional experience, education, skills, contact links and achievements follow `docs/design/Pokefolio_B4_Content_Source_of_Truth.docx`. The supplied `Uttkarsh_Malviya.pdf` is copied unchanged into `public/documents/`; SHA-256: `1c2a144d5d245a874879f4423c7ca87831eed7002a3efa8435d8e58b65669f5e`. Certificates have no supplied destination and are intentionally unavailable. No location, dates, project relationships or unsupported impact statistics are invented.

## Original art and preserved behavior

58 original portfolio assets include category/inventory icons, compact type badges, project thumbnails and a 48×64 Uttkarsh portrait. Skill detail art uses the locked category-emblem fallback. No copied Nintendo/Game Freak artwork or third-party game assets.

B1/B2/B3 artwork, WorldSim, collision, LOS, automatic doorway entry, encounter behavior, question trees, battle reducer, audience Parties, project-switch semantics and routing intent remain intact. Phaser continues to own game scenery; React owns menu and portfolio UI. No backend, database or CMS added.

Actual screenshot testing exposed compositor blending in the existing visible overworld at DPR 3 and clipping of the final physical row. A presentation-only physical expansion surface now covers the logical Phaser world canvas in the main app, matching the existing battle approach; the battle hides this surface. A one-pixel transparent clip margin preserves the last physical pixel. Native geometry, integer-scale calculation, canonical UI renderer and authored world art remain unchanged. These are regression fixes rather than redesigns.

## Files changed

- `src/ui/portfolio/`: PlayerMenu, portfolio screens, native layout helpers and original raster artwork.
- `src/content/portfolio/`: verified source transcription, independent catalogue/skill/Bag selectors and provenance notes.
- `assets-src/portfolio/`, `public/assets/portfolio/`: original authoring script, 58 assets, RLE data and manifests.
- `public/documents/Uttkarsh_Malviya.pdf`: original supplied resume.
- `src/app/(portfolio)/`: semantic fallback layout and six route families.
- `src/app/GameShell.tsx`, `src/core/input/index.ts`: menu lifecycle, world shortcuts, touch speaking parity and existing router exit.
- `src/runtime/MusicService.ts`, `safeOpen.ts`, `AudioUnlocker.ts`, `stores/index.ts`, `motion.ts`, `Orchestrator.ts`: actual settings/audio/link behavior and motion integration.
- `src/game/WorldRaster.ts`, `WorldScene.ts`, `boot.ts`, `src/ui/kit/GameViewport.tsx`: bounded DPR rendering regression fixes.
- `src/ui/kit/DialogueBox.tsx`: reduced-animation speaking indicator.
- `tests/ui/portfolio.spec.tsx`, `tests/e2e/portfolio-production.spec.ts`: asset, source, menu, input, settings, resume, fallback and pixel regressions.
- `docs/LICENSES.md`: original asset/music provenance.

## Screenshot evidence and visual observations

[B4 screenshot index](B4-SCREENSHOTS.md) lists all 51 captures with exact CSS viewport, DPR, integer scale and physical PNG dimensions. Native 1×, 3× and 4× evidence covers all seven menu flows. Largest-fit desktop is 1440×900 CSS, DPR 1, scale 5. Touch is 390×844 CSS, DPR 3, scale 4; desktop DPR 3 is 320×214 CSS, scale 4.

Every capture has zero intermediate colors and zero mismatched native pixel blocks. Actual rendered screenshots were inspected for text, cursor, headers, window geometry, portrait, project details, contact content and external touch-control clearance. Source-backed text is paged rather than squeezed or replaced with web typography. All evidence remains in this single Phase B folder, alongside preserved B1/B2/B3 evidence.

## Remaining unfinished UI/art and limitations

No temporary B4 placeholder artwork remains. Category emblems are the specified skill-art fallback. Certificates remain intentionally unavailable until an authored resource exists; location is deliberately omitted. Detailed interior furnishings and later production scopes are untouched.

A browser may return null for a successful `noopener` opening, so null alone cannot distinguish a blocked popup. Actual opener exceptions and unavailable resources receive canonical notices; unsafe protocols are rejected. The original PDF download and exact verified link intents are covered by regression tests.

## Verification

- Unit tests: **137 passed**, 27 files.
- B4 browser tests: **3 passed** across the complete screen/touch run and the focused original-PDF/resource rerun. The initial PDF assertion was corrected to observe downloads on the originating page as well as the new tab; application behavior was not weakened.
- Existing browser regressions: **20 passed** — battle production, battle flow, opening/route teardown, automatic doorway, world interaction/touch, viewport and foundation.
- Typecheck: passed.
- Lint and dependency/boundary checks: passed; 125 modules, 446 dependencies, zero violations.
- Authored-content validation: passed; 18 project/audience trees.
- Screenshot pixel checks: **51 captures**, zero intermediate colors and zero mismatched native pixel blocks.
- `git diff --check`: passed.
- Production build: passed; 25 static pages, including all twelve project detail routes.

No genuine technical blocker remains. B4 is ready for user visual review. No B5 work has begun.
