# Emerald is the product runtime

The normal `/` entry uses the completed Emerald world/session, renderer, source UI,
characters, interiors, interactions, challenger adapter and semantic music routing
in both development and production. `NODE_ENV=production` does not choose the old
custom world. Missing assets produce an explicit loading error, never a legacy
fallback. `/dev/emerald` remains the opt-in diagnostic harness.

## Local development

```sh
pnpm game:local
# http://127.0.0.1:3101/
```

Normal `pnpm dev` also selects Emerald without `EMERALD_LOCAL`. On a loopback
development host the product asset routes read the existing ignored extraction:

- `artifacts/emerald-source/bundle.json`
- `artifacts/emerald-source/ui/ui-bundle.json`
- `artifacts/emerald-source/audio/manifest.json` and `audio/imports/*`

If absent, reuse `pnpm emerald:extract`, `pnpm emerald:extract-ui`, and
`pnpm emerald:import-audio`. No assets are generated at build time.

The temporary old-world fallback is development-only: `/?world=legacy` or
`POKEFOLIO_WORLD=legacy pnpm game:local`. Both are ignored by the production entry.
`EMERALD_LOCAL=1` still controls the diagnostic harness/private diagnostic routes,
not product implementation selection.

## Deployment prerequisite: an authorized asset release

Ignored local files are not present on Vercel. The product reads assets from
`/api/game-assets/world`, `/api/game-assets/ui`, `/api/game-assets/music`, and
`/api/game-assets/MUS_*`. In production these routes fetch a configured release
from an external asset host. They do not read or automatically publish local
extractions. The source must match commit
`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

Prepare a deterministic release **locally**, without uploading:

```sh
pnpm emerald:prepare-delivery
```

Output stays in ignored `artifacts/emerald-source/delivery/`:
`release.json`, `world.json`, `ui.json`, `music.json`, and available recordings
under `audio/MUS_*.mp3` (or their actual supported container extension).
`release.json` records source revision, exact paths, SHA-256, byte sizes and MIME
types. Existing extracted JSON and recording bytes are reused; no art/audio is
redrawn, converted or downloaded. Music URLs are adapted to product endpoints.
The packager does not grant distribution rights or perform deployment.

Before a public deployment can run the game:

1. Resolve authorization to distribute the included Nintendo/Game Freak graphics,
   map data and music. The current task does not grant that authorization.
2. Upload the prepared release to a host/storage location authorized for those
   assets. Keep all files from the same `release.json` together in one versioned
   directory. No upload is performed by this repository's build.
3. Set these **server-only** deployment variables, then redeploy:

   ```text
   POKEFOLIO_ASSET_BASE_URL=https://<authorized-host>/<versioned-release>/
   POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED=1
   # Optional if the upstream storage requires a bearer credential:
   POKEFOLIO_ASSET_BEARER_TOKEN=<server-only-token>
   ```

   The placeholder is documentation, not an invented actual domain. The base URL
   must use HTTPS (HTTP loopback is allowed for private production testing), have
   no embedded credentials/query/fragment, and serve `release.json`. Redirects
   are rejected. Origin credentials are never sent to the browser. When the
   distribution flag is enabled, product endpoints serve assets to site visitors;
   this is not an end-user access-control mechanism.
4. Verify root gameplay, all asset responses and the available tracks against
   that release. Check host/platform request/response limits for the actual files.
   The current largest recording is about 4.18MB; routes buffer and hash-check
   each response. The transport rejects individual assets above 32MiB.

Without authorization/origin configuration the production build succeeds and `/`
still selects Emerald, but the game reports **asset delivery is not configured**.
All semantic portfolio routes remain available. This is an unresolved deployment
prerequisite, not permission to silently serve the old game.

## Integrity, privacy and CSP

The server verifies release revision, resource-specific paths, MIME types, exact
length and SHA-256 before delivering bytes. World/UI/music revisions must match;
the world includes Littleroot, Route101 and the three ground-floor interiors, and
UI includes the completed title/Birch/Brendan/Steven/portfolio components. Invalid
resource IDs return 404 without private-file access. Missing optional recordings
stay unavailable; no track substitution or victory on ordinary EXIT.

The private diagnostic routes remain unavailable in production. Next output
tracing excludes `artifacts/emerald-source/**` and `pokeemerald/**` from both the
diagnostic and product asset routes. No extracted files enter `public/`, Git or
automatic serverless bundles. Browsers fetch same-origin product endpoints, so
the existing production CSP does not need a third-party origin or unsafe-eval.
Authorization concerns asset delivery, not which game implementation is selected.

## Private production verification

After `pnpm build` and `pnpm emerald:prepare-delivery`:

```sh
pnpm exec playwright test --config tools/emerald-reconstruction/production.playwright.config.ts \
  product-runtime.e2e.ts music-production.e2e.ts
```

This starts an unconfigured production server on loopback 3112, an explicitly
authorized **loopback-only test** server on 3113, and a private fixture asset host
on 3114. No external service is contacted and no assets are publicly deployed.
The authorization environment flag is scoped to the fixture process. The test
proves production rendering through deployed-mode asset delivery, not the
existence of a licensed/publicly hosted release. Additional existing source-game
browser tests can use this production config against the fixture, excluding the
test that explicitly exercises the development-only legacy fallback.
