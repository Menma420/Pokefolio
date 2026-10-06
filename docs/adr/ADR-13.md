# ADR-13: P11 production presentation and scene audio

**Status:** Adopted under the owner's approved P11 implementation plan.

Keep the existing physical-pixel raster, palette, bitmap font, Window/Cursor, React/Phaser
boundary and deterministic Clock. Phaser renders landscapes and character sprites; React
renders prose, project identity, summary presentation, topics, commands and portfolio screens.

The project-summary gate belongs to battle presentation. It consumes verified shared project
selectors and dispatches the existing DETAILS event only after the initial summary completes.
A switched-project summary leaves the reducer's resolved destination untouched. B cancels the
summary; answer-reading B invokes the reducer's existing BACK event. The reconstruction brief supersedes the earlier topic-hint decision: root topic lists
say B: EXIT (back to commands), nested topic lists say B: BACK, and root commands say
B: EXIT (leave battle). All still dispatch their existing events. No tree or reducer edit.

LINK uses the existing shared safeOpen utility in the activating input call stack. Pressed
feedback and an opening notice follow that gesture. They never postpone browser permission.

Audio adapts the existing Web Audio services instead of adding Howler or another dependency.
A single scene transport plays original self-hosted WAV loops. Unlock alone starts no music;
town begins with overworld control, VS pauses town, battle begins on GameBridge battleReady,
and exact return resumes town. Web Audio owns sample timing; the shared Clock retains game
choreography and cue timing. Music and SFX mute independently. Hidden pages stop the transport;
resume restores its offset. Missing/failed tracks fail silently without retry loops.

Authoring uses reproducible original integer masks and note/chord scores. No Nintendo/Game
Freak assets, samples, extracted sprites, traced shapes, melodies, fonts or logos are inputs.
Existing 81 tile IDs remain stable; six new interior fixture/rug tiles append to the atlas.
The reconstruction reauthors terrain, characters, opening, battle and portfolio art.
Only decorative visual layers of the frozen town and three interiors change. Frozen structural signatures
are checked by the P11 regression test. All source content, map geometry and gameplay remain
owned by their existing modules.

## Reconstruction extension

Original token-indexed 6×6 nine-slice corners and edge strips in `assets-src/ui/frames.json` adapt the shared Window raster; the foundation
standard-frame geometry and canonical UI tokens stay unchanged. Screen classes use
independent native recipes: a right-side pause menu over pixel-dimmed field, a vertical
six-slot Party, compact battle lists, inventory pockets, split Dex/catalogue panes,
separate experience records and details, and an identity card. No reducers or ScreenStack
contracts change. VS impact and project withdrawal/send-out cues follow the shared Clock
frames. Asset dimensions and stable tile IDs remain regression-checked.

The presentation preserves role reversal explicitly: visitor/audience dialogue is labelled
VISITOR, Uttkarsh's first-person answers are labelled UTTKARSH, and VS identifies the
selected audience perspective opposite Uttkarsh. Authored narrator text has no speaker.
Audience selection changes the interview perspective, never Uttkarsh's identity.

Production touch EXIT exposed a queued Phaser post-render callback after its canvas had
been detached. WorldRaster and BattleRaster now ignore detached/disposed surfaces and
cancel their listeners on destruction. This lifecycle guard changes no physical raster
geometry, scale calculation or gameplay ownership.
