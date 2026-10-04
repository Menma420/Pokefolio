# Full B3 battle capture sequence

Actual rendered game battle at `/dev/battle`, using the same production Phaser BattleScene, React battle UI, reducer and authored content as `/`. Recruiter audience, 960×640 CSS, DPR 1, 4× integer scale throughout. Only the Clock is paused for frame capture; no scene content or state is injected. Developer launcher controls are outside the captured game flow.

1. [b3-sequence-01-vs-recruiter.png](b3-sequence-01-vs-recruiter.png)
2. [b3-sequence-02-battle-arrival.png](b3-sequence-02-battle-arrival.png)
3. [b3-sequence-03-sendout-trainers.png](b3-sequence-03-sendout-trainers.png)
4. [b3-sequence-04-project-flash.png](b3-sequence-04-project-flash.png)
5. [b3-sequence-05-project-silhouette.png](b3-sequence-05-project-silhouette.png)
6. [b3-sequence-06-project-out.png](b3-sequence-06-project-out.png)
7. [b3-command-4x.png](b3-command-4x.png)
8. [b3-sequence-07-topic.png](b3-sequence-07-topic.png)
9. [b3-sequence-08-answer.png](b3-sequence-08-answer.png)
10. [b3-sequence-09-deeper-topic.png](b3-sequence-09-deeper-topic.png)
11. [b3-sequence-10-deeper-answer.png](b3-sequence-10-deeper-answer.png)
12. [b3-sequence-11-leaf-auto-parent.png](b3-sequence-11-leaf-auto-parent.png)
13. [b3-party-recruiter-4x.png](b3-party-recruiter-4x.png)
14. [b3-party-cancel-return-depth-4x.png](b3-party-cancel-return-depth-4x.png)
15. [b3-sequence-12-party-choice.png](b3-sequence-12-party-choice.png)
16. [b3-sequence-13-withdraw-project.png](b3-sequence-13-withdraw-project.png)
17. [b3-sequence-14-switch-silhouette.png](b3-sequence-14-switch-silhouette.png)
18. [b3-sequence-15-new-project.png](b3-sequence-15-new-project.png)
19. [b3-sequence-16-party-return-depth.png](b3-sequence-16-party-return-depth.png)
20. [b3-sequence-17-exit-line.png](b3-sequence-17-exit-line.png)

The interview traverses three topic depths, demonstrates valid-leaf auto-return, cancels Party back to the prior command/cursor, then switches Acko Clinic to Karsh at depth two and preserves a valid topic list. The native send-out and switch frames include typing prefixes, slot flash and silhouette reveal intentionally.

Main-game lifecycle proof at `/`: [battle](b3-main-game-battle-4x.png) → [exact overworld return](b3-main-game-exact-return-4x.png). The test checks the same map, camera room, tile and facing, world sleep/wake, and battle-scene unload. The separate public-game golden-path suite also verifies fresh intro, automatic LOS encounter, Recruiter and Engineer battles, repeat encounter, browser BACK, refresh and route-abort recovery.

All three audience layouts, native scales, largest-fit desktop and twelve project emblems are indexed in [B3-SCREENSHOTS.md](B3-SCREENSHOTS.md). Existing LINK behavior is tested without changing its implementation. No temporary battle artwork is used.
