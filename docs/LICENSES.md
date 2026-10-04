# 3rd Party Licenses

## Pixel Font
**Font:** [Placeholder: Press Start 2P or similar OS font]
**License:** SIL Open Font License (OFL) or similar. 
**URL:** [TBD]
## Assets
- Placeholder art uses generated flat colors. No Nintendo IP is present.

## B1 — Original Pokefolio overworld artwork

The town tiles and character sprites in `public/assets/world/` are original Pokefolio artwork authored with integer-coordinate masks and pixel shapes in `assets-src/world/build.py`. No third-party images, extracted game assets, traced artwork, Nintendo/Game Freak characters, logos, or sprite sheets are used. The lossless PNG and JSON-hash atlases are generated locally; their per-tile and per-character palettes are recorded in `assets-src/world/palette-sheet.json` and the world manifest. These assets belong to this project and introduce no third-party asset-license dependency.

## B2 — Original Pokefolio opening artwork

The title wordmark, stepped sky, town silhouette, VS lettering and four portraits are original integer-pixel artwork authored in `assets-src/opening/build.py`. Production uses the lossless authored RLE masks in `assets-src/opening/art.json`; original PNG previews are in `public/assets/opening/`. No Nintendo/Game Freak assets or other third-party visual material are inputs. Existing canonical UI font and palette are unchanged.

## B3 — Original Pokefolio battle artwork

All 35 battle assets, including backgrounds, platforms, human sprites, project emblems, thumbnails and type pictograms, are authored locally in `assets-src/battle/build.py`, with no third-party visual inputs. The reproducible PNG/RLE masks and palette record belong to this project. The Pokémon Elo Rating project uses an original ranking trophy emblem, with no Pokémon character, ball, logo or copied game asset.

## B4 portfolio operating layer artwork and music

Original Pokefolio inventory/category emblems, type badges and 48×64 Uttkarsh portrait are
integer-pixel authoring in `assets-src/portfolio/build.py`. The 48px project treatments derive
only from our own B3 emblems. No Nintendo/Game Freak/Pokémon or external brand assets are
inputs. The quiet 32-step square-wave music phrase in `src/runtime/MusicService.ts` is an
original composition; it starts only after audio unlock and follows the shared Clock.
