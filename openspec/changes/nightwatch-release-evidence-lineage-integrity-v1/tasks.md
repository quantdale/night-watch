Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze current release evidence behavior

- [ ] ~~1.1 In a separately authorized implementation session, re-read the
  release definition, evaluator, project-state adapter, current condition
  outputs, and production-completion ownership; record any intervening drift.~~
- [ ] ~~1.2 Add failing pure probes proving `MET` currently survives null,
  unknown, future, divergent, and later-`HEAD` evidence.~~
- [ ] ~~1.3 Add a synthetic Git fixture that creates exact, ancestor,
  descendant, side-branch, and missing commit identities with bounded
  deterministic hashes.~~

## 2. Implement categorical commit resolution

- [ ] ~~2.1 Define the closed evidence relation vocabulary and separate raw
  check state, relation, and effective condition state in release verdict
  types.~~
- [ ] ~~2.2 Add a bounded read-only Git adapter that verifies commit objects,
  compares exact IDs, evaluates ancestry in both directions, and distinguishes
  exit 0, exit 1, timeout, signal, overflow, spawn error, and malformed output.~~
- [ ] ~~2.3 Resolve `HEAD` exactly once from the captured checkout snapshot and
  reject malformed, missing, replaced, or changing identity inputs.~~
- [ ] ~~2.4 Add table tests for every relation and operational failure without
  conflating indeterminate with divergent.~~

## 3. Enforce exact evidence in the pure evaluator

- [ ] ~~3.1 Require exact checkpoint equality plus raw check `MET` for an
  effective `MET`; map all other evidence states to stable non-certifying
  categories.~~
- [ ] ~~3.2 Make conditionsMet, conditionsUnmet, certificationRefused,
  advanceRefused, and named refusal lists derive only from effective states.~~
- [ ] ~~3.3 Preserve honest diagnostic check state and detail without allowing
  it to override absent or non-exact evidence.~~
- [ ] ~~3.4 Extend the pure cross-product matrix across all check states,
  evidence forms, lineage relations, and advance/not-advance statuses.~~

## 4. Bind one project-check evaluation snapshot

- [ ] ~~4.1 Capture root identity, live HEAD, certified checkpoint, definition
  bytes/digest, and snapshot stability before collecting check outputs.~~
- [ ] ~~4.2 Replace the boolean `merge-base` callback with the categorical
  adapter and fail closed on repository/head drift during evaluation.~~
- [ ] ~~4.3 Canonically digest the definition, snapshot, ordered raw outputs,
  resolved evidence, relations, effective states, lane counts, and external
  track into the rendered verdict.~~
- [ ] ~~4.4 Emit stable condition-specific codes for absent, stale, future,
  divergent, missing, and indeterminate evidence while omitting raw Git errors
  and machine paths.~~

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

- [ ] ~~6.1 Run `project:check` in synthetic repositories for null, exact,
  stale, future, divergent, missing, malformed, later-HEAD, and checkout-drift
  cases with all raw checks met and an advance claimed.~~
- [ ] ~~6.2 Register non-vacuous mutations for removed absence/equality guards,
  inverted ancestry, one-direction ancestry, missing-object-as-divergent,
  timeout-as-false, repeated HEAD reads, and raw-state counting.~~
- [ ] ~~6.3 Prove every mutation fails its intended test and restores bytes
  exactly with no Git or project-state mutation.~~

## 7. Acceptance and handoff

- [ ] ~~7.1 Run focused release/project-state/lane/CI/checkpoint suites, root
  and bin typechecks, hardening rules/mutations, validation-universe,
  continuity/workspace/project checks, local gate, and clean gate.~~
- [ ] ~~7.2 Strict-validate this change, inspect privacy/diff/deletion
  surfaces, integrate through an owned C-00 session, and report exact-head CI
  as executed evidence or explicit non-evidence.~~
