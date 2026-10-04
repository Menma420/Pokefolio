# B4 portfolio source mapping

Authoritative identity, contact, professional experience, education, resume skills and
achievements are supplied by `docs/design/Pokefolio_B4_Content_Source_of_Truth.docx`.
`verified.ts` transcribes those facts into bounded display values and sourced sections.

`index.ts` selects the twelve-project catalogue without audience, Party or session state.
It clones catalogue entries for portfolio-only verified metadata; original battle project
objects, question trees and memberships remain unchanged. The verified NomNom and
PortScanner entries extend their portfolio summaries and technology runs. Other project
write-ups reuse the finalized authored question-tree content across all audiences without
requiring an audience selection.

Pokédex entries include the entire verified skill set plus technologies/concepts supported
by project answers. Project references are shown only when supported; resume-only skills
say 'Verified professional skill set.' rather than inventing a project association. Icons
use the locked enlarged-category-emblem fallback.

All four Bag categories exist. P7 omits CERTIFICATES because none are verified/available. EXTRAS contains
the three sourced achievements; no invented collectibles or counters. Location is omitted
from the Trainer Card and fallback pages because the source explicitly forbids inference.

The actual resume is copied unchanged from the supplied `Uttkarsh_Malviya.pdf`:
SHA-256 `1c2a144d5d245a874879f4423c7ca87831eed7002a3efa8435d8e58b65669f5e`.
Bag opens that original PDF directly. `/resume` provides server-rendered semantic content,
a PDF viewing link and a download link; it is not a generated replacement CV.

P7 consumes the shared view-model selectors in `index.ts`. `menus.ts` supplies the locked
Player Menu definitions. Navigation is a transient ScreenStack in `uiStore`; child screens
retain their parent's exact selection/category/page/section, and B pops one logical layer.
RESET TUTORIAL follows Final UI Implementation Plan §31: reset hint flags, preserving
the existing session progress/intro/first-encounter contract.
