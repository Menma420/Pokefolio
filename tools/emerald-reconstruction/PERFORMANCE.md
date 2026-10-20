# Android performance investigation

The automated measurements are **Linux headless Chromium**, not Android hardware.
They use the production build, a 390×844 CSS viewport, DPR 3, touch/coarse input,
and CDP CPU throttling at 4×. Local source assets are served only on loopback.
Navigation to the real Route 101 encounter runs at 1× CPU between measured
segments. No `/dev/battle` or synthetic battle state is used.

## Reproduce

Prerequisites: existing Node/pnpm/Playwright installation and the already prepared
ignored `artifacts/emerald-source/delivery/` release. Do not upload or regenerate it.
Close other CPU-heavy work. Ports 3114 and 3120 must be free.

```sh
pnpm build
node tools/emerald-reconstruction/profile_performance.mjs after
```

The profiler starts and stops its own loopback asset fixture and production server.
Results live together in `artifacts/emerald-source/phase-android-performance/`.
Use a different run label for repeats. The default is 12 seconds per short segment
and 180 seconds sustained world play, plus an eight-second CDP freeze/resume.
`PROFILE_SECONDS` and `PROFILE_SUSTAIN_SECONDS` can change durations; use the same
values for comparisons. The walking workload is 16 real tile movements: a slow
run may exceed the minimum sample duration while those movements complete.

`report.json` includes rAF interval distributions, title/world update counts,
Long Task durations, CDP scripting/task/layout/style metrics, canvas operation
counts and timings, ResizeObserver construction counts, startup resource timings,
and sampled CPU hotspots. `.cpuprofile` files open in Chrome DevTools' JavaScript
profiler. Screenshots are supporting visual evidence, not a performance metric.
The sampled `performance.memory` value is Chromium's coarse estimate, not proof
of leak freedom or GPU memory use. rAF FPS is distinguished from art/simulation
update frequency; it is not a physical display's presented-frame counter.

The static-title comparison enables the existing reduced-motion setting. The
animated setting is restored before world/battle samples. Cold/warm startup use
a fresh browser context then reload the same context; browser cache effects do
not imply server-asset caching because verified delivery uses `no-store`.
Loopback measurements exclude real mobile network latency and Vercel geography.

## Regressions and visual checks

```sh
EMERALD_TEST_SOURCE=1 pnpm test
pnpm typecheck
pnpm lint
pnpm check:deps
pnpm build
EMERALD_EVIDENCE_DIR=artifacts/emerald-source/phase-android-performance/gameplay \
EMERALD_UI_EVIDENCE_DIR=artifacts/emerald-source/phase-android-performance/ui \
SOURCE_TITLE_EVIDENCE_DIR=artifacts/emerald-source/phase-android-performance/title \
pnpm exec playwright test --config tools/emerald-reconstruction/performance.playwright.config.ts \
  --grep-invert 'local legacy fallback retains approved world|fresh legacy startup'
```

Those two legacy-only checks require the development fallback (intentionally
unavailable in production); run them with the existing development Playwright
config rather than changing their assertions. The production run includes the
existing DPR 1/2/3 × native scale 1–8 screenshot-pixel comparison, title/intro
persistence, keyboard/touch menus, real encounter/battle/return and audio tests.

## Actual Android follow-up

1. Connect an Android phone with USB debugging enabled; verify `adb devices`.
2. Run the same production server and loopback release fixture. Use
   `adb reverse tcp:3120 tcp:3120` and open `http://localhost:3120/` in phone Chrome.
   The Next server fetches the asset fixture itself; assets stay off public storage.
3. On desktop Chrome, use `chrome://inspect/#devices` to inspect that phone tab.
   Record the physical device model, Android/Chrome versions, display refresh rate,
   power/thermal state, network and game integer scale. Do **not** apply desktop
   CPU throttling to the real-device result.
4. Record cold and warm title startup and 12-second animated/static title, world,
   walking and battle segments. Save Performance traces with JS samples and memory.
   Perform the same real encounter path used by `integrated.e2e.ts`.
5. Record at least three minutes of play; check sustained intervals, heap/GC,
   responsiveness and audio. Background Chrome for eight seconds, then a minute,
   and resume. Check movement, held-input release, audio and exact battle return.

CDP freezing a desktop page is only a lifecycle proxy. It does not reproduce
Android's process eviction, thermal throttling, GPU drivers or audio-focus rules.
No renderer, simulation-clock or lifecycle policy change is justified by that
proxy alone.
