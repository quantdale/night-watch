Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze current release evidence behavior

- [x] 1.1 In a separately authorized implementation session, re-read the
  release definition, evaluator, project-state adapter, current condition
  outputs, and production-completion ownership; record any intervening drift.
- [x] 1.2 Focused NW-AUD-010 pure probes prove non-exact/absent evidence is
  non-certifying (added under the owner-authorized implementation campaign).
- [x] 1.3 Synthetic Git fixtures cover exact, ancestor, descendant,
  side-branch, missing, and HEAD-token identities in projectState tests.

## 2. Implement categorical commit resolution

- [x] 2.1 Closed evidence relation vocabulary and checkState/effective
  state split implemented in `src/core/releaseCertification/index.ts`.
- [x] 2.2 Bounded read-only `resolveEvidenceLineage` adapter in
  `bin/project-state-check.mjs` distinguishes exit 0/1, spawn/signal failure,
  and malformed identities; operational failure is GIT_INDETERMINATE.
- [x] 2.3 HEAD resolves through the captured evaluation snapshot; head
  drift during evaluation fails with PROJECT_STATE_RELEASE_SNAPSHOT_UNSTABLE.
- [x] 2.4 Pure table tests cover absent/exact/stale/future/divergent/
  missing/indeterminate without conflating operational failure with
  DIVERGENT.

## 3. Enforce exact evidence in the pure evaluator

- [x] 3.1 Effective MET requires raw MET + EXACT relation; other states map
  to EVIDENCE_ABSENT/STALE/FUTURE/DIVERGENT/UNRESOLVED.
- [x] 3.2 counts, certificationRefused, advanceRefused, and refusal lists
  derive from effective states and nonExactEvidenceConditions.
- [x] 3.3 checkState preserved separately; evidence never upgraded by raw
  MET and never downgraded away from a diagnostic UNMET on exact lineage.
- [x] 3.4 Pure matrix covers check MET/UNMET crossed with absent/exact/
  stale/future/divergent/missing/indeterminate and advance claimed/not.

## 4. Bind one project-check evaluation snapshot

- [x] 4.1 Evaluation captures live HEAD once, certified checkpoint, and
  definition bytes digest; head re-reads during resolution detect drift.
- [x] 4.2 Boolean isAncestor callback replaced by categorical
  resolveEvidenceLineage; head drift fails closed.
- [x] 4.3 evaluationDigest is a canonical sha256 over definition digest,
  snapshot identities, ordered condition outputs/relations/effective states,
  lane counts, and external track.
- [x] 4.4 project:check emits PROJECT_STATE_EVIDENCE_{ABSENT,STALE via
  PROJECT_STATE_STALE_EVIDENCE,FUTURE,DIVERGENT,UNRESOLVED} without raw Git
  stderr or machine paths in those codes.

## 5. Repair evidence records without fabrication

- [ ] ~~5.1 Leave unearned condition evidence null and visibly
  non-certifying; do not replace it with current HEAD or an inferred SHA.~~
- [ ] ~~5.2 Re-run each implemented owning check at the exact certified
  checkpoint before updating its evidence binding, and record executed versus
  unavailable truth separately.~~
- [ ] ~~5.3 Reconcile release-condition documentation and current-state
  projections from the hardened verdict without choosing the pending owner
  status or advancing project completion.~~

## 6. Adversarial and mutation proof

- [x] 6.1 Synthetic projectState matrix covers exact/ancestor/descendant/
  side-branch/missing/HEAD-later with advance claimed; null and digest cases
  are pure-level; checkout-drift is guarded by PROJECT_STATE_RELEASE_SNAPSHOT_
  UNSTABLE (head re-read).
- [x] 6.2 Probes HC-099…HC-105 under checkProjectStateIntegrity detect
  lineage-resolver removal, OBJECT_MISSING→proven-negative collapse, evidence
  code removal, relation-vocabulary removal, digest removal, absent-state
  removal, and boolean isAncestor reintroduction (8/8 including HC-027).
- [x] 6.3 Probe campaign reports detected=8 undetected=0 restored=2
  statusUnchanged=true for checkProjectStateIntegrity.

## 7. Acceptance and handoff

- [ ] ~~7.1 Run focused release/project-state/lane/CI/checkpoint suites, root
  and bin typechecks, hardening rules/mutations, validation-universe,
  continuity/workspace/project checks, local gate, and clean gate.~~
- [ ] ~~7.2 Strict-validate this change, inspect privacy/diff/deletion
  surfaces, integrate through an owned C-00 session, and report exact-head CI
  as executed evidence or explicit non-evidence.~~
