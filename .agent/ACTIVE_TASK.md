# Active Task

Task ID: nightwatch-final-reproducibility-polish-v1
Phase: FINAL_REPRODUCIBILITY_POLISH_V1
Title: Nightwatch Final Reproducibility and Polish
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-final-reproducibility-polish-v1
Starting SHA: e0c0c33cb6f44d33993b666d301cc261b87a4f01
Last validated implementation SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last checkpoint: M3 DEV requalification PASS/known product anomaly at fe35220; final reconciliation remains
Current milestone: M4 — Final reconciliation and hygiene
Next action: Reconcile all live task/project/OpenSpec documents, run the complete acceptance gate set, then commit, push, and verify clean HEAD parity
Authorization class: NIGHTWATCH_FINAL_REPRODUCIBILITY_POLISH_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e0c0c33cb6f44d33993b666d301cc261b87a4f01
LAST_VALIDATED_IMPLEMENTATION_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_FINAL_REPRODUCIBILITY_POLISH_V1_STATUS: IN_PROGRESS
## Routing and safety

This is the final reproducibility polish successor. Predecessor continuous deep hardening is COMPLETE at 55e92b9/e0c0c33 (cache 12, fuzz 12, soak 3×73, gate local 10/10). Deferred gate:clean and isolated parity are now in scope. No production, DB, infra, sibling writes, weakening containment, or publication. Auth remains external; containment fail-closed.
