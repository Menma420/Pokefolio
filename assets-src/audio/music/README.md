# Audio distribution boundary (P1.7)

Production uses the existing original Pokefolio WAV scores and original UI cues.
`../build.py` no longer copies soundtrack MP3s into public assets.

The three previously supplied soundtrack recordings have been preserved byte-for-byte
under ignored `artifacts/emerald-source/audio/imports/` and their redundant legacy
copies under `audio/legacy-import-backup/`. They are no longer production assets.
Git history was not rewritten. No imported soundtrack bytes should be staged.

Local source music uses the private manifest/endpoint and the single MusicService.
See `tools/emerald-reconstruction/AUDIO-README.md` for import, source conversion,
loop validation, missing tracks and reproduction commands. `decoded-metadata.json`
now describes the original production WAVs, not private soundtrack recordings.
Interview EXIT is not a victory and does not play a victory cue.
