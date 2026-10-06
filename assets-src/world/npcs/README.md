# Owner-requested NPC sprite replacements

Current actors:

- Brendan: exact supplied player reference in `../brendan/`.
- Steven: exact supplied `steven.png`, challenger.
- May: exact supplied `may.png`, ordinary route-guide.
- Trainer: exact supplied `Trainer-4dir.png`, ordinary route-neighbor.

Both `Trainer.png` and `Trainer-4dir.png` were copied unchanged from
`/home/menma/Downloads/Sprite-Lab/`. `trainer.json` is a lossless indexed adapter
of their RGBA pixels, not a redraw. No color, silhouette, geometry or detail is changed.
The single Trainer PNG is exactly the South cell of the four-direction sheet.

The sheet is 64×32: four 16×32 cells in South, North, West, East order.
East is already supplied and is used directly. It equals the horizontal mirror of West.
Each frame stays untrimmed, bottom-center anchored with feet at row 30 and the existing
one-tile 16×16 footprint. Six opaque colors and binary alpha are preserved.

**The provided exports contain no walking poses.** Existing idle/0/1/2 atlas slots
alias the supplied pose for each direction; world movement and animation timing remain
unchanged. No missing walk artwork was fabricated. If a Trainer walk sheet is later
supplied, it can be mapped to those existing slots without changing gameplay.

SHA256:
- Trainer.png: `dfdb0f2e14f25b4f043a24266452a37d87cbc6928a418a1c1712450290622389`
- Trainer-4dir.png: `f0b66a0fbf6a87577541125d5174c4ce8c4e6adeb6b9a29008cc01899465b645`

Build with `python3 assets-src/world/build.py`. The supplied hashes are pinned in the
builder and tests. The previous randomized Steven neighbor recipe/export/adapter files
are historical rejected work and are no longer consumed by the production asset builder.

Owner-supplied Pokémon depictions and Sprite Lab exports retain their source provenance.
No license or ownership grant is asserted for the supplied character sources.
