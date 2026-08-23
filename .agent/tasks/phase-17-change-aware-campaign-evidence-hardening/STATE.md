# Task State

## Identity

Task ID: phase-17-change-aware-campaign-evidence-hardening
Phase: 17-CHANGE-AWARE-CAMPAIGN-EVIDENCE-HARDENING
Status: IN_PROGRESS
Starting SHA: e8af0c46f5f32c5d8bf80ca8041bb535ac64d7d2
Last validated implementation SHA: 17486ff13de9b8588a9ab5273c8eff882bda9036
Last substantive checkpoint SHA: 17486ff13de9b8588a9ab5273c8eff882bda9036
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: M5 — source-impact, parser/privacy, replay, corpus, and byte-determinism implementation wave validated by focused and affected tests.
Current milestone: M6 — integrated validation, docs alignment, checkpoint/push, and truthful CI inspection.
Next action: Run the Level 3 validation ladder, update durable project/task truth from the resulting evidence, then execute canonical and isolated full regression.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: e8af0c46f5f32c5d8bf80ca8041bb535ac64d7d2
LAST_VALIDATED_IMPLEMENTATION_SHA: 17486ff13de9b8588a9ab5273c8eff882bda9036
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 17486ff13de9b8588a9ab5273c8eff882bda9036
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_17_STATUS: IN_PROGRESS
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

M6 — implementation waves are locally green; integrated validation, docs
alignment, checkpoint/push, and final topology parity remain.

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

## Exact Next Action

Run `npm run typecheck`, `npm run hardening:check`, the Phase 17 and affected
compatibility suites, then the remaining Level 3 gates; record exact output
before the canonical and topology-correct isolated full regressions.

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
- `src/core/campaign/runtimeValidation.ts`
- `src/core/portfolio/{allocation.ts,manifest.ts,index.ts}`

## Decisions Made During This Task

- Phase 16CH remains terminal; this is a new task rather than a reopening.
- The campaign remains LOCAL / SOURCE / SYNTHETIC and does not grant Phase
  16D, DEV, data-plane, or infrastructure authority.
- The source-to-portfolio bridge will consume existing `SelectionResult`
  evidence only; it will not scan or fetch sibling repositories implicitly.

## Work In Progress

Implementation wave is complete locally; integrated validation and durable
closure remain in progress.

## Blockers

None.

## Validation Ledger

- Phase 16CH closure baseline before this task: typecheck, hardening,
  synthetic campaign, owner provenance, continuity, project check, canonical
  2232 passed / 4 skipped / 0 failed, and isolated exact parity were green.
- Phase 17 focused matrix: 26 passed / 0 failed.
- Change-intelligence + Phase 16 portfolio/replay compatibility cone:
  142 passed / 0 failed.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- Canonical and isolated full Phase 17 completion runs: pending.

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

## Deferred / Follow-Up

- Phase 16D contained DEV acceptance: not authorized.
- Phase 6, infrastructure/data-layer work, sibling writes, publication, and
  external coordination remain out of scope.
- Any source-to-portfolio mapping that cannot be proven from the supplied
  `SelectionResult` remains explicitly unresolved; no implicit source scan or
  network fetch is introduced.

## Resume Recipe

Read ACTIVE_TASK.md, then this task's SPEC.md, PLAN.md, and STATE.md. Inspect
Git status/diff, run the smallest current focused validation, and continue the
exact next action above. Keep updates here after each milestone or material
decision.

## Completion Snapshot

Not complete. The current snapshot is the M1 reproduction waypoint above;
Phase 17 implementation and completion validation remain in progress.
