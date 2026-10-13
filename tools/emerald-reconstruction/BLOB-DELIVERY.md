# Prepared Emerald release → Vercel Blob

This tool publishes the existing prepared release. It does not extract assets,
change the game, configure Vercel, commit, push, or deploy the application.
Owner confirmation of public distribution was received for this task. Keep the
explicit authorization guard for subsequent uses.

## Prerequisites

- Node 22 and `pnpm install --frozen-lockfile`.
- Existing `artifacts/emerald-source/delivery/release.json` and its referenced files.
- The connected Blob store's access mode (`public` or `private`).
- Its `BLOB_READ_WRITE_TOKEN`, supplied through the environment or an ignored
  `.env.blob.local` file. Never pass tokens as command-line arguments, paste them
  into chat, commit them, or put them in a `NEXT_PUBLIC_*` variable.

Example ignored file (replace the value locally; do not commit):

```dotenv
BLOB_READ_WRITE_TOKEN=<connected-store-token>
POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED=1
```

A public-store upload exposes assets immediately. The authorization guard must
be enabled only with the owner's distribution authorization. A private-store
upload can remain inaccessible publicly; the app's delivery authorization is
still a separate gate.

## Commands

From the repository root:

```sh
pnpm emerald:upload-assets --dry-run
pnpm emerald:upload-assets --access public --env-file .env.blob.local
# For a private store, use --access private instead.
```

The offline preflight makes no network calls. It checks source revision,
required world/UI components, music availability, MIME, sizes, relative paths,
symlink containment and SHA-256 before any upload. Unreferenced files in the
release directory are never uploaded. Explicitly unavailable/not-required songs
remain unavailable; this command does not fabricate or replace audio.

Files retain their manifest-relative paths under:

```text
pokefolio/emerald/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/<sha256-of-release.json>/
```

The release hash prevents later content changes from reusing an immutable
prefix. Random suffixes and overwrites are disabled. Existing files are reused
only if their downloaded bytes, sizes and MIME match. A conflicting object stops
the run. Resources are uploaded and verified before `release.json` is published
and verified last. On failure, uploaded immutable resources remain; a rerun
verifies and reuses them. No delete or cleanup of unrelated blobs is performed.
Concurrent conflicting uploads fail safely; rerun after the other upload ends.

The command downloads every returned Blob URL, including `release.json`, and
compares SHA-256, byte count and MIME. Verification uses direct HTTPS requests,
no redirects and no cache, with a server-side bearer header for private stores.
A native Blob URL of the selected access mode is required. URLs are derived from
actual SDK responses, never synthesized from a guessed store name.

Success prints the exact `POKEFOLIO_ASSET_BASE_URL`, with a trailing slash. It
also writes `artifacts/emerald-source/phase-blob-upload/verification.json` with
expected/actual hashes and URLs, without credentials. Preflight evidence is in
`preflight.json` in the same phase folder. Both are ignored local artifacts.

Reverify without writing any blobs:

```sh
pnpm emerald:upload-assets --verify-only --access public --base-url '<printed-base-url>'
# Private verification also requires --env-file .env.blob.local or token env.
```

## Exact Vercel Production settings after successful verification

| Environment variable | Value |
| --- | --- |
| `POKEFOLIO_ASSET_BASE_URL` | Exact printed base URL, including immutable prefix and trailing slash |
| `POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED` | `1`, with confirmed public-distribution authorization |
| `POKEFOLIO_ASSET_BEARER_TOKEN` | Private store only: valid server-side Blob bearer credential |

For a public store, the deployed app needs **no Blob storage token**. The
read/write token is needed by the uploader, not by public asset reads. Leave
`POKEFOLIO_ASSET_BEARER_TOKEN` unset for public storage. Merely connecting a store
and setting `BLOB_READ_WRITE_TOKEN` on Vercel does not configure this app's
private reads: the existing server route reads
`POKEFOLIO_ASSET_BEARER_TOKEN` explicitly. Keep that credential server-only.

The loader normalizes the base to a directory, then uses
`new URL('release.json', base)` and `new URL(entry.path, base)`. Therefore the
base must be the **release directory**, not the store root or `release.json` URL.
The upload tests exercise this resolution through the actual production handler.
Existing revision/completeness/hash/MIME checks are unchanged.

## Deployment verification (separate, not automatic)

After the owner configures Production settings and explicitly triggers a new
app deployment, check its actual production URL. Storage upload alone is not
proof that deployment is complete.

1. `/` loads Emerald; absent/corrupt assets show an error, never the legacy map.
2. `/api/game-assets/world`, `/ui`, `/music` and each available music ID succeed.
   `/music` is intentionally transformed to same-origin resource URLs by the
   server; compare original hosted `music.json` bytes separately.
3. Check Littleroot → Route 101 → challenger → audience → VS → battle → answer
   → EXIT/exact map return; check interiors and X/Y menus.
4. Check app deployment traces exclude ignored source assets, upstream source,
   diagnostics and unrelated outputs. Blob upload must include only the manifest
   and the listed resources. The dev-only Blob SDK must not enter app route traces.
5. Run production browser regressions. The existing production Playwright config
   uses a private loopback fixture; it is not verification of the public site.

No actual production URL, store URL or upload success should be claimed before
performing those checks.

Official SDK/storage references used for the adapter:
[Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk),
[private Blob HTTP authentication](https://vercel.com/docs/vercel-blob/private-storage),
[public Blob storage](https://vercel.com/docs/vercel-blob/public-storage).
