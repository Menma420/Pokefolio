# Owner-supplied game music

Exact MP3 copies supplied by the owner:

| Source in artifacts/ | Authoring copy | Playback |
|---|---|---|
| 1-05. Littleroot Town.mp3 | town.mp3 | Town/interior/field loop |
| 1-17. Battle! (Trainer Battle).mp3 | battle.mp3 | Real battle scene loop |
| 1-18. Victory! (Trainer Battle).mp3 | victory.mp3 | Once on completed battle exit; then town resumes |

The builder copies these bytes unchanged to content-hashed production filenames.
SHA-256 values are in the production/source audio manifests. These are supplied Pokémon
soundtrack recordings, not original Pokefolio compositions. No new license grant is asserted.
The owner's explicit replacement request supersedes the earlier original-music plan.
The 16 UI sound effects remain original cue scores in the existing builder.

`decoded-metadata.json` records Chromium Web Audio's decoded dimensions at 48kHz for
regression checks (output-device resampling can change the sample rate, not the music).
Playback is gated by the existing first-input unlock, music mute and visibility handling.
Victory follows the existing completed-exit callback without changing gameplay timing or
introducing battle-win statistics. It pauses/resumes on mute or tab hide and yields to a
new encounter's scene change. A failed optional track cannot block gameplay.
