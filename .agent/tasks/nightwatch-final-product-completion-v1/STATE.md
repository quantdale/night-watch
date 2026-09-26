# Task State

## Identity

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Status: IN_PROGRESS
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last substantive checkpoint SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-final-product-complet-a891357d
Last checkpoint: 2026-09-26 — M3 COMPLETE (4.1-4.13): the declared-skip /
hermetic-temp / skip-identity spine, sibling-absent clean gate, TOPOLOGY and
UI certification groups, Node 22 + SHA-pinned CI, session fixes, and five
repair-forward checkpoints ending at `aa78a014`; gate:dev PASS 5507/0,
gate:milestone PASS, and exact-head CI green (run 36243034942, all 15
required groups PASS, receipt `receipt:sha256:535217a6dbae65b7a26f9243`,
OD-3).
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_VALIDATED_IMPLEMENTATION_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_FINAL_PRODUCT_COMPLETION_V1_STATUS: IN_PROGRESS

## Objective

Execute the terminal campaign `nightwatch-final-product-completion-v1`
(tasks.md phases 1-15): disposition every audited census item (OD-1), make the
certification spine checkpoint-neutral and CI-green, persist truthful
autonomous-hunt results, reconcile every operator-truth surface, close the
ledger, and end at `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129 with a
`main`-only clean topology (OD-2).

## Current Milestone

M4 Release-certification machinery (tasks 5.1-5.7): wire the seven
unimplemented release probes (G14 reachability, G17 schema lifecycle, G18 UI
error-taxonomy receipt, G19 environment declaration, G21 auth-capability
single evaluator, G12 product run receipt plus the historical W13 aggregate),
the `implemented` honesty rule (5.3), post-certification demotion semantics
(X-04, 5.4), schema DECIDED state (A-19/A-20, 5.5), and CI block-record
wiring (A-14/D-03, 5.6). M3 closed green at `aa78a014` (CI run 36243034942).

## Completed Milestones

- **M0 COMPLETE** — owner pre-flight on canonical: drift recorded in
  audit.md (1.1); canonical record re-pointed to this task (1.2, A-04);
  orphan branch `1441cc8a` recorded and deleted (1.3, A-06); MAINTENANCE
  claim released, planning material moved to the session scratchpad,
  canonical verified clean with `workspace:check` PASS (1.4).
- **M1 COMPLETE** — session bootstrap: `sess-0734f2070d08` on
  `session/nightwatch-final-product-complet-a891357d` at base `1f786a4e`;
  planning change and continuity committed together as bootstrap checkpoint
  `ec6010a2`; session:check PASS, handoff:check PASS, agent:check PASS
  (35 legacy warnings), project:check PASS post-commit.

- **M2 COMPLETE** — certification anchors and ratchets: LIVE_TASK_STATUS
  derivation (R2-N6), checkpoint-neutral binding files behind the diff-shape
  guard (A-01), `checkReleaseEvidenceBindings` + HC-144..146 (146/146),
  project:check D-06 assertions, the bin type-check ceiling ratchet as gate
  group BIN_TYPECHECK_CEILING, and the disposition-token ledger accounting
  (A-21, R2-62). Anchors `8775b58a` + `6f8a9d7c`; gate:dev PASS 5481/0;
  gate:milestone PASS (all steps exit=0).

- **M3 COMPLETE** — CI-green, deterministic, hermetic spine (4.1-4.13):
  declared live-source skips + hermetic temp paths + per-shard skip-identity
  enforcement (`eccce619`); sibling-absent clean gate with measured identity
  (`874015b9`, `7374d511`, `8ac69c22`); TOPOLOGY + UI_CONTROL_CENTER
  certification groups (`4a1c2619`); Node 22 + SHA-pinned workflow actions
  with the workflow-pinning rule (`981fb7f8`); X-08/A-03/A-07 session fixes;
  M3 ledger docs (`7accc8de`, `11afc06a`). Exact-head CI then failed four
  times and every failure was repaired forward: environment-surface gate-label
  enum + COMPATIBILITY absent-worktree classification (`760e90fc`), declared
  CHROMIUM_UNAVAILABLE skips for the real-browser tests (`988834e1`,
  `58bf06f2`), shared port-lease authority + sun_path-safe campaign temp root
  (`736e0e09`), X-02 degraded envelope mode for bwrap-less runners
  (`aa78a014`). gate:dev PASS 5507/0; gate:milestone PASS; exact-head CI
  green (run 36243034942, all 15 groups PASS, receipt
  `receipt:sha256:535217a6dbae65b7a26f9243`).

## Work In Progress

- Task 5.1 (M4): wire the seven unimplemented release probes — G14
  reachability, G17 schema lifecycle, G18 UI error-taxonomy receipt, G19
  environment declaration, G21 auth-capability single evaluator, G12 product
  run receipt plus the historical W13 aggregate — setting `implemented:true`
  only when wired (A-02/D-01).

## Exact Next Action

Read tasks 5.1-5.7 and `src/core/releaseCertification/**`, then wire the
G14/G17/G18/G19/G21/G12 probes behind the `implemented` honesty rule (5.1),
running the focused suites as each lands. Repair forward with new commits on
any failure — never amend. Close M4 with focused + `gate:milestone` PASS per
5.7, then the C-00 push and `gh` CI observation (OD-3) as in M3; the M3
closeout docs commit itself is pushed via
`node bin/nightwatch-session.mjs integrate --expect-session sess-0734f2070d08
--expect-head <head>` and its exact-head CI run is observed with `gh`.

## Files Changed

| Path | Reason | Status |
| --- | --- | --- |
| `openspec/changes/nightwatch-final-product-completion-v1/` | terminal campaign contract (proposal/design/audit/tasks/specs) | restored unchanged into the worktree |
| `openspec/changes/nightwatch-final-product-completion-v1/audit.md` | P0 drift record (1.1) and A-06 disposition record (1.3) | updated this session |
| `.agent/tasks/nightwatch-final-product-completion-v1/` | continuity v2 record for this campaign | created in the worktree (M1) |
| `.agent/ACTIVE_TASK.md` | active route and session binding | flipped to this campaign (M1) |
| `.agent/EXECUTION_PROMPT.md` | planner-executor handoff for this campaign | rewritten (M1) |

## Validation Ledger

Command: `git fetch origin` + `git rev-parse HEAD origin/main`
Result: PASS
When: 2026-09-25
Relevant failure/output summary: no remote movement; `HEAD == origin/main ==
1f786a4e1b7e4967d06c930946f1107e32931e8a`; single canonical worktree; orphan
branch `session/nightwatch-successor-campaign-en-c8bcb74c` present.

Command: `npm run project:check`
Result: FAIL (EXPECTED, OD-4)
When: 2026-09-25
Relevant failure/output summary:
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`; release verdict
`nightwatch.release-certification.v1` OPERATIONALLY_ACCEPTED; conditions
met=0/16; certificationRefused=true; checkpoint `87c4506f`. Matches the
audit's predicted baseline exactly.

Command: `npm run agent:check`
Result: FAIL (EXPECTED, OD-4)
When: 2026-09-25
Relevant failure/output summary: 1 error
`LEDGER_CHANGE_WITHOUT_TASK` (change `nightwatch-final-product-completion-v1`
had no task STATE yet at measurement time); legacy warnings unchanged.

Command: `npm run workspace:status` / `npm run status:local`
Result: PASS / MEASURED
When: 2026-09-25
Relevant failure/output summary: workspace invariants all PASS,
clean=false (untracked planning dir, OD-4 state); `status:local` reports the
change as MISSING_TASK open=113; drift recorded in audit.md.

Command: `openspec validate nightwatch-final-product-completion-v1 --strict`
Result: PASS
When: 2026-09-25
Relevant failure/output summary: Change is valid (113 tasks, 7 delta specs).

Command: `git show session/nightwatch-successor-campaign-en-c8bcb74c`
Result: PASS (A-06)
When: 2026-09-25
Relevant failure/output summary: tip `1441cc8a` verified as the single
docs-only BLOCKED record commit before `git branch -D` under OD-3.

Command: `node bin/nightwatch-session.mjs claim/release` (canonical MAINTENANCE)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: `sess-200ba55d7757` adopted from
`sess-36dedce34085`, naming this task (A-04), then released after the
continuity staging bound it; canonical clean afterwards with
`workspace:check` PASS (attention=0).

Command: `node bin/nightwatch-session.mjs start/claim` (session worktree)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: worktree
`nightwatch-final-product-complet-a891357d`, branch
`session/nightwatch-final-product-complet-a891357d`, base `1f786a4e`,
session `sess-0734f2070d08`; claim adopted the created registration.

Command: `npm run session:check` (worktree)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: OWNED_SESSION, drift=false, attention=0,
canonicalSafe=true; worktree dirty only with the staged bootstrap content.

Command: `npm run handoff:check` (worktree)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: planner-handoff receipt status PASS;
OpenSpec route files tracked; Planned-From `1f786a4e` is a main ancestor.

Command: `npm run agent:check` (worktree)
Result: PASS (35 legacy warnings)
When: 2026-09-25
Relevant failure/output summary: 0 strict errors after the STATE heading set
was completed and the stray slash-joined command list was rephrased out of
ACTIVE_TASK; warnings are the known historical LEDGER_TASK_WITHOUT_CHANGE
population.

Command: `npm run project:check` (worktree, pre-commit)
Result: FAIL (EXPECTED, pre-commit)
When: 2026-09-25
Relevant failure/output summary:
`PROJECT_STATE_CHECKOUT_DIRTY` — the bootstrap content is staged but not yet
committed; every other section reproduced the certified-baseline detail with
ledger_errors=0 (OD-4's LEDGER_CHANGE_WITHOUT_TASK resolved). Re-run after
the bootstrap commit.

Command: `npm run typecheck`, `npm run typecheck:bin`, `npm run hardening:check`
Result: PASS (M2)
When: 2026-09-26
Relevant failure/output summary: root typecheck clean; bin lane PASS with the
new ceiling ratchet (bin/run-shards.mjs 14 <= 25 after JSDoc annotation; no
behaviour change), conformance 14/76 (burn-down is M9); hardening structural
invariants hold including the new `checkReleaseEvidenceBindings` rule.

Command: `node bin/hardening-check.mjs --probe-campaign`
Result: PASS (M2, task 3.3)
When: 2026-09-26
Relevant failure/output summary: rules=86 probes=146 detected=146
undetected=0 restored statusUnchanged=true; HC-144 (subject mutation),
HC-145 (non-binding key), HC-146 (correction-entry non-binding key) all
DETECTED by `checkReleaseEvidenceBindings`.

Command: focused suites (liveTaskStatusDerivation 5/5, c16ExpectedInformationGain,
hardeningRuleParity, productionCompletionOpenWork 15/15, projectState 91/91,
plannerHandoff, validationShardPlan, validationExecutionClasses,
phase23QualityGate, hardeningRuleQuantifiers, nw14HostCapabilityMatrix)
Result: PASS (M2)
When: 2026-09-26
Relevant failure/output summary: contract pins updated for the new rule
(86 rules), the BIN_TYPECHECK_CEILING gate group, the new test-file
classifications, and the binding-authority migration (lane evidence resolved
through config/release-evidence.v1.json with the one-time legacy fallback).

Command: `npm run gate:dev`
Result: PASS (M2, task 3.7)
When: 2026-09-26
Relevant failure/output summary: all steps exit=0; affected-shards
passed=5481 failed=0 in 420.2s; validation-universe unclassified=0 after
registering tests/unit/liveTaskStatusDerivation.test.ts.

Command: `npm run gate:milestone` (pre-commit)
Result: STEP_FAILED (EXPECTED PRE-COMMIT)
When: 2026-09-26
Relevant failure/output summary: every step exit=0 (typecheck-bin,
hardening-rules 146/146 probe campaign included) except project-check exit=1
on `PROJECT_STATE_CHECKOUT_DIRTY` — the milestone gate requires committed
state; re-run after the M2 commit.

Command: `npm run gate:dev` (M3, tasks 4.1-4.6)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all steps exit=0; affected-shards
passed=5485 failed=0, 33 skips all declared by the per-shard skip-identity
policy; validation-universe PASS with refreshed inventory digest after
registering tests/unit/sanitizedFailureLocations.test.ts.

Command: gate:dev affected-shards (M3 intermediate)
Result: ONE INTERMITTENT TEST FAILURE (exclusive bucket, not reproduced)
When: 2026-09-26
Relevant failure/output summary: a single gate:dev run reported the exclusive
shard failed=1; the same bucket then passed 361/361 in isolation, the full
run-shards universe passed 5485/0, and a subsequent gate:dev passed 5485/0.
The receipt was overwritten before the failing location could be read; cause
NOT identified and NOT hidden — watch item for 4.13's full validation.

Command: looped + load-stressed `observerSemanticLedger.test.ts` (M3 4.4)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: 5/5 looped passes idle; 3/3 passes under
6-way CPU saturation (wall 10s → 14s) after converting the waits to
event-driven polls (D-24/R2-65 reproduction + fix evidence).

Command: focused suites (c03 31+3sk, c04 12+6sk, c02b 17+2sk, c02a 20+2sk,
realSourceCanary, c07, phase14FreshSourceAdmission, phase14ContractReport,
reviewStore 54/54, sanitizedFailureLocations, gateReceiptPersistence,
syntheticCampaignDiagnostics, plannerHandoff, validationShardPlan)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all green; typecheck clean; hardening:check
PASS including the dead-`protocol` cleanup in documentation.mjs.

Command: `node bin/run-shards.mjs --json` (M3 skip-policy enforcement)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: result PASS, totals 5485/0 with 33 declared
skips; undeclared-skip enforcement proven earlier by shard-1
SHARD_UNDECLARED_SKIP (3 undeclared → fixed via the rebuilt allowlist) and
the phase14ContractReport double-quote reason that the original generator
missed.

Command: `npm run gate:clean` (M3 4.7 evidence)
Result: RECEIPT RECORDED (both the dirty-tree ENVIRONMENT_MISMATCH path and
the full pre-4.7 run)
When: 2026-09-26
Relevant failure/output summary: the full run's receipt carries
siblingMode=ABSENT, siblingRootClass=EMPTY_DISPOSABLE, measured
siblingIdentityBefore==After (empty digest), install PASS, Node 20 toolchain
(pre-4.11), HARDENING+PROBES PASS and HANDOFF_TRUTH TEST_FAILURE — the latter
was the clone lacking the session worktree (D-04), fixed by 4.10; receipts now
persist to artifacts/gate-receipts/ (B-14).

Command: `npm run gate:topology` (M3 4.8)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all four absence envelopes constructed,
dynamic lanes PASS, findings [], plus requiresSiblingTopologyMeasurements
for all 14 groups (3 measurable, 0 dependence, 11 unmeasurable);
checkWorkflowActionPinning probe HC-147 DETECTED (campaign 147/147).

Command: `npm run gate:ui` (M3 4.9)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: npm ci + typecheck + vitest + vite build +
build verification all PASS (3 built files, 359051 bytes).

Command: clone reproduction of the HANDOFF_TRUTH failure (M3 4.10)
Result: REPRODUCED THEN FIXED
When: 2026-09-26
Relevant failure/output summary: a manual clone failed with
ACTIVE_TASK_SESSION_WORKTREE_MISSING (the declared session worktree is not
registered in a fresh clone) → HANDOFF_ACTIVE_CONTINUITY_FAILED; with the
4.10 classification the same clone passes under NIGHTWATCH_GATE_ENVIRONMENT=CI
and still fails without the label (local strictness preserved).

Command: focused suites for 4.7-4.12 (workspace/session 86/86, topology
26/26 incl. X-02 twins, quantifier 6/6 at 87 rules, phase23 gate pins,
routing/agent-state, phase14 twins, reviewStore 54/54)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all green; typecheck clean;
hardening:check PASS including the workflow-pinning rule and the authenticated
writer census (quality-gate-clean registered as LANE_RECEIPT_TOOL for its
receipt persistence).

Command: `npm run gate:dev` + `npm run gate:milestone` (M3 4.13 close-out,
post topology repair)
Result: PASS (both)
When: 2026-09-26
Relevant failure/output summary: at `aa78a014` — gate:dev affected-shards
5507/0 (selected 395); gate:milestone every step exit=0 with affected-shards
5507/0; npx tsc clean; hardening:check PASS; gate-topology local envelope
regression PASS (envelope BUBBLEWRAP, all four absences constructed, findings
[]) and degraded e2e PASS inside a bwrap-masked user namespace (envelope
BWRAP_UNAVAILABLE_DEGRADED, findings []). Canonical was formatter-churned in
`tests/unit/syntheticCampaignShards.test.ts` and restored path-scoped
(token-identical) before the runs.

Command: `node bin/nightwatch-session.mjs integrate --expect-session
sess-0734f2070d08 --expect-head aa78a014cd18b5cdc1c90b27286f12e0e6bb345f`
Result: SESSION_INTEGRATED — origin/main=aa78a014cd18b5cdc1c90b27286f12e0e6bb345f
When: 2026-09-26
Relevant failure/output summary: fast-forward only (CAS on the remote ref),
no force push, no history rewrite; session `sess-0734f2070d08`.

Command: `gh run watch 36243034942` (OD-3 exact-head CI observation)
Result: PASS — `completed / success`, gate `finalResult: PASS`
When: 2026-09-26 (run 12:47:28Z → 13:00:49Z)
Relevant failure/output summary: gitHead `aa78a014`; node v22.23.2 /
npm 10.9.8; environmentClass CI; receipt `receipt:sha256:535217a6dbae65b7a26f9243`;
all 15 required groups PASS — GATE_DEFINITION, STATIC, BIN_TYPECHECK_CEILING,
HARDENING, HARDENING_PROBES, HANDOFF_TRUTH, PROJECT_TRUTH, AGENT_CONTINUITY,
SEMANTIC_COMPATIBILITY (2148 total / 2134 passed / 14 skipped / 0 failed),
OWNER_PROVENANCE, SYNTHETIC_CAMPAIGN (1951 / 1907 / 44 skipped / 0 failed),
PATCH_INTEGRITY, WORKSPACE_INTEGRITY, TOPOLOGY (degraded envelope — the
runner has no bwrap), UI_CONTROL_CENTER. R2-CI satisfied.

Command: exact-head CI repair chain (runs 36221563120 → 36237628855)
Result: FAIL → FAIL → FAIL → FAIL → FAIL, every failure repaired forward
When: 2026-09-26
Relevant failure/output summary: 36221563120 @`11afc06a` —
ENVIRONMENT_VALUE_MALFORMED (gate-label enum missing
COMPATIBILITY/DEV_LANE/REVIEW_MUTATION) + SESSION_WORKTREE_MISSING on fresh
checkouts (classification was CI|CLEAN only) → `760e90fc`; 36227213833
@`760e90fc` — storageState:503 real-browser fixture on the browser-less
runner (the campaign stops at the first failure, masking devLogin's three
page tests) → `988834e1`; 36231098989 @`988834e1` — devLoginSecurity:28/46/66
same root cause → `58bf06f2`; 36233319116 @`58bf06f2` — campaign exit=1 with
0 counted failures: the per-lane TMPDIR isolation had split the shared
port-lease authority (EADDRINUSE on 18987 across concurrent shards) and the
nested temp path overflowed Chromium's 107-byte sun_path
(process_singleton_posix "Socket path too long") → `736e0e09` (shared
NIGHTWATCH_PROXY_LEASE_DIR + short `nw-synth-` prefix + two regression pins);
36237628855 @`736e0e09` — TOPOLOGY envelope spawns ENOENT because the runner
has no bwrap (the group had never run green in CI) → `aa78a014` (X-02
degraded envelope mode; direct observation with declared BWRAP_UNAVAILABLE
non-exercises, recorded in the receipt as `envelope:
BWRAP_UNAVAILABLE_DEGRADED`). Never amended; five repair commits total.

## Decisions Made During This Task

- 2026-09-25 — Adopt the released canonical MAINTENANCE record for this task
  and release it inside P0, staging the continuity record transiently in
  canonical because `release` binds continuity against
  `.agent/ACTIVE_TASK.md` + `.agent/tasks/<id>/STATE.md` bytes (measured
  `SESSION_CONTINUITY_MISMATCH` otherwise; authority:
  `bin/lib/session-authority.mjs admitContinuity`, commit `b0f9b1f2`).
  Consequence: canonical ended P0 clean with the released record naming this
  task; the full continuity is committed in this M1 bootstrap checkpoint.
- 2026-09-25 — `PROJECT_VERDICT_EFFECT: PRESERVE` (D-98 semantics): the
  project state projects `OPERATIONALLY_ACCEPTED`, which an IN_PROGRESS task
  may preserve only with PRESERVE; the D-129 terminal verdict is claimed only
  at S.

## Discoveries

- P0 pre-flight reproduced the audited baseline exactly; one stale figure in
  the audit's live-truth table (`status:local sees 75`; measured 188 open
  items across 5 campaigns) is corrected in audit.md's drift record.
- `release` continuity admission makes the literal P0 ordering require the
  transient activation staging described above; tasks.md 1.4's two hard
  requirements (released claim, clean canonical) are both satisfied by it.
- `agent:check` requires the full STATE heading set (including
  `## Decisions Made During This Task`, `## Discoveries`, `## Blockers`,
  `## Deferred / Follow-Up`, `## Resume Recipe`, `## Completion Snapshot`) and
  the routing checker reads every `session/...` token in ACTIVE_TASK as a
  worktree reference, so slash-joined command lists must not look like
  `session/...` paths.

## Blockers

None.

## Safety Events

No Alphaus environment, database, cloud, credential, or external publication
contact; no sibling repository mutation; no force push or history rewrite;
all testing local/synthetic. External contact is OD-3 only: `git fetch`
(reads), C-00 fast-forward pushes of validated checkpoints to `origin/main`
(heads `11afc06a`, `760e90fc`, `988834e1`, `58bf06f2`, `736e0e09`,
`aa78a014`), and `gh` CI observations of the six matching hardening runs
(36221563120, 36227213833, 36231098989, 36233319116, 36237628855,
36243034942 — five failed, the last succeeded). The authorized npm registry
advisory query (task 15.4) has not been run yet.

## Deferred / Follow-Up

- T2-GATE contained-DEV redesigns (NW-AUD-016 full, 025 full, 026, 037, 038):
  quarantined behind the DEV-lane precondition registry (M8).
- TF external prerequisites (production track C-12/C-13/C-14/P4, DEV storage
  re-capture, ripple-api re-admission, owner-gated legacy migration): owner
  actions with revisit triggers, recorded per OD-1.

## Resume Recipe

Resume from this file: read `.agent/ACTIVE_TASK.md`, then the change's
`tasks.md` (phases 1-15) and `audit.md` dispositions, reconcile against
`git status` and the session record, run the smallest decisive validation,
and continue the Exact Next Action. All work happens in the session worktree
named in the routing block; integration is fast-forward only.

## Completion Snapshot

Not complete. Terminal snapshot is written at M14: all 228 census items
dispositioned (OD-1), `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129 with CI
`EXECUTED_PASS` at S (OD-2), operator proofs recorded, ledger closed, and a
`main`-only clean topology equal to `origin/main`.
