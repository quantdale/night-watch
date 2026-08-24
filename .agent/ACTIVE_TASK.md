# Active Task

Task ID: phase-22-contained-dev-semantic-calibration
Phase: 22-CONTAINED-DEV-SEMANTIC-CALIBRATION
Title: Nightwatch Phase 22 — Contained DEV Semantic Reality Calibration and Bounded Real-Campaign Acceptance
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-22-contained-dev-semantic-calibration
Starting SHA: c06ecd0183c9f6b25297f8f830d7e00e2fe0578c
Last validated implementation SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
Last substantive checkpoint SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
Last checkpoint: M5 — additive calibration/operator/dry-run implementation and focused validation
Current milestone: M6 — mandatory local validation, manifest freeze, and final pre-DEV gates
Next action: Run the mandatory local validation cone, repair failures, refresh source, freeze the manifest, and complete pre-DEV gates; do not contact DEV before M6 is green.
Authorization class: PHASE_22_CONTAINED_DEV_SEMANTIC_REALITY_CALIBRATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c06ecd0183c9f6b25297f8f830d7e00e2fe0578c
LAST_VALIDATED_IMPLEMENTATION_SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a

## Terminal Boundary Tokens

```text
PHASE_22_STATUS: IN_PROGRESS
PHASE_21_STATUS: COMPLETE
PHASE_20_STATUS: COMPLETE
PHASE_19_STATUS: COMPLETE
PHASE_18_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_17_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16CH_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16D_STATUS: NOT_AUTHORIZED
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
```

## Routing

Phase 19, Phase 20, and Phase 21 remain terminal at their existing task
directories; do not reopen or mutate their history. Live HEAD is always
discovered from Git (`LIVE_HEAD_AUTHORITY: GIT`).

## Scope boundary

This task authorizes additive Nightwatch source, bounded read-only sibling
source inspection, deterministic re-derivation, synthetic fixtures/tests,
owner-only external auth-state path validation, the existing guarded DEV
preflight, and exactly one serial bounded DEV campaign only after all local
gates and the frozen manifest pass. It authorizes no NEXT/production contact,
mutation, datastore/database operation, infrastructure discovery, sibling
write, publication, AI authority, self-development promotion, unbounded
crawling, arbitrary route discovery, credentials, raw authenticated evidence,
screenshots, traces, DOM/raw-body persistence, or storage-state copying.

The permanent decision remains `FROZEN_BY_OWNER /
INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`. Unknown operation classes fail
closed before executor callbacks. Real findings remain owner-only outside Git.
Semantic projections emit categories and deterministic opaque evidence only;
raw values, set members, identities, and reconstructible values never cross
the privacy boundary.

## Files Changed

- `.agent/ACTIVE_TASK.md`
- `.agent/tasks/phase-22-contained-dev-semantic-calibration/**`
- additive Phase 22 eligibility, source-derivation, manifest, preflight,
  privacy, calibration, replay, dossier, operator, and focused-test modules
  plus the bounded real launcher/test path

## Validation Ledger

Bootstrap Git inspection: PASS — clean `main` at
`HEAD == origin/main == c06ecd0183c9f6b25297f8f830d7e00e2fe0578c`; no DEV or
other product systems contacted.

Historical authority review: PASS — Phase 21 terminal records, Phase 9B/R1,
Phase 10B, Phase 11A and 11A.x records read; their history is preserved.

Phase 20 baseline census: PASS — 6 source artifacts, 22 discovered
candidates, 21 admitted, 1 unsupported-syntax rejection; graph 157 nodes /
151 edges; 86 total gaps with reason counts DIFFERENTIAL_PROJECTION_GAP=20,
MECHANICALLY_PROVABLE_UNCOVERED=16, REPLAY_GAP=18, MINIMIZATION_GAP=15,
DUPLICATE_SEMANTIC_COVERAGE=2, ANALYZER_UNSUPPORTED=1; 34 generated / 32
applicable / 32 detected / 0 surviving mutants; 31 benign controls / 0 benign
false positives; 32 replayed / 32 minimized / 32 high-confidence.

Worker doctor: PASS — read-only bridge healthy; worker findings are advisory
only and no worker mutation or external contact is authorized.

Phase 21 implementation milestones: PASS — M1 privacy-safe membership;
M2 source-bound enum/set mutation applicability 46 generated / 46 applicable /
46 detected / 0 surviving, 33 benign / 0 false positives; M3 deterministic
differential discovery 22 candidate rows / 21 admitted pairs; M4 contract-bound
replay lifecycle 67 attempted / 67 reproduced / 0 replay gaps; M5 dependency-
aware minimization 67 attempted / 67 supported with semantic fixed-point
proofs; M6 21 synthetic bindings admitted and 4 of 7 metamorphic kinds
exercised, with 3 source-proof exclusions; M7 graph 239 nodes / 233 edges /
3 residual gaps, 83 of 86 baseline records closed and 3 explicitly
irreducible. The complete Phase 21 campaign measures 67 generated / 67
applicable / 67 detected / 0 surviving, 54 benign / 0 false positives, 67
replayed / 67 minimized / 67 high-confidence.

Phase 21 focused cone: PASS — 48 Phase 19–21 compatibility tests after the
operator repair; the initial 1,295-test Phase 9–21 run exposed three legacy CLI
compatibility defects (plan shape, contracts shape, and truncated large JSON),
all repaired without weakening the tests. `npm run hardening:check`,
`npm run campaign:synthetic` (27/27), and `npm run typecheck` are PASS.

Phase 9–21 compatibility cone: PASS — 1,295/1,295 tests; 0 failures and 0
unexpected skips after the additive CLI compatibility repairs.

Owner provenance: PASS — `npm run test:owner-provenance` 91/91.

Canonical full Playwright regression: PASS — 2,333 enumerated; 2,329 passed;
4 skipped; 0 failed. Topology-correct isolated full regression: PASS — the
same 2,333 / 2,329 / 4 / 0 result from a fresh clone at the implementation
checkpoint. Skip identity parity is exact: `tests/unit/phase5Api.test.ts`
lines 197, 246, and 280, plus `tests/unit/selfDevSandboxConfinement.test.ts`
line 147. The first isolated attempt used an incorrectly nested sibling-root
fixture and was discarded as a validation setup defect; the corrected run
used read-only aggregate links at the resolver's expected parent.

External Actions inspection: BLOCKED / BILLING_RESTRICTION — run
`32672981417` for head `04ad56c8baa904b8fc8537a41e4fa2e90602770b` concluded
`failure`; job `97276539731` (`Local hardening checks`) also concluded
`failure` with `steps=[]`. This is not a local validation failure and was not
retried. External CI is not claimed green.

## Resume Recipe

Read this file, then `.agent/tasks/phase-22-contained-dev-semantic-calibration/`
`SPEC.md`, `PLAN.md`, and `STATE.md` in order. Resume at the exact current
milestone and next action. Do not contact DEV before M6 and do not reopen
Phase 19, Phase 20, or Phase 21 history.
