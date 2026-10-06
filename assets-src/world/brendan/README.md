# Immutable Brendan source — Sprite Lab v0.8.3

The owner explicitly requested the original reconstructed Pokémon Emerald Brendan,
not an original PokéFolio adaptation. `walking.png`, the v0.7 construction grammar,
and the v0.4 measured recipe are copied unchanged from the supplied Sprite Lab ZIP.
Source PNG SHA256: `f33ec07a5fd17f4422455f8bc55cd3d3522fa65c3bf740ecbdc00da705eaa0d1`.

`golden.json` is a lossless indexed-data adapter of the nine-frame 144×32 PNG.
Index 0 is transparent, as in Sprite Lab; every other index preserves its exact RGB.
The separately supplied semantic South idle reconstruction matches all 512 pixels.
No Character Creator/Uttkarsh mutation is used.

Mapping to existing PokéFolio slots:

| Facing | idle / pose 0 | pose 1 | pose 2 |
|---|---|---|---|
| South/down | source 0 | source 3 | source 4 |
| North/up | source 1 | source 5 | source 6 |
| West/left | source 2 | source 7 | source 8 |
| East/right | mirrored source 2 | mirrored source 7 | mirrored source 8 |

Existing Clock/world-tick timing `[0,1,0,2]` is unchanged. Idle and pose 0 are
intentionally identical; the twelve unique directional cells occupy sixteen existing
atlas entries. No crop, translation compensation, palette remap or anchor adjustment
is applied. Idle foot contact is row 30; walk foot contact is row 31. The measured
walk +1px vertical translation and aligned stable head silhouette remain in the source.

Rebuild using `python3 assets-src/world/build.py`. Independent tests decode the original
indexed PNG and compare every imported RGBA cell, not merely the adapter JSON.
Terrain and all 48 NPC/challenger frame hashes are checked against pre-change pixels.

This source depicts Nintendo/Game Freak's Brendan. It is user-supplied reconstructed
third-party artwork, not original PokéFolio artwork, and the archive supplies no license
grant. This integration does not claim ownership or establish redistribution rights.
