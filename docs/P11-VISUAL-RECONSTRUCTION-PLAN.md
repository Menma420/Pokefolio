# PokéFolio — P11 Visual Reconstruction / Redesign Plan

**Status:** Replacement planning brief (post–owner rejection of conservative P11)  
**Scope:** Full visual presentation reconstruction — **planning only; not implementation**  
**Evidence base:** `artifacts/phase-11/` (126 screenshots, technical PASS, subjective visual FAIL)  
**Related:** [ADR-13](adr/ADR-13.md), [artifacts/phase-11/README.md](../artifacts/phase-11/README.md)

---

## IMPORTANT

This is a **REPLACEMENT** planning brief for P11.

The previous P11 interpretation was too conservative. It treated P11 as incremental visual polish:

- improve sprites
- refine terrain
- add hints
- tweak screens
- preserve most existing compositions

That is **not** the goal anymore.

The owner reviewed the resulting P11 implementation and rejected it visually because, despite technical polish, it still does **not** feel sufficiently like Pokémon Emerald.

The current product still reads as a custom/generic pixel-art RPG with Pokémon-inspired elements.

P11 must therefore be treated as a:

**FULL VISUAL PRESENTATION RECONSTRUCTION.**

Do **not** redesign the underlying game logic or architecture.  
**Do** redesign the entire visual presentation layer where necessary.

Do **not** optimize for minimum code changes.  
Optimize for **maximum visual transformation** while preserving locked behavior and architecture.

---

## 1. Executive Verdict

P11 shipped as a **technical polish pass**, not a **visual identity reconstruction**. All automated gates passed (207 tests, 50/50 browser cases, DPR matrix, frozen world signatures). The owner’s rejection is correct: the product still reads as **“nice retro pixel-art portfolio with Pokémon vocabulary”** rather than **“I opened Pokémon Emerald — wait, this is a portfolio.”**

**Verdict:** P11 implementation is **engineering-complete but visually incomplete**. The next phase must **replace presentation compositions wholesale** while keeping the frozen architecture (reducer, WorldSim, GameBridge, 36×22 topology, A/B/X/Y contracts, 240×160 renderer, bitmap font, canonical palette).

**North star:** Three-second recognition test → “Pokémon game” → then “developer portfolio.”

---

## 2. New P11 North Star

The target is:

> “I opened Pokémon Emerald.”  
> Then: “Wait — this is actually a developer portfolio.”

**Not:**

- “Nice retro pixel-art portfolio.”
- “Generic 90s RPG.”
- “Pokémon-inspired website.”

The game should feel like a genuine GBA-era Pokémon experience in:

- spatial composition
- screen hierarchy
- sprite proportions
- tile language
- menu composition
- dialogue presentation
- battle composition
- visual pacing
- interaction feedback
- information density
- transitions
- iconography
- world composition
- character framing

We are reproducing the **design language** and **experience character**.

We are **not** copying:

- Pokémon sprites
- Pokémon tiles
- Pokémon fonts
- Pokémon logos
- Pokémon music
- Pokémon battle backgrounds
- Nintendo / Game Freak copyrighted assets

---

## 3. Critical Change in Interpretation

Do **not** assume that the current UI compositions are inherently correct.

The previous plan over-preserved existing compositions.

For P11, ask:

> “If I were designing this screen from scratch for a Pokémon Emerald-era GBA game, using the current content and functional contract, how would I compose it?”

Then compare that hypothetical design to the current implementation.

If the current composition is fundamentally wrong: **recommend replacing it.**

Do not merely suggest:

- adding another border
- changing a color
- moving one label
- adding an icon
- tightening padding

Those are polish-level changes. P11 needs **system-level visual redesign**.

---

## 4. What Must Remain Frozen

Preserve:

- underlying game architecture
- core reducer semantics
- WorldSim
- GameBridge
- encounter evaluator
- LOS behavior
- camera behavior
- collision
- 36×22 map topology
- three buildings / interiors
- NPC count
- challenger behavior
- question trees
- Party membership
- audience semantics
- content facts
- portfolio routes
- accessibility architecture
- logical A/B/X/Y actions
- 240×160 renderer
- integer scaling
- bitmap font system
- canonical palette unless there is an explicit owner-approved extension

These are **engineering / product contracts**.

---

## 5. What Is Allowed to Be Redesigned

P11 **may** substantially redesign:

- every UI screen
- every UI composition
- every panel placement
- battle composition
- topic / question presentation
- Party presentation
- Player Menu presentation
- Pokédex presentation
- Project presentation
- Experience presentation
- Bag presentation
- Trainer Card presentation
- Options presentation
- title art composition
- world art
- tile appearance
- building art
- environmental art
- sprite silhouettes
- character proportions
- battle project art
- project icons
- skill icons
- transitions / pacing where behavior remains unchanged
- audio composition
- UI visual hierarchy

Preserve the underlying data and interaction behavior.

---

## 6. Why the Current P11 Still Doesn't Feel Like Emerald

The implementation optimized for **preservation + incremental art** instead of **Emerald structural grammar**:

| What P11 did | Why it fails the Emerald test |
|---|---|
| Retained existing screen geometries (`layout.tsx` absolute boxes, right-rail menu, full-screen cream lists) | Emerald screens have **distinct spatial recipes** per screen class — not one generic cream panel |
| Quieted grass/path, refined trees, 64 walk poses | Art refinement ≠ **environmental composition language** (clustering, shore grammar, landmark hierarchy) |
| 2×2 topic grid, split command windows | Correct *idea*, wrong *proportions* — still reads as web dashboard tiles |
| Portfolio screens = header bar + 16px rows | Reads as **spreadsheet UI**, not Pokédex / Bag / Party analogues |
| Battle kept plate-at-(8,8) + command-at-(112,112) | Structurally “Pokémon-shaped” but **missing field tension, platform drama, bottom-third command rhythm** |
| Original audio / SFX added | Sound exists; **visual-audio identity** not yet unified |
| Swatch proves pixel fidelity | Test A passes; **Tests B and C fail** |

Root cause: the plan asked *“how do we improve what exists?”* instead of *“how would Emerald compose this screen from scratch?”*

---

## 7. Five Biggest Visual Failures

### F1 — No unified GBA screen grammar

Every screen uses the same `Screen` → full-bleed `Window` → `Header` bar → 16px `Row` list. Emerald uses **screen-class-specific compositions** (Party slots, Bag split-pane, battle bottom-third, pause menu offset panel).

**Expected perception fix:** “These are game menus,” not “content in cream boxes.”

### F2 — Overworld reads as tile grid, not place

Flat grass blocks, lollipop trees, rectangular pond, sparse decoration, no path edge grammar, buildings lack readable facades / footprints.

**Expected perception fix:** “Starting town,” not “debug room with props.”

### F3 — Sprites lack GBA trainer silhouette

Characters are chibi-flat icons: large head, thin legs, minimal shading, weak grounding, no Emerald compact-trainer read at 16×32.

**Expected perception fix:** “GBA overworld trainer,” not “generic RPG token.”

### F4 — Battle / interview composition lacks dramatic hierarchy

Floating blue plates, oversized bottom panels, emblem as flat icon on platform, weak foreground / midground separation, command area feels like form buttons.

**Expected perception fix:** “Battle screen → oh, interview,” not “form on landscape.”

### F5 — Portfolio content presentation = website lists

Projects / Pokédex / Experience / Trainer Card use row + column metadata layout. Projects especially read as **SaaS catalogue**, not game content slots.

**Expected perception fix:** “In-game dex / bag / party,” not “portfolio CMS.”

---

## 8. New P11 Design Philosophy

**Principle 1 — Screen class first**  
Each screen belongs to an Emerald *class* (title, field dialogue, pause menu, dex list, dex detail, party, bag, battle, VS). Design the class recipe, then map portfolio data into it.

**Principle 2 — Composition over decoration**  
Replace layouts before adding borders. A wrong layout cannot be saved by palette fidelity.

**Principle 3 — Identity before metadata**  
Lead with emblem / icon / portrait / silhouette; metadata is secondary and compact.

**Principle 4 — Intentional compactness**  
240×160 is aggressively utilized. No dead bands, no web padding, no full-width empty cream.

**Principle 5 — One game, one system**  
Shared window family, cursor rhythm, header treatment, plate geometry, transition vocabulary — all screens must feel authored together.

**Principle 6 — Maximum visual transformation, frozen behavior**  
Redesign freely in presentation layer; zero reducer / WorldSim / collision / camera contract changes.

---

## 9. Complete Game-Wide Visual System

### 9.1 Reference board (conceptual — no copyrighted assets)

| Category | Emerald principle extracted | PokéFolio application |
|---|---|---|
| **Window family** | Double-bevel frame, inner highlight, corner cut-ins, fill texture implied by flat tone | Replace procedural `windowPixels()` output with **authored 9-slice frame atlas** (still palette-locked) |
| **Cursor** | 8×8 arrow, snaps on row change, no hover states | Keep bitmap cursor; add **selection flash** (2-frame invert on confirm path) |
| **Typography placement** | Labels upper-left in plates; values right-aligned in lists; dialogue inset 8px | Standardize insets: **8 / 11 / 7** px margins per screen class |
| **Status plates** | Compact upper corners, name dominant, sub-label below, no HP | Project plate = name + type badge row; audience plate = role label only |
| **List rhythm** | 14–16px row pitch, icon column, trailing category glyph | Pokédex / Projects: **24px rows** with 16×16 icon column |
| **Selection model** | Cursor + row highlight band (subtle fill shift) | Add **selected row fill** (`cream` → `gold` tint) |
| **Page indicators** | ▲ / ▼ at list edge, not floating | Move scroll glyphs to **fixed rail x=225** |
| **Battle bottom third** | Message window + command window **adjacent**, not stacked full-width | Split: message **152×48** left, commands **88×48** right |
| **Transitions** | Fade + slide with 8-frame stepped motion | Extend `TransitionDirector` presets per screen class |
| **Iconography** | 16×16 item / skill icons, consistent outline weight | Re-author all icons to **shared 1px outer outline rule** |
| **Environmental tiles** | Edge-aware autotile clusters, path width 2–3 tiles, tree blobs | Rebuild tile art with **edge-set grammar** on frozen topology |

### 9.2 Window taxonomy (new)

| Type | Use | Size recipe |
|---|---|---|
| **W-FIELD** | Overworld dialogue | 240×48 bottom docked |
| **W-MENU-NARROW** | Pause menu | 96–120×128–144, right-aligned, overworld visible left |
| **W-MENU-FULL** | Portfolio screens | 240×160 with class-specific interior split |
| **W-PLATE-S** | Battle project plate | 120×36 |
| **W-PLATE-A** | Audience plate | 96×20 |
| **W-CMD** | Battle commands | 88×48, 2×2 |
| **W-MSG** | Battle / field message | 152×48 |
| **W-SPLIT** | Bag, Dex detail | Left pane ~56–80px / right pane remainder |
| **W-CARD** | Trainer Card | Gold fill, inset portrait frame |

### 9.3 Motion vocabulary

| Event | Frames | Notes |
|---|---|---|
| Menu open | 8 | Slide from right + overworld dim (4-step opacity) |
| Menu close | 6 | Reverse slide |
| Cursor move | 0 | Instant + SFX |
| Confirm | 6 | Press tint + white flash 2f |
| Battle send-out | Existing | Re-time to match new emblem slot |
| VS entry | 24 | Portraits from offscreen + bar wipe |
| Dialogue advance | ▼ bob 16f | Keep; reduce box height so bob reads |

### 9.4 Sound reinforcement map

| Interaction | Cue | Visual sync |
|---|---|---|
| Title start | `title.start` | Wordmark drop completes on cue |
| Menu open | `menu.open` | Slide frame 2 |
| Cursor | `cursor.move` | Row highlight snap |
| Confirm | `ui.confirm` | Press flash |
| Cancel | `ui.cancel` | Slide-back start |
| VS | `vs.cue` | Stripe scroll peak |
| Battle enter | `battle.sendout` | Flash frame |
| LINK | `link.open` | Notice banner |
| Town loop | `town` | Starts on control, not unlock |

---

## 10. Screens That Must Be Explicitly Reconsidered

Do **not** protect current UI compositions. Explicitly reconsider:

- battle command placement
- topic grid composition
- Party layout
- Player Menu geometry
- Pokédex layout
- project detail layout
- experience layout
- Trainer Card composition
- Bag composition
- Options composition
- dialogue geometry
- battle plate geometry
- battle background hierarchy

If an existing layout is only “technically acceptable” but visually weak: **replace it**.

---

## 11. Screen-by-Screen Redesign

Format for each screen: **CURRENT → WHY IT FAILS → EMERALD MODEL → NEW DESIGN → KEEP / CHANGE → ASSETS → MOTION → SOUND → ACCEPTANCE**

---

### 1. Title

**CURRENT:** Stepped sky bands, flat house / tree silhouettes, wordmark drop, blinking PRESS START (`title-4x.png`).

**WHY IT FAILS:** Reads as minimalist indie title, not GBA franchise opening. Lacks depth layers, emblem focal point, bottom weight.

**EMERALD MODEL:** Layered sky, strong horizon, central logo mass, bottom third reserved for prompt, subtle animation.

**NEW DESIGN:** Recompose into **3 planes** — (1) animated cloud / sky parallax 2f, (2) town ridge with readable rooflines + tree mass, (3) foreground path / grass band. Wordmark **larger, lower-center** (y≈52). PRESS START in **window strip** (W-FIELD mini) at bottom. Optional sparkle on é accent 32f loop.

**KEEP:** Wordmark authorship, Start input, palette.  
**CHANGE:** Entire background composition, prompt framing.

**ASSETS:** New `opening/background` RLE (replace, don’t patch), optional 2-frame cloud tiles.

**MOTION:** Cloud scroll 1px/32f; wordmark drop 12f; prompt blink 32f.

**SOUND:** `title.start` on first A; town loop deferred.

**ACCEPTANCE:** 3s test → “GBA game title,” not “portfolio splash.”

---

### 2. Intro

**CURRENT:** Intro background + paginated `DialogueBox`.

**WHY IT FAILS:** Dialogue box proportions are field-generic; no intro-specific framing (portrait slot / safe crop).

**EMERALD MODEL:** Opening sequence uses **full-width lower dialogue** with scene visible above.

**NEW DESIGN:** Crop intro art to **upper 112px** active scene; dock **W-FIELD** at y=112 with **tighter 4-line max**. Add small **trainer portrait inset** (32×32) left of text for beats 2–3.

**KEEP:** Narrative content, pagination, Clock typing.  
**CHANGE:** Box geometry, portrait slot, background crop safe area.

**ASSETS:** Intro background recompose with lower safe zone; portrait frame.

**MOTION:** Page flip = 4f horizontal wipe.

**SOUND:** `text.tick`, `page`.

**ACCEPTANCE:** Reads as “game intro dialogue,” not “text modal.”

---

### 3. Tutorial

**CURRENT:** Nonblocking 8s overlay: X/Y hints, menu path, ENJOY beat (`tutorial-*-beat.png`).

**WHY IT FAILS:** Floating text boxes; no tutorial **frame** or iconography.

**EMERALD MODEL:** Help uses **compact callout windows** near relevant UI region.

**NEW DESIGN:** Three **anchored callouts** — (1) near top-right for X:MENU, (2) points at menu slot when open, (3) center toast for ENJOY. Use **W-PLATE-S** callout style, not full dialogue.

**KEEP:** 8s timing, nonblocking, Y→Bag path.  
**CHANGE:** Callout positions, shapes, icons (16×16 button glyphs).

**ASSETS:** Tutorial callout frame tiles, A/B/X/Y icon strip.

**MOTION:** Callout pop 6f scale-step.

**SOUND:** Soft `ui.confirm` on each beat.

**ACCEPTANCE:** Hints feel like in-game tooltips, not docs overlay.

---

### 4. Overworld

**CURRENT:** 36×22 grid, flat grass / path, lollipop trees, pond rectangle, sparse props (`town-4x.png`).

**WHY IT FAILS:** No place identity; tile repetition obvious; paths don’t guide; buildings not landmarks.

**EMERALD MODEL:** Starting town = **path spine**, clustered vegetation, shore transitions, building facades readable from overhead, NPC grounding.

**NEW DESIGN:** Rebuild **tile art only** on frozen topology:

- Path system: 2-tile-wide spine with **corner / set pieces**
- Grass: 3-tone with **edge tufts** against path
- Water: shore ring + ripple center (3×3 minimum)
- Trees: **multi-tile canopies** (2×2 blob + trunk), not circles
- Buildings: **facade tiles** (door, window, roof eaves) at existing footprints
- Props: flowers / rocks / sign as **edge-attached**, not random scatter

**KEEP:** Collision, layers, map JSON positions, 81+6 tile IDs.  
**CHANGE:** All tile pixels, decor clustering pass on same coordinates.

**ASSETS:** Full `town-tiles` atlas rebuild; building facade sheets; tree 2×2 sets.

**MOTION:** Water shimmer 2f; tall-grass rustle optional.

**SOUND:** `world.bump`, grass rustle optional.

**ACCEPTANCE:** Screenshot at spawn → “Pokémon town,” not “tile test map.”

---

### 5. Ordinary NPC dialogue

**CURRENT:** Bottom `DialogueBox` over overworld (`ordinary-npc-dialogue-4x.png`).

**WHY IT FAILS:** Box too tall for short lines; no speaker context; overworld dim missing.

**EMERALD MODEL:** **W-FIELD** 240×48, 2–3 lines, ▼ bottom-right, world visible above with **slight dim**.

**NEW DESIGN:** Reduce box to **48px height**; add **4px top inner shadow** on world during dialogue. Optional **NPC name plate** (80×16) above box left.

**KEEP:** DialogueService, typewriter, interact flow.  
**CHANGE:** Box dimensions, dim overlay, name plate.

**ASSETS:** W-FIELD frame variant; dim overlay strip.

**MOTION:** Box slide-up 4f on open.

**SOUND:** `text.tick`, `ui.confirm`.

**ACCEPTANCE:** Standard field dialogue read instantly.

---

### 6. Challenger encounter

**CURRENT:** Exclamation bubble + dialogue (`challenger-dialogue.png`).

**WHY IT FAILS:** Bubble generic; lacks encounter **zoom tension**.

**EMERALD MODEL:** Flash bubble → face-to-face → challenge text.

**NEW DESIGN:** Enhance bubble (**8×8 art**, 2-frame pulse); **1-tile camera nudge** toward challenger (presentation-only offset — not changing collision camera algorithm); challenger name plate.

**KEEP:** Encounter evaluator, LOS, step trigger.  
**CHANGE:** Bubble art, micro-camera presentation nudge, dialogue staging.

**ASSETS:** New exclamation sprite sheet; name plate W-PLATE-A.

**MOTION:** Bubble pulse 4f; camera nudge 8f return.

**SOUND:** `encounter.alert`.

**ACCEPTANCE:** “Trainer spotted me” feeling before battle.

---

### 7. Audience selection

**CURRENT:** Choice window with Recruiter / Engineer / Friend (`audience-selection.png`).

**WHY IT FAILS:** Flat list; no **role identity** preview (portrait / icon / color).

**EMERALD MODEL:** Multi-choice box with **▶** and compact options; important choices sometimes show icons.

**NEW DESIGN:** **3-row choice** with **24×24 audience bust** left column, label right; selected row **gold band**. Window **centered 200×80**, not bottom-full.

**KEEP:** Audience IDs, selection reducer events.  
**CHANGE:** Layout, icons, window placement.

**ASSETS:** 3 audience bust sprites (original).

**MOTION:** Row select snap; confirm flash.

**SOUND:** `cursor.move`, `ui.confirm`.

**ACCEPTANCE:** Feels like “choose battle format,” not settings enum.

---

### 8. VS

**CURRENT:** Diagonal checkerboard, busts, VS lettering, name bar (`vs-recruiter.png`).

**WHY IT FAILS:** Static, flat checkerboard reads “placeholder”; lacks **bar wipe energy**.

**EMERALD MODEL:** VS = **motion + stripe field + portraits slam + name reveal**.

**NEW DESIGN:** Replace checkerboard with **scrolling diagonal bars** (palette-locked blues); portraits **enter from ±240** over 12f; VS logo **impacts** at f8 with 2f white flash; name bar **slides up** at f16.

**KEEP:** Audience-specific palettes, portrait art base (can redraw).  
**CHANGE:** Background system, timing choreography, name bar geometry.

**ASSETS:** VS background tile strip; improved busts with shading; VS logo with impact frames.

**MOTION:** 24f sequence (see above).

**SOUND:** `vs.cue` synced to impact frame.

**ACCEPTANCE:** Screen screams “VS” before reading text.

---

### 9. Battle

**CURRENT:** Platforms, plates, emblem slot, split command / topic areas (`actual-battle-command-4x.png`, `topics-2x2.png`).

**WHY IT FAILS:** Plates float; bottom UI too large; emblem doesn’t feel “sent out”; weak depth.

**EMERALD MODEL:** Upper field drama; **lower third** split message / commands; compact plates tucked to corners; active entity dominates.

**NEW DESIGN — full recomposition:**

```
┌──────────────────────────────────────┐
│ [Project plate 120×36]     [emblem]  │  ← opponent field
│         platform    challenger sprite│
│                                      │
│  visitor back-sprite    platform     │
├──────────────────┬───────────────────┤
│ W-MSG 152×48     │ W-CMD 88×48       │
│ dialogue/topics  │ command grid      │
└──────────────────┴───────────────────┘
```

- Rebuild background: **horizon band + mid grass + foreground platform ellipse shading**
- Emblem slot: **56×56** with send-out arc motion from plate
- Topic mode: **W-MSG expands to 240×48** with **2×2 compact cells** (not 80px tall window)
- Plates: shrink, tuck to **(4,4)** and **(140,92)**

**KEEP:** Command set, topic tree, send-out timing hooks, no HP bars.  
**CHANGE:** Nearly all battle UI coordinates; background hierarchy; topic / command layout.

**ASSETS:** Battle background rebuild; platform shading; plate frames; emblem animation frames.

**MOTION:** Retime send-out to new slot; plate slide on switch.

**SOUND:** `battle.sendout`, `battle.withdraw`, battle loop on ready.

**ACCEPTANCE:** Instant “battle screen” → second beat “interview.”

**No HP bars. No fake RPG stats. Do not turn battle into a dashboard.**

---

### 10. Battle summary

**CURRENT:** `DialogueBox` summary gate before topics.

**WHY IT FAILS:** Same box as answers; no “dex entry” feel for project context.

**EMERALD MODEL:** Pokédex entry / sign = **structured identity block** then continue.

**NEW DESIGN:** Summary as **mini dex card** in message area: emblem 32×32, name, type, 2-line blurb, “CONTINUE ▼”.

**KEEP:** Summary adapter, DETAILS event, B cancel.  
**CHANGE:** Summary visual template.

**ASSETS:** Summary card frame.

**MOTION:** Card fade-in 6f.

**SOUND:** `page` on complete.

**ACCEPTANCE:** Summary feels like “project revealed,” not paragraph modal.

---

### 11. Topic selection

**CURRENT:** 2×2 grid in 80px tall window (`topics-2x2.png`).

**WHY IT FAILS:** Cells feel like form quadrants; labels float in empty cream.

**EMERALD MODEL:** Move select / multi-choice uses **tight options** with cursor, not giant tiles.

**NEW DESIGN:** **Four options in W-MSG** as **2×2 text grid** (no inner windows), 10px pitch, cursor in cell; optional **category color dot** 4×4 per topic.

**KEEP:** 2×2 navigation, B:BACK, topic data.  
**CHANGE:** Remove nested Window; cell geometry; typography density.

**ASSETS:** Optional topic category dots.

**MOTION:** Cursor snap per cell.

**SOUND:** `cursor.move`, `ui.confirm`.

**ACCEPTANCE:** Topics read as “battle menu choices,” not dashboard tiles.

---

### 12. Answer

**CURRENT:** Battle dialogue box, paged answers (`answer-depth-*.png`).

**WHY IT FAILS:** Wall of text in generic box; no **speaker directionality**.

**EMERALD MODEL:** Battle message box with **compact line count**; important lines may pause.

**NEW DESIGN:** W-MSG with **max 3 lines visible**; **audience mini-bust 16×16** left margin when audience speaks; player answers plain.

**KEEP:** Two-line paging, reading / back semantics.  
**CHANGE:** Speaker indicator, line limits, box content inset.

**ASSETS:** Audience mini-busts.

**MOTION:** ▼ bob; page horizontal wipe 4f.

**SOUND:** `text.tick`, `page`.

**ACCEPTANCE:** Reads as interview exchange in battle context.

---

### 13. Leaf return

**CURRENT:** Return to topic root with B:BACK (`leaf-return-back.png`).

**WHY IT FAILS:** No visual confirmation of **navigation depth change**.

**EMERALD MODEL:** Menu stack pops with subtle **cursor memory** flash.

**NEW DESIGN:** On leaf return, **8f header flash** “TOPICS” in plate; cursor restores to last index with blink once.

**KEEP:** Reducer BACK semantics.  
**CHANGE:** Transition feedback.

**ASSETS:** None (motion only).

**MOTION:** Header blink 8f.

**SOUND:** `ui.cancel`.

**ACCEPTANCE:** User feels they climbed up a tree, not cleared a form.

---

### 14. Party

**CURRENT:** 2×3 card grid with icons (`party-recruiter-4x.png`).

**WHY IT FAILS:** **Dashboard cards**, not Pokémon party slots.

**EMERALD MODEL:** Party = **six vertical slots**, icon + name + status row, active slot highlighted.

**NEW DESIGN:** **6×24px slots** stacked; left **16×16 emblem**; center name; right type glyph; empty slots show “—”; active project **gold row + cursor**. Bottom W-MSG: “Choose a Project. ACTIVE”.

**KEEP:** Six projects, switch behavior, send-out hook.  
**CHANGE:** Entire Party layout — **replace grid with slot list**.

**ASSETS:** Slot row highlight band; compact type glyphs.

**MOTION:** Row slide 4f on switch confirm.

**SOUND:** `ui.confirm`, `battle.sendout` on switch.

**ACCEPTANCE:** “Party screen” instant recognition.

---

### 15. Player Menu

**CURRENT:** 104×128 narrow panel slides from right (`player-menu-4x.png`).

**WHY IT FAILS:** Too narrow, floats like web drawer; overworld not dimmed; no **START menu** weight.

**EMERALD MODEL:** Pause menu = **offset panel ~50% width**, overworld visible / dimmed left, bold entries.

**NEW DESIGN:** **W-MENU-NARROW 120×144** at x=120; **left 120px overworld dimmed**; menu entries **18px pitch** with icons (16×16) per entry; EXIT separated by divider.

**KEEP:** Seven items, X toggle, slide transition.  
**CHANGE:** Width, icons, dim layer, entry spacing.

**ASSETS:** Menu item icons (7); dim overlay.

**MOTION:** Slide 8f + dim fade 4f.

**SOUND:** `menu.open`, `cursor.move`.

**ACCEPTANCE:** X press → “game pause menu” immediately.

---

### 16. Pokédex (list)

**CURRENT:** Full-screen list, 16px rows, icon + name + badge (`pokedex-4x.png`).

**WHY IT FAILS:** Spreadsheet density; wrong **list / detail relationship**.

**EMERALD MODEL:** Dex list = **icon column + number / name + seen marker**; often left-heavy.

**NEW DESIGN:** **W-SPLIT**: left **56px** category panel (icon + short name); right **scroll list** 24px rows; **selected row** shows large icon preview in left pane.

**KEEP:** Categories, skills data, scroll.  
**CHANGE:** Split layout, row height, preview pane.

**ASSETS:** Category panel icons; list row highlight.

**MOTION:** Preview swap 4f on cursor move.

**SOUND:** `page` on category change.

**ACCEPTANCE:** “Pokédex list,” not “skills table.”

---

### 17. Pokédex detail

**CURRENT:** Header + large icon + text blocks (`skill-detail-*.png`).

**WHY IT FAILS:** Flat document layout; “WHERE USED” feels like footer disclaimer.

**EMERALD MODEL:** Dex entry = **creature page**: large sprite left, stats right, description below fold.

**NEW DESIGN:** Left **64×64 skill art**; right **type badge + category**; bottom **description 4 lines**; “WHERE USED” as **related project chips** (max 3) not full-width rows.

**KEEP:** Pagination, related project links.  
**CHANGE:** Entry page template.

**ASSETS:** Detail page frame; project chip frames.

**MOTION:** Page flip on ▼.

**SOUND:** `page`.

**ACCEPTANCE:** Feels like dex entry page.

---

### 18. Projects (catalogue)

**CURRENT:** 16px rows + tagline footer (`projects-4x.png`).

**WHY IT FAILS:** **Portfolio catalogue**, not in-game content list.

**EMERALD MODEL:** Bag / Pokédex list hybrid — **icon identity dominant**.

**NEW DESIGN:** **24px rows** with **24×24 emblem** (not 16), name **max 10 chars visible**, type as **color chip** not text right-aligned; footer **single-line flavor**.

**KEEP:** 12 projects, tagline data, scroll.  
**CHANGE:** Row template, emblem size, type presentation.

**ASSETS:** 24×24 project list emblems (upscale / redraw from 16).

**MOTION:** Footer tagline crossfade 4f on cursor move.

**SOUND:** `cursor.move`.

**ACCEPTANCE:** Projects feel like “party / bag entries,” not SaaS list.

---

### 19. Project detail

**CURRENT:** Three sections via header arrows (`project-detail-*.png`).

**WHY IT FAILS:** **Web page sections**; identity block weak.

**EMERALD MODEL:** Item / scene detail = **hero icon + structured fields**.

**NEW DESIGN:** Persistent **top band 48px**: emblem 32×32 + name + type; sections as **tabs drawn as 3 small plates** (OVERVIEW / TECH / LINKS); body fills lower 112px.

**KEEP:** 3 sections, LINK list, write-up route.  
**CHANGE:** Tab visual system, identity band.

**ASSETS:** Tab plate frames (selected / unselected).

**MOTION:** Tab switch 4f horizontal.

**SOUND:** `page`.

**ACCEPTANCE:** “Inspecting game content,” not “reading portfolio page.”

---

### 20. Experience (list)

**CURRENT:** Company rows + divider + section text (`experience-4x.png`).

**WHY IT FAILS:** Single-screen tries to do list + detail; cramped.

**EMERALD MODEL:** List screens don’t show detail body simultaneously.

**NEW DESIGN:** List mode **only** — 5 company rows, period right-aligned; **no inline body** until detail screen.

**KEEP:** Cursor, enter to detail.  
**CHANGE:** Remove inline section preview from list view.

**ASSETS:** Row template reuse from Projects.

**MOTION:** Standard list snap.

**SOUND:** `cursor.move`.

**ACCEPTANCE:** Clear list → detail progression.

---

### 21. Experience detail

**CURRENT:** Combined with list in one component.

**WHY IT FAILS:** Split attention.

**EMERALD MODEL:** Full-screen detail with back navigation.

**NEW DESIGN:** Full W-MENU-FULL: header company name; **role + period plate**; section name as **tab**; body 6 lines paginated.

**KEEP:** Section pagination, content facts.  
**CHANGE:** Dedicated detail composition.

**ASSETS:** Experience header plate.

**MOTION:** Page flip.

**SOUND:** `page`.

**ACCEPTANCE:** Reads as “trainer profile entry.”

---

### 22. Bag

**CURRENT:** Top list + bottom description window (`bag-documents-*.png`).

**WHY IT FAILS:** Close, but **top header wrong** — Bag should use **left category icon + right list**.

**EMERALD MODEL:** Bag = **left pocket tabs**, right item list, bottom description.

**NEW DESIGN:** **Left 48px vertical category strip** (4 icons); right **item list**; bottom **W-MSG 48px** description; selected item **highlight band**.

**KEEP:** Categories, items, reading flow.  
**CHANGE:** Category navigation from horizontal header to **vertical strip**.

**ASSETS:** Larger category icons 24×24; strip highlight.

**MOTION:** Category switch slides list 4f.

**SOUND:** `page`, `ui.confirm`.

**ACCEPTANCE:** “Bag screen” not “file list + footer.”

---

### 23. Bag categories

**CURRENT:** Header arrows switch category name.

**WHY IT FAILS:** Hidden category model.

**EMERALD MODEL:** Visible pocket icons always on screen.

**NEW DESIGN:** (Merged into #22) persistent strip.

**KEEP:** Category order, items per category.  
**CHANGE:** Navigation metaphor.

**ASSETS:** See #22.

**ACCEPTANCE:** Category visible at a glance.

---

### 24. Resume / document (bag reading)

**CURRENT:** Full-screen `DialogueBox` overlay.

**WHY IT FAILS:** Same as field dialogue — OK but should feel like **reading item**.

**EMERALD MODEL:** Key item text = centered scroll or letter frame.

**NEW DESIGN:** **Parchment-style inner frame** (palette gold inner) inside W-MENU-FULL; text inset; “CLOSE” hint.

**KEEP:** Dismissible dialogue, text content.  
**CHANGE:** Frame styling.

**ASSETS:** Letter frame 9-slice.

**MOTION:** Open fade 6f.

**SOUND:** `page`, `ui.cancel`.

**ACCEPTANCE:** “Reading an in-game document.”

---

### 25. Trainer Card

**CURRENT:** Gold cream form + portrait (`trainer-card-4x.png`).

**WHY IT FAILS:** **Form fields**, not **trainer identity card**.

**EMERALD MODEL:** Card = portrait dominant, ID block, compact facts, badge row.

**NEW DESIGN:** **Card plate** centered 216×136; top **TRAINER CARD** ribbon; left **48×64 portrait**; right **ID block** (NAME / ID / SCHOOL); bottom **3 badge slots** (focus areas as original emblem icons); highlights as **footer ticker** 2 lines max.

**KEEP:** Profile data, Y hint semantics via notice.  
**CHANGE:** Entire layout — form → card.

**ASSETS:** Card frame gold; 3 focus badges; ribbon art.

**MOTION:** Card flip-in 8f optional on first open.

**SOUND:** `menu.open` subtle.

**ACCEPTANCE:** “Trainer card,” not “resume form.”

---

### 26. Options

**CURRENT:** Standard list with ◂ value ▸ (`options-*.png`).

**WHY IT FAILS:** Functional but generic; no **settings screen** identity.

**EMERALD MODEL:** Options = list with **value column aligned**, sometimes icons.

**NEW DESIGN:** Keep list but add **left icon column** (music note, sfx, text, motion); align values **x=168** fixed; separator before CONTROLS.

**KEEP:** All settings semantics, mute behavior.  
**CHANGE:** Icons, column alignment.

**ASSETS:** 6 setting icons.

**MOTION:** Value change 2f blink.

**SOUND:** `ui.confirm`, `ui.buzz`.

**ACCEPTANCE:** “Game options,” not web settings.

---

### 27. Touch controls

**CURRENT:** External D-pad + ABXY (`touch-*.png`).

**WHY IT FAILS:** Controls look **mobile overlay**, not integrated GBA chrome.

**EMERALD MODEL:** Touch layers mimic **hardware** — rounded pad, button labels.

**NEW DESIGN:** **GBA-styled pad**: darker teal shell, **embossed ABXY** with letter labels; **48px min** preserved; optional **semi-transparent** when idle 50% → 100% on touch.

**KEEP:** ≥48px targets, parity with keyboard.  
**CHANGE:** Visual styling only.

**ASSETS:** Touch shell sprites (CSS or raster).

**MOTION:** Press depress 2f.

**SOUND:** Unchanged.

**ACCEPTANCE:** Touch feels like handheld controls, not website buttons.

---

## 12. Overworld Rebuild

**Scope:** Art-only on frozen 36×22 topology.

The map topology stays frozen. The visual composition does not.

Rebuild the art language of the existing map so it resembles a believable Pokémon-style starting town.

Think in terms of:

- foreground / midground / background
- paths as navigational structures
- clustered vegetation
- strong silhouettes
- readable building facades
- visual landmarks
- compact tile grammar
- soft environmental repetition
- controlled texture

The current world should stop feeling like: **“a grid of pixel-art tiles.”**  
It should feel like: **“a place in a Pokémon world.”**

Do **not** add random decoration.

### Tile families to re-author

| Family | Tiles | Grammar |
|---|---|---|
| Grass | 4 core + 8 edges | Tuft edges toward path / water |
| Path | 4 core + 12 turns / T | 2-wide spine, rounded corners |
| Water | 4 core + 8 shore | Shore ring mandatory |
| Tree | 3 sizes | 2×2 canopy + trunk anchor |
| Building | per footprint | Door / window / roof eaves |
| Fence | existing walls | Post + rail repeat |
| Decor | flowers, rocks, sign | Edge-attached only |

### Landmark pass (same coordinates)

1. **Spawn path intersection** — make T-junction readable as town center
2. **Pond + workshop** — shore + dock tiles
3. **Grand tree** — 2×2 canopy landmark
4. **Three building facades** — unique silhouettes
5. **Challenger approach** — clear sightline corridor

**Acceptance:** `town-1x.png` at native scale passes Test B without UI.

---

## 13. Sprite Rebuild

Sprites must be **redesigned**, not just repaired. The issue is larger than animation.

Redesign: silhouette, body proportions, head / body ratio, legs, shoes, arms, stance, grounding.

The character should read as a compact GBA trainer sprite.

### Requirements

- 16×32 art box
- 16×16 collision
- four directions
- idle
- three walk frames
- visibly alternating legs
- readable feet
- grounded stance

### Proportions (authoring spec)

| Region | px height | Notes |
|---|---|---|
| Head | 8–9 | Round, not oversized |
| Torso | 10–11 | Jacket mass readable |
| Legs | 10–12 | **Alternating stride visible** |
| Feet | 2 | **Planted**, 1px shadow |

### Characters (4 designs × 4 dirs × 4 poses = 64)

- Player (4 walk + idle)
- Challenger
- 2 NPCs

**Reject:** noodle legs, floating feet, tiny adult, giant head, realistic proportions, generic RPG sprites.

**Acceptance:** `walking-four-directions-4x.webm` — stride readable at 1x; silhouette matches trainer reference board proportions (not traced).

---

## 14. Battle Rebuild

See §11.9. Summary of **mandatory replacements**:

1. Background horizon structure
2. Platform shading / ellipse
3. Plate geometry (smaller, corner-tucked)
4. Bottom third W-MSG + W-CMD split
5. Emblem send-out arc to 56×56 slot
6. Topic grid inside message area (no 80px window)

**No HP bars. No fake stats.**

The visitor should immediately perceive: **“Battle screen.”**  
Then realize: **“This is an interview.”**

The active project should occupy a creature-like presentation role.

---

## 15. Menu Rebuild

See §11.15. Core change: **120px menu + dim + icons**, not 104px floating list.

Exit confirmation: merge into **center-bottom W-MSG** + right **YES / NO plate** (keep behavior, redraw geometry to match Emerald confirm pattern).

Desired outcome: press X → instantly feels like opening the game’s Start / Menu system.  
Not: “a narrow cream panel on top of a website.”

---

## 16. Party / Pokédex / Bag / Trainer Card Rebuild

| Screen | From | To |
|---|---|---|
| Party | 2×3 cards | 6 slot list |
| Pokédex | Full list | Split preview + list |
| Bag | Horizontal cats | Vertical pocket strip |
| Trainer Card | Form | Card plate + badges |

All share **24px row rhythm** and **selected band** styling.

Do not simply put portfolio content inside cream boxes. The content must inherit the visual grammar of the game.

---

## 17. Title / Intro / VS Rebuild

| Screen | Priority | Key move |
|---|---|---|
| Title | P0 | Layered parallax + prompt window |
| Intro | P1 | Portrait inset + cropped safe area |
| VS | P0 | Motion bars + timed impact sequence |

These three drive **first-10-second** recognition.

---

## 18. Projects Must Stop Looking Like Portfolio Cards

Project identity should be communicated through:

- emblem / icon
- name
- type / category
- visual identity
- compact description
- interaction

**Not** through:

- website cards
- hero screenshots
- SaaS dashboards
- modern metadata panels

---

## 19. Control Hints (frozen contract)

Keep the owner’s latest decision:

| Context | B label |
|---|---|
| Root commands | **B: EXIT** |
| Nested state | **B: BACK** |
| Root topic list / post-leaf root state | **B: EXIT** |
| Nested topic | **B: BACK** |

- A must always match the current action
- A and Enter identical
- B and Backspace identical

Do not let visual redesign break the control contract.

---

## 20. Audio / SFX System

Keep the original composition requirement.

**Town:** peaceful / intimate / nostalgic / warm / slightly wistful / hometown / beginning of adventure.  
Creative target: *“Make me remember Littleroot Town without playing Littleroot Town.”*

**Battle:** energetic / curious / interview tension / not aggressive.

Audio should be treated as part of the **complete game identity**, not merely “replace oscillator.”

Design / sync:

- title cue
- town loop
- encounter cue
- audience / VS cue
- battle loop
- send-out
- cursor
- confirm
- cancel
- page
- reaction
- LINK

### Required sync pass

| Cue | Re-sync to |
|---|---|
| `title.start` | Wordmark landing frame |
| `vs.cue` | VS impact frame 8 |
| `battle.sendout` | Emblem flash frame |
| `menu.open` | Slide frame 2 |
| Town loop | Control gain (unchanged) |

### Mix targets

- **Town:** 90 BPM triple — warmer lead, less square wave dominance
- **Battle:** 120 BPM — interview tension via staccato rhythm, not aggressive drums

**Acceptance:** Owner listening test — “Littleroot feeling” without copying.

---

## 21. Asset Production Plan

| Bundle | Assets | Est. count |
|---|---|---|
| `opening` | Title BG, intro safe crop, VS bars / busts / logo frames | ~12 |
| `world` | Full tile atlas, characters 64 poses, bubbles | ~100+ tiles, 64 sprites |
| `battle` | BG, platforms, plates, emblems refresh | ~20 |
| `portfolio` | Menu icons, bag strip, card frame, skill / list emblems 24px | ~40 |
| `audio` | Re-mix town / battle, re-sync cues | 15 cues + 2 loops |
| **UI frames** | 9-slice window atlas (new) | ~6 variants |

**All original. No Nintendo inputs. Palette-locked unless owner approves extension.**

---

## 22. Recommended Art Pipeline

1. **Reference board** (internal mood frames — proportions only)
2. **Layout wireframes** at 240×160 native (ASCII / blocking) — approve before pixels
3. **Python builders** (`assets-src/*/build.py`) — maintain reproducibility
4. **RLE export** → `public/assets/*`
5. **FoundationSwatch update** — new canonical specimen
6. **Screenshot matrix recapture** — 126+ PNGs
7. **Owner review gate** — Tests A+B+C human sign-off

**Tooling:** Existing integer mask pipeline; add `assets-src/ui/` for 9-slice frames if procedural `windowPixels()` insufficient.

---

## 23. Implementation Order

### Wave 0 — Systemic foundations (blocks everything)

1. Window 9-slice atlas + selected row band
2. Screen-class layout primitives (replace `Screen` / `Header` / `Row` patterns)
3. Dim overlay component
4. Motion sync hooks for audio

### Wave 1 — First-10-second identity

5. Title recomposition
6. VS sequence rebuild
7. Player menu + dim
8. Sprite full rebuild

### Wave 2 — Core loop

9. Overworld tile atlas rebuild
10. Field dialogue W-FIELD
11. Battle full recomposition
12. Party slot list

### Wave 3 — Portfolio screens

13. Pokédex split
14. Projects / detail tabs
15. Bag vertical strip
16. Trainer Card plate
17. Experience list / detail split
18. Options icons

### Wave 4 — Polish + verification

19. Tutorial callouts
20. Touch chrome
21. Audio re-sync
22. Full screenshot matrix + owner review

---

## 24. Systemic vs Local Changes

| Systemic (high leverage) | Screens improved |
|---|---|
| Window 9-slice atlas | All 27 |
| Selected row band | 15+ list screens |
| W-FIELD / W-MSG / W-CMD sizes | Battle, dialogue, topics |
| Split-pane primitive | Dex, Bag |
| Menu dim + width | Player menu, pause feel |
| 24px row rhythm | Projects, Dex, Party, Bag |
| Sprite proportions | Overworld, VS, battle |

| Local (still required) |
|---|
| Title parallax layers |
| VS bar scroll art |
| Trainer Card badge row |
| Project detail tabs |
| Touch shell styling |

**Prefer systemic first** — avoids re-fixing 15 screens individually.

---

## 25. File / Component Impact Map

| Area | Files (expected touch) |
|---|---|
| **UI kit** | `Window.tsx`, new `WindowFrame.tsx`, `DialogueBox.tsx`, `CommandGrid.tsx`, `TopicGrid.tsx`, `MenuList.tsx`, `ActionHints.tsx`, `FoundationSwatch.tsx`, `palette.ts` (maybe) |
| **Layout system** | `portfolio/layout.tsx` — **major replacement** of `Screen`, `Header`, `Row` |
| **Portfolio** | `PortfolioScreens.tsx`, `MenuScreens.tsx`, `PlayerMenu.tsx` |
| **Battle** | `BattleScreen.tsx`, `PartyScreen.tsx`, `VsScreen.tsx`, `battle-presentation.ts` |
| **Opening** | `TitleScreen.tsx`, `PixelArtwork.tsx` |
| **World** | `assets-src/world/build.py`, `MapRenderer.ts` (presentation hooks only), tile manifests |
| **Battle art** | `assets-src/battle/build.py`, `BattleScene.ts` (platform positions) |
| **Opening art** | `assets-src/opening/build.py` |
| **Portfolio art** | `assets-src/portfolio/build.py`, `skills.py` |
| **Audio** | `assets-src/audio/build.py`, `MusicService.ts` (sync offsets only) |
| **Tests** | `p11-production.spec.ts`, UI snapshots, art contract tests |
| **Docs** | New ADR-14 (visual reconstruction), update ADR-13 status |

**Frozen (no logic changes):** `core/battle/*`, `WorldSim`, `GameBridge` reducer wiring, map JSON topology, collision, camera algorithm.

---

## 26. Test Plan

### Automated (must stay green)

- All P0–P10 regressions (44 cases)
- P11 production suite (6 cases) — update snapshots **meaningfully**, don’t weaken assertions
- World structure fixture signatures
- DPR 1/2/3 × scale 1–8 swatch matrix
- Input parity A/Enter, B/Backspace
- B hint contract: root EXIT, nested BACK

### New visual contract tests

- Battle layout bounds: W-MSG at y=112, W-CMD right split
- Party: 6 slot rows exist (not 2×3 grid)
- Menu: width ≥120px, dim layer present
- Pokédex: split pane widths 56 + 184

### Behavioral smoke

- Full recruiter path: title → town → encounter → VS → battle → topics → answer → party switch → exit
- All three audiences
- Portfolio: every menu item opens / closes
- Touch 390×844 parity

---

## 27. Visual QA Plan

### Three tests (every screen)

| Test | Question |
|---|---|
| **A** | Does it look good at 1x, 3x, 4x? |
| **B** | Does it look like Pokémon-style GBA gameplay? |
| **C** | Does this still feel like the SAME GAME across all screens? |

P11 is not successful unless **all three** pass.

### Review cadence

1. Wireframe sign-off (blocking)
2. Graybox layout in dev kit
3. Art-complete native 1x review
4. Full screenshot matrix
5. Owner 3-second + 10-second recognition tests
6. Audio listening session

### P11 artifact comparison

Side-by-side: `artifacts/phase-11/*` vs new captures — **composition diff**, not pixel-diff tolerance weakening.

---

## 28. Screenshot Matrix

Retain P11 matrix structure (126 PNGs). Minimum recapture set:

| Group | Files | Scales |
|---|---|---|
| Swatch | 24 | DPR 1/2/3 × 1–8 |
| Title / Intro / Tutorial | 8 | 1x / 4x |
| Town + landmarks | 12 | 1x / 4x + 6 landmarks |
| Walking / boundary | 6 + 2 video | 4x |
| Interiors / NPC | 5 | 4x |
| Encounter / Audience / VS | 5 | 4x |
| Battle flow | 20 | 1x / 3x / 4x |
| Party | 4 | 1x / 4x × audiences |
| Portfolio menus | 40 | 1x / 3x / 4x each screen |
| Touch | 6 | 390×844 DPR3 |
| Reduced motion | 3 | largest-fit |

Store in `artifacts/phase-11-reconstruction/` (new folder — do not overwrite P11 evidence).

---

## 29. Impact / Effort Priority

| Priority | Change | Impact | Effort |
|---|---|---|---|
| **P0** | Window system + row selection | All screens | M |
| **P0** | Battle recomposition | Core identity | L |
| **P0** | Title + VS motion | First impression | M |
| **P0** | Sprite rebuild | Overworld + battle | L |
| **P0** | Overworld tile rebuild | Town identity | L |
| **P1** | Player menu + dim | Menu feel | S |
| **P1** | Party slot list | Battle flow | M |
| **P1** | Pokédex split | Portfolio identity | M |
| **P1** | Projects row redesign | Portfolio identity | M |
| **P2** | Bag vertical strip | Bag identity | M |
| **P2** | Trainer Card plate | Card identity | M |
| **P2** | Experience split | Clarity | S |
| **P2** | Options icons | Polish | S |
| **P3** | Touch chrome | Mobile | S |
| **P3** | Audio re-sync | Identity | S |

**S** = 0.5–1 day, **M** = 1–3 days, **L** = 3–5 days (implementation agent estimate).

---

## 30. Risks

| Risk | Mitigation |
|---|---|
| Layout changes break accessibility | Preserve aria labels, focus order, sr-only mirrors |
| Battle coordinate change breaks send-out timing | Update `battle-presentation.ts` + `BattleView` together |
| Snapshot test churn | Update with visual inspection checklist per PNG |
| Scope creep into reducer | ADR-14 explicitly freezes behavior |
| 9-slice windows regress DPR matrix | Run swatch gate before any screen work |
| Owner still rejects “feel” | Wireframe gate before full art production |
| Palette too muted for Emerald read | Optional owner-approved accent extension (document in ADR) |

---

## 31. Out of Scope

- Reducer / question tree / content fact changes
- Map topology / collision / NPC count changes
- New portfolio routes or projects
- Nintendo asset import or trace
- HP / PP / stats mechanics
- Non-integer scaling
- TTF replacing bitmap font in gameplay UI
- P12+ features
- Committing / pushing unless owner requests

---

## 32. Exact Handoff to Sol Ultra

### Mission

Execute **P11 Visual Reconstruction** — full presentation replacement per this plan. **Do not treat as polish.** Preserve all frozen engineering contracts from §4.

### Start here

1. Read `artifacts/phase-11/README.md` — understand what passed / failed
2. Read this plan end-to-end
3. Implement **Wave 0** before any screen-specific art
4. Use `FoundationSwatch` + `/dev/kit?swatch=p11` as regression anchor — **update swatch** to new system

### Non-negotiables

- 240×160 native, integer scale, bitmap font, canonical palette
- A/Enter, B/Backspace parity; B: EXIT root, B: BACK nested topics
- 36×22 world, three interiors, frozen signatures
- No reducer edits for visual work
- Original assets only

### Definition of done

- Tests A+B+C pass on all 27 screens
- Owner 3-second test: “Pokémon game” → “portfolio”
- 126+ screenshot matrix recaptured
- All automated tests green (no weakened assertions)
- ADR-14 written documenting reconstruction scope
- Human visual + audio sign-off (not just automated GREEN)

### Do NOT

- Preserve weak compositions “because they work”
- Patch borders onto dashboard layouts
- Optimize for minimum diff
- Start with sprite tweaks before layout system

---

## 33. Final Human Test (recruiter path)

| Step | Current reaction | Target reaction |
|---|---|---|
| Title 3s | “Pixel-art portfolio splash” | “Wait, Pokémon?” |
| Enter town | “Generic tile map” | “Starting town” |
| Press X | “Web drawer menu” | “Pause menu opened” |
| Challenger | “NPC chat” | “Trainer battle incoming” |
| Battle | “Form on background” | “Battle — oh, interview” |

**If any step stays in the left column, P11 reconstruction is not complete.**

---

## Language Rule

Do **not** describe major redesigns as:

- polish
- tweaks
- minor refinement
- cleanup

Explicitly identify:

- redesign
- reconstruction
- replacement
- re-composition
- art direction change

---

*Planning document only. Baseline evidence remains at `artifacts/phase-11/` for comparison.*
