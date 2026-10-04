# ADR-12: P9 contiguous world camera

**Status:** Adopted for P9, following the owner's explicit continuous-world requirement.

The earlier World/Level specification described fixed screen snapping. P9 supersedes that camera rule: the 240×160 viewport follows the player through a larger 36×22 tile world. The two original area IDs remain location/return-anchor metadata, never camera bounds or transition triggers.

The pure camera selector samples WorldSim's authoritative movement ticks, rounds native coordinates, and clamps against the entire map. Phaser applies the resulting scroll without easing or a separate animation clock. Fixed 15×10 interiors retain their existing camera behavior. The compact `/dev/world` fixture remains unchanged for its historical regression baseline.

No changes to collision resolution, LOS, battle ownership, scaling, rasterization, approved pixel assets or React/Phaser boundaries are required. The final map builder composes the existing approved atlas and exports through the existing Tiled compiler. Placement validation checks the production world and its three interiors.
