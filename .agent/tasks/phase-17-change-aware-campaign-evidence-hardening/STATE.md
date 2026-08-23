# Task State

## Identity

Task ID: phase-17-change-aware-campaign-evidence-hardening
Phase: 17-CHANGE-AWARE-CAMPAIGN-EVIDENCE-HARDENING
Status: COMPLETE
Starting SHA: e8af0c46f5f32c5d8bf80ca8041bb535ac64d7d2
Last validated implementation SHA: 482ed51814ce8e8f7d67de7edc9a98786240430c
Last substantive checkpoint SHA: 482ed51814ce8e8f7d67de7edc9a98786240430c
Last documentation checkpoint SHA: 482ed51814ce8e8f7d67de7edc9a98786240430c
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: M7 — terminal continuity closure after exact canonical/isolated parity and truthful external-CI inspection.
Current milestone: COMPLETE — terminal local/source/synthetic closure; external CI blocked.
Next action: STOP — future engineering requires a new local/source/synthetic task and fresh scope.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: e8af0c46f5f32c5d8bf80ca8041bb535ac64d7d2
LAST_VALIDATED_IMPLEMENTATION_SHA: 482ed51814ce8e8f7d67de7edc9a98786240430c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 482ed51814ce8e8f7d67de7edc9a98786240430c
LAST_DOCUMENTATION_CHECKPOINT_SHA: 482ed51814ce8e8f7d67de7edc9a98786240430c
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_17_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16CH_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16D_STATUS: NOT_AUTHORIZED
PHASE_6_STATUS: FROZEN_BY_OWNER

## Objective

Execute the frozen-intent Phase 17 local/source/synthetic program in SPEC.md:
connect source-change impact to portfolio planning, harden strict parser and
privacy boundaries, make repeated-action replay evidence occurrence-honest,
expand adversarial determinism coverage, and close the task with validated
source/docs and no new authority.

## Current Milestone

COMPLETE — M0–M7 closed; local/source/synthetic evidence is complete and the
inspected external CI job executed zero steps.

## Completed Milestones

- M0 — fresh post-Phase-16CH audit, successor task records, scope boundary,
  and strict continuity routing created; `npm run agent:check` strict errors
  were reduced to zero.
- M1 — `phase17EvidenceHardening.test.ts` reproduced four defects against the
  pre-fix code: 4 tests failed exactly as expected (property-order changeset
  identity, unvalidated foreign baseline, raw duplicate diagnostic, and
  repeated-action minimality overclaim). No external systems were contacted.
- M2 — pure source-impact overlay connected selector evidence to the approved
  portfolio allocator; direct/shared/transitive ranking, fallback zero-lift,
  stale evidence, and unlinked-member gates are covered.
- M3 — baseline JSON is now strictly versioned, bounded, own-field-only,
  canonical-order, reference-consistent, and privacy screened; duplicate and
  diagnostic surfaces are sanitized.
- M4 — repeated-action minimization is exercised through the live reducer and
  lossy public minimality proof reconstruction fails closed; historical result
  shape remains unchanged.
- M5 — reusable Phase 17 source-change corpus covers direct, shared,
  transitive, irrelevant, ambiguous, deleted, renamed, stale, and simultaneous
  changes; repeated source-aware allocation output is byte-identical.
- M6 repair — canonical regression found seven Phase 15P readiness failures
  caused by broad identity redaction misclassifying `ripple-account-inventory`;
  the detector now requires an identifier-shaped value after an identity label,
  and the focused readiness/rehearsal/Phase 17 matrix is 52 passed / 0 failed.
- M6 validation — the affected compatibility cone passed 142/0; the clean
  canonical full regression passed 2259/0/4 and the fresh topology-correct
  isolated regression passed the exact same 2259/0/4 with the same skip set.
- M7 — Actions run `32628613509` / job `97167784939` was inspected once and
  completed as failure with `steps=[]` under the known billing/spending block;
  continuity, project, and safety truth were closed without claiming CI green.

## Exact Next Action

STOP. The task is terminal. Future engineering must use a new
LOCAL / SOURCE / SYNTHETIC task; Phase 16D remains separately unauthorized.

## Files Changed

- `.agent/ACTIVE_TASK.md`
- `.agent/tasks/phase-17-change-aware-campaign-evidence-hardening/` task records
- `tests/unit/phase17EvidenceHardening.test.ts` (reproduction, bridge, parser,
  replay, privacy, corpus, and determinism matrix)
- `corpus/phase17/changeImpactFixtures.ts` (reusable synthetic source-change
  corpus)
- `src/core/portfolio/changeImpact.ts` (pure source-to-portfolio overlay)
- `src/core/changeIntelligence/{selection.ts,baseline.ts}`
- `src/core/triage/{correlation.ts,minimizer.ts}`
- `src/core/campaign/runtimeValidation.ts` (DEF-17-06 privacy-boundary repair)
- `src/core/portfolio/{allocation.ts,manifest.ts,index.ts}`

## Decisions Made During This Task

- Phase 16CH remains terminal; this is a new task rather than a reopening.
- The campaign remains LOCAL / SOURCE / SYNTHETIC and does not grant Phase
  16D, DEV, data-plane, or infrastructure authority.
- The source-to-portfolio bridge will consume existing `SelectionResult`
  evidence only; it will not scan or fetch sibling repositories implicitly.

## Work In Progress

None. Implementation, integrated validation, exact topology parity, durable
documentation, and continuity closure are complete locally.

## Blockers

None for local closure. External CI is classified as blocked because the
inspected job executed zero steps; this is not an unresolved local blocker.

## Validation Ledger

- Phase 16CH closure baseline before this task: typecheck, hardening,
  synthetic campaign, owner provenance, continuity, project check, canonical
  2232 passed / 4 skipped / 0 failed, and isolated exact parity were green.
- Phase 17 focused matrix after DEF-17-06 regression coverage: 27 passed / 0
  failed.
- Readiness/rehearsal plus Phase 17 repair matrix: 52 passed / 0 failed.
- Change-intelligence + Phase 16 portfolio/replay compatibility cone:
  142 passed / 0 failed.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- First canonical full regression after the implementation wave: 2251 passed /
  4 skipped / 7 failed; all seven failures shared
  `READINESS_PRIVACY_BLOCKED:target-id` and were traced to DEF-17-06.
- DEF-17-06 focused repair: typecheck PASS; readiness/rehearsal/Phase 17
  matrix 52 passed / 0 failed.
- Final canonical full regression: 2259 passed / 4 skipped / 0 failed out of
  2263 tests.
- Fresh isolated clone with `npm ci`, read-only aggregate sibling symlinks,
  `NIGHTWATCH_SIBLING_ROOT`, and `NIGHTWATCH_PROXY_PORT=19123`: 2259 passed /
  4 skipped / 0 failed out of 2263; exact parity and clean isolated tree.
- Skip inventory in both runs: `tests/unit/phase5Api.test.ts:195`, `:244`,
  `:278`, and `tests/unit/selfDevSandboxConfinement.test.ts:143`.
- Actions run `32628613509` / job `97167784939`: completed failure with zero
  steps; external billing/spending block; inspected once and not retried.

## Safety Events

None. This task has made no DEV/NEXT/production contact, authenticated
session, product/data mutation, datastore/cloud/infra operation, sibling write,
publication, credential handling, or real finding persistence.

## Discoveries

- `selection.ts` and `triage/correlation.ts` use ordinary JSON serialization
  for identity material; property-order permutation is an actionable
  determinism defect.
- The baseline read path trusts a JSON type assertion rather than validating a
  versioned document.
- Shared duplicate diagnostics echo an unbounded value.
- Minimality evidence reconstructs by action ID even though minimizer replay
  candidates are occurrence-aware internally.
- Phase 16 portfolio allocation has no source-impact overlay; this is the
  principal Phase 17 architecture target.
- Broad identity-shaped diagnostic redaction must distinguish product target
  vocabulary (`ripple-account-inventory`) from identifier-shaped values.
- The first integrated run exposed that distinction as a real compatibility
  defect; DEF-17-06 is repaired and covered by a product-target positive
  control plus the full canonical/isolated parity proof.

## Deferred / Follow-Up

- Phase 16D contained DEV acceptance: not authorized.
- Phase 6, infrastructure/data-layer work, sibling writes, publication, and
  external coordination remain out of scope.
- Any source-to-portfolio mapping that cannot be proven from the supplied
  `SelectionResult` remains explicitly unresolved; no implicit source scan or
  network fetch is introduced.

## Resume Recipe

This task is terminal. For historical verification, read ACTIVE_TASK.md, this
task's SPEC.md, PLAN.md, STATE.md, REPORT.md, and HANDOFF.md, then discover
live Git state. Do not resume this task; future work requires a new
LOCAL / SOURCE / SYNTHETIC task.

## Completion Snapshot

COMPLETE. Implementation checkpoint `482ed51814ce8e8f7d67de7edc9a98786240430c`
passed the focused and affected cones, Level 3 gates, canonical full
regression `2259/4/0`, and exact topology-correct isolated full regression
`2259/4/0`. The tree and `origin/main` are clean/equal at the final
documentation descendant; Actions run `32628613509` / job `97167784939`
executed zero steps under the external billing/spending block, so the
terminal classification is local complete / external CI blocked, not CI green.
