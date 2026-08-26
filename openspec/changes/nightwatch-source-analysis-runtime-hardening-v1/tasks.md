# Tasks: Source-Analysis Runtime Hardening

The executor must mirror this change into a fresh native `.agent/tasks/nightwatch-source-analysis-runtime-hardening-v1/` continuity-v2 task before implementation. These tasks are ordered. Do not mark a task complete from assumption; record exact validation evidence in native STATE/REPORT.

## 1. Bootstrap and exhaustive repository audit — target H0–H1.5

- [x] 1.1 Fetch/pull `main`, prove clean tree and local/remote HEAD equality, and reconcile any commits after planned-from `910ff0f65aaf966aae20e4c72fe8b695e66038e4`.
- [x] 1.2 Read all repository authority docs and the completed systemic-optimization task; create/activate the fresh native task without rewriting terminal history.
- [x] 1.3 Generate the complete tracked-file manifest with `git ls-files`; inspect every tracked file and record a sanitized classification/review ledger for source, bin, tests, corpus, configs/workflows, UI, scenarios, agent/tooling and docs.
- [x] 1.4 Enumerate every TypeScript runtime transpile/require-hook implementation and every caller/profile; do not assume there are exactly 20 copies.
- [x] 1.5 Trace every `discoverSourceSurfaces`/source-integration caller and every exact-source read/analyzer/evidence-digest seam that can be affected by reuse.
- [x] 1.6 Run TODO/FIXME/HACK/dead-path/duplicate-path hygiene searches and reconcile findings manually against actual code.
- [x] 1.7 Capture baseline Git state, Node/npm/TypeScript versions, representative CLI stdout/stderr/exit codes, source-census safe output/digests, wall time and peak RSS.

## 2. Build the parity harness before optimization — target H1–H2.5

- [ ] 2.1 Add a focused differential helper/test that captures the complete safe source-discovery/Phase24 observable surface for deterministic inputs.
- [ ] 2.2 Assert equality for operation/surface ordering, proof states, analyzer diagnostics, every evidence digest, response-flow identity, response/semantic contract IDs, taxonomy/census/portfolio/review digests and reason codes.
- [ ] 2.3 Add byte-equality checks for deterministic CLI JSON/stdout where current contracts guarantee stable bytes.
- [ ] 2.4 Exercise repeated-symbol/same-file fixtures so the harness would detect accidental cross-symbol reuse.
- [ ] 2.5 Prove the harness fails on intentionally injected identity/order/currentness changes, then remove probes.

## 3. Centralize TypeScript runtime loading — target H2.5–H4

- [ ] 3.1 Design one bounded loader utility with explicit compiler profiles and guaranteed hook restoration.
- [ ] 3.2 Add content-addressed process-local transpile reuse keyed by every load-bearing compiler/source input.
- [ ] 3.3 Add optional ignored derivative-cache persistence only if baseline evidence justifies it and atomic/full invalidation is proven; otherwise keep process-local only.
- [ ] 3.4 Migrate bin entrypoints in small dependency groups, running cold/warm stdout/stderr/exit-code differential tests after each group.
- [ ] 3.5 Preserve explicitly different callers rather than falsely normalizing them.
- [ ] 3.6 Add hook-leak, nested/error restoration, stale-content, TypeScript-version/options invalidation and poisoned-entry tests.

## 4. Reuse exact source reads safely — target H4–H5.5

- [ ] 4.1 Instrument the current discovery path and record read counts by safe identity; establish the real duplicate-read baseline.
- [ ] 4.2 Add a call-scoped exact-snapshot read-through layer around the existing sibling-source authority without adding filesystem persistence.
- [ ] 4.3 Key reuse to repo/source/path/content/currentness identity; prove different snapshots cannot alias.
- [ ] 4.4 Preserve unavailable/stale/outside-scope/ambiguous behavior and privacy/source-size guards.
- [ ] 4.5 Run the full parity harness and focused source/join/eligibility tests; any unexplained digest or ordering change blocks this milestone.

## 5. Investigate shared parse/token work — target H5.5–H7

- [ ] 5.1 Measure residual parse/token cost after read reuse; do not refactor if it is no longer material.
- [ ] 5.2 If admitted, separate file-shared immutable parse/token state from per-symbol/per-hint/per-surface analysis inputs.
- [ ] 5.3 Keep analyzer IDs/versions, rejection mapping, observation construction and evidence canonicalization authoritative and unchanged.
- [ ] 5.4 Bound any in-memory parse cache and key it to exact source/analyzer identity.
- [ ] 5.5 Differential-test all synthetic source languages/proof families and the fresh approved-source census.
- [ ] 5.6 If same-input identity parity cannot be proven, revert this subtask and document the rejected optimization; retain independent read/loader wins.

## 6. Adversarial hardening — target H7–H9

- [ ] 6.1 Add cross-repository/same-path and same-repository/different-SHA collision tests.
- [ ] 6.2 Add same-file/multiple-symbol isolation and symbol-not-found/multiple-symbol tests.
- [ ] 6.3 Add content-change-with-same-mtime and mtime-only controls for each content-addressed cache.
- [ ] 6.4 Add malformed, oversized, privacy-sentinel, stale, unavailable, ambiguous and unsupported-source controls.
- [ ] 6.5 Add exception/interruption/fallback tests proving no partial cache entry or installed hook survives failure.
- [ ] 6.6 Exercise nested/concurrent loader or source-discovery use according to the supported contract; serialize or reject explicitly if necessary.
- [ ] 6.7 Verify cache/reuse cannot turn a rejected/unproven path into a proof and cannot change Phase24 eligibility.

## 7. Architecture and repository-wide regression sweep — target H8.5–H10

- [ ] 7.1 Revisit every large/hot file and duplicate config discovered in Task 1; record whether it is intentional, deferred or a reproduced issue.
- [ ] 7.2 Do not split `campaign/orchestrator`, `surfaces`, `sourceAnalyzers`, `hardening-check`, Control Center `App`, or historical docs solely for line count.
- [ ] 7.3 Validate all migrated bin entrypoints, source operator commands, Control Center projections and gate manifests.
- [ ] 7.4 Run focused response-flow/source-gap/readonly/eligibility/source-review/Phase24 compatibility tests.
- [ ] 7.5 Run synthetic campaign and owner-provenance suites; repair any introduced Critical/High regression before proceeding.

## 8. Performance and full acceptance — target H9–H11

- [ ] 8.1 Repeat baseline timings/RSS with the same methodology; report cold/warm variance and exact before/after numbers.
- [ ] 8.2 Run `npm run typecheck`, `npm run hardening:check`, `npm run project:check`, `npm run agent:check`, and `npm run agent:audit`.
- [ ] 8.3 Run `npm run test:semantic-compat`, `npm run campaign:synthetic`, and `npm run test:owner-provenance` (or their current authoritative replacements if Git changed).
- [ ] 8.4 Run `npm run gate:local` and the current Node20 clean-checkout gate.
- [ ] 8.5 Run canonical/topology-correct isolated parity if required by the affected source-analysis cone; enumerate exact pass/skip/fail counts and skip identities.
- [ ] 8.6 Confirm safe source/eligibility/portfolio outputs and all compared digests are identical cold vs warm and baseline vs optimized for the same snapshot.

## 9. Twelve-hour closure and truth reconciliation — target H11–H12

- [ ] 9.1 Use remaining productive budget for regression hunting and hidden-coupling review inside scope; do not invent new feature authority or idle artificially.
- [ ] 9.2 Reconcile OpenSpec tasks, native SPEC/PLAN/STATE/REPORT and project docs with actual implementation truth.
- [ ] 9.3 Inspect the full diff/privacy surface, run `git diff --check`, and ensure no raw sibling source, secret, owner-only finding or machine-private artifact entered Git.
- [ ] 9.4 Commit validated durable checkpoints with detailed messages; fast-forward push only; verify local `HEAD == origin/main` after push.
- [ ] 9.5 Observe the exact-head GitHub Actions run once. If the job has zero/null steps, record the external billing/platform block and do not call CI green or retry-churn.
- [ ] 9.6 Complete the final report with audit coverage, performance, parity/digests, validation, rejected candidates, risks, deferred work, Git anchors and CI truth.
