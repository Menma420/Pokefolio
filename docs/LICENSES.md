# 3rd Party Licenses

## Original bitmap font and UI
The 8px bitmap glyph masks in `assets-src/font/glyphs.json` are original project artwork.
No web font, Nintendo/Game Freak font or third-party typeface is shipped. UI tokens and
window/cursor masks are original code-native project assets.

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
inputs. P11 replaces the earlier short draft music phrase with the original score and exports below.

## P11 original production artwork and audio
Title lettering, character poses, reconstructed terrain and landmarks, interior fixtures, native project
thumbnails and skill pictograms are authored in the corresponding `assets-src/*` builders.
Skill symbols are engineering metaphors, not vendor logos. The skill inventory is generated
from shared content selectors; artwork adds no proficiency claims.

`assets-src/audio/build.py` contains the original 16-bar town and battle compositions and 16
short cue scores. PCM WAV exports in `public/assets/audio/` have no external samples,
melodies or copyrighted game-audio inputs. Town is 90 BPM in triple meter; battle is 120 BPM
in common time. Both loops last 32 seconds. All authored assets belong to this project; no
new third-party asset-license dependency is introduced. Existing package licenses still apply.

## P11 reconstruction frame atlas

`assets-src/ui/frames.json` contains original 6×6 corner and straight-edge pixel masks.
Indices resolve through the existing canonical UI palette at raster time. They contain no
borrowed artwork or baked replacement palette. The reconstruction also reauthors opening
figures, VS portraits, battle sprites, tangible project emblems, field sprites and inventory
art through the original reproducible builders. Reference MP3s in `artifacts/` are never
read by the audio builder or included in a production manifest.

## Owner-requested Brendan player replacement (Sprite Lab v0.8.3)

The overworld player now uses the owner-supplied reconstructed Pokémon Emerald Brendan
sheet, unchanged except for required East mirroring and lossless atlas packing. This
supersedes the original-art statement for the overworld player only. Terrain, NPCs,
challenger, opening and battle artwork remain as previously authored. The supplied
archive provides no license grant for the depicted Nintendo/Game Freak character;
no redistribution rights are asserted. Provenance and exact mapping are recorded in
`assets-src/world/brendan/README.md`.

## Owner-requested Steven / May NPC replacements

The challenger uses supplied Steven pixels; the nearby ordinary NPC uses supplied May
pixels. The last ordinary NPC initially used a fixed palette-only Steven variant, expressly selected
by the owner. These supersede the original-NPC-art statement for those three overworld
characters only. Source files, hashes and recolor are recorded in `assets-src/world/npcs/`.
No new license grant is supplied or asserted; other scenes and terrain remain unchanged.

The owner subsequently rejected the palette-only neighbor and requested Sprite Lab
randomization over Steven. The current neighbor changes measured construction geometry
and palette using the supplied Sprite Lab integer slot transform; its source/recipe and
provenance are in `assets-src/world/npcs/README.md`. Steven, May and Brendan remain exact
supplied actors. This derived neighbor does not change the source attribution above.

The owner rejected the randomized neighbor and supplied `Trainer.png` and
`Trainer-4dir.png` from Sprite Lab. The current ordinary neighbor uses that exact
four-direction export without palette/shape edits. Both files, hashes and provenance
are preserved in `assets-src/world/npcs/`. The earlier generated neighbor is no longer
part of the production atlas. Supplied walk frames do not exist; movement slots reuse
the exact directional poses rather than claiming reconstructed walking artwork.

## Owner-requested soundtrack replacement

The owner supplied `1-05. Littleroot Town.mp3`, `1-17. Battle! (Trainer Battle).mp3`
and `1-18. Victory! (Trainer Battle).mp3` and explicitly requested their production use.
These Pokémon soundtrack recordings replace the original town/battle compositions
and add the battle-exit cue. They are copied unchanged from `assets-src/audio/music/`
to hashed MP3 exports. This supersedes the earlier statements that the production
manifest contains only original music and never reads supplied recordings.
No license grant or original authorship of these supplied recordings is asserted.
The 16 UI cue scores remain original Pokefolio work. Provenance is recorded in
`assets-src/audio/music/README.md`; source/export SHA-256 checks are automated.
