# Locked v1.1 scale example — arithmetic correction

The locked formula remains authoritative and uncapped:

`n = floor(min(availablePhysicalWidth / 240, availablePhysicalHeight / 160))`

| CSS viewport | DPR | Available physical pixels | n | Game surface physical pixels |
| --- | --- | --- | --- | --- |
| 1440×900 | 1 | 1440×900 | 5 | 1200×800 |
| 1440×900 | 2 | 2880×1800 | **11** | 2640×1760 |

The PDF's DPR-2 example saying 10 is superseded by this user-authorized arithmetic correction. No cap or product behavior change is introduced. Touch controls still reserve their required outside-surface area before fitting the surface.
