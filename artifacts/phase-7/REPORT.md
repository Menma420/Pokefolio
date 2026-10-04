# Phase 7 — In-game portfolio menus

## 1. STATUS: PASS WITH CAVEATS

P7 is implemented and ready for visual/spec review. All required direct paths pass by keyboard and touch. Caveats concern existing authored-content gaps, not broken navigation or unfinished P7 art. P8–P12 were not started.

## 2. Files/modules changed

All paths below are relative to the repository root.

| Area | Files |
| --- | --- |
| Navigation contracts/core | `src/domain/menu.ts`, `src/core/menu/index.ts` |
| Shared content/config | `src/content/portfolio/menus.ts`, `src/content/portfolio/index.ts`, `src/content/portfolio/README.md` |
| Navigation owner | `src/runtime/stores/index.ts` |
| Portfolio UI | `src/ui/portfolio/PlayerMenu.tsx`, `MenuScreens.tsx`, `PortfolioScreens.tsx`, `layout.tsx` |
| Shared UI integration | `src/ui/kit/MenuList.tsx`, `src/ui/kit/GameViewport.tsx` |
| Actual raster regressions | `src/game/battlePixels.ts`, `src/game/WorldRaster.ts` |
| Unit/component tests | `tests/core/screen-stack.spec.ts`, `tests/ui/portfolio-menus.spec.tsx`, `tests/ui/portfolio.spec.tsx`, `tests/ui/battle-art.spec.tsx` |
| Browser tests/axe helper | `tests/e2e/portfolio-menus.spec.ts`, `tests/e2e/portfolio-production.spec.ts`, `tests/e2e/remediation.spec.ts`, `tests/helpers/axe.ts` |
| Review evidence | This single `artifacts/phase-7/` folder: report, screenshot index, PNGs, manifests, axe results and check logs |

Approved Phase A/B artwork/evidence was preserved after regression capture runs. No dependencies, artwork assets, routes, WorldSim, battle reducer, question trees or Party definitions changed.

## 3. Architecture implemented

`MenuDef` supplies the locked menu configuration. Pure immutable `ScreenStack` operations live in core with rendering-independent domain contracts. `uiStore` owns the transient stack and last-used menu cursor; no screen navigation is persisted.

Child frames retain parent selection/category/page/section. B pops a logical layer and restores the selected DOM focus. Direct Y opens Bag as a root frame, so B returns directly to the overworld. The previous ad-hoc return refs/local navigation state were removed. React retains presentation/input integration; existing InputRouter, Clock, transitions, settings, audio and safeOpen remain in use.

Screens consume shared portfolio selectors. Catalogue content does not depend on audience or Battle Party state. External opens stay inside the input gesture and use the existing shared `safeOpen` with `_blank` and `noopener,noreferrer`.

Two actual rendering regressions were corrected without replacing the renderer: restore transparent trailing padding while retaining integer ImageData dimensions at fractional DPR, and observe the frozen world canvas size so menu-time resizing updates its physical raster without resuming simulation.

## 4. Screens completed

| Screen | Completion |
| --- | --- |
| Player Menu | Locked seven-row order; shared Window/MenuList/Cursor; session cursor memory; X/B closure |
| Pokédex | ALL + nine established categories; skill list/detail, Type/icon, sourced descriptions/usage, related project navigation and paging |
| Projects | All 12 projects; independent read-only catalogue; overview, tech/impact, links; exact scrolled parent restoration |
| Experience | Chronological sourced roles; logical detail layer; summary/ownership/engineering/impact sections and paging; parent restoration |
| Bag | Exactly DOCUMENTS / PROFILES / CONTACT / EXTRAS; description + USE; actual PDF, verified links, authored achievements; extras dialogue B restoration |
| Trainer Card | Verified identity, Acko role, backend positioning, IIIT Allahabad and B.Tech IT; original approved portrait; read-only |
| Options | MUSIC, SOUND FX, TEXT SPEED, ANIMATION, REDUCED MOTION, CONTROLS, RESET TUTORIAL; existing persistence |
| Controls | Keyboard and external touch controller instructions; B restores Controls selection |
| EXIT | EXIT? with YES/NO; starts on NO; NO/B restores EXIT selection; YES routes to `/about` |

Semantic screen regions replace incorrectly nested document-main landmarks. Semantic bitmap text/live regions remain present; hidden underlying EXIT/extra-reading controls are inert. Canonical visual geometry, palette, font and physical integer scaling remain intact.

## 5. Direct-path matrix

| Path from overworld | Keyboard | Touch |
| --- | --- | --- |
| X → Player Menu | PASS | PASS |
| Y → Bag → Documents → Resume → actual PDF | PASS | PASS |
| X → Projects → detail → B | PASS | PASS |
| X → Pokédex → detail → related project → B | PASS | PASS |
| X → Experience → detail → B | PASS | PASS |
| X → Uttkarsh → Trainer Card → B | PASS | PASS |
| Y → Bag → Profiles → GitHub | PASS | PASS |
| Y → Bag → Profiles → LinkedIn | PASS | PASS |
| Y → Bag → Contact → Email | PASS | PASS |
| X → Bag → Extras → reading → B | PASS | PASS |
| X → Options → Controls → B | PASS | PASS |
| X → Options → Reset Tutorial | PASS | PASS |
| X → EXIT → NO/B → menu | PASS | PASS |
| X → EXIT → YES → `/about` | PASS | PASS |

Resume tests open the real PDF in a new browsing context, verify no opener, PDF content type and original SHA-256 `1c2a144d5d245a874879f4423c7ca87831eed7002a3efa8435d8e58b65669f5e`. GitHub/LinkedIn/email tests observe the safe-open URL, target and security flags; third-party pages and an installed mail client are not exercised.

## 6–9. Tests and regression results

| Check | Result |
| --- | --- |
| Complete unit/component suite: `pnpm exec vitest run --maxWorkers=2` | **173 passed / 29 files**, including 36 new P7 tests |
| Final P7 browser suite: `pnpm exec playwright test tests/e2e/portfolio-menus.spec.ts --workers=1 --reporter=line` | **5 passed**; complete keyboard/touch flows, actual PDF in both input modes, actual P6 X/Y gating |
| Independent P7 component axe fixtures | **24 passed**; jsdom structural rules; browser covers contrast-enabled audits |
| Actual P7 browser axe states | **44 audits, zero violations**; all axe rules enabled, no severity filtering |
| Existing complete browser suite, including P0–P6 and approved B1–B4 | **All 33 existing cases passed** |
| P6 golden path | PASS: intro, automatic LOS/approach, audience, interview, exact return, repeat, refresh and interruption cleanup |
| Door/NPC interaction | PASS: walk-on doorway requires no Enter/A; NPC Enter behavior preserved; interior/return point verified |
| Foundation matrix | PASS: DPR 1/2/3 × scales 1–8, largest-fit formula, exact glyph pixels/palette, safe areas, hit targets, gating, transitions and touch parity |
| `pnpm typecheck` | PASS |
| `pnpm lint` (including dependency boundaries) | PASS: 129 modules / 459 dependencies; zero violations |
| `pnpm validate` | PASS: 18 authored project/audience trees |
| `pnpm build` | PASS: production webpack build and 25 prerendered pages |
| `git diff --check` | PASS |

The first combined 38-case browser run recorded 37 passes and one P7 screenshot-harness failure: it read the old scale while viewport resizing was still settling. The harness now waits for the requested frame scale and physical world raster before cropping. Pixel/palette assertions were retained. The corrected keyboard rerun passed, then the complete final five-test P7 suite passed. Raw combined and final logs are included rather than concealing that earlier failure.

## 10. Screenshot/checkpoint evidence

See [SCREENSHOTS.md](SCREENSHOTS.md) for every filename, exact viewport CSS size, DPR, integer scale and physical screenshot size. All 89 captures show the actual rendered game:

- 22 P7 states at **1×, 3×, 4×**, DPR 1: 240×160, 720×480, 960×640 CSS.
- Largest-fit desktop: **1440×900 CSS, DPR 1, n=5**, 1200×800 physical game frame, flat black letterbox.
- The same 22 states on **390×844 CSS, DPR 3, n=4** with the external touch controller. Full physical screenshot: 1170×2532; game raster: 960×640.

Final capture manifests report **zero native pixel-block mismatches and zero intermediate colors** for every capture. Representative native/3×/4× menu, detail, Experience, Bag, Card, Options, Controls, EXIT, touch and largest desktop PNGs were visually inspected. Text and cursor remain crisp, windows retain their approved square geometry, and long content uses paging rather than crowded typography. This is readiness evidence for human review, not an assertion of user visual approval.

## 11. Blueprint/locked-decision alignment

No unapproved product decisions. Final Implementation Plan §26 preserves the existing header category selector (ALL then nine categories), rather than introducing a new category screen. §31 governs RESET TUTORIAL: reset hint flags and show “Tips will show again,” preserving earned/session progress, intro and first-encounter semantics. SOUND FX is the locked display label for SFX. P7 explicitly permits Certificates only if verified/available, so the previous unavailable certificate row is omitted.

## 12. Remaining placeholders/content gaps

No unfinished P7 UI/art placeholders were introduced or remain. Approved original B4 icons/portrait and B1 world art are reused. Certificates/location remain absent because the source does not verify them. Eleven catalogue project periods remain the existing “NOT SUPPLIED” value; WeatherPi, Arise and ChatRoomApp have no authored impact statement and retain the explicit unavailable-content message. Existing short summaries were not expanded into invented claims or metrics. Later town/interior/art work is untouched.

## 13. Tests not run

None of the required configured tests were skipped. Browser evidence uses the repository's Chromium configuration; Firefox/WebKit are not configured. JSDOM cannot measure visual contrast, so only that rule is disabled in the independent component environment; actual Chromium P7 audits enable all rules. Native mail-client launch and third-party account-page behavior are outside the controlled browser tests.

## 14. Recommendation

**P7 is ready for visual/spec review.** The app remains available at `http://127.0.0.1:3100/`. No technical blocker remains. Stop at P7; wait for review before P8.
