# Active Task

Task ID: nightwatch-owner-local-review-persistence-v1
Phase: OWNER_LOCAL_REVIEW_PERSISTENCE_V1
Title: Owner-Local Review Persistence & Dossier Identity Enrichment
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-owner-local-review-persistence-v1
Starting SHA: 47c00883461fe689393d35e275b51eac0b78ed15
Last validated implementation SHA: 1ec3ae02c7942e95fc124664409adb65a8eec334
Last checkpoint: close-out — M0-M8 complete; regression 4076/0/13 twice, gate:local PASS 11/11, 54 mutations / 0 unexplained survivors; STOP
Current milestone: COMPLETE / STOP — all milestones closed, REPORT final
Next action: STOP — integrate to main, release the session, remove the worktree
Authorization class: OWNER_LOCAL_REVIEW_PERSISTENCE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 47c00883461fe689393d35e275b51eac0b78ed15
LAST_VALIDATED_IMPLEMENTATION_SHA: 1ec3ae02c7942e95fc124664409adb65a8eec334
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 1ec3ae02c7942e95fc124664409adb65a8eec334
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_OWNER_LOCAL_REVIEW_PERSISTENCE_V1_STATUS: COMPLETE

## Routing and safety

```
CAMPAIGN: nightwatch-owner-local-review-persistence-v1
SESSION WORKTREE: session/nightwatch-owner-local-review-pe-bef49826

IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source, tests, schemas, contracts, CLI,
  owner-local private review persistence and its APIs,
  review CLI/UI controls and Control Center local routes,
  atomic file/storage implementation over the existing
  private-artifact primitive,
  finding dossier metadata and finding intelligence integration,
  schema/version work and local migration/rebuild tooling,
  synthetic and local fixtures, crash/concurrency/mutation/property
  testing, .agent continuity tooling and hardening rules,
  documentation, OpenSpec, lifecycle state, diagnostics,
  commits, pushes, clean-clone certification

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

NEXT / DEV EXECUTION:
  NOT AUTHORIZED

C-12 / C-13 / C-14 LIVE EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED

SLACK / LESLIE / PONDR / NOTION / EXTERNAL FILING:
  NOT AUTHORIZED

CREDENTIALS, DEPLOYMENT, SIBLING WRITES,
FORCE PUSH, HISTORY REWRITE:
  NOT AUTHORIZED
```

Repository-local and offline. No production contact, no NEXT contact, no
DEV request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-owner-local-review-pe-bef49826`. The canonical checkout
is never used for implementation.
