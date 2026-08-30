# EXECUTION PROMPT — Post-Acceptance Production Hardening and Yield Expansion

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1
OpenSpec: openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/
Planned-From: 10f50fd250c7dfbcc62c18d3693a483a58ac6fc1
Target Branch: main
Predecessor Task ID: nightwatch-operational-acceptance-v1
Predecessor Status: COMPLETE

## Mission

Strengthen the already operationally accepted Nightwatch (OPERATIONALLY_ACCEPTED at 598e7fa) into a more reliable, higher-yield, better-observed, more reproducible autonomous bug-hunting system. Use real DEV operational evidence to expose hidden weaknesses, expand source intelligence and oracle depth, and harden replay, campaign reliability, lifecycle, observability, and repository truth.

Do not repeat operational acceptance as if blocked. Do not weaken fail-closed safety, contact production, mutate DEV data, modify Alphaus repositories, or treat synthetic counts as operational proof.

## Permanent constraints

- No production contact.
- No DEV mutation.
- No infrastructure/data-layer operations excluded by owner policy.
- No Alphaus repository writes.
- No credentials, cookies, tokens, storage-state bytes, or raw findings in Git, task files, or GitHub.
- No force-push.
- Do not weaken project-state or continuity validators.
- Real DEV remains serial read-only via existing launchers with external auth state; no concurrent DEV.

## Required workstreams

1. Project-truth reconciliation: repair stale BLOCKED claims in EXECUTION_PROMPT/CURRENT_STATE/ROADMAP and harden validators so contradictions cannot silently recur.
2. Fresh baseline and audit of the nine operational-acceptance repairs as a family with generalized regressions.
3. Repeated real read-only DEV reliability and long-run/soak hardening.
4. Fresh source census at current SHAs, gap ranking, and bounded proof expansions that remain fail-closed.
5. Autonomous yield, oracle depth, and finding-quality/false-positive hardening.
6. Replay, checkpoint/resume chaos, auth lifecycle, containment, performance, and cache correctness hardening.
7. Control Center full audit, CLI/operator UX, diagnostics, error taxonomy, fuzz/property, dead-code, and dependency review.
8. Clean-machine Node 20, canonical/isolated parity, full regression, and final DEV requalification.

## Terminal outcomes

This campaign does not select an operational-acceptance verdict; predecessor is already OPERATIONALLY_ACCEPTED. Terminal is COMPLETE when milestones M1–M8 are validated, validators pass, hardening is proven, and requalification is fresh.

Do not use COMPLETE or PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED as a substitute for operational truth.
