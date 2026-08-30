# EXECUTION PROMPT — Final Reproducibility and Polish

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-final-reproducibility-polish-v1
OpenSpec: openspec/changes/nightwatch-final-reproducibility-polish-v1/
Planned-From: e0c0c33cb6f44d33993b666d301cc261b87a4f01
Target Branch: main
Predecessor Task ID: nightwatch-continuous-deep-hardening-v1
Predecessor Status: COMPLETE

## Mission

Prove post-acceptance Nightwatch reproduces on a clean machine and in isolated topology, and requalify real DEV, closing the deferred reproducibility gaps.

## Permanent constraints

- No production contact.
- No DEV mutation.
- No infrastructure/data-layer operations excluded by owner policy.
- No Alphaus repository writes.
- No credentials, cookies, tokens, storage-state bytes, or raw findings in Git, task files, or GitHub.
- No force-push.
- Do not weaken project-state or continuity validators.

## Required workstreams

1. Clean-machine `gate:clean` Node20
2. Isolated parity canonical vs isolated `gate:local`
3. Final DEV requalification (phase2c/phase4/phase5/prepare/resume)
4. Final reconciliation and hygiene

## Terminal outcomes

M1–M4 are terminal and validators pass. The campaign is COMPLETE with local and Node 20 clean certification, exact isolated parity, bounded DEV evidence, and no new operational verdict.
