# ADR-15: Manifest-only Vercel Blob delivery tool

Status: Accepted for the owner-requested prepared-release upload.

The production runtime already uses a source-pinned, integrity-checked external
release directory. Ignored local extraction files do not exist on Vercel.

Add `@vercel/blob` **2.8.1** as a pinned development dependency for an explicit
upload command. Use the official SDK for authenticated lookup and immutable
publication, and direct HTTPS GETs for independent byte/MIME verification in the
same form used by the production loader. No SDK imports or new storage logic
enter application routes, browser bundles or game runtime.

Only manifest-listed resources and the manifest itself are published, under a
source-commit plus manifest-hash prefix. Public upload requires explicit owner
authorization. Tokens remain in environment/ignored local files. Existing
objects are never overwritten. The manifest is published last, after verified
resources. Failure leaves safely resumable immutable objects.

The extra dependency is required for the requested Vercel Blob integration; it
adds no framework, backend, database, content source or gameplay behavior.
See `tools/emerald-reconstruction/BLOB-DELIVERY.md` for commands, server settings
and the distinction between successful storage publication and app deployment.
