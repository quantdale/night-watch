# Task State

## Identity

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Status: IN_PROGRESS
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: 82e661bae45424573c3ea06a20900e342047b849
Last substantive checkpoint SHA: 82e661bae45424573c3ea06a20900e342047b849
Last documentation checkpoint SHA: 82e661bae45424573c3ea06a20900e342047b849
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
LAST_VALIDATED_IMPLEMENTATION_SHA: 82e661bae45424573c3ea06a20900e342047b849
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 82e661bae45424573c3ea06a20900e342047b849
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1_STATUS: IN_PROGRESS

## Objective

Explain and reduce intermittent strict replay divergence, increase useful
bug yield from existing mechanically proven source coverage, and replace
task-name-based project-verdict authorization with explicit fail-closed state
metadata. Preserve `OPERATIONALLY_ACCEPTED` unless current evidence actually
invalidates it.

## Current Milestone

M5 — Repeated operation and release evidence — IN_PROGRESS

## Completed Milestones

- Git topology and authoritative starting SHA verified.
- Successor task and OpenSpec change scaffolded.
- Required local baseline tests and Control Center checks completed.
- Task/OpenSpec scaffold checkpointed and pushed at `d11dae2`; post-checkpoint
  agent, project, handoff, and hardening checks pass.
- M1 replay diagnosis and identity fix checkpointed and pushed at `bf35bf3`.
  The pre-fix deterministic delayed-response reproducer failed because the
  response was absent from final evidence after the settlement barrier; after
  the fix, two fresh runs captured the malformed response with stable
  `payer-navigate` attribution and identical fingerprints.
- M2 planner/yield slice checkpointed and pushed at `a5ff79f`. The plan is now
  v2 and includes bounded semantic, relation, source-change, proof, age,
  anomaly, replay, portfolio, and redundancy signals. Candidate metadata is
  part of the plan input digest; greedy selection defers equivalent
  redundancy keys while distinct eligible representatives remain. Yield
  aggregation canonicalizes sanitized outcomes so duplicate ownership and
  confidence attribution do not depend on arrival order. Control Center
  adapters provide source-derived diversity/proof metadata.

## Additional Completed Milestones

- Current-inventory planner backtest is closed at 82e661b: 128 source
  operations considered, 3 Phase 24 candidates eligible, all 3 selected;
  score order 953245 > 953140 > 953105; redundancy cardinality 3/3 and
  redundancy rate 0; diversity cardinalities are repository 1, route family
  3, entity type 1, semantic invariant 3, journey type 3, interface type 1,
  and source-change cluster 2. Three same-process authority projections were
  byte-identical. The separate source-gaps summary exposed an old
  top-level zero-eligible field; direct eligibility census and Control Center
  authority both report 3, so the direct path is authoritative and the
  reporting contradiction is retained.
- M3 explicit state protocol is closed at 82e661b: task-name inference is
  removed from project-state authorization; PRESERVE, REEVALUATE, and
  SUPERSEDE are bounded explicit effects; active metadata and STATE identity
  are location-bound; live-state and execution-prompt cross-checks reject
  contradictions. Focused state validation is 114 agent tests plus 53
  project-state tests, all passing.
- M4 persisted execution and quality hardening is closed at 82e661b:
  every work-item completion boundary resumes without duplication or loss;
  existing atomic private-artifact and replay-required interruption coverage
  remains green; cache currentness tests now change the actual analyzer and
  taxonomy key inputs; canonical-digest tests assert serialization,
  permutation, mutation, cycle, prototype, and privacy-boundary invariants.

## Work In Progress

The baseline and scaffold checkpoint are closed. M1 is closed by the
`bf35bf3` implementation checkpoint. M2, M3, and M4 are closed by the
`82e661b` implementation checkpoint after the current inventory backtest,
state-protocol matrix, interruption boundary matrix, cache audit, and
canonical-digest property audit passed. M5 remains active for bounded real
requalification, clean/isolated parity, CI observation, and final closure.

The clean guarded Phase 2C retry passed all local safety checks, but the first
journey stopped before browser-context creation with
`HUMAN_AUTH_ACTION_REQUIRED`; the external storage state is structurally valid
but its authenticated session is no longer usable. Actual DEV observations
remain 0 (auth-blocked attempts: 1; replay divergences: 0).

## Exact Next Action

Complete the local final matrix, clean Node 20 gate, and canonical/topology-
correct isolated parity. Do not retry DEV until the owner refreshes the
external authentication state; if refreshed, run only the bounded serial
Phase 2C observation and preserve every outcome category.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/SPEC.md` | frozen successor intent | done |
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/PLAN.md` | living milestones | done |
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/STATE.md` | continuity state and baseline | done |
| `.agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1/REPORT.md` | live report handoff | done |
| `.agent/ACTIVE_TASK.md` | activate successor | done |
| `.agent/EXECUTION_PROMPT.md` | active handoff | done |
| `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/*` | OpenSpec proposal/design/spec/tasks | done |
| `src/core/journeys/replay.ts` | categorical replay classification and strict pass policy | done |
| `src/browser/observers/networkObserver.ts` | request-intent attribution, intentional settlement, capture health | done |
| `src/browser/observers/stability.ts` | bounded intentional-request settlement and count-only diagnostics | done |
| `src/core/journeys/engine.ts` | capture/settlement evidence and fail-closed verdict | done |
| `src/core/journeys/types.ts` | replay classifications and evidence health fields | done |
| `src/core/evidence/journeyEvidence.ts` | preserve new evidence health fields across parsing | done |
| `src/browser/fixtures/journeyFixtureServer.ts` | delayed-response deterministic reproducer | done |
| `tests/unit/journeyEngine.test.ts` | late-response attribution/fingerprint regression | done |
| `tests/unit/phase2cOracleMatrix.test.ts` | categorical replay regression matrix | done |
| `tests/unit/rippleReadiness.test.ts` | intentional-vs-background settlement regressions | done |
| `src/core/campaignIntelligence/types.ts` | versioned planner-v2 metadata and selection trace | done |
| `src/core/campaignIntelligence/planner.ts` | explainable scoring and diversity-aware selection | done |
| `src/core/campaignIntelligence/yield.ts` | order-independent sanitized yield attribution | done |
| `src/controlCenter/authorities/campaignAuthority.ts` | source-derived proof/diversity metadata | done |
| `tests/unit/phase19CampaignIntelligence.test.ts` | planner, cluster, and yield regressions | done |
| `tests/unit/controlCenterAdapters.test.ts` | planner-v2 adapter fixture | done |

## Validation Ledger

Command: `git fetch --prune origin && git status --short --branch && git branch --show-current && git rev-parse HEAD && git rev-parse origin/main`
Result: PASS before scaffolding
When: 2026-08-31
Relevant failure/output summary: canonical Nightwatch repository; `main` only;
local `HEAD == origin/main == 7ac265594719f3d93eabf78e0bd9f749ef63dba7`; clean
working tree before task activation.

Command: `npm ci`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 7 packages added; audit reported one low
severity advisory from the existing dependency set.

Command: `npm run typecheck`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: TypeScript completed with no errors; 11.3s
observed.

Command: `npm run hardening:check`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: offline structural invariants hold.

Command: `npm run quality-gate:spec`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: definition digest
`sha256:4c5a9d19416fd2e0c24f01a2fd6a518b8faf47f866665ae37af21abbf8921044`;
10 required groups; compatibility phases 22 and files 142.

Command: `npm run gate:inventory`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 10 logical groups; 156 unique test files; 0
duplicate test-file executions; inventory baseline digest
`ac3df00195eef846a8e9e42615e90b4b912877d2`.

Command: `npm run test:semantic-compat`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 1932 total; 1919 passed; 13 skipped; 0
failed; phases 9–26; 142 files.

Command: `npm run test:owner-provenance`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 91 tests passed; 0 failed; Playwright 8.0s
observed.

Command: `npm run campaign:synthetic -- --reporter=line`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 73 passed; 0 failed; Playwright 15.4s and
19.59s wall.

Command: `npm run control-center:ui:typecheck`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: no TypeScript errors.

Command: `npm run control-center:ui:test`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 2 files; 11 tests; 0 failed; Vitest 3.38s,
4.13s wall.

Command: `npm run control-center:ui:build`
Result: PASS
When: 2026-08-31
Relevant failure/output summary: 3 built files; 259566 bytes; no external
references or embedded content; 2.08s wall.

Command: `npm run agent:check`
Result: FAIL during initial untracked scaffold; PASS after checkpoint
When: 2026-08-31
Relevant failure/output summary: the first invocation preceded creation of
this STATE/REPORT; after the continuity-v2 shape repair and checkpoint it
passed with only the approved stale implementation-baseline and legacy-task
warnings. The stale warning refers to the documentation-only OpenSpec
scaffold, not source code.

Command: `npm run project:check`
Result: FAIL closed during untracked scaffold; PASS after checkpoint
When: 2026-08-31
Relevant failure/output summary: the pre-checkpoint run emitted
`PROJECT_STATE_CHECKOUT_DIRTY` and
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`; the post-checkpoint run passed
and preserved `OPERATIONALLY_ACCEPTED`.

Command: `npm run handoff:check`
Result: FAIL closed during untracked scaffold; PASS after checkpoint
When: 2026-08-31
Relevant failure/output summary: the pre-checkpoint run emitted
missing/untracked OpenSpec and active continuity errors; the post-checkpoint
handoff receipt passed with all seven OpenSpec files, including `audit.md`.

Command: `npm run gate:local`
Result: FAIL closed during untracked scaffold
When: 2026-08-31
Relevant failure/output summary: static and hardening groups passed, then
HANDOFF_TRUTH failed and later groups were not run; this is task scaffolding,
not an implementation regression.

Command: `npx playwright test tests/unit/journeyEngine.test.ts -g "late responses retain" --project=nightwatch --workers=1 --retries=0 --reporter=line`
Result: PASS after fix; the pre-fix reproducer was intentionally run and
failed because the delayed `API_KNOWN_READ` response was not present in final
evidence. Post-fix: 1 test / 1 passed; the test performs two fresh runs and
compares sanitized malformed-json fingerprints.
When: 2026-08-31
Relevant failure/output summary: post-fix Playwright 7.0s; wall 7.82s.

Command: `npm run typecheck`
Result: PASS after M1 implementation
When: 2026-08-31
Relevant failure/output summary: TypeScript completed with no errors; 2.43s
observed.

Command: `npm run hardening:check`
Result: PASS after M1 implementation
When: 2026-08-31
Relevant failure/output summary: offline structural invariants hold.

Command: `npx playwright test tests/unit/rippleReadiness.test.ts tests/unit/phase2cOracleMatrix.test.ts tests/unit/journeyEngine.test.ts --project=nightwatch --workers=1 --retries=0 --reporter=line`
Result: PASS after M1 implementation
When: 2026-08-31
Relevant failure/output summary: 44 passed; 0 failed; Playwright 40.5s;
46.93s wall.

Command: `npm run hardening:check && npm run typecheck && npx playwright test tests/unit/phase19CampaignIntelligence.test.ts tests/unit/phase19ProductOperator.test.ts tests/unit/phase20SemanticCoverage.test.ts tests/unit/controlCenterAdapters.test.ts --workers=1`
Result: PASS after M2 planner/yield implementation
When: 2026-08-31
Relevant failure/output summary: hardening passed; TypeScript passed; 37
focused tests passed; 0 failed; Playwright 4.9s observed.

Command: `npm run campaign:plan -- --json`
Result: PASS after M2 planner/yield implementation
When: 2026-08-31
Relevant failure/output summary: local synthetic plan emitted
`nightwatch.campaign-plan.v2`, one selected item, bounded score/diversity/
redundancy trace, and no raw values or external contact.

Command: `npm run journey:phase2c -- --env=dev --storage-state=<external-owner-state>`
Result: BLOCKED before target contact
When: 2026-08-31
Relevant failure/output summary: the local Phase 2A safety gate passed
environment, target, host, proxy, authentication-state, containment,
authenticated-evidence, and passive-action checks, then failed closed at
`repository-freshness` because this task's documentation edits were still
uncommitted. No browser context or DEV target operation was started; this is
not a Phase 2C reliability observation. The documentation checkpoint must be
committed and revalidated before retrying the bounded real run.

## Decisions Made During This Task

- Create a distinct continuity-v2 successor because completed acceptance and
  reproducibility tasks must remain terminal historical records.
- Preserve `OPERATIONALLY_ACCEPTED` with explicit `PROJECT_VERDICT_EFFECT:
  PRESERVE` while this hardening task is active.
- Treat an unexplained replay divergence as non-success even when a later
  bounded retry passes.
- Keep `NO_SAFE_NEW_FAMILY` authoritative unless new source evidence clears
  the existing mechanical proof bar.
- Version planner identity when ranking inputs change; include the complete
  sanitized candidate metadata and previous-provenance inputs in the plan
  digest so stale rankings cannot masquerade as identical plans.
- Keep first-stage priority intrinsic and apply diversity/redundancy only as a
  bounded transparent second-stage selector; once unique redundancy keys are
  exhausted, the selector fills remaining budget by intrinsic priority.
- Canonicalize sanitized yield outcomes before aggregation so campaign or
  worker arrival order cannot change duplicate ownership or confidence counts.
- Use explicit verdict effects only: PRESERVE keeps an earned operational
  verdict during hardening; REEVALUATE permits truthful requalification
  downgrade; SUPERSEDE is reserved for an explicitly replacing campaign.
  Task-name prefixes are never authorization.
- Bind active task metadata to the preamble and STATE identity fields, and
  bind live documentation truth to one bounded machine-owned snapshot. Marked
  historical prose remains inert.

## Defect Ledger

| ID | Severity | Subsystem | Discovery | Reproduction | Root cause | Fix | Regression | Validation | Final disposition |
|---|---|---|---|---|---|---|---|---|---|
| RYSP-001 | Medium | continuity bootstrap | baseline | New task scaffold was not visible to the strict checker before STATE/REPORT and required OpenSpec audit were present/tracked | setup ordering and incomplete handoff scaffold | added required v2 state/report shape, `audit.md`, and checkpointed before strict gate evaluation | `agent:check`, `project:check`, and `handoff:check` pass after `d11dae2` | post-checkpoint validators pass | Closed as scaffold sequencing; not a Nightwatch runtime defect |
| RYSP-002 | High | journey settlement | deterministic delayed-response reproducer | an intentional known-read remained in flight while pending response handlers were zero; the engine finalized, closed the context, and omitted the response/oracle | settlement sampled response-handler count and quiet time, not intentional in-flight requests | track intentional requests and wait for their lifecycle; emit `TIMED_OUT`/capture health and classify framework defects | delayed malformed-response journey regression and 44-test focused cone | PASS after `bf35bf3` | Closed; false-success/missed-oracle path removed |
| RYSP-003 | Medium | replay identity | same delayed-response reproducer | response resource/oracle attribution read mutable current intent, so response timing could alter the fingerprint and step | response processing used `journeyIntent` instead of request-origin metadata | snapshot request intent in a bounded WeakMap and use it for response lifecycle, fingerprints, semantic hook context, and failures | two fresh delayed-response runs produce the same fingerprint and initiating step | PASS after `bf35bf3` | Closed; strict replay identity remains meaningful |
| RYSP-004 | Medium | campaign planning | planner/yield audit and reverse-order regression | changing candidate metadata did not change the plan input digest; reversing identical outcome records changed high-confidence/per-candidate attribution | plan identity included candidate IDs only; yield duplicate ownership used arrival order | planner v2 digests full sanitized metadata/provenance and uses bounded diversity/redundancy selection; yield sorts sanitized outcomes canonically | 37-test planner/control-center/semantic cone; reversed yield input equals canonical report; three planner runs and reversed candidates are equal | PASS after `a5ff79f` | Closed; no proof authority or safety gate weakened |
| RYSP-005 | Medium | replay identity and capture boundary | replay identity/metamorphic audit | equivalent object-key insertion order produced strict mismatch; two equally unsupported/cyclic evidence values could otherwise compare alike | replay equality used raw JSON.stringify and did not reject unknown capture/evidence shape before comparison | canonicalize object keys while retaining array order; reject unsupported/cyclic/oversized evidence and UNKNOWN capture status | Phase 2C oracle matrix, canonical-digest audit, and 179-test state/replay suite | PASS at `82e661b` | Closed; strict replay remains fail closed |
| RYSP-006 | High | project-state and continuity protocol | state authorization/parser audit | accepted status depended on a nightwatch task-name exception, and incidental status prose could affect milestone interpretation | authorization and milestone parsing were convention/free-text driven | explicit bounded verdict effect; location-bound metadata; structured live-state and prompt cross-checks; trailing-delimiter milestone parser | 114 agent-state tests and 53 project-state tests | PASS at `82e661b` | Closed; accepted verdict preserved explicitly |
| RYSP-007 | Low | test quality | cache/property claim audit | analyzer/taxonomy invalidation and bounded-input tests did not change/assert the authoritative inputs they named | tests asserted repeated behavior without reconstructing the real cache key or exact content bound | tests now compare the actual key payload, mutate authoritative versions, and assert exact canonical output/privacy boundary | 50 cache/canonical/checkpoint tests, including 12 cache cases and 15 property cases | PASS at `82e661b` | Closed; test-claim gap corrected |

## Discoveries

- The current project checker previously authorized accepted status for many
  active `nightwatch-*` tasks through a task-name prefix exception; the
  implementation now requires an explicit bounded verdict effect and the
  current active task declares `PRESERVE`.
- The current baseline is green for implementation gates, but activating a
  new task requires the exact continuity-v2 document shape before project and
  handoff truth can be evaluated.
- Current direct source census remains conservative:
  `NO_SAFE_NEW_FAMILY`; 1732 files considered, 1092 read, 1078 admitted,
  654 rejected, 12,449,877 bytes; 128 operations, 127 routes, 127 request
  contracts, 43 response contracts, 53 semantic observations, 118 proven/10
  rejected joins, lifecycle 85 discovered/40 mechanically proven/3
  projectable, and Phase 24 has 3 eligible/125 excluded. A stale top-level
  zero-eligible field in the separate source-gaps presentation disagreed with
  the direct eligibility census and Control Center authority; the direct
  authority path is retained.
- The pre-fix delayed-response fixture isolated two coupled reliability
  defects: premature settlement and response-time action attribution. Both
  were Nightwatch-owned and are now covered by local regressions.
- Replay comparison now returns a bounded classification and diagnostic codes;
  only exact, timing-only, or explicitly benign bounded variation can pass.

## Safety Events

NONE

## Resume Recipe

Read `ACTIVE_TASK.md`, this `STATE.md`, `PLAN.md`, and `SPEC.md`; inspect the
working tree; then run the bounded serial Phase 2C DEV requalification only
if the external owner-managed storage state passes its existing structural
and authentication gates. Preserve every sanitized outcome category and do
not convert an earlier strict divergence into a retry PASS.

## Completion Snapshot

Not complete. M0 through M4 are closed at implementation checkpoint
82e661b. M5 remains active for bounded DEV requalification, clean/isolated
parity, CI observation, final documentation, and release closure.

## Blockers

None at the current milestone. Owner-managed DEV authentication will be
checked only after local changes are validated; unavailable authentication
will be reported as a bounded evidence limitation rather than bypassed.

## Deferred / Follow-Up

- Any source family below the mechanical proof bar.
- Production, NEXT, infrastructure, datastore, mutation, publication, and
  sibling-repository work.
