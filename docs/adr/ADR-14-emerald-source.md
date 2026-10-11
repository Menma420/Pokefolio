# ADR-14 — Opt-in private source reconstruction

Accepted by the owner's exact-Littleroot implementation request, 2026-10-11.
The earlier original-art / 36×22 / clamped-camera presentation constraints are
superseded **for the source reconstruction only**. Source geometry, elevation,
collision, palette and camera rules take precedence there. Portfolio logic,
content and the normal public game remain unchanged.

Build-time Python extraction uses a pinned, clean, read-only upstream checkout.
Normalized assets live outside public/ and outside importable source code, under
ignored artifacts/emerald-source. A development-only loopback-gated route supplies
those assets to the compatibility scene. Deployment builds cannot serve them.
Pure source-compatible logic belongs in core/emerald; Phaser presentation in
game/emerald; portfolio/keyboard/touch adapters stay in the app layer. No new
framework/dependency, script VM replacement, or battle rewrite is introduced.

Fidelity is reported separately for source data, rendering/behavior and emulator
frames. Missing reference captures block exactness approval, not extraction work.

The local webpack server alone permits unsafe-eval for development source maps.
It uses an ignored separate .next-emerald-local output directory to isolate hot
reload/type manifests from normal production builds. Production retains the
original CSP, returns 404 for both source endpoints even with EMERALD_LOCAL=1,
and its output-file tracing excludes all extracted assets. The selected ON_LOAD
metatile subset is evaluated from source at extraction time; raw grid words stay
immutable and the source-compatible runtime applies those separately recorded edits.

The local webpack watcher excludes .next-emerald-local, private extracted outputs
and upstream. Next's default .next ignore does not cover the isolated cache;
without this exclusion the runtime filesystem context watches its own generated
manifests and repeatedly reloads. A real-browser no-reload regression covers it.
