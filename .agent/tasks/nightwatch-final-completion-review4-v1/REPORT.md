# Report — review-4 corrective campaign

Status: IN_PROGRESS (close-out in progress; the close-out record is appended at task 7.4)
Task ID: nightwatch-final-completion-review4-v1
Phase: COMPLETION_REVIEW4_V1
CHILD OF: nightwatch-final-product-completion-v1
Starting SHA: 67eb30981b4bb4d6bb6959b9afee9345938f5750

## Scope

The seven groups of `tasks.md`, one spec requirement per group in
`openspec/changes/nightwatch-final-completion-review4-v1/specs/review4-closure/spec.md`.
Every finding of the independent review-4 (`audit.md`) has exactly one
disposition in the table below.

## Per-ID disposition table

| ID | Sev | Task | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| R4-01 | high | 1.1 | CLOSED | `productionBindingReceiptVerifier` is passed by every production `checkpointRoleViolations` caller (project-state-check 5 sites, agent-state 4 sites); the `() => true` stubs survive only in fixtures. Regression: `productionCompletionLaneState.test.ts` "R4-01: the PRODUCTION verifier makes a receipt-binding commit documentary" (commit AND range, plus the fail-closed/mismatched-subject negatives). Probe family HC-217..HC-224 (8 members, all DETECTED). |
| R4-02 | high | 1.2 | CLOSED | `--no-renames` added to all five `git diff`/`diff-tree` name listings in `bin/project-state-check.mjs` (agent-state already had it). Regression: "R4-02: a rename cannot hide a source deletion" proves `git mv src/... .agent/...` is DOCUMENTARY under rename detection and SUBSTANTIVE with `--no-renames`. |
| R4-03 | high | 1.3 | CLOSED | `verifyPersistedReceipt(root, subject, digest, sha)` now requires the subject, the kind, the schema declared for that kind, the SHA, the PASS verdict field(s), a clean emit where required, and the re-derived digest; the caller passes `subject`. Regressions in `projectState.test.ts` cover FAIL-with-recomputed-digest, subject mismatch, subject absent, schema unsupported, clean-emit unproven and digest mismatch. |
| R4-04 | high | 1.4 | CLOSED | `topologyCertificationVerdict` (pure) makes the conjunction explicit: a missing receipt is `TOPOLOGY_RECEIPT_ABSENT` (NOT MET), a degraded envelope is `TOPOLOGY_NOT_CERTIFYING`, and the detail never attributes a topology class to the CI run. Regressions in `projectState.test.ts` cover absent/degraded/absent-status/wrong-SHA. |
| R4-05 | medium | 1.5 | CLOSED | `autonomous-yield-proof` declares `certifying: true` and stays in the required set; the live verdict reports it honestly UNMET (no paid run yet). OD-6(a) recorded in D-150. |
| R4-06 | medium | 1.6 | CLOSED | The real-tree expectation is derived from `classifyCheckpointRange` with the production verifier wired in (SAME or clean DOCUMENTARY_DESCENDANT passes), so the guard no longer contradicts certification. |
| R4-07 | medium | 1.7 | CLOSED | Gate receipts default to the Git-ignored `artifacts/receipts/` (used only when `git check-ignore` proves it) so the verifier can re-read them; the collector tests write into a shared fixture root (`git clone --shared` at HEAD) instead of the real checkout. Regressions in `gateReceiptPersistence.test.ts`. |
| R4-08 | medium | 2.1 | CLOSED | `checkReview4CollectorTotality` (new) carries 8 probes; `checkCheckpointRoleGuardIntegrity` gained 6, including behavioural `kind: range`, merge (`-m` per parent), `ours`-resolution (second parent) and corrections-pairing fixtures. All 14 members DETECTED; `hardening:rules` 93 rules / 245 probes / 0 undetected. |
| R4-09 | medium | 2.2 | CLOSED | The DEV-launcher effect scan is syntax-aware (parsed top-level statements, descent into `try`/`if`/blocks, local calls via assignment, the full fs mutation vocabulary) with `devLauncherEffectSelfTest` and 7 probes (HC-210..HC-216), all DETECTED. |
| R4-10 | medium | 3.1 | CLOSED | `buildGateChildEnvironment` forwards the shape-validated `NIGHTWATCH_PUSH_BEFORE` explicitly, it is declared in environment-surface, and `phase23QualityGate.test.ts` proves a real node process receives it and `resolveArchiveDiffBase` returns the pre-push tip. |
| R4-11 | medium | 3.2 | CLOSED | The governed `CI_STATUS` word is DERIVED at check time (`DERIVED_FROM_CI_OBSERVATION`) from the project-state block cross-checked against the ci-block-record; CURRENT_STATE again states observed = executed = `027367d9`, EXECUTED_PASS. Five probes (HC-231..HC-235) DETECTED. |
| R4-12 | medium | 3.3 | CLOSED | The five review-4 red runs (36537649045, 36596242188, 36787018515, 36806004712) and their repairs are recorded with their defect classes; the top level is refreshed to run 36832639979 at `67eb3098`; `validateCiBlockRecord` refuses a top level older than its newest observation (`CI_BLOCK_RECORD_TOP_LEVEL_STALE`). Regressions in `ciBlockRecord.test.ts`. |
| R4-13 | medium | 3.4 | CLOSED | Close-out procedure recorded (hardening:check + agent:check + project:check before any close-out push; canonical commits only under a live MAINTENANCE claim — the a408d31b/e97b38aa breach is recorded in the child STATE and the ci-block-record). An `openspec/changes/archive/<dated>-<change>/**` path is documentary ONLY as a byte-identical move in the same commit (5 probes HC-236..HC-240 DETECTED, plus the copy/edit negatives). The archived child is removed from the task-ID ledger. |
| R4-14 | medium | 4.1 | CLOSED | `captureFailureCounts` reaches the main-path evidence, its `journeyEvidence` manifest entry, the journey event and the auth-invalid manifest entry; `parseJourneyEvidence` validates the closed vocabulary and bounded integers; `journeyEngine.test.ts` asserts the RECORDED manifest and event, not the observer. |
| R4-15 | medium | 4.2 | CLOSED | `advanceProxyLiveness` tolerates transient misses (3 consecutive failures OR 5000 ms from the first, D-151) with threshold/deadline tests; FLAKE-003 carries an appended correction (mechanism, the inaccurate "no failing surface touched" claim, and the 3x6-way-saturation re-run: 26 passed x3); the body-read slots are released in `afterEach`. |
| R4-16 | low-medium | 4.3 | CLOSED | `VC01_REQUIRED_TITLES` is the three devLoginSecurity tests PLUS the storage-state live-cookie-readability browser test; the per-test CI proof reads both pinned files. Regression in `semanticSkipIdentity.test.ts`. |
| R4-17 | low | 4.4 | CLOSED | `resolvePrettierBinary` finds the declared `prettier` devDependency (or the harness tools path) and the parent-cwd control runs Prettier itself on an in-repo probe; the positive control uses the repository requirePragma config; the suite is in the semantic-compatibility lane; the `.prettierignore` comment is corrected; the dependency is assessed in the host-capability matrix. |
| R4-18 | low | 4.5 | CLOSED | The shared CLI renders `required` flags without brackets and prefixes `REQUIRED.`; the canary declares `--endpoint`/`--model` required; the TS parser accepts `--flag value` AND `--flag=value`; the dead `usage()` and `parsed.help` branch are removed. |
| R4-19 | low | 5.1 | CLOSED | `TASK_GROUP_TASK_RE` accepts a suffixed id; the regression proves an open `9.5b` keeps its group out of `TASK_GROUPS_COMPLETE`; the parent declares `TASK_GROUP_DEFERRED: 9.5b` (carried by 14.1/14.2) and `Exact Next Action` names it. |
| R4-20 | medium | 5.2 | CLOSED | The corrections-v1 REPORT carries an appended dated correction section: corrected header figures (29 findings, 22/6/1), a per-ID disposition table for all 71 IDs, the 8.2-8.16/7.15 tick annotations, 6.4 DONE, the a408d31b CI-run pairing correction, the STATE CF-04 attribution correction and the CORR-PERF-001 re-encode record. No historical bytes rewritten. |
| R4-21 | medium | 7.6 | CLOSED | The parent change has an active group-15 task `15.8 OWNER STEP`: revert the repository to private, confirm GitHub Actions still executes and record the run. |
| R4-22 | low | 6.1 | CLOSED | The merged corrections branch is deleted with its ancestry proven and `b4d0c611` recorded; the parent session release/remove outputs are in both STATE files; `gate:clean` receipts record `sourceWorktreePathClass`, `liveSessionCount` and `declaredSessionWorktree`. |
| R4-23 | low | 6.2 | CLOSED | The parent prose is synced (60/76, the live session, the resume point, no stray fragment, the prose anchor, Exact Next Action, PLAN M9) and the checkers refuse a NO-live-session claim beside a declared session (`ACTIVE_TASK_ROUTING_LIVE_SESSION_PROSE_DRIFT`) and a declared-progress figure that disagrees between ACTIVE_TASK and STATE (`TASK_GROUP_LEDGER_PROGRESS_PROSE_DRIFT`), each with a regression and 5 probes (HC-241..HC-245). |
| R4-24 | low | 7.5 | CLOSED | The agent-session UUID is removed from `docs/DECISIONS.md` and replaced by a non-identifying provenance reference (date + verbatim question/answer), registered as CORR-R4-24-001..003 in the corrections registry; a dated record states that CI artifacts are public while the repository is, and what they contain. |

## Validation (pre-integration)

- `npm run hardening:check` PASS; `npm run typecheck` clean; `npm run
  typecheck:bin` PASS (ceiling 1446, ratchets lowered not raised).
- `node bin/hardening-check.mjs --probe-campaign` — 93 rules / 245 probes /
  **245 DETECTED** / 0 undetected, every mutation restored, statusUnchanged.
- Focused suites green: `productionCompletionLaneState` 29/29, `projectState`
  141/141, `gateReceiptPersistence` 44/44, `ciBlockRecord` 19/19,
  `phase23QualityGate` 16/16, `journeyEngine` (recorded-summary),
  `bodyReadAcquisition` 7/7, `contextGuardTransaction` 8/8,
  `semanticSkipIdentity` 18/18, `formatterPolicy` 9/9, `aiLocalCanary` 10/10,
  `agent-state`, `hardeningRuleQuantifiers`/`hardeningRuleParity`/
  `hardeningProbeCampaign`.
- `npm run agent:check` PASS (85 legacy warnings); `npm run project:check`
  PASS; `npm run workspace:check` PASS; `npm run session:check` PASS.

## Safety events

No Alphaus environment, database, cloud, credential or external publication
contact; no sibling repository mutation; no force push or history rewrite; all
testing local/synthetic. External contact is OD-3 only: `git fetch` reads,
C-00 fast-forward pushes and `gh` CI observations. One devDependency was added
(`prettier` 3.6.2, a proof tool the formatter-policy controls drive); it is
assessed in `docs/HOST-CAPABILITY-MATRIX.md` and neutralised by
`.prettierignore` + `.prettierrc` (`requirePragma`).

## Close-out record

(appended at task 7.4 with the CI run, the integration head and the
`gate:clean` receipt)
