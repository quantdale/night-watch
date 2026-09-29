# Task State

## Identity

Task ID: nightwatch-final-completion-corrections-v1
Phase: COMPLETION_CORRECTIONS_V1
CHILD OF: nightwatch-final-product-completion-v1
Status: IN_PROGRESS
Starting SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
Last validated implementation SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
Last substantive checkpoint SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-final-completion-corr-c45f0e9d
Last checkpoint: 2026-09-28 — VC-02..VC-06 validation-spine corrections at
clean checkpoint `6b19e428`: exact skip identities, truthful topology, D-04
CI/CLEAN-only relaxation, `gate:ui --ignore-scripts`, and the clean-checkout
verdict/real-root honesty. Focused suites green (routing 15/15, phase23 15/15,
receipt 41/41, census 14/14), probe campaigns HC-180..HC-183 DETECTED,
typecheck:bin PASS at 1560 / 14 of 76, universe PASS at `sha256:95f903de`. A
full `gate:clean` at this anchor produced the VC-06 receipt (real sibling root
measured twice, unchanged; TOOLCHAIN versions; sourceRootCleanAtEmit true) but
the inner PROJECT_TRUTH failed on PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE —
the project baseline still named `32180001` while this task had validated
substantive work past it. Repaired in this documentation-only descendant by
advancing the baseline to this anchor.
Previous checkpoint: 2026-09-28 — VC-01 skip correction at clean checkpoint
`c736ab9b`; the exact committed tree passed the 34-test DEV-login/storage-state
suite, including all four browser-backed assertions with 0 skips. Exact-head
GitHub Actions proof remains pending M4 integration.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
LAST_VALIDATED_IMPLEMENTATION_SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 6b19e4281e1125f0e6198ae6eb6ae4baac4ccfe7
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_COMPLETION_CORRECTIONS_V1_STATUS: IN_PROGRESS

## Objective

Close the corrective change's 39 tasks (phases 1-6), re-verifying every
audit finding at the parent base `1d47e2ee`, so the parent campaign resumes
from sound foundations at M9 task 10.2 (remainder: 59/76 declared).

## Current Milestone

Milestone ID: M4

M1 (bootstrap + Phase 1 preconditions), M2 (task 6.1 formatter policy,
landed FIRST per RESUME_PROMPT §2), and M3 (certification anchors, tasks
2.1-2.8) are COMPLETE. M4 validation spine (tasks 3.1-3.12) is IN_PROGRESS.

## Completed Milestones

- **M1 COMPLETE** — bootstrap and Phase 1 preconditions (tasks 1.1-1.3):
  the corrective change restored unchanged and committed together with
  continuity v2 (`3ce396c6`); the parent session checkpointed at `1d47e2ee`
  with resume point "M9 task 10.2 (remainder: 59/76 declared)" and
  exact-head CI run 36366426608 green at `32180001`, released and removed
  with the branch reachability proof (1.1); the 16 canonical files
  owner-dispositioned disposable (AST-equivalent to `df0a6d35`) and
  restored under the explicit owner authorization, pi-lens mutation
  controls disabled (`~/.pi-lens/config.json` + project `.pi-lens.json` at
  `/home/dalepalaca/go/src/` and `~/.nightwatch/`), `workspace:check` PASS
  (`canonicalSafe=true`) (1.2); all 31 findings re-verified at `1d47e2ee`
  with file:line evidence — 21 STILL_PRESENT, 5 CHANGED, 2 COMPLETED_LATER
  (VB-04 and VD-05's rule @ `a784e668`), 3 follow-on defects CF-01..CF-03
  (1.3).
- **M3 COMPLETE** — certification anchors (tasks 2.1-2.8, VB-01..VB-07):
  VB-07 baseline 1579 diagnostics / 13 of 76 entry points, 78 exact ceilings,
  total 1579, annotation budget 26; 45/45 focused ratchet/CLI tests plus
  clean-tree project-state regression 1/1. `gate:dev` PASS and
  `gate:milestone` PASS at `d6fd98b1`; both conservatively selected all 438
  unit tests, 5773 executed, 5740 passed, 0 failed, 33 skipped. Milestone
  also passed `typecheck:bin`, `hardening:rules`, `project:check`, and
  `workspace:check`. `withinTarget=false` for both lanes (782447/120000 ms and
  1337343/300000 ms); selection was not narrowed.

## Work In Progress

- **M2 (task 6.1) COMPLETE** — the repository formatter policy landed FIRST
  per RESUME_PROMPT §2: `biome.json` (formatter + organize-imports + linter
  off), `.editorconfig` pinning the normalizers off and declaring only the
  corpus byte invariants that hold, and `tests/unit/formatterPolicy.test.ts`
  5/5 with a positive control (formatter-enabled config rewrites the probe)
  and a whole-tracked-corpus `check --write` no-op over a disposable
  `git ls-files` copy with before/after hashes. The pinned
  `@biomejs/biome@2.5.14` installed offline (cache-only), the disposable
  `npm ci --offline` verification re-executed (10 packages, lockfile
  byte-identical), and dependency-currency + the matrix carry the honest
  advisory-scope limit. Focused suites green (formatterPolicy 5/5;
  nw14/nw08/executionClasses/nw07/c16 149/149 with the known clean-tree
  `projectState:2316` exception on the dirty worktree); hardening:check,
  handoff:check, agent:check and typecheck all PASS.
- Lint follow-through in the same checkpoint: the dead `loadTypeScriptModule`
  wrappers in `bin/ai-local-canary.mjs` and `bin/auth-configure.mjs` are
  removed (both call sites already use `loadRuntimeTypeScriptModule`
  directly) — this is the fix the harness autofix kept re-applying in
  canonical, now landing legitimately through the C-00 integrate.
- **M4 IN_PROGRESS — validation spine (tasks 3.1-3.12, VC-01..VC-11).**
  VC-01's stale bundled-Chromium skip guards and allowlist entries are removed;
  all 34 focused DEV-login/storage-state tests passed locally, including all
  four browser-backed tests (0 skips); exact-head CI remains pending. VC-02
  (task 3.2) is implemented and focused-validated: v2 identities are exact by
  file/title path/reason; all four authoritative Playwright lanes attach the
  reporter; missing, malformed, unconfigured, and undeclared cases fail
  closed; and safe skip-policy details propagate into gate receipts. Full
  `campaign:synthetic` and owner-provenance proofs passed; the run-shards
  focused proof passed with one declared skip. The semantic-compatibility
  full attempt was made on a dirty worktree: the intended clean-tree
  `projectState:2390` assertion failed and one source-stale reason variant was
  undeclared. That variant is now admitted by its exact identity and a focused
  report re-evaluates PASS; the clean-tree lane rerun is reserved for the
  checkpoint. VC-03 (task 3.3) is now implemented and locally validated: Bubblewrap is resolved from PATH and the resolved executable is reused for all envelope spawns; runner topology is `PROVEN` only for the complete envelope with every absence exercised, otherwise `PROVEN_DEGRADED` or `NOT_PROVEN`; bounded class/envelope/unexercised-absence details flow through quality-gate receipts; the CI artifact uploader is pinned to a full commit SHA and names artifacts with `${{ github.sha }}`. Focused topology/receipt/writer/hardening suites passed 63/63; `npm run gate:topology` PASS (BUBBLEWRAP, four absences exercised, class `PROVEN`); persisted receipt projection PASS; `npm run hardening:check` PASS; `npm run typecheck:bin` PASS at 1572 diagnostics after lowering ceilings. Actual exact-head CI artifact observation remains pending task 3.12. VC-04 (task 3.4) is implemented locally: D-04 now permits absent declared worktrees only for CI/CLEAN, and only with an error-free routing record plus exact STATE-branch equality; semantic-compat forwards the parent gate label through a pure environment helper; regression tests prove LOCAL remains LOCAL and COMPATIBILITY is not a relaxation. Focused routing tests pass 15/15, hardening:check PASS, validation:universe PASS (581 discovered, 0 unclassified; digest `sha256:56a4390f3eb87f1fe9b40bf4`), and typecheck:bin PASS at 1572 / 13 of 76. HC-180 is registered to kill the branch-equality conjunct and was proven
DETECTED at the M4 guard checkpoint `18185f36` (2/2 probes detected, workspace
restored, status unchanged); full `hardening:rules` probe campaign runs at the
M4 group gate. Exact-head CI/artifact evidence and group gates remain pending.
  VC-05 (task 3.5) is implemented and verified: `gate:ui` installs UI
  dependencies with `npm ci --ignore-scripts`, and the FULL chain was verified
  without any declared exception — typecheck clean, 105/105 UI tests, and the
  vite/esbuild production build PASS (esbuild does not need its install script
  here). `checkPhase23QualityGate` asserts the exact install-script text and
  HC-181 kills the flag (DETECTED 4/4). Focused phase23 suite 15/15 including
  the new VC-05 script-text test; hardening:check and typecheck:bin PASS.
  VC-06 (task 3.6) is implemented and locally validated: the clean-checkout
  verdict is the pure `resolveCleanCheckoutVerdict` in
  `bin/lib/cleanCheckoutReceipt.mjs` (measurement integrity > drift >
  dirty-clone > dirty-source > gate result — the erased-conjunct regression,
  where a dirty post-run checkout fell through to the inner gate's PASS, is
  gone); the SOURCE root is re-measured at receipt time
  (`sourceRootCleanAtEmit` on every receipt); the REAL product-resolved
  sibling root is measured read-only via `resolveSiblingRoot` (the direct
  literal stays forbidden) with the v2 depth/entry-bounded manifest whose git
  calls all carry `--no-optional-locks`; every early exit carries siblingMode,
  realSiblingRootClass and exact ambient versions through
  `cleanEarlyReceipt`. Evidence: gateReceiptPersistence 41/41 (9 new VC-06
  tests incl. a behavioral early-exit receipt), hardening:check PASS, probe
  campaign checkPhase23QualityGate 6/6 DETECTED (HC-181/182/183), census
  suites 14/14 after registering the receipt library's npm version probe as
  TEST_LANE, typecheck:bin PASS at 1560 diagnostics / 14 of 76 (the clean
  runner itself dropped 12→0), universe PASS at `sha256:95f903de`. The full
  `gate:clean` arc closed at this checkpoint across four receipts: the first
  at `6b19e428` proved the VC-06 machinery (real sibling root measured twice,
  unchanged; TOOLCHAIN versions; sourceRootCleanAtEmit true) and exposed
  PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE; after the baseline advance
  (`e9ad3300`) a second run exposed HARDENING APPEND_ONLY on the reconciled
  prose row (declared CORR-CORR-002); a third run exposed
  SEMANTIC_COMPATIBILITY_REPORT_MISSING — the VC-04 label forwarding had
  removed the self-declared COMPATIBILITY authorization the skip reporter
  keyed on. The reporter now authorizes the semantic-compatibility lane by its
  own timing-lane identity (missing-path throw preserved), and the full
  clean-gate run at `9a1abf28` PASSED all 15 groups (clean receipt
  `clean-receipt:sha256:7ce5fa02f058a2c37ecc4a93`, inner gate receipt
  `receipt:sha256:86dea28a9dc385bb814a9a6f` with matching stdout digest,
  real sibling identity `sha256:35b17bb4…` unchanged). The VC-02
  clean-tree semantic-compat rerun also passed standalone (2177 total, 2163
  passed, 14 declared skips, 0 failed, skipPolicy PASS). Task 3.7 (VC-07) is
  complete: 11/11 at the 2 s bound under load (NOT REPRODUCED, recorded as a
  first-class outcome), the root-cause comment corrected (the wait bounds
  handler LATENCY after `goto`, not an async projection), `docs/FLAKE-LEDGER.md`
  (FLAKE-001) created and declared APPEND_ONLY_ARCHIVE. Task 3.8 (VC-08) is
  complete: the workflow-pinning matcher is token-based over every `uses` key
  form (block/compact/flow/quoted, quote-aware comment stripping, fail-closed
  on empty references) and probes HC-184..HC-187 cover the previously
  unprobed forms — probe campaign 5/5 DETECTED, hardening suites 15/15,
  typecheck:bin PASS at 1559 (validation-and-gates 23→22, total 1560→1559,
  lowered in the same change). Task 3.9 (VC-09) is complete: the c04 twins
  assert non-empty premises (`graph.edges.length > 0` before their loops),
  phase14 C3-14's silent early return is now a declared skip, and the c03
  real-topology/method-level/TRUNCATED describes classify through
  `classifyLiveSourceTestState` (REAL_TOPOLOGY_LIVE_STATE) with `LIVE_SOURCE_`
  reason tokens — the 11 generic-token config entries were replaced by 22
  exact LIVE_SOURCE identities + 1 for C3-14 (93 total, zero generic residue).
  Focused c03/c04/phase14 run 48 passed / 20 declared skips; skip-policy
  suites 18/18; hardening:check PASS; full semantic-compat on the clean tree
  at `71a6ca3b` PASS (2177 total, 2163 passed, 14 declared, 0 failed,
  skipPolicy PASS). Task 3.10 (VC-10) is complete: group measurements count
  declared dependencies SEPARATELY (`declaredDependence` beside
  `measuredDependence` — a declared LEGACY_HOST_PATH_SKIP is host-path debt,
  never zero; NONE_INPUT_FIXTURE stays opaque data), the constant extractor
  resolves bounded function-returned roots (single-return function bodies
  without nested braces + literal-returning arrows; path-built or
  multi-statement returns stay UNRESOLVED by design, never guessed), and
  SEMANTIC_COMPATIBILITY / SYNTHETIC_CAMPAIGN declare
  `requiresSiblingTopology: true` (their suites carry 2 + 3 declared
  dependencies). gateTopology 36/36 (two new VC-10 cases), gate:topology PASS
  (PROVEN/BUBBLEWRAP, truthful receipt), typecheck:bin PASS at 1559 (the 4
  implicit-any params its first draft introduced were FIXED, never raised past
  the ceiling), hardening:check + validation:universe PASS. The genuinely dead
  `CHILD_ENV_INHERITED_KEYS` export (zero consumers, independently verified)
  is removed alongside.

Task 3.11 (VC-11) is complete: the orphan-branch unique-commit count runs
against the canonical REMOTE ref (`origin/<branch>`, never a stale local
main) and the test asserts the exact numeric value
(`orphanSessionBranches[0].uniqueCommits === 1`); UI_CONTROL_CENTER declares
`NODE22`; the sun_path budget measures `os.tmpdir().length` instead of a
hard-coded `/tmp/`; HC-188 probes the HANDOFF classification invariant
(probe campaign 2/2 DETECTED with HC-028). workspaceIsolation +
syntheticCampaignShards + phase23QualityGate 92/92; hardening:check,
typecheck:bin (1559) and validation:universe PASS. The dead
`SHARD_CHILD_ENVIRONMENT_IDS` export (.mjs + .d.mts) is removed after full
consumer verification.

## Exact Next Action

Proceed to M4 task 3.12 (the M4 close-out: focused suites + `gate:milestone`
PASS at the clean checkpoint, commit, then the pending exact-head CI and
topology-artifact observation). The clean-gate proof, the semantic-compat
clean-tree rerun, and VC-07..VC-11 are complete. Preserve VC-01 exact-head CI
and VC-03 artifact observation as pending M4 close-out evidence; integrate
only after 3.12 passes.

## Files Changed

| Path | Reason | Status |
| --- | --- | --- |
| `openspec/changes/nightwatch-final-completion-corrections-v1/` | corrective change contract (proposal/design/audit/tasks/specs) | restored unchanged into the worktree (bootstrap) |
| `openspec/changes/nightwatch-final-completion-corrections-v1/audit.md` | task 1.3 re-verification record at `1d47e2ee` | updated at bootstrap |
| `.agent/tasks/nightwatch-final-completion-corrections-v1/` | continuity v2 record for this child campaign | created at bootstrap |
| `.agent/ACTIVE_TASK.md` | active route to this child | flipped at bootstrap |
| `.agent/EXECUTION_PROMPT.md` | planner-executor handoff for this child | rewritten at bootstrap |
| `bin/bin-typecheck.mjs`, `bin/lib/typecheck-ratchet.{mjs,d.mts}` | full-source per-file, total, stale-ceiling, and annotation-budget ratchet | VB-07 and M3 group gates complete at `d6fd98b1` |
| `config/bin-typecheck.v1.json` | VB-07 ratchet retains the historical 1579 baseline and the current 1560 surface; 78 exact ceilings, run-shards=13 | VC-06 dropped quality-gate-clean 12→0; typecheck:bin PASS at 1560 / 14 of 76 |
| `tests/unit/binTypecheckRatchet.test.ts` | missing/growth/staleness/annotation regression tests | 5/5; registered FULL_REGRESSION / PARALLEL_SAFE |
| `tests/unit/devLoginSecurity.test.ts`, `tests/unit/storageState.test.ts` | VC-01: remove stale bundled-Chromium skips so the configured system Chrome channel executes the security checks | 34/34 focused tests PASS; four browser-backed tests executed, CI proof pending |
| `config/semantic-compatibility.v1.json` | VC-01 obsolete Chromium entries removed; VC-02 exact file/title-path/reason skip identities | strict policy test PASS; 81 entries; source-stale variant proven |
| `bin/lib/semantic-skip-policy.{mjs,d.mts}` | v2 exact skip-identity evaluator and closed outcomes | focused policy probes PASS |
| `tests/helpers/playwrightSkipIdentityReporter.ts` | bounded v2 identity report; authorized path validation | reporter path refusal probes PASS |
| `bin/run-shards.mjs`, `bin/semantic-compat.mjs`, `bin/campaign-synthetic.mjs`, `bin/quality-gate.mjs`, `package.json` | attach reporter/evaluator to SHARDS, COMPATIBILITY, SYNTHETIC_CAMPAIGN, OWNER_PROVENANCE; gate fails closed and carries skipPolicy details | campaign, owner, shard, typecheck and focused receipt proofs PASS |
| `bin/lib/gate-receipt.{mjs,d.mts}`, `bin/lib/shard-child-environment.d.mts` | sanitize and propagate skip-policy outcomes/counts/locations; type shard report path | receipt focused probes PASS; bin typecheck PASS |
| `bin/lib/topology-gate.{mjs,d.mts}`, `bin/gate-topology.mjs`, `bin/quality-gate.mjs`, `config/bin-typecheck.v1.json` | VC-03 PATH-based Bubblewrap resolution, truthful topology classification, bounded gate receipt projection, and measured typecheck ceiling reduction | topology gate PASS (`PROVEN`, 4/4 absences); typecheck ratchet PASS at 1572 |
| `.github/workflows/hardening.yml`, `bin/lib/hardening/rules/validation-and-gates.mjs`, `bin/lib/authenticatedWriterCensus.mjs` | VC-03 full-SHA topology artifact upload, narrow action allowlist, and receipt-writer census registration | hardening:check PASS; exact-head artifact observation pending |
| `tests/unit/gateTopology.test.ts`, `tests/unit/syntheticCampaignDiagnostics.test.ts`, `tests/unit/authenticatedWriterCensus.test.ts` | VC-03 path resolution, classification, bounded receipt, artifact-pin, and writer-registration regressions | focused suites 63/63 PASS |
| `bin/agent-state.mjs`, `bin/semantic-compat.mjs`, `bin/lib/semantic-compat-environment.{mjs,d.mts}`, `bin/lib/hardening/rules/documentation.mjs` | VC-04 D-04 relaxation restricted to CI/CLEAN with routing validity and exact branch equality; semantic-compat inherits its parent label; HC-180 enforces equality | hardening:check PASS; HC-180 DETECTED 2/2 at `18185f36` |
| `package.json`, `bin/lib/hardening/rules/validation-and-gates.mjs`, `config/hardening-rule-probes.v1.json`, `tests/unit/phase23QualityGate.test.ts` | VC-05 `gate:ui` install with `--ignore-scripts`, hardening assertion on the script text, HC-181 probe, focused regression | gate:ui chain verified (105/105 UI tests + build); HC-181 DETECTED 4/4; phase23 15/15 |
| `bin/quality-gate-clean.mjs`, `bin/lib/cleanCheckoutReceipt.{mjs,d.mts}` | VC-06 pure verdict (erased-conjunct fix), v2 read-only bounded manifest, real-root measurement via `resolveSiblingRoot`, early receipts with siblingMode/root-class/versions | gateReceiptPersistence 41/41; full gate:clean run pending at checkpoint |
| `bin/lib/hardening/rules/validation-and-gates.mjs`, `config/hardening-rule-probes.v1.json` | VC-06 clean-runner rule now asserts `measureClean(root)` + the verdict wiring + the library's lock-free status pattern; HC-182/HC-183 probes | probe campaign checkPhase23QualityGate 6/6 DETECTED |
| `bin/lib/childProcessCensus.mjs` | classify the receipt library's `npm --version` probe as TEST_LANE (identical to quality-gate-clean's npm spawns) | census suites 14/14; hardening:check PASS |
| `tests/unit/gateReceiptPersistence.test.ts` | VC-06 verdict/manifest/early-receipt/wiring regressions (9 new tests) | 41/41 PASS |
| `docs/CURRENT_STATE.md`, `config/document-role-corrections.v1.json` | advance the substantive baseline to `6b19e428` (PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE repair) and declare CORR-CORR-002 for the reconciled prose row | project:check PASS at `e9ad3300`; hardening:check PASS |
| `tests/helpers/playwrightSkipIdentityReporter.ts`, `tests/unit/semanticSkipIdentity.test.ts` | VC-04 follow-through: the compat lane authorizes by its timing-lane identity (label forwarding had removed the report authorization); regression tests | semanticSkipIdentity 14/14; semantic-compat clean-tree rerun PASS (2177/2163/14/0, skipPolicy PASS) |
| `docs/FLAKE-LEDGER.md`, `config/document-role.v1.json` | VC-07 tracked flake ledger (FLAKE-001: mechanism, 11/11 non-reproduction at the 2 s bound, shipped bound + residual risk) + APPEND_ONLY_ARCHIVE declaration | hardening:check PASS |
| `tests/unit/observerSemanticLedger.test.ts` | VC-07 root-cause comment correction (synchronous projection; the wait bounds handler latency after `goto`) | observerSemanticLedger 2/2 PASS |
| `tests/unit/c03GrpcTopology.test.ts`, `tests/unit/c04FrontendGraph.test.ts`, `tests/unit/phase14FreshSourceAdmission.test.ts`, `config/semantic-compatibility.v1.json` | VC-09 non-vacuous twin premises, declared C3-14 skip, `classifyLiveSourceTestState` for the c03 real-topology describes (LIVE_SOURCE_ tokens replace 11 generic entries; 93 exact identities) | focused 48 passed / 20 declared; semantic-compat PASS at `71a6ca3b` |
| `bin/lib/topology-gate.mjs`, `bin/gate-topology.mjs`, `config/quality-gate.v1.json`, `tests/unit/gateTopology.test.ts`, `bin/child-environment.mjs` | VC-10 separate `declaredDependence` counting, bounded function-returned-root extraction (unresolvable stays UNRESOLVED), truthful `requiresSiblingTopology: true` for the two host-path-debt groups; dead `CHILD_ENV_INHERITED_KEYS` export removed | gateTopology 36/36; gate:topology PASS (declaredDependence 2/3); typecheck:bin 1559 |
| `bin/workspace-integrity.mjs`, `tests/unit/workspaceIsolation.test.ts`, `config/quality-gate.v1.json`, `tests/unit/syntheticCampaignShards.test.ts`, `config/hardening-rule-probes.v1.json`, `bin/lib/shard-child-environment.{mjs,d.mts}` | VC-11 orphan-branch count against the canonical remote ref + numeric assertion, UI group `NODE22`, TMPDIR-measured sun_path budget, HC-188 HANDOFF classification probe; dead `SHARD_CHILD_ENVIRONMENT_IDS` export removed | 92/92 focused; probe 2/2 DETECTED; hardening + typecheck:bin (1559) + universe PASS |
| `bin/lib/hardening/rules/validation-and-gates.mjs`, `config/hardening-rule-probes.v1.json`, `config/bin-typecheck.v1.json` | VC-08 token-based workflow-pinning matcher (all `uses` key forms, comment-aware, fail-closed on empty refs) + probes HC-184..HC-187; ratchet lowered to 1559 | probe campaign 5/5 DETECTED; hardening suites 15/15; typecheck:bin PASS |
| `tests/unit/semanticSkipIdentity.test.ts`, `tests/unit/selfDevSandboxConfinement.test.ts`, `tests/unit/syntheticCampaignDiagnostics.test.ts` | VC-02 identity/report, reason, and gate-receipt regressions | 29/29 receipt+policy; 25 passed, 1 declared host skip |
| `config/validation-universe.v1.json`, `config/validation-execution-classes.v1.json` | register ratchet suite and refresh the inventory digest | checks PASS at M3 close; VC-06 re-measured at `sha256:95f903de` (581 discovered, 0 unclassified) |

## Validation Ledger

Command: `npm run workspace:check` (canonical, pre-bootstrap)
Result: PASS
When: 2026-09-28
Relevant failure/output summary: `canonicalSafe=true`, clean tree at
`1d47e2ee`; the 16 owner-dispositioned files restored under RESUME_PROMPT
§1 authorization; pi-lens mutation controls disabled.

Command: re-verification of all 31 audit findings at `1d47e2ee` (read-only)
Result: PASS (recorded in `audit.md`'s re-verification table)
When: 2026-09-28
Relevant failure/output summary: 21 STILL_PRESENT, 5 CHANGED, 2
COMPLETED_LATER (VB-04 and VD-05's rule @ `a784e668`), 3 follow-on defects
(CF-01..CF-03) where later parent work built on a defective surface.

Command: `npm run agent:check` (this worktree, pre-bootstrap)
Result: PASS (pending this bootstrap commit's continuity headings)
When: 2026-09-28
Relevant failure/output summary: strict errors listed the missing
continuity headings (## Deferred Work, ## Completion Criteria, ## Files
Changed, ## Validation Ledger) — added before the bootstrap commit.

Command: focused ratchet/CLI suites, `npm run typecheck`,
`npm run typecheck:bin`, `npm run validation:universe`, and
`node bin/validation-execution-classes.mjs`
Result: PASS
When: 2026-09-28
Relevant failure/output summary: 45/45 Playwright tests; root typecheck clean;
bin lane PASS at 13/76, 1579 diagnostics, 78 exact ceilings, total ceiling
1579, annotation budget 26; universe 580 discovered / 0 unclassified at
`901b155e`; all 438 executable unit tests have valid non-weakening classes.

Command: `npm run gate:dev -- --json` (pre-checkpoint candidate tree)
Result: FAIL (clean-checkout-dependent test; retry required)
When: 2026-09-28
Relevant failure/output summary: affected selection broadened to 438 tests;
5773 executed, 5739 passed, 1 failed, 33 skipped, 0 not-run. The sole failure
is `tests/unit/projectState.test.ts:2390`, whose real-tree check emits
`PROJECT_STATE_CHECKOUT_DIRTY` on stderr and no stdout under DEV_LANE while
the worktree is dirty. The test's missing execution class and first digest
drift were fixed; a later clean-checkpoint run exposed the helper's missing
BIN_SYNTAX classification (recorded below). No test or safety condition was
weakened.

Command: `npm run gate:dev -- --json` (after checkpoint `80840627`)
Result: STEP_FAILED at `validation-universe`; correction in progress
When: 2026-09-28
Relevant failure/output summary: clean checkout let the lane reach its first
required step, where `bin/lib/typecheck-ratchet.mjs` was unclassified and the
stored inventory digest had drifted. Added the helper to BIN_SYNTAX and
measured digest `901b155e` (580 discovered, 0 unclassified); that correction
was committed as `d6fd98b1` before the successful retries below.

Command: clean-checkout `projectState.test.ts` real-tree regression at
`d6fd98b10ac810128e7ed244c31c213e4d3fc72b`
Result: PASS (1/1)
When: 2026-09-28
Relevant output: the real project-state check produced its expected stdout
and every release-check probe resolved to carried output.

Command: `npm run gate:dev -- --json` at `d6fd98b10ac810128e7ed244c31c213e4d3fc72b`
Result: PASS
When: 2026-09-28
Relevant output: 3 shards; 5773 planned/executed, 5740 passed, 0 failed,
33 skipped, 0 not-run; coverage true; 782447 ms against the 120000 ms
telemetry target (`withinTarget=false`); affected selection broadened to all
438 tests (`AFFECTED_BROADENED`).

Command: `npm run gate:milestone -- --json` at `d6fd98b10ac810128e7ed244c31c213e4d3fc72b`
Result: PASS
When: 2026-09-28
Relevant output: all steps exit 0, including `typecheck:bin`,
`hardening:rules`, `project-check`, and `workspace-check`; 3 shards;
5773 planned/executed, 5740 passed, 0 failed, 33 skipped, 0 not-run; coverage
true; 1337343 ms against the 300000 ms telemetry target (`withinTarget=false`);
all 438 tests selected. No selection narrowing was applied.

Command: initial `npx playwright test --project=nightwatch tests/unit/devLoginSecurity.test.ts tests/unit/storageState.test.ts` after removing obsolete skip-policy entries
Result: FAIL before test discovery
When: 2026-09-28
Relevant failure/output summary: the JSON allowlist had a trailing comma after
its new final element was removed. No tests ran; the comma was repaired
immediately and strict JSON parsing passed on retry.

Command: `npx playwright test --project=nightwatch tests/unit/devLoginSecurity.test.ts tests/unit/storageState.test.ts`
Result: PASS (34 passed, 0 skipped)
When: 2026-09-28
Relevant output: all three DEV-login real-page tests and the storage-state
live cookie-readability browser test executed through the configured Chrome
channel. All 34 tests passed in 4.9 s; none were skipped.

Command: `npx playwright test --project=nightwatch tests/unit/devLoginSecurity.test.ts tests/unit/storageState.test.ts` at committed checkpoint `c736ab9b3534bf879ae730856e717546cfaa0b0b`
Result: PASS (34 passed, 0 skipped)
When: 2026-09-28
Relevant output: exact committed tree rerun; all four browser-backed security
assertions executed and passed, with no skip outcomes (2.5 s).

Command: `npm run campaign:synthetic` (VC-02 reporter + measured exact identities)
Result: PASS
When: 2026-09-28
Relevant output: 107 files; 1960 total, 1946 passed, 14 skipped, 0 failed;
all 14 skips declared by exact file/title-path/reason identities; skipPolicy
PASS (14 skipped, 0 undeclared); coverage complete; L6 lane PROVEN.

Command: `npm run test:owner-provenance` with the authorized v2 report path
Result: PASS (91 passed, 0 skipped)
When: 2026-09-28
Relevant output: the v2 report contains zero skips; owner-provenance reporter
and skip-policy receipt path exercised.

Command: `node bin/run-shards.mjs --files=tests/unit/semanticSkipIdentity.test.ts,tests/unit/selfDevSandboxConfinement.test.ts --workers=1 --serial --json`
Result: PASS
When: 2026-09-28
Relevant output: planned/executed 26/26, 25 passed, 1 declared host skip,
0 failed; per-shard skipPolicy PASS (1 skipped, 0 undeclared).

Command: focused semanticSkipIdentity + syntheticCampaignDiagnostics tests
Result: PASS (29/29)
When: 2026-09-28
Relevant output: exact matching, report path refusal, missing/invalid report,
runner wiring, and gate-receipt safe propagation all passed.

Command: focused semanticSkipIdentity + selfDevSandboxConfinement tests
Result: PASS (25 passed, 1 declared host skip)
When: 2026-09-28
Relevant output: v2 allowlist identity validation passed; selfDev case G
reported a reasoned skip because chown support is unavailable.

Command: targeted COMPATIBILITY report for `tests/unit/realSourceCanary.test.ts`
Result: PASS (1 skipped identity declared; 0 undeclared)
When: 2026-09-28
Relevant output: default sibling-root state produced LIVE_SOURCE_STALE; the
exact test identity/reason is now admitted and policy evaluation returns PASS.

Command: `npm run typecheck` + `npm run typecheck:bin`
Result: PASS
When: 2026-09-28
Relevant output: root typecheck clean; bin ratchet PASS at 1573 diagnostics,
13/76 conforming, 78 exact ceilings; measured ceilings only decreased from
the previous 1579 total and run-shards 16.

Command: `npm run test:semantic-compat` on the dirty worktree (diagnostic run)
Result: FAIL (expected clean-checkout dependency; one skip-policy mismatch since repaired)
When: 2026-09-28
Relevant output: 2162 total, 2147 passed, 14 skipped, 1 failed at
`tests/unit/projectState.test.ts:2390:EXPECT_EQUAL` because the real checkout
was dirty; at that time one `realSourceCanary` LIVE_SOURCE_STALE identity was
not yet allowlisted. The precise identity was then reproduced and evaluated
PASS. Full lane rerun is deferred to a clean checkpoint; no test condition was
weakened.

Command: `node -e` strict JSON parse + stale-reference search; TypeScript LSP diagnostics on both suites
Result: PASS
When: 2026-09-28
Relevant output: semantic compatibility JSON parses; no `browserBinaryAvailable`
or `CHROMIUM_UNAVAILABLE` references remain in the two suites/config; primary
LSP diagnostics report 0 findings for both test files.

Command: focused `activeTaskRoutingBinding.test.ts`
Result: PASS (15/15)
When: 2026-09-28
Relevant output: absent declared worktrees are expected only for CI/CLEAN, exact
STATE-branch match, and an otherwise error-free routing record; semantic-compat
preserves LOCAL and does not grant COMPATIBILITY a relaxation.

Command: `npm run hardening:check`, `npm run validation:universe`, and `npm run typecheck:bin`
Result: PASS
When: 2026-09-28
Relevant output: structural invariants PASS; universe 581 discovered / 0
unclassified at `sha256:56a4390f3eb87f1fe9b40bf4`; bin ratchet 1572
diagnostics / 13 of 76 conforming / 78 ceilings.

Command: `node bin/hardening-check.mjs --probe-campaign --only=checkAgentContinuityIntegrity` at `18185f36`
Result: PASS
When: 2026-09-28
Relevant output: 2/2 probes detected (HC-026, HC-180), 0 undetected,
workspace restored, status unchanged.

Command: `npm ci --ignore-scripts --prefix ui/control-center` + UI typecheck/test/build (VC-05 verification)
Result: PASS
When: 2026-09-28
Relevant output: install succeeded without lifecycle scripts; typecheck clean;
105/105 vitest tests; `vite build && node scripts/verify-build.mjs` PASS
(44 modules, no external references). esbuild does not need its install script
under the bundled fallback — NO declared exception required.

Command: `node bin/hardening-check.mjs --probe-campaign --only=checkPhase23QualityGate`
Result: PASS
When: 2026-09-28
Relevant output: 4/4 probes detected (HC-022, HC-090, HC-091, HC-181),
workspace restored, status unchanged.

Command: focused `phase23QualityGate.test.ts`
Result: PASS (15/15)
When: 2026-09-28
Relevant output: includes the new VC-05 gate:ui `--ignore-scripts` script-text
regression; `npm run hardening:check` and `npm run typecheck:bin` PASS after
the rule and probe change.

Command: focused `gateReceiptPersistence.test.ts` (VC-06 block added)
Result: PASS (41/41)
When: 2026-09-28
Relevant output: verdict precedence (dirty clone / dirty source / drift /
unresolved / verbatim gate result), v2 manifest determinism + nested-change
detection + worktree status binding, early-receipt field shape, a behavioral
early-exit spawn carrying siblingMode=INVALID + exact versions + root class,
and wiring assertions (pure resolver used; `resolveSiblingRoot` present;
`DEFAULT_SIBLING_ROOT` literal absent; `--no-optional-locks` in the library;
no `git(['status'` left in the runner).

Command: `node bin/hardening-check.mjs --probe-campaign --only=checkPhase23QualityGate`
Result: PASS
When: 2026-09-28
Relevant output: 6/6 DETECTED (HC-022, HC-090, HC-091, HC-181, HC-182,
HC-183), workspace restored, status unchanged. HC-182 kills the verdict
wiring; HC-183 replaces every `measureClean(root)` call.

Command: census suites (`childProcessCensus.test.ts`, `childProcessCensusIndirection.test.ts`)
Result: PASS (14/14)
When: 2026-09-28
Relevant output: after classifying the receipt library's npm probe as
TEST_LANE and replacing the JSDoc `import('node:child_process')` type
annotations (which the raw-source indirection check counts as dynamic
imports) with structural return types, hardening:check reports 0 census
errors.

Command: `npm run hardening:check` + `npm run typecheck:bin` + `npm run typecheck` + `npm run validation:universe`
Result: PASS
When: 2026-09-28
Relevant output: structural invariants PASS; bin ratchet 1560 diagnostics /
14 of 76 conforming / 78 ceilings (quality-gate-clean now 0, cleanCheckout
Receipt 0 — no entry needed); root typecheck clean; universe 581 discovered /
0 unclassified at `sha256:95f903de`.

Command: behavioral early-exit smoke (`env -i … NIGHTWATCH_CLEAN_SIBLING_MODE=INVALID node bin/quality-gate-clean.mjs`)
Result: PASS (exit 1 with a complete receipt)
When: 2026-09-28
Relevant output: `{siblingMode: INVALID, nodeVersion: v22.22.1,
npmVersion: 10.9.4, versionsSource: AMBIENT, realSiblingRootClass:
DEFAULT, sourceRootCleanAtEmit: false (dirty tree), finalResult:
ENVIRONMENT_MISMATCH}` — sibling mode, versions and root class now present
on an early exit.

Command: `npm run test:semantic-compat` — the VC-02 clean-tree rerun on the dirty worktree (diagnostic)
Result: FAIL (skipPolicy SKIP_REPORT_MISSING; then a clean-tree retry hit the known dirty-tree projectState:2390)
When: 2026-09-28
Relevant output: 2177 total, 2163 passed, 14 skipped, 0 failed — the report
was missing because the VC-04 label forwarding removed the self-declared
COMPATIBILITY gate label the skip reporter authorized on. Fixed by
lane-identity authorization (reporter + regression test, commit `9a1abf28`).

Command: `npm run gate:clean` at `6b19e428` (run 1)
Result: TEST_FAILURE at inner group 7 (PROJECT_TRUTH)
When: 2026-09-28
Relevant output: the VC-06 receipt itself was fully honest — real sibling
root measured twice (unchanged `sha256:35b17bb4…`), TOOLCHAIN versions,
sourceRootCleanAtEmit true — and groups 1–6 PASSED (incl. HARDENING_PROBES
with HC-180..183). PROJECT_TRUTH failed with
PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE: the project baseline named
`32180001` while the task had validated substantive work past it (latent
since the M3 anchor advance).

Command: `npm run project:check` + `npm run gate:clean` at `e9ad3300` (runs 2a/2b)
Result: project:check PASS; gate:clean TEST_FAILURE at HARDENING (group 4)
When: 2026-09-28
Relevant output: the baseline advance (`e9ad3300`, docs-only) repaired
PROJECT_TRUTH (PASS in run 2b); HARDENING then failed APPEND_ONLY on the
reconciled prose row (docs/CURRENT_STATE.md:810) — declared as CORR-CORR-002
in `config/document-role-corrections.v1.json` (inert: the old line is gone).

Command: `npm run gate:clean` at `3f40e56d` (run 3)
Result: TEST_FAILURE at SEMANTIC_COMPATIBILITY (group 9)
When: 2026-09-28
Relevant output: groups 1–8 PASSED (PROJECT_TRUTH and HARDENING included);
semantic-compat reported SKIP_REPORT_MISSING (the VC-04 report-authorization
regression, see above).

Command: `npm run test:semantic-compat` at `9a1abf28` (clean tree)
Result: PASS
When: 2026-09-28
Relevant output: 2177 total, 2163 passed, 14 declared skips, 0 failed;
skipPolicy PASS (14 declared, 0 undeclared) — the clean-tree rerun reserved
since VC-02 is now complete.

Command: `npm run gate:clean` at `9a1abf28` (run 4) — full clean-gate proof
Result: PASS (finalResult PASS, 15/15 groups)
When: 2026-09-28
Relevant output: clean receipt `clean-receipt:sha256:7ce5fa02f058a2c37ecc4a93`
(sourceHead `9a1abf28…`), inner gate receipt
`receipt:sha256:86dea28a9dc385bb814a9a6f` with matching stdout digest
(STRUCTURED_FILE, no receipt error); install PASS with
`packageLockDigest: sha256:43993495…`; cleanBefore/cleanAfter/sourceRootClean
AtEmit all true; siblingMode ABSENT (EMPTY_DISPOSABLE) unchanged; real
sibling root DEFAULT measured twice, unchanged
(`sha256:35b17bb4b1cbe4febbfe3375`); versions TOOLCHAIN v22.22.1 / npm
10.9.4; nodeModulesReused/authState/ownerFindingState all false. All 15
groups PASS (SEMANTIC_COMPATIBILITY 367084ms, SYNTHETIC_CAMPAIGN 187492ms,
HARDENING_PROBES 173786ms, TOPOLOGY 54344ms, UI_CONTROL_CENTER 49002ms).

Command: observerSemanticLedger at the 2 s bound under load (VC-07 reproduction attempt)
Result: NOT REPRODUCED (11/11 runs PASS at the 2 s bound)
When: 2026-09-28
Relevant output: 3 solo runs under 20 CPU spinners (load 19–24), 2 rounds of
4 concurrent browser contexts (load 25–26): all 11 runs passed (9.8–22.3 s
each). The loopback fixture's two tiny responses finish within 2 s even under
heavy CPU contention; the historical flake load is not reproducible on demand.
Recorded in `docs/FLAKE-LEDGER.md` FLAKE-001 with the true mechanism
(synchronous projection in one handler passage; the wait bounds handler
LATENCY after `goto`), the shipped 20 s bound and its residual risk.

Command: focused `observerSemanticLedger.test.ts` + `npm run hardening:check` (VC-07 close)
Result: PASS (2/2 + hardening)
When: 2026-09-28
Relevant output: both ledger tests green with the corrected root-cause
comment; the new `docs/FLAKE-LEDGER.md` (APPEND_ONLY_ARCHIVE declaration in
`config/document-role.v1.json`) satisfies document-role currency and the
append-only/status-word rules.

Command: `node bin/hardening-check.mjs --probe-campaign --only=checkWorkflowActionPinning` (VC-08)
Result: PASS (5/5 DETECTED)
When: 2026-09-28
Relevant output: HC-147 (block form), HC-184 (compact `- uses:`), HC-185
(flow `{ uses: }`), HC-186 (quoted `"uses":`) and HC-187 (second workflow
file via the create op) all detected; workspace restored, git status
unchanged.

Command: focused `hardeningRuleQuantifiers.test.ts` + `hardeningProbeCampaign.test.ts` + `npm run hardening:check` + `npm run typecheck:bin`
Result: PASS (15/15 + hardening + typecheck:bin at 1559)
When: 2026-09-28
Relevant output: quantifier/probe invariants green with the five workflow
probes registered; typecheck:bin PASS after lowering validation-and-gates
23→22 and the total 1560→1559 in the same change.

Command: focused c03/c04/phase14 + skip-policy suites (VC-09)
Result: PASS (48 passed / 20 declared skips; 18/18 skip-policy)
When: 2026-09-28
Relevant output: the non-vacuous twin premises and the declared C3-14 skip
behave as intended; the c03 real-topology describes now skip with
LIVE_SOURCE_<kind> tokens via `classifyLiveSourceTestState`, and the config
holds 93 exact identities with zero generic-token residue.

Command: `npm run test:semantic-compat` at `71a6ca3b` (clean tree, VC-09 close)
Result: PASS (2177 total, 2163 passed, 14 declared, 0 failed)
When: 2026-09-28
Relevant output: skipPolicy PASS (14 declared, 0 undeclared); the only
earlier failure (projectState:2390 on the dirty tree) disappeared at the
clean checkpoint as documented. hardening:check PASS alongside.

Command: focused `gateTopology.test.ts` + `gate:topology` + `typecheck:bin` + `hardening:check` + `validation:universe` (VC-10)
Result: PASS (36/36; PROVEN/BUBBLEWRAP; 1559; both structural checks)
When: 2026-09-28
Relevant output: the VC-10 receipt carries `declaredDependence: 2`
(SEMANTIC_COMPATIBILITY) and `3` (SYNTHETIC_CAMPAIGN) alongside
`measuredDependence: 0`, both groups truthfully `requiresSiblingTopology:
true`; the function-returned-root extractor resolves single-return bodies and
literal arrows and leaves path-built returns UNRESOLVED (never guessed). The
first draft's 4 implicit-any params were fixed to land under the 2-diagnostic
ceiling rather than raising it.

Command: probe campaign `--only=checkPlannerHandoffIntegrity` + focused `workspaceIsolation` / `syntheticCampaignShards` / `phase23QualityGate` (VC-11)
Result: PASS (2/2 DETECTED incl. HC-188; 92/92 tests)
When: 2026-09-28
Relevant output: HC-188's mutation (adding a forbidden ambient token read
beside the one permitted gate-mode read) is caught by the strip-and-assert;
the orphan-branch test asserts `orphanSessionBranches[0].uniqueCommits === 1`
against `origin/main`; the sun_path budget uses `os.tmpdir().length`; the UI
group declares `NODE22`. hardening:check, typecheck:bin (1559) and
validation:universe PASS alongside. `SHARD_CHILD_ENVIRONMENT_IDS` (zero
external consumers across .mjs/.ts/.d.mts, independently verified) is removed
from `bin/lib/shard-child-environment.{mjs,d.mts}`.

## Decisions Made During This Task

- VC-09 replaces existence-only sibling probes with
  `classifyLiveSourceTestState` so a STALE checkout can never masquerade as
  CURRENT, and the skip identity carries the full LIVE_SOURCE_<kind> token;
  the config keeps BOTH reason-token variants per test identity because the
  observed kind depends on the host's snapshot state.

- VC-10 keeps topology measurement HONEST about debt: a declared
  LEGACY_HOST_PATH_SKIP counts as a real dependence (the declaration is a debt
  ledger, not an eraser), so `requiresSiblingTopology` declarations can no
  longer read 0 while the config names host-path suites. The
  function-returned-root extractor is deliberately BOUNDED to shapes it can
  read literally — a `path.join`-built or conditionally returned root stays
  UNRESOLVED rather than guessed, and the module documentation says so.

- The D-04 gate label and the skip-report authorization are separate
  authorities: the label grants no worktree relaxation (CI/CLEAN-only, HC-180)
  and semantic-compat never invents it; the reporter therefore authorizes the
  semantic-compatibility lane by its OWN timing-lane identity — which only the
  compat runner sets — while SHARDS/SYNTHETIC_CAMPAIGN/OWNER_PROVENANCE keep
  their explicit gate labels. The missing-path throw and the
  non-absolute-path refusal are preserved, so a lane regression still fails
  closed.
- PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE is resolved by advancing the task
  anchors and the project baseline together to the true validated anchor
  `6b19e428` (the invariant's own direction: the baseline must not lag the
  task). The prose-row reconciliation is declared CORR-CORR-002 (inert — the
  old line is gone). The pre-existing prose drift on the LOCAL/CLEAN/CI rows
  is recorded in CURRENT_STATE's drift notes for VA-03 (task 5.3) rather than
  silently reconciled.

- VC-01 removes the stale test-level browser skips instead of reimplementing
  channel discovery: Playwright already owns the `channel: 'chrome'` launch
  contract, so unavailable configured Chrome must fail setup rather than let
  security assertions silently disappear. Its obsolete skip allowlist entries
  are removed with it.
- VC-02 uses a v2 bounded identity report. A declaration requires exact repo-
  relative file and full title path plus a nonblank reason token; the evaluator
  rejects duplicate/blank/blanket policy entries. Reason variants are added
  only when directly measured, because the same live-source test can report
  LIVE_SOURCE_UNAVAILABLE or LIVE_SOURCE_STALE depending on runner topology.
  Parent gate receipts carry only an enum result, integer counts and safe
  repo-relative file:line locations—never raw title/reason text.
- VC-04 keeps semantic-compat's environment builder in a separate pure module
  so tests exercise actual environment forwarding without importing the CLI's
  `import.meta` entrypoint. It is registered in BIN_SYNTAX and the universe
  digest is refreshed. A temporary declaration shim that masked seven existing
  CLI type diagnostics was removed; the authoritative bin ratchet remains 1572
  diagnostics / 13 of 76 conforming, with no false ceiling reduction. HC-180
  targets the CI/CLEAN branch-equality conjunct and was proven DETECTED at the
  M4 guard checkpoint `18185f36` (2/2 probes, workspace restored).
- VC-06 keeps the verdict precedence explicit: measurement integrity first
  (an unresolvable real sibling root is SIBLING_IDENTITY_UNRESOLVED — neither
  drift nor pass), then identity drift, then the dirty clone and dirty SOURCE
  root, and only then the inner gate's result, which the receipt always
  carries as its own field. The old `siblingIdentityUnchanged ? gateResult :
  DRIFT` fallback is what erased the dirty conjunct; the pure resolver makes
  each conjunct independently testable.
- The REAL sibling root is resolved through `resolveSiblingRoot` — the
  product's single sanctioned resolver (source-integrity rule
  SIBLING_ROOT_DIRECT_READ keeps the literal out of this file) — and the
  receipt records only the class (DEFAULT/ENV_OVERRIDE/UNRESOLVED), never a
  machine-specific absolute path. The v2 manifest discloses truncation, and
  every git call it makes runs with `--no-optional-locks` so a status never
  refreshes an index — in particular inside sibling repositories, which this
  workspace never writes.
- The receipt library's `npm --version` probe is classified TEST_LANE — the
  same profile quality-gate-clean's own npm spawns already receive — rather
  than reshaping the call to satisfy the classifier; the JSDoc type imports
  were replaced with structural return types because the census reads raw
  source for indirections by design (a comment naming child_process counts).
- gate:clean is fail-fast: an early failure hides all later groups, so a
  single receipt proves only its executed prefix. Four receipts were needed to
  reach 15/15 (PROJECT_TRUTH, then HARDENING APPEND_ONLY, then
  SEMANTIC_COMPATIBILITY); the trio of failures found three REAL defects (the
  stale baseline, the undeclared prose-row rewrite, and the VC-04 report
  authorization regression) — none were noise.
  NOT_REPRODUCED is a first-class outcome: the 2 s bound flake was attempted
  under load 19–26 with 4 concurrent browsers (11/11 PASS) and is recorded as
  NOT REPRODUCED rather than papered over; the 20 s bound is retained with its
  residual risk and an event-driven fix sketch named in FLAKE-001.
- VC-08 keeps the pinning matcher FAIL-CLOSED on shapes a regex cannot
  disambiguate from a real uses mapping: a heredoc line shaped exactly like
  one counts as one (suspicious copy-paste material fails), and a `uses` key
  with no inline reference is its own failure — a deferred value cannot be
  pinned. Quote-aware comment stripping follows single-quote doubling and
  double-quote escapes so a quoted `#` can never hide a moving reference.
- M3 gate acceptance follows each lane's explicit JSON `result`: both are
  PASS, while `withinTarget=false` remains disclosed performance telemetry.
  The affected-test selector broadened to all 438 tests and no selection or
  safety criterion was narrowed.

## Discoveries

- The 31 audit findings were re-verified at `1d47e2ee`; VB-04 and VD-05's
  rule landed in the parent's `a784e668` (COMPLETED_LATER) and 5 findings
  CHANGED shape. Three follow-on defects (CF-01/CF-02/CF-03) were recorded:
  later parent work (M5-M9) built on the VD-01/VD-03 foundations.
- VB-07's initial draft only ratcheted the 76 top-level entry points; the
  correction expands the per-file map to every `.mjs` and `.d.mts` included
  by `tsconfig.bin.json`, including diagnostic-bearing `bin/lib` modules.
  Gate validation confirmed the new test needs execution-class and
  validation-universe registration, and the new helper needs BIN_SYNTAX
  classification before broad validation can pass.
- Both M3 lanes completed the broadened 438-test selection with full coverage
  and zero failures; `withinTarget=false` was emitted by both lane receipts
  because the suite took 782447 ms / 1337343 ms respectively. This is retained
  as a performance follow-up without narrowing the selection or changing the
  task's explicit PASS criterion.
- VC-01's skip guard used `chromium.executablePath()` (bundled Chromium), while
  the Playwright project is configured for system `channel: 'chrome'`. Remove
  the stale skip itself rather than duplicate Playwright's channel-resolution
  logic; the focused run now proves the four browser-backed assertions execute
  with the same channel as CI.
- VC-02's reporter canonicalizes title paths relative to the test file and
  strips absolute paths from skip reasons. An absent configured sibling root
  can classify as STALE rather than UNAVAILABLE, so the runner's reason token
  must be discovered and admitted per exact identity; blanket per-file
  exceptions would hide new test skips.

## Blockers

None.

## Safety Events

No Alphaus environment, database, cloud, credential, or external publication
contact; no sibling repository mutation; no force push or history rewrite;
all testing local/synthetic. External contact is OD-3 only. The owner
authorized one restore command (`git checkout -- <the 16 files>`) in
canonical on 2026-09-28 (RESUME_PROMPT §1); canonical was verified clean
afterwards.

## Deferred / Follow-Up

- The parent's M9-M14 work (10.2 remainder, 10.3-10.6, M10-M14) stays in
  the parent campaign after this child closes.
- PRE-EXISTING (discovered 2026-09-28, VC-08 audit): the probe registry has
  five duplicate IDs across other rules (HC-085 in
  checkRuleEngineSoundness+checkRootOutputConfigLiteral, HC-090/091 in
  checkPhase23QualityGate+checkC00WorkspaceIntegrity, HC-092/093 in
  checkC00WorkspaceIntegrity+checkRuleEngineSoundness). IDs are not enforced
  unique by checkRuleEngineSoundness and no test pins uniqueness. The VC-08
  additions (HC-184..187) are unique; a uniqueness invariant for probe IDs is
  deferred as follow-up.

## Resume Recipe

Resume from this file: read `.agent/ACTIVE_TASK.md`, then this task's
`SPEC.md`, `PLAN.md`, `STATE.md`, and the change's `tasks.md`/`audit.md`;
reconcile against `git status` and the session record; run the smallest
decisive validation; continue the Next Action. All work happens in the
session worktree named in the routing block; integration is fast-forward
only; never write under the canonical checkout while this session is live.

## Completion Snapshot

Not complete. Terminal snapshot is written at close-out (task 6.4): every
finding dispositioned with evidence, ACTIVE_TASK routed back to the parent
at IN_PROGRESS with Next action "M9 task 10.2 remainder", and the change
archived with `--skip-specs`.
