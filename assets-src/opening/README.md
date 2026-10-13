# Original Pokefolio opening artwork (B2)

`python3 assets-src/opening/build.py` reproducibly authors native integer-pixel masks and writes lossless PNG previews, the recorded palette sheet and the production RLE raster data (`art.json`). No downloaded, traced, extracted or recoloured game assets are inputs.

The wordmark uses original 6×9 display-letter masks with stepped colour bands and a one-native-pixel outline, distinct from the canonical UI bitmap font. Backgrounds contain five flat sky bands, original cloud/moon pixels and a town silhouette occupying the bottom 48 pixels. Portraits occupy 64×64 art boxes and use at most seven opaque colours. VS lettering occupies 56×40 pixels; its title bar occupies 128×16 pixels.

React expands authored cells into physical ImageData through the existing Phase A Raster. Semantic headings, image labels, buttons and the existing dialogue live region remain accessible. Animation samples the existing Clock in discrete native-pixel positions. Game-flow timing, transitions, input and progress persistence remain with their existing owners.

All B2 review screenshots and metadata are in the existing `artifacts/phase-b/` folder, alongside the approved B1 evidence.

## Current Emerald title wordmark

`wordmark.py` authors the current **PokéFolio** branding: individual integer-grid
letter contours/counters, a deliberately uneven baseline, a separately shaped
acute accent and i dot, golden fill, three-pixel blue contour and a hard (2,3)
navy extrusion. It writes `pokefolio-wordmark.json` and its transparent PNG
preview. Run it with an existing Python/Pillow runtime; no fonts or extracted
game pixels are inputs. The 216×60 asset sits at native (12,9).

`src/core/emerald/titleUi.ts` imports this original brand asset directly, so an
older pinned private Emerald release can retain its background and UI data while
the app displays the updated brand. No private release regeneration or upload is
needed. The source background palette/animation and Press Start stay unchanged.
The earlier `build.py` wordmark remains part of the explicit legacy-world art set.
