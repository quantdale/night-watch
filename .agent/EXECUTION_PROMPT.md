# EXECUTION PROMPT — Reliability, Yield, and State Protocol

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-reliability-yield-and-state-protocol-v1
OpenSpec: openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/
Planned-From: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Target Branch: main
Predecessor Task ID: nightwatch-final-reproducibility-polish-v1
Predecessor Status: COMPLETE

## Mission

Determine whether Nightwatch can repeatedly produce the same trustworthy
interpretation under real product nondeterminism, use existing mechanically
proven surfaces more effectively, and preserve project-state truth through an
explicit fail-closed task-verdict protocol.

## Permanent constraints

- No production or NEXT contact and no DEV mutation.
- No infrastructure, deployment, database, datastore, or cloud operations;
  the owner-frozen data/infrastructure boundary remains authoritative.
- No Alphaus sibling-repository writes, external publication, issue creation,
  or automatic owner/team messaging.
- No credentials, cookies, tokens, storage-state bytes, raw customer values,
  raw DOM/responses, authenticated traces, or raw findings in Git, task files,
  artifacts committed to GitHub, or diagnostics.
- No force-push, retry-based correctness certification, proof weakening,
  opaque execution scoring, or arbitrary canonical promotion.

## Required workstreams

1. Baseline and defect ledger before implementation.
2. Phase 2C replay reproduction, classification, canonicalization, and
   regression hardening.
3. Proof-aware campaign prioritization, diversity, yield attribution,
   clustering, and false-positive controls without a new proof family.
4. Explicit `PROJECT_VERDICT_EFFECT` state protocol and structured continuity/
   live-document validation.
5. Persisted-state chaos, auth lifecycle, bounded diagnostics, cache/property
   audit, and measured performance.
6. Bounded real DEV observations if owner-managed auth and all guards pass;
   local/clean/isolated parity and final reconciliation.

## Execution rule

Every divergence, blocked gate, anomaly, and CI observation is retained as a
sanitized categorical result. A retry may provide another observation but may
not erase or relabel a prior strict mismatch. `NO_SAFE_NEW_FAMILY` remains a
valid outcome. Any Critical/High Nightwatch defect is repaired before closure.

## Active continuity

The active task is
`.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/` under
`nightwatch.agent-continuity.v2`. The task declares
`PROJECT_VERDICT_EFFECT: PRESERVE`; this allows post-acceptance hardening to
remain active while the existing project verdict stays
`OPERATIONALLY_ACCEPTED`. A future requalification or invalidation must use a
different explicit effect and pass the corresponding checker rules.

## Initial next action

The baseline and M1 replay checkpoint are complete; the replay fix is pushed
at `bf35bf3`. The first M2 planner/yield slice is pushed at `a5ff79f`; build
and record a deterministic selection backtest against the current Phase 24
mechanically proven inventory next.

## Current checkpoint

The replay, planner/yield, explicit verdict-effect, live-state, cache/property,
and bounded interruption milestones are locally validated at implementation
checkpoint `82e661bae45424573c3ea06a20900e342047b849`. The current inventory
backtest is deterministic: 128 considered, 3 eligible, 3 selected, zero
redundancy, and no new proof family. The remaining release evidence is bounded
DEV requalification if the external owner-managed authentication is valid,
then clean/isolated/final validation.
