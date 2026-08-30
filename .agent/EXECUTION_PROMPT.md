# EXECUTION PROMPT — Continuous Deep Hardening

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-continuous-deep-hardening-v1
OpenSpec: openspec/changes/nightwatch-continuous-deep-hardening-v1/
Planned-From: 5080e0d67794462853f62b8757b64d41410b2f1e
Target Branch: main
Predecessor Task ID: nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1
Predecessor Status: COMPLETE

## Mission

Prove post-acceptance Nightwatch remains stable over repeated autonomous operation by exercising the deferred soak, cache, containment, chaos, auth, fuzz, and reproducibility workstreams that were budget-deferred.

This is a new, substantial continuation intended to occupy remaining autonomous budget without re-proving already completed hardening.

## Permanent constraints

- No production contact.
- No DEV mutation.
- No infrastructure/data-layer operations excluded by owner policy.
- No Alphaus repository writes.
- No credentials, cookies, tokens, storage-state bytes, or raw findings in Git, task files, or GitHub.
- No force-push.
- Do not weaken project-state or continuity validators.

## Required workstreams

1. Soak/long-run 3× synthetic with resource snapshots
2. Cache currentness 12-case (same/changed SHA/content, dep, analyzer, interrupted/malformed/duplicate/stale)
3. Containment requalification (L6 4/4 + manual denied)
4. Replay/resume chaos 8-case
5. Auth lifecycle 9-case (sanitized)
6. Fuzz/property ≥20 cases
7. Dead-code, deps, gate:clean, isolated parity, final DEV requalification

## Terminal outcomes

This campaign is COMPLETE when M1–M7 are terminal and validators pass. No new operational verdict; predecessor remains OPERATIONALLY_ACCEPTED.
