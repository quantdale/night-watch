## 1. Owner pre-flight on canonical (P0; no live session)

- [x] — DONE 2026-09-25: base re-verified (`HEAD == origin/main == 1f786a4e`), drift recorded in audit.md pre-flight drift record (one stale figure corrected: status:local open-items 188, not 75). Re-verify the base: `git fetch`, HEAD == origin/main, clean tree, no registered worktree. Re-run `project:check`, `agent:check`, `workspace:status` and `status:local`, and record any drift from `1f786a4e` in `audit.md` before editing.
- [x] — DONE 2026-09-25: `claim --role MAINTENANCE --adopt --expect-session sess-36dedce34085 --task nightwatch-final-product-completion-v1` (sess-200ba55d7757); canonical record names this task (A-04 fixed). Adopt the RELEASED canonical MAINTENANCE record (`claim --role MAINTENANCE --adopt --expect-session sess-36dedce34085`, the 6.4 precedent) so the canonical self record names this task (A-04).
- [x] — DONE 2026-09-25: `1441cc8a` recorded in audit.md (A-06 record), then `git branch -D` (OD-3). Record orphan branch `session/nightwatch-successor-campaign-en-c8bcb74c` → `1441cc8a` (docs-only BLOCKED record, superseded) in `audit.md`, then `git branch -D` it (OD-3; A-06).
- [x] — DONE 2026-09-25: claim released via continuity-bound staging (release binds ACTIVE_TASK+STATE bytes; recorded in PLAN Decision Log); planning change moved to the session scratchpad; canonical clean; `workspace:check` PASS attention=0. Release the maintenance claim. Strict-validate this change, then move the untracked planning directory out of canonical into the session scratchpad. It must not be committed alone: a change without its task `STATE.md` fails `agent:check` (`LEDGER_CHANGE_WITHOUT_TASK`), `project:check` and `handoff:check`, and an untracked canonical breaks WORKSPACE_CANONICAL_PROTECTION once a session is live. Verify canonical is clean and `workspace:check` passes.

## 2. Session bootstrap (M1)

- [x] — DONE 2026-09-25: session `sess-0734f2070d08`, branch `session/nightwatch-final-product-complet-a891357d`, base `1f786a4e`, worktree `~/.nightwatch/worktrees/nightwatch-final-product-complet-a891357d`. `session start --task nightwatch-final-product-completion-v1` from canonical. Claim the session in the worktree, and record the session id, branch and base.
- [x] — DONE 2026-09-25: planning change restored unchanged; continuity v2 {SPEC,PLAN,STATE,REPORT} created with the OD-1..OD-4 block verbatim and a `## Declared Deletions` section. Restore the planning change into the worktree unchanged. Create `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE,REPORT}.md` with continuity v2 identity. The SPEC carries the OD-1..OD-4 authorization block verbatim and a `## Declared Deletions` section.
- [x] — DONE 2026-09-25: ACTIVE_TASK/EXECUTION_PROMPT flipped IN_PROGRESS (Planned-From `1f786a4e`); live-state block aligned; session/handoff/agent checks PASS, project:check PASS post-commit; bootstrap checkpoint `ec6010a2`. Flip `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md` (Planned-From a main ancestor) to this campaign IN_PROGRESS. Run session/handoff/agent/project checks. Commit the planning change and the task continuity together as the bootstrap checkpoint.

## 3. Certification anchors and ratchets (M2; must land before any evidence binding)

- [x] — DONE 2026-09-26: LIVE_TASK_STATUS derived from `.agent/ACTIVE_TASK.md` (sentinel DERIVED_FROM_ACTIVE_TASK; the mjs parser accepts the bare identifier fail-closed); regression `tests/unit/liveTaskStatusDerivation.test.ts` proves open/close pass with no `src/` edit and the hardening path derives the live value (R2-N6). Derive the expected `LIVE_TASK_STATUS` from `.agent/ACTIVE_TASK.md`; remove the literal from `src/core/source/censusFigureLedger.ts:290`. Regression: a task open/close passes with no `src/` edit (R2-N6).
- [x] — DONE 2026-09-26: `config/release-evidence.v1.json` (closed schema, 27 subjects) and `config/document-role-corrections.v1.json` (22 entries) created; both registered in APPROVED_CHECKPOINT_PATHS behind the diff-shape guard (`bin/lib/checkpoint-role.mjs`: values-only bindings / append-only corrections, schema-valid, fail-closed); existing bindings loaded once via the legacy fallback and removed from `release-certification.v1.json`, `validation-lane-state.v1.json`, `document-role.v1.json` (A-01). Create `config/release-evidence.v1.json` (closed schema) and `config/document-role-corrections.v1.json`. Add the diff-shape guard (values-only changes are documentary) and register both in `APPROVED_CHECKPOINT_PATHS` behind that guard. Load existing bindings once for compatibility, then remove them from the old files (A-01).
- [x] — DONE 2026-09-26: hardening rule `checkReleaseEvidenceBindings` (closed schema + condition/lane subject closure) with probes HC-144 (subject mutation), HC-145 (non-binding key), HC-146 (correction-entry non-binding key); probe campaign 146/146 detected. Add a hardening probe: mutating a non-binding key or subject in the bindings file must classify substantive.
- [x] — DONE 2026-09-26: project:check asserts every bound evidence artifact exists at its evidenceSha (`git cat-file -e`) and each condition agrees with its cited lane at token boundaries (D-06); the live condition-08/lane disagreement was reconciled to the cited lane record identity. Add the `project:check` assertions: evidence artifact exists at its `evidenceSha` (`git cat-file -e`), and each condition agrees with its cited lane (D-06).
- [x] — DONE 2026-09-26: per-file bin type-check ceiling ratchet in `config/bin-typecheck.v1.json` (bin/run-shards.mjs <= 25, now 14 after JSDoc annotation) enforced in every mode by `bin/bin-typecheck.mjs`; registered in the gate as required group BIN_TYPECHECK_CEILING (A-13/B-07/D-13 guard). Install the per-file bin type-check diagnostic ceiling ratchet (`run-shards.mjs` ≤ 25) and register it in the gate (A-13/B-07/D-13 regression guard).
- [x] — DONE 2026-09-26: struck items settle only with a disposition token (DEFERRED no longer accepted); undispositioned strikes are reported `LEDGER_UNDISPOSITIONED_ITEM` and counted as their own open-work class; BLOCKED tasks report as their own class and terminal ledgers with undispositioned strikes stay visible (A-21, R2-62); positive/negative tests in `productionCompletionOpenWork.test.ts` (15/15). Make the ledger parser require a disposition token on struck items (`LEDGER_UNDISPOSITIONED_ITEM`) and report BLOCKED tasks as their own open-work class (A-21, R2-62). Add positive and negative tests.
- [x] 3.7 Focused suites + `gate:dev` + `gate:milestone` PASS; commit; update STATE. — DONE 2026-09-26: focused suites PASS (liveTaskStatusDerivation 5/5, productionCompletionOpenWork 15/15, projectState 91/91, plannerHandoff, validationShardPlan/ExecutionClasses, phase23QualityGate, hardeningRuleQuantifiers, nw14HostCapabilityMatrix); `gate:dev` PASS (affected-shards 5481/0); `gate:milestone` PASS on the committed state (all steps exit=0 including project-check, workspace-check and the 146/146 probe campaign); M2 committed at `8775b58a` with the universe-inventory fixup `6f8a9d7c`.

## 4. CI-green, deterministic and hermetic spine (M3)

- [x] — DONE 2026-09-26: `c03GrpcTopology.test.ts` live measurements guarded with declared `test.skip(…, LIVE_SOURCE_<kind>)` and every measurement in the live-source suites routed through `liveSourceTestRoot()` (c03, c02b, c02bProtoCorroboration, phase10Canary, phase12CoverageInventory, w10LongRunResilience, minedCases, changeIntelligenceBacktest, realOwnerLocalGeneralityProof) (R2-01/R2-N1). Guard `tests/unit/c03GrpcTopology.test.ts:389` and route every live measurement through `liveSourceTestRoot()` (R2-01/R2-N1).
- [x] — DONE 2026-09-26: all 10 tautological `kind !== 'CURRENT'` guards converted to declared `test.skip(…, LIVE_SOURCE_<kind>)` (c02a x3, c03 x2, c04 x1, c02b x2, c07 x1, realSourceCanary x1); every converted live test has a synthetic twin (new twin blocks in c03/c04/c02b/c02a; existing CI-parity/fixture twins mapped in realSourceCanary and c07); skip identities declared in `config/semantic-compatibility.v1.json` (R2-N2). Convert the 10 tautological `kind !== 'CURRENT'` guards into declared `test.skip(…, 'LIVE_SOURCE_<kind>')`, each with a synthetic twin (R2-N2).
- [x] — DONE 2026-09-26: `reviewStore.test.ts` traversal test now owns its temp parent (no shared os.tmpdir listing); `campaign-synthetic.mjs` children get an isolated TMPDIR per invocation reusing the shard isolation pattern (D-02). `reviewStore.test.ts` owns its temp parent. `campaign-synthetic.mjs` reuses the shard TMPDIR isolation (D-02).
- [x] — DONE 2026-09-26: `observerSemanticLedger.test.ts` waits made event-driven (poll the findings projection, 20s bounds); reproduced robust: 5/5 looped passes + 3/3 passes under 6-way CPU load (D-24/R2-65); recorded in STATE Validation Ledger. Reproduce the `observerSemanticLedger.test.ts:77` flake under CI-like load (looped runs), make its waits event-driven, and record it in the flake ledger (D-24/R2-65).
- [x] — DONE 2026-09-26: shared `bin/lib/sanitized-failure-locations.mjs` (closed class set TIMEOUT/EXPECT_EQUAL/EXPECT_MATCH/EXPECT_THROW/UNCLASSIFIED) wired into run-shards, campaign-synthetic and semantic-compat; gate-receipt parser accepts `file:line:CLASS` with legacy literals intact; raw messages never carried (D-19); unit tests green. Add a sanitized assertion class to CI `failedLocations` (for example EXPECT_EQUAL or TIMEOUT). Raw messages never appear.
- [x] — DONE 2026-09-26: per-shard skip-identity reports (`playwrightSkipIdentityReporter`) evaluated by `evaluateSemanticSkipPolicyIdentities` in run-shards — an undeclared or unconfigured policy fails the shard; canonical allowlist rebuilt to 45 entries with a balanced-argument parser (original 3 preserved); the vacuous /tmp-snapshot tests split into declared skips + always-running synthetic twins (phase14FreshSourceAdmission x2, phase14ContractReport x1) (D-10/D-11/D-12). Full-regression skip-identity allowlist: a per-shard Playwright JSON report evaluated by the skip policy, with all declared identities and reasons; an undeclared skip fails. Split vacuous `/tmp`-snapshot tests into honest synthetic tests and declared skips, or add a read-only snapshot materializer lane (D-10/D-11/D-12).
- [ ] 4.7 `gate:clean` runs sibling-absent by default (explicit, recorded opt-in for sibling mode). Replace the literal `siblingWrites: 0` with a measured before/after sibling identity (R2-N3).
- [ ] 4.8 Add `gate:topology` to the certification set. Its static scan resolves imported path constants, and `requiresSiblingTopology` declarations are measured (X-02).
- [ ] 4.9 Add a UI gate group (`npm ci --prefix ui/control-center --ignore-scripts`, typecheck, test, build) to the local, ci and clean modes. Persist clean receipts to an ignored receipts directory (B-14, D-18).
- [ ] 4.10 HANDOFF_TRUTH `SESSION_DECLARED_ABSENT_EXPECTED` in ci/clean modes, only when the declared branch equals STATE's branch. Add a negative probe for a mismatched branch (D-04).
- [ ] 4.11 Pin actions by full SHA; anchored rule over every workflow file and compact step forms; move CI to Node 22 on Node-24-native action majors with `runs-on: ubuntu-24.04`; align the `gate:clean` Node path; record the exact node/npm versions in receipts (NW-AUD-001, NW-AUD-004 narrowed, D-19).
- [ ] 4.12 Bind the session terminal-closeout relaxation to the canonical branch and add its negative test (X-08). Resolve CLAIM_TASK_UNKNOWN against the claiming worktree path, with a negative probe (A-03). `workspace:status` raises ATTENTION `WORKSPACE_ORPHAN_SESSION_BRANCH` for any `refs/heads/session/*` with no worktree and names its unique-commit count, changing nothing (A-07).
- [ ] 4.13 Focused + `gate:milestone` PASS; commit. Push a canonical-routed checkpoint, observe CI with `gh` (OD-3), and record the observed result. The spine is done only when CI is green (R2-CI).

## 5. Release-certification machinery (M4)

- [ ] 5.1 Wire the probes for G14 (reachability), G17 (schema lifecycle), G18 (UI error-taxonomy receipt), G19 (environment declaration), G21 (auth-capability single evaluator) and G12 (product run receipt plus the historical W13 aggregate). Set `implemented:true` only when wired (A-02/D-01).
- [ ] 5.2 Accessibility result record: the browser accessibility certification plus the focus-indicator contrast measurement emit a machine-readable record, which the G20 probe consumes (R2-51).
- [ ] 5.3 Hardening rule: `implemented` must equal whether a wired probe exists.
- [ ] 5.4 Post-certification demotion: classify HEAD versus S as EXACT, DESCENDANT_DOCUMENTARY or DESCENDANT_SUBSTANTIVE; `CERTIFIED_AT_ANCESTOR` ATTENTION; a passed revisit date gives ATTENTION plus an owner action (X-04).
- [ ] 5.5 Add a DECIDED state to the release-certification schema citing D-129, and tick programme 13.8 (A-19). Represent C-14 as terminal per D-134 so the track reports `EXTERNAL_PREREQUISITE_UNMET` (A-20).
- [ ] 5.6 Wire the CI block-record judgements into `agent:check`/`project:check` and retire the duplicate probe (A-14). Retire the billing-block record into history, replacing it with the observed executed-run record (D-03, R2-61).
- [ ] 5.7 Focused + `gate:milestone` PASS; commit.

## 6. Autonomous hunt result integrity (M5; T1 agent chain)

- [ ] 6.1 AgentFindingRecord: content-addressed dossierId, campaignId, per-source HEAD and tree digest, `cfe:` fingerprint, test identity, reasoner identity. Derived mechanically in `admitLocalFinding` (C-19).
- [ ] 6.2 Write the record atomically to the `agent-findings/` private subtree before any checkpoint deletion. On write failure: exit non-zero and keep the checkpoint (C-01).
- [ ] 6.3 A TERMINATED resume returns the persisted records verbatim, or `UNAVAILABLE_NOT_PERSISTED`. Regression: run, then resume on the same state dir (C-02).
- [ ] 6.4 Reasoner identity: digests of the executable, adapter, print CLI and `PRINT_ARGS`, plus the provider and model labels, with the model cross-checked against `--model`. Resume refuses `REASONER_IDENTITY_MISMATCH` before any turn (NW-AUD-044, C-05).
- [ ] 6.5 Resumed budget derived from prefix usage only; persisted `maxTurns`; conservation assertion; per-dimension pause/resume test (NW-AUD-045, C-06, C-14).
- [ ] 6.6 Persist the provider-failure class per call; derive `terminationClass` (VALID_PROVIDER_RUN / PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION / PROVIDER_DEGRADED) into the result, checkpoint and outputs; dead-provider regression (C-04).
- [ ] 6.7 Tier-scaled failure ceilings; transient versus permanent classes; bounded backoff with jitter; rename `retries` to `failures`. Failover validator refuses unreachable provider orders (C-16, C-15).
- [ ] 6.8 Dispatcher: forward `agent campaign run|resume` with inherited stdio, no fixed timeout, signal pass-through and the declared consumer environment. Regression that the dispatcher never kills a campaign (C-03/B-03).
- [ ] 6.9 SIGINT/SIGTERM → PAUSED checkpoint plus reasoner process-group kill; progress checkpoint after each absorbed investigation; remove or rename `campaign pause` (C-07).
- [ ] 6.10 Print adapter cleans up on every exit path (TMPDIR-empty regression). Salvaged evidence refs are marked and excluded from grounding metrics (C-11, C-24).
- [ ] 6.11 Reproduction materializes from the Git object store at the recorded HEAD (read-only). Dirty-tree regression; DECISIONS entry for the method change (X-05).
- [ ] 6.12 ENVIRONMENT_DEPENDENT classification for known environment signatures, refused for admission (C-18).
- [ ] 6.13 Minimal product run-receipt module: provider health, attribution counts, sibling identity before/after including porcelain and diff digests for all approved repos, leak scan, persisted admission IDs (C-28, C-26).
- [ ] 6.14 `campaign findings` / `nightwatch findings` report per-campaign rows from persisted records; `nightwatch-agent status` reports measured state; never a constant 0 (C-12, C-13/B-04, B-12).
- [ ] 6.15 Refuse non-array candidateIds; mark ungrounded presentation defaults explicitly; Lane C atlas adapters return ADAPTER_UNAVAILABLE without fixtures (C-29, NW-AUD-046/047).
- [ ] 6.16 `--wall-clock-minutes` (narrow-only) and an `agent:campaign` npm script (C-23).
- [ ] 6.17 Deterministic fake-reasoner synthetic hunt suite covering admission, refusal, persistence, resume, provider outage and signal pause, registered in the gate. Focused + `gate:milestone` PASS; commit.

## 7. Finding truth surfaces and Control Center data (M6; T1)

- [ ] 7.1 Protocol dossier readiness verdict before any write; no READY ledger entry, bug candidate, promotion or COMPLETE_WITH_FINDINGS from a non-READY dossier (NW-AUD-029, C-08).
- [ ] 7.2 Total Control Center status mapping; widen types and sanitize oneOf (NW-AUD-048, C-09).
- [ ] 7.3 Role-typed replay contexts for L1/L2 with distinct run IDs per role; stop inferring contextKind in the phase7 harness (NW-AUD-025 interim, C-10).
- [ ] 7.4 `campaign-state/` subtree for orchestrator state with read-compatibility; findings authority filters to dossier families first and exposes reasonCodes (B-02/C-21).
- [ ] 7.5 Test-scoped run root; Control Center newest-N window across the real run roots with `RUN_EVIDENCE_WINDOW_TRUNCATED` (B-01, X-01).
- [ ] 7.6 Read-only agent-campaign authority and view (no paths) (C-20, B-12).
- [ ] 7.7 Safety Center from owner-scope, workspace-integrity and session status (B-11). Currentness wired to family-movement classification, or labelled not wired (C-25).
- [ ] 7.8 One `resolveSiblingRoot()` (trimmed, env-first) used by intelligence, the Control Center source view, historical context and tests; consumers declared; hardening flags direct `DEFAULT_SIBLING_ROOT` reads (B-10, C-22).
- [ ] 7.9 Relabel synthetic Phase 19–21 previews (`nightwatch:status`, `campaign:plan|coverage|contracts|gaps|operator`) as synthetic preview, or delegate to `status:local` (B-17, NW-AUD-041/042 narrowed).
- [ ] 7.10 `status:local` renders auth entries under their own heading, not under blockers (B-18).
- [ ] 7.11 Browser/UI coverage for the new views (typecheck, vitest, browser suite); focused + `gate:milestone` PASS; commit.

## 8. Narrowed source, semantic and configuration over-claims (M7; T1)

- [ ] 8.1 NW-AUD-012 narrowed: forward the validated merged environment, refuse unknown `.env` keys, fail on malformed or duplicate lines, treat an unreadable `.env` as an error.
- [ ] 8.2 NW-AUD-036 narrowed: re-check HEAD after scan, refuse mismatched digests in the read view, stop hard-coding `sourceSnapshotMatches: true`.
- [ ] 8.3 NW-AUD-039 narrowed: NOT_APPLICABLE / INVALID_INPUT / truncated evidence is incomplete, never PASS.
- [ ] 8.4 NW-AUD-040 narrowed: regex TS/JS/Go/OpenAPI analyzers produce HEURISTIC results excluded from proven candidate selection; truncated inventories reported.
- [ ] 8.5 Focused + `gate:milestone` PASS; commit.

## 9. Contained-DEV lane integrity (M8; T2)

- [ ] 9.1 DEV-lane precondition registry and launcher refusal (`DEV_LANE_PRECONDITION_OPEN`, owner token citing DECISIONS), listing NW-AUD-016 full, 022 task 2.1 (R2-47), 025 full, 026, 037, 038. Tests for every launcher.
- [ ] 9.2 NW-AUD-021 residual: element-handle fill/click, same-evaluate verification before each effect, `used` set on first effect, between-effect swap/navigation/listener regressions, adversarial matrix, credential consumer census, source-approved form action (R2-07, R2-31, R2-32, R2-34, R2-36).
- [ ] 9.3 NW-AUD-015: transactional storage-state plus sidecar publication for refresh and capture (same batch as 9.2).
- [ ] 9.4 NW-AUD-022 narrowed: prepared record before every effect, one terminal record after, reader fails closed on unmatched or malformed lines, effect-site census, fault tests (R2-06, R2-46, R2-49).
- [ ] 9.5 NW-AUD-023 narrowed plus popup L0: setup rollback, health-interval clearing, awaited popup guards via a context-wide L1 barrier (deny-by-policy fallback), close joins acquisitions. Re-tag NW-AUD-020 tasks 3.2/4.2 until proven; add the async-source and popup/frame/worker admission tests (R2-05, R2-28, R2-29).
- [ ] 9.6 NW-AUD-035: cancel or join a body read that loses the race, and bound acquisition.
- [ ] 9.7 NW-AUD-024 residual: generation-unique phase7 run IDs, manifest parse fails closed, mirror cross-check at finalize, run-dir fsync, observer non-clean latch, `download.cancel()` in finally, append-time event/byte bounds, writer/reader census, killed-writer and temp-collision tests (R2-02, R2-08, R2-39, R2-40, R2-43, R2-64, R2-25 / NW-AUD-018 task 4.2).
- [ ] 9.8 NW-AUD-016 narrowed: per-start nonce echoed by the health endpoint and bound to the event log.
- [ ] 9.9 NW-AUD-028: per-invocation relay credential, relay-wide budget, no observation overwrite.
- [ ] 9.10 NW-AUD-043: bind ChangeSet edges to the real baseline/head, validate ChangeSets and recompute changesetId, classify renames by both endpoints.
- [ ] 9.11 R2-03 then R2-04: census fails closed on dynamic import/createRequire/string-built specifiers/namespace destructuring; explicit environment allowlist for every non-envelope child; sync calls declare timeout and output bound.
- [ ] 9.12 Register mutation probes for every successor and M8 guard (all-skipped refusal, EEXIST claim, fsync, integrity latch, durable-event assertion, proxy persistence validation, `assertCurrent`, unresolved import) (R2-30, R2-18, R2-37, R2-44). Commit before `hardening:rules`, then run the full probe campaign.
- [ ] 9.13 Focused + `gate:milestone` PASS; commit.

## 10. D-129 debt: CLI contract and bin type-check (M9; after functional bin edits)

- [ ] 10.1 Retire superseded bins as declared deletions, or declare them research-retained with contract entries (X-12).
- [ ] 10.2 Migrate the remaining undeclared bins to `defineOperatorCli` (help without execution, CLI_UNKNOWN_ARGUMENT, exit codes 0–4, single-document JSON, leak scan, no absolute paths) (A-12/B-05/D-14, B-13; programme debt R2-58).
- [ ] 10.3 Register the shared-parser structural rule with a negative probe (programme 4.10). Correct the task counts, and restore the README claim once conformance is 76/76 (B-06).
- [ ] 10.4 Annotate bins to zero diagnostics in safety-critical-first batches (session, workspace-integrity, project-state-check, quality-gate, …), with the gate plus probe campaign after each batch.
- [ ] 10.5 Flip `config/bin-typecheck.v1.json` to BLOCKING with 0 exemptions, and register the lane in the gate (programme 15.7/15.11, X-03).
- [ ] 10.6 `gate:milestone` PASS; commit.

## 11. Residual dispositions, quality debt and documentation of behaviour (M10)

- [ ] 11.1 T3 S-fixes: NW-AUD-032 non-bypassable Phase 6 gate; 011 single-flight refusal; 013 export fails closed plus realpath destination; 005 non-zero exit when the receipt is not finalized; 007/009 preflight before rm plus atomic report writes; 033 release the reservation on denial; 017 relabel unwitnessed L6 fields NOT_WITNESSED.
- [ ] 11.2 Draft one DECISIONS entry per ACCEPTED_RESIDUAL item (027, 030, 031, 034, R2-15, R2-17, and the remainders of the narrowed T3 items), citing OD-1/D-144 with a revisit trigger. Record D-131 composition as the end state, and strike NW-AUD-019 2.2 and programme 14.7 (A-15, R2-26).
- [ ] 11.3 T4 S-fixes: dead clustering fallback (D-15), debug console.log (D-16), deprecated serializer aliases (D-20). Add ratchets for unused exports (D-17) and for the retention scope of the campaign-state subtree (X-11). Re-measure CF-1 (A-16).
- [ ] 11.4 DECISIONS D-144 (OD-1..OD-4), plus entries for the seven successor behaviours, the census, the demotion semantics, the HANDOFF_TRUTH classification, the Git-HEAD materialization and the DEV-lane registry. Update SAFETY_MODEL/ARCHITECTURE (R2-63, R2-21, R2-38, R2-45).
- [ ] 11.5 Env-surface and SAFETY_MODEL wording for the print CLI (live provider, not deterministic; provider auth in HOME); remove the unconsumed `NIGHTWATCH_REASONER_PRINT` declaration (C-30).
- [ ] 11.6 Extend the dependency assessment to the UI lockfile, with a GHSA-82fw disposition or vitest upgrade (D-08). Complete the Vue review item due 2026-10-09 (D-09).
- [ ] 11.7 Commit.

## 12. Operator proofs (M11)

- [ ] 12.1 README operator quickstart: root and UI install, health, a bounded hunt with reasoner environment prerequisites, status/findings, Control Center, auth capture, storage locations, authorization boundaries, provider-failure meaning, ouchan-only reproduction ceiling. Env-selectable browser channel (B-08, B-09, C-17, C-23).
- [ ] 12.2 Run the deterministic synthetic hunt and `campaign:synthetic`; record the receipts.
- [ ] 12.3 Authorized paid proof run (OD-3, exactly one): opencode print CLI, declared model, `--repository=mobingilabs/ouchan`, `--wall-clock-minutes` ≤ 60, dedicated TMPDIR, print-debug log. Record provider calls, source actions, reproduction attempts, admissions/refusals, dossiers, provider failures, sibling identity before/after for all eight repos, and the leak scan. If the provider is blocked, record `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION` as EXTERNAL.
- [ ] 12.4 Verify any admitted candidate yields a valid owner-local AgentFindingRecord visible in CLI and Control Center, and that a refused or non-reproduced candidate appears nowhere as verified.
- [ ] 12.5 Clean-clone install proof through the extended `gate:clean` (root plus UI).

## 13. Adversarial completion audit (M12)

- [ ] 13.1 Read-only adversarial lanes attack completion: malformed CLI args, unknown env vars, missing/non-zero/timeout provider, interrupted campaign plus resume, missing/stale auth sidecar, unavailable or stale sibling, malformed state/dossier/review files, missing browser, denied destinations, path/symlink tricks, child termination, invalid OpenSpec/task state, stale evidence, empty-validation false positives, skip accounting, branch/worktree drift.
- [ ] 13.2 Every reproduced defect gets a fix plus a regression (T0/T1-class) or a census disposition (other). Re-run the affected gates.

## 14. Ledger closure and live-rendered documentation (M13)

- [ ] 14.1 Reconcile the NW-AUD originals against their successors item by item with SHA citations (021↔credential-use-binding-successor, 022↔proxy-event-firewall, 024↔run-evidence-transaction-successor, 014↔child-process-census-indirection) (A-24).
- [ ] 14.2 Set the six BLOCKED successor children COMPLETE against their receipts (reopen hermeticity work under M3 evidence); set production-completion-programme, the autonomous programme, W11 and the observability plan terminal, with every box ticked-with-citation or struck-with-disposition, including programme 9.1–9.3 against `a574945e` (A-08, A-09, A-10, A-11, R2-23, C-30, D-07).
- [ ] 14.3 Record every census disposition in `audit.md` and the task REPORT. Archive the complete changes oldest-first. Archive the NW-AUD originals: spec sync only when fully implemented as written, otherwise `--skip-specs` plus a disposition record. Stop at the first strict-validation failure (A-22, X-06).
- [ ] 14.4 Owner confirms the ACCEPTED_RESIDUAL and QUARANTINE lists (recorded).
- [ ] 14.5 Render README status block, CURRENT_STATE (including the :811-812 and :4009-4010 rows, CI rows, and the headings at X-07), RELEASE-ADVANCE-CONDITIONS and ROADMAP headings from live `project:check` and `gh` output. Label historical tables (A-18, B-15, B-16, R2-11, X-07).
- [ ] 14.6 `openspec validate --all --strict` PASS, with exactly one active change remaining (this one).

## 15. Close-out choreography and certification (M14)

- [ ] 15.1 Full authoritative set in the session: typecheck, typecheck:bin (BLOCKING), control-center UI typecheck/test/build, browser suite, schema:check, hardening:check, hardening:rules, validation:universe, agent:check, agent:audit, project:check, workspace:check, session:check, campaign:synthetic, gate:local, npm test.
- [ ] 15.2 Create the final substantive commit S, routed canonical. Integrate with `--expect-head S`. `integrate` is the fast-forward push, so S is the tip of that push and no later commit is batched with it.
- [ ] 15.3 Observe CI `EXECUTED_PASS` at S with `gh` and ingest it into the bindings file via `phase23-ci observe`. Every lane is re-executed at S and rebound, so no condition carries ancestor evidence (D-05, R2-09, NW-AUD-010 task 5.2). Then release, and `remove --delete-branch` from canonical after the ancestry proof. If CI fails at S, repair forward with a new S; never amend.
- [ ] 15.4 From canonical with no live session: `gate:local`, `gate:clean` (sibling-absent, root and UI), `gate:topology` at S. Run the authorized npm registry advisory query (OD-3) and bind its record.
- [ ] 15.5 Documentary receipt commit on approved paths only (bindings values, ACTIVE_TASK, STATE, REPORT, CURRENT_STATE); archive this change; push; confirm `project:check` verdict at S and HEAD == origin/main.
- [ ] 15.6 Final topology proof: `git status --short --branch`, `git worktree list --porcelain`, `git branch`, `git branch -r`, `git rev-parse HEAD origin/main`, `git log --oneline --decorate -10`. Only `main`, one worktree, clean.
- [ ] 15.7 Deliver the final completion report in the prompt's 13-section form: verdict per the terminal vocabulary; safety counters (DEV/NEXT/production contacts 0, production DB 0, sibling writes 0, credentials persisted 0, external publications 0, force pushes 0); external prerequisites; final operator commands.
