# PokéFolio phase artifacts

Use this index to open each phase’s report and evidence. Existing phase folders are reused; no second archive or numbered duplicate folder is created for an already-recorded phase. B1–B4 remain together in the existing Phase B folder, with a separate report for each approved scope.

| Phase / scope | Canonical folder | Report | Evidence |
| --- | --- | --- | --- |
| Phase A | [phase-a/](phase-a/) | [REPORT.md](phase-a/REPORT.md) | Foundation, remediation, doorway fix and visual review |
| B1 | [phase-b/](phase-b/) | [B1-REPORT.md](phase-b/B1-REPORT.md) | Approved overworld production evidence |
| B2 | [phase-b/](phase-b/) | [B2-REPORT.md](phase-b/B2-REPORT.md) | Opening, intro, audience and VS evidence |
| B3 | [phase-b/](phase-b/) | [B3-REPORT.md](phase-b/B3-REPORT.md) | Battle, Party and switching evidence |
| B4 | [phase-b/](phase-b/) | [REPORT.md](phase-b/REPORT.md) | Portfolio OS production evidence |
| P7 | [phase-7/](phase-7/) | [REPORT.md](phase-7/REPORT.md) | In-game portfolio menus, input and accessibility |
| P8 | [phase-8/](phase-8/) | [B8-REPORT.md](phase-8/B8-REPORT.md) | Web routes, SEO and no-JS evidence |
| P9 | [phase-9/](phase-9/) | [README.md](phase-9/README.md) | World, camera, interior and geometry evidence |
| P10 | [phase-10/](phase-10/) | [README.md](phase-10/README.md) | Content and production battle-entry remediation |
| P11 | [phase-11/](phase-11/) | [README.md](phase-11/README.md) | Visual reconstruction and subsequent sprite/audio follow-ups |
| Source reconstruction | [emerald-source/phase-reconstruction/](emerald-source/phase-reconstruction/) | [REPORT.md](emerald-source/phase-reconstruction/REPORT.md) | Private source extraction and rendering diagnostics |
| Source integration | [emerald-source/phase-integration/](emerald-source/phase-integration/) | [REPORT.md](emerald-source/phase-integration/REPORT.md) | Private normal-root world and challenger integration |
| Source P0 + startup fix | [emerald-source/phase-p0-interactions/](emerald-source/phase-p0-interactions/) | [REPORT.md](emerald-source/phase-p0-interactions/REPORT.md) | Private NPC/object interactions, full NPC dialogue catalogue and startup blink regression |

## Folder policy

- Reports, screenshots/recordings, checks and supporting files belong in that phase’s existing canonical folder. Append review corrections and follow-ups there.
- Historical A/B/P7–P11 filenames remain unchanged so existing review links and capture commands keep working. Their folders already contain their reports and evidence.
- Source reconstruction, integration and P0 evidence use `REPORT.md`, `screenshots/`, `checks/` and `support/` under the **ignored** `emerald-source/` parent. P0 includes the startup-blink follow-up, not another phase folder.
- Older source evidence paths are compatibility symlinks to the canonical files, not duplicated asset copies. Existing test/tool commands can still update the same files.
- Source runtime inputs (`bundle.json`, indexed map/tileset data and the master provenance manifest) remain shared at the paths required by the local renderer. Phase reports link to that data.
- Full source-derived NPC dialogue stays in the private P0 report and `NPC-CATALOGUE.json`. Do not copy extracted dialogue, screenshots or assets to `public/`, commit them, or deploy them.
- Phase reports are historical results, not new claims that all previous checks pass. P0–P6 did not have standalone engineering-phase archives in this checkout; their available shared visual evidence is listed under A/B. No missing historical report has been fabricated.
