# Active Task

Task ID: nightwatch-reviewer-surface-and-intel-scale-v1
Phase: REVIEWER_SURFACE_AND_INTEL_SCALE_V1
Title: Reviewer Surface & Finding-Intelligence Scale
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-reviewer-surface-and-intel-scale-v1
Starting SHA: 868761d2128d5155db454623bc2fa01622a57d33
Last validated implementation SHA: 8265acec74d79cebeb861192f9d6ee499f579439
Last checkpoint: M1 in progress — campaign opened from 868761d; DEF-FC-04 proven (routing block entered at 48c0a60 for the coherence campaign and survived verbatim into FC-1 at 0c5cb42 and 868761d while identity fields were rewritten)
Current milestone: M1 (W0) — repository truth, DEF-FC-04 repair, continuity metadata hardened against cross-campaign drift
Next action: add the ACTIVE_TASK routing-block campaign-binding rule to the continuity checker so a predecessor block fails closed, with a regression that fails on the unrepaired document
Authorization class: REVIEWER_SURFACE_AND_INTEL_SCALE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 868761d2128d5155db454623bc2fa01622a57d33
LAST_VALIDATED_IMPLEMENTATION_SHA: 8265acec74d79cebeb861192f9d6ee499f579439
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 8265acec74d79cebeb861192f9d6ee499f579439
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_REVIEWER_SURFACE_AND_INTEL_SCALE_V1_STATUS: IN_PROGRESS

## Routing and safety

```
CAMPAIGN: nightwatch-reviewer-surface-and-intel-scale-v1
SESSION WORKTREE: session/nightwatch-reviewer-surface-and--30ec5809

IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source, tests, schemas, contracts, CLI,
  .agent continuity tooling and hardening rules,
  Control Center server, authorities, adapters and React UI,
  finding intelligence and finding review cones,
  repository-owned synthetic scale corpora and measurement harnesses,
  browser and endurance lanes, documentation, OpenSpec,
  lifecycle state, diagnostics, commits, pushes,
  clean-clone certification

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
`session/nightwatch-reviewer-surface-and--30ec5809`. The canonical checkout
is never used for implementation.
