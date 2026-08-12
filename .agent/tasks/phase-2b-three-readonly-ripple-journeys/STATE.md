# Task State

## Identity

Task ID: phase-2b-three-readonly-ripple-journeys
Phase: 2B
Status: IN_PROGRESS
Starting SHA: ec4c14376923ffbe12356dd180218eb09cf4f75f
Current SHA: a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba
Last validated implementation SHA: a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba
Branch: `main`

## Objective

The objective is recorded in `CURRENT_GOAL` below: establish the reusable
engine and exactly three source-backed, semantically read-only Ripple
journeys.

## Current Milestone

M8 — Journey 2 first observation diagnostic review after a bounded L0
product-anomaly candidate.

## Completed Milestones

M0 continuity/task creation, M1 archaeology/inventory/freshness, M2 semantic
proof/selection/contracts, M3 generic engine design, M4 implementation, and
M5 synthetic/local validation, M6 pre-real validation/self-review, and the
Journey 1 pair are complete. M8 is in progress; M9–M11 remain pending.

## Work In Progress

Full local validation and the adversarial pre-real review are PASS. Journey 1
passed in a first observation and fresh-context replay. Journey 2 first
observation reached its structural/read checkpoint but failed a generic
oracle on one allowed DEV font response; no replay or Journey 3 context has
run.

## CURRENT_GOAL

Establish Nightwatch's first reusable authenticated behavioral-journey system
and prove exactly three meaningful, source-backed, semantically read-only
Ripple customer journeys with one fresh-context replay each.

## CURRENT_PHASE

M8 — controlled DEV Journey 2 first observation diagnostic review after the
successful Journey 1 pair.

## CURRENT_EVIDENCE

- Phase 2A closure was independently reconciled. `a6d7c8b` is the validated
  implementation baseline, `9bf2c45` the validation/checkpoint commit, and
  `ec4c143` the clean documentation terminal HEAD; descendants are not drift.
- M1 archaeology and freshness are recorded in `CANDIDATES.md` and
  `FRESHNESS.md`. Ripple UI is `dev@d80b161b...`, local `origin/dev` is
  `e46b8ed6...` (0 ahead/21 behind; selected files unchanged); Ripple API is
  `master@27bb007...` and equals its local tracking ref.
- Exactly three contracts are now written in `JOURNEYS.md` and executable
  definitions in `src/products/ripple/journeyContracts.ts`: payer exchange
  read, common exchange read, and account inventory.
- The four intentional read rules and adjacent mutation rules are source-
  backed in `CANDIDATES.md`/`JOURNEYS.md`; Cost Drift's unresolved POST is not
  in the registry or any journey.
- The semantic observer now records only rule IDs/classes, action IDs/types,
  and dispositions; passive unknowns are distinct from action-caused unknowns.
- The contract/engine implementation checkpoint is `7b57d559dad039fb491ca9e539d174dc40357d58`; the serial gated real-run harness checkpoint is `f763aca65ba6f5dfbf47956d66c9f90d561a2a18`; reviewed local telemetry containment and the latest implementation checkpoint are `a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba`.
- `npx tsc --noEmit`: PASS at `a2bde6a`.
- Full local `NIGHTWATCH_ENV=local npx playwright test --project=nightwatch --workers=1`: **251 passed** in 58.7s at `a2bde6a`.
- `npm run journey:real -- --help`: PASS; the opt-in launcher performs no
  real work without the required environment, target, and storage-state
  arguments.
- Full validation exposed and repaired one Nightwatch-only config omission:
  two exact reviewed Chromium control-plane telemetry hosts were absent from
  local containment. No product bug or real safety event resulted.
- `PRE_REAL_PHASE_2B_IMPLEMENTATION_READY`: PASS after full local validation,
  source/contract/diff inspection, and exact launcher gate review.
- `PRE_REAL_SELF_REVIEW_PASS`: PASS; the 15-question review is recorded below
  and found no unresolved Nightwatch defect, containment weakening, semantic
  ambiguity, privacy leak, or cross-repository modification.
- Journey 1 first observation `nightwatch-20260812T011302Z-3ff2-j1-first`:
  PASS; route `/payer-exchange-rate-v2`, shell and both journey markers true,
  required read observed, auth readable, oracle/safety/privacy PASS.
- Journey 1 replay `nightwatch-20260812T011302Z-3ff2-j1-replay`: PASS in a
  fresh context; strict replay comparison MATCH with expected timing and
  passive-unknown-count variance only.
- Journey 2 first observation `nightwatch-20260812T011302Z-3ff2-j2-first`:
  structural and semantic read checkpoints PASS, auth/safety/privacy PASS,
  but generic oracle status FAIL from one allowed DEV font response with HTTP
  502 and the resulting console-error; no production/unknown/mutation/DB
  event occurred. The runner correctly prohibited replay.
- Focused endpoint plus journey suite: `12 passed`; real local fixture HTTP,
  engine, recorder, observer, tripwire, privacy, and replay comparator paths
  were exercised. No Alphaus target or database was contacted.

## CURRENT_JOURNEY_CANDIDATES

COMPLETE. Ten candidates and verdicts are in `CANDIDATES.md`; rejected or
constrained candidates include dashboard duplicate coverage, mixed billing-
group/detail flows, Cost Drift DEV-unimplemented behavior, invoice/MFE
flows, project scope gaps, and export/activity ambiguity.

## SELECTED_JOURNEYS

1. `ripple-payer-exchange-read` — `/payer-exchange-rate-v2` —
   `.__ExchangeRateDataTable` — GET payer exchange read.
2. `ripple-common-exchange-read` — `/global-exchange-rate-v2` —
   `.__GlobalExchangeRateDataTable` — GET common exchange read.
3. `ripple-account-inventory` — `/accounts` — `.__CustomDataTable` — GET
   billing-group list plus GET account inventory.

No other journey is authorized for this task.

## READ_ONLY_PROOF_STATUS

PASS for all selected intentional actions. The executable registry uses exact
environment API hosts and anchored path patterns. `KNOWN_READ` is allowed;
`KNOWN_MUTATION` is blocked before network I/O; API `UNKNOWN` remains passive
only during navigation and is a semantic safety stop when causally caused by
an interaction. No selected action intentionally requires UNKNOWN.

## IMPLEMENTATION_STATUS

CONTRACT_AND_ENGINE_IMPLEMENTED at `a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba`; synthetic and full local validation PASS. The generic declarative engine is in `src/core/journeys/engine.ts`, generic contract/result types in `src/core/journeys/types.ts`, fresh-context comparison in `src/core/journeys/replay.ts`, and the serial gated real-run harness is in `tests/manual/phase2b-real-journeys.ts` with `bin/phase2b-real.mjs`. Pre-real adversarial review remains.

## FILES_CHANGED

- `.agent/tasks/phase-2b-three-readonly-ripple-journeys/CANDIDATES.md`
- `.agent/tasks/phase-2b-three-readonly-ripple-journeys/FRESHNESS.md`
- `.agent/tasks/phase-2b-three-readonly-ripple-journeys/JOURNEYS.md`
- `src/core/evidence/types.ts`
- `src/core/safety/endpointSemantics.ts`
- `src/browser/context.ts`
- `src/browser/observers/networkObserver.ts`
- `src/core/journeys/types.ts`
- `src/core/journeys/engine.ts`
- `src/core/journeys/replay.ts`
- `src/browser/fixtures/journeyFixtureServer.ts`
- `src/products/ripple/journeyContracts.ts`
- `tests/unit/endpointSemantics.test.ts`
- `tests/unit/journeyEngine.test.ts`
- `config/environments/local.json`
- `tests/manual/phase2b-real-journeys.ts`
- `playwright.phase2b.config.ts`
- `bin/phase2b-real.mjs`
- `package.json`

## VALIDATION_LEDGER

- `npx tsc --noEmit`: PASS.
- `NIGHTWATCH_ENV=local npx playwright test tests/unit/endpointSemantics.test.ts tests/unit/journeyEngine.test.ts --project=nightwatch --workers=1`: **12 passed**.
- `NIGHTWATCH_ENV=local npx playwright test --project=nightwatch --workers=1`: **251 passed** in 58.7s.
- `npx tsc --noEmit`: PASS.
- `npm run journey:real -- --help`: PASS.
- `git diff --check`: PASS before this state-only checkpoint.
- Nightwatch commits `7b57d559dad039fb491ca9e539d174dc40357d58` and
  `f763aca65ba6f5dfbf47956d66c9f90d561a2a18` contain only the Phase 2B
  contracts, engine, safety integration, fixture, tests, gated serial runner,
  and task documentation; the worktree was clean after the implementation
  checkpoint.
- Pre-real gate: PASS; all 13 checks passed before the real runner.
- Real DEV contexts: 3 (`nightwatch-20260812T011302Z-3ff2-j1-first`,
  `nightwatch-20260812T011302Z-3ff2-j1-replay`,
  `nightwatch-20260812T011302Z-3ff2-j2-first`). DB queries: NONE.
- Alphaus repositories: read-only source inspection only; pre-existing Ripple
  UI/API worktree entries remain untouched.
- `npm run journey:real -- --help`: PASS; launcher is opt-in and did not
  create a browser context.

## REAL_RUN_LEDGER

| Run ID | Journey | Result | Sanitized finding |
|---|---|---|---|
| `nightwatch-20260812T011302Z-3ff2-j1-first` | payer exchange read | PASS | source-backed GET read, route/shell/table ready, oracle/safety/privacy PASS |
| `nightwatch-20260812T011302Z-3ff2-j1-replay` | payer exchange read | PASS | fresh context; strict invariants matched; timing/passive-unknown variance bounded |
| `nightwatch-20260812T011302Z-3ff2-j2-first` | common exchange read | FAIL | route/shell/table/read/auth/safety passed; generic unexpected-status + console-error on one allowed DEV font response (HTTP 502) |

Per-run safety totals for all three contexts: production attempts 0, proxy
violations 0, unknown destinations 0, unknown approvals 0, known mutations 0,
DB queries 0.

No host approval, production attempt, proxy violation, mutation, or database
query occurred. The J2 failure is an L0 product/infra anomaly candidate,
not a safety failure.

## REPLAY_LEDGER

| Replay ID | Journey | Comparison |
|---|---|---|
| `nightwatch-20260812T011302Z-3ff2-j1-replay` | payer exchange read | PASS; strict mismatch set empty; expected timing and passive-unknown variance |

Journey 2 replay is prohibited because its first observation did not pass.
Journey 3 has not started. Synthetic comparator tests are not real replay IDs.

## AUTH_STATUS

External `$HOME/.nightwatch/auth/ripple-dev-state.json` remains outside Git
and has not been printed, copied, dumped, or persisted. The three completed
contexts each passed boolean structural, DEV-semantic, domain/path, and live
page-readability checks. Before any bounded J2 diagnostic retry or later
context, use only the existing boolean/provenance/page-readability helpers and
the Phase 2A gate. If invalid, stop with the human-auth blocker and do not run.

## DECISIONS

- Keep Phase 2A closed; only a genuine shared-infrastructure regression may
  reopen an invariant, and none has appeared.
- Freeze exactly C02/C03/C04 after source proof; do not lower the semantic bar
  to obtain three journeys.
- Keep the default endpoint registry empty. Phase 2B passes an explicit
  contract registry to the shared context; no global dynamic blessing exists.
- Treat internal cache writes in read handlers as implementation detail, not
  customer-state mutation; no selected action calls a write handler.
- Use fixed structural selectors and metadata-only evidence. Never persist
  customer DOM, body, text, payload, secret, screenshot, or authenticated
  trace.
- Real execution must be serial: Journey 1 first/replay, then 2 first/replay,
  then 3 first/replay. One repair retry maximum per journey, only for a
  proven narrow Nightwatch defect.
- Full local validation found one Nightwatch-only local containment omission:
  exact Chromium control-plane telemetry hosts were absent from local policy.
  The two reviewed exact hosts were added in `a2bde6a`; no wildcard, proxy
  bypass, production allowance, or real safety event was introduced.

## PRE_REAL_SELF_REVIEW

PASS, checkpointed before any DEV context.

1. The journeys are materially different: payer exchange read, common
   exchange read, and account inventory use distinct source components and
   read endpoints; the account journey adds inventory behavior rather than
   shell-only coverage.
2. Every intentional action is source-proven `KNOWN_READ` or `LOCAL_ONLY`.
3. No POST was treated as read based on method; reviewed POST routes are
   mutation rules and are blocked. The unresolved Cost Drift POST is excluded.
4. No UNKNOWN endpoint is intentionally required; passive initialization is
   recorded separately.
5. No export or download journey is selected.
6. No selected step changes or persists user preferences; no filters or tabs
   are interacted with.
7. No selected step saves application state or submits a form.
8. Selectors are fixed source-defined component classes, never customer data,
   amounts, account names, nth-child, or volatile IDs.
9. Phase 2A context, auth, proxy, containment, shell, and stability primitives
   are reused; only the explicit source-reviewed endpoint registry is added.
10. Auth expiry is separated from product failure by boolean state checks,
    page readability, live page auth validation, and the guarded capture
    command; stale auth is never retried as a product issue.
11. Navigation/document replacement cancellation remains distinct from
    critical asset failure.
12. Replay creates a fresh browser context through a new `observeOnce` call;
    it reuses the same external state, target, definition, selectors, and
    registry.
13. Fixture-only code is isolated from real mode; the real launcher requires
    explicit environment, external state, opt-in flag, and the pre-real gate.
14. Authenticated evidence persists only fixed metadata; request/response
    bodies, headers, cookies, tokens, DOM/text, screenshots, and traces are
    excluded.
15. Production deny, unknown-host fail-closed, proxy health, authenticated
    shell readiness, and route-stability requirements were not weakened.

PRE_REAL_PHASE_2B_IMPLEMENTATION_READY: PASS
PRE_REAL_SELF_REVIEW_PASS: PASS

## REJECTED_JOURNEYS

C01 dashboard (duplicate shell/initialization); C05 billing-group list
(feature-flag/MFE semantics incomplete); C06 Cost Drift (DEV handler
unimplemented and historical malformed-JSON anomaly unresolved); C07 invoice
surface (MFE/calculation/finalization risk); C08 billing-group detail (mixed
settings and identifiers); C09 project list (scope not fully proven); C10
export/activity (export side effects/uncertain semantics). Full evidence is in
`CANDIDATES.md`.

## REJECTED_HYPOTHESES

NONE for Phase 2B. Phase 2A's expired-auth diagnosis, root-route diagnosis,
Vue `#app` pre-mount meaning, QLayout shell, cancellation taxonomy, malformed
JSON status, and historical production contact remain preserved facts.

## BUG_CANDIDATES

- `PB2-J2-L0-DEV-FONT-502`: `ripple-common-exchange-read`, first run
  `nightwatch-20260812T011302Z-3ff2-j2-first`; last successful checkpoint was
  the common route/shell/table/read/auth checkpoint, then a generic
  `unexpected-status` oracle and `console-error` occurred for one allowed DEV
  font response with status 502. Reproduction level L0 (single observation).
  Nightwatch self-check: target/policy/proxy/auth/route/structural/semantic
  ledgers passed; no mutation or destination safety event. Source correlation
  and repeatability are unresolved. Do not weaken the oracle or contract.

Synthetic negative cases are harness regression coverage, not Ripple bug
candidates. The local telemetry omission was a Nightwatch policy defect,
repaired in `a2bde6a`.

## UNRESOLVED

- Real DEV request set may contain passive unknown bootstrap traffic; this is
  expected and must remain separate from action-caused unknown.
- Journey 2's single allowed DEV font HTTP 502/console-error needs one bounded
  diagnostic re-observation to distinguish transient L0 behavior from a
  repeatable product/infra anomaly; do not inspect its body or relax the
  generic oracle.
- Journey 3 remains unrun because execution is serial and J2 has not yet
  completed its first-success/replay pair.
- Real source/deployment freshness remains the recorded local-source caveat;
  no fetch/pull is authorized.

## SAFETY_EVENTS

NONE. All three real contexts had exact totals of 0 production attempts, 0
proxy violations, 0 unknown destinations, 0 unknown approvals, 0 known
mutations, and 0 DB queries. Synthetic tests intentionally exercised blocked
production/unknown, known mutation, and action-caused unknown paths against
loopback only; those are expected local assertions, not real safety events.

## PRIVACY_STATUS

PASS for the three real run directories and the Journey 1 comparison: 22
sanitized text/JSON files scanned, 0 non-safe forbidden-field values, 0 trace
files, and 0 screenshots. Authenticated evidence contains fixed
IDs/classes/booleans/counts/timings only; no bodies, headers, cookies, tokens,
DOM/text, customer/account values, or cost values were persisted.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba` (Phase 2B contract/engine/gated
runner plus exact local telemetry containment implementation; the real
contexts used approved documentation checkpoint `15c3c9f`, and Phase 2A
baseline remains `a6d7c8b`).

## LAST_CHECKPOINT_SHA

`15c3c9fef9fe2da57090ddd103a88604829c9607` (`CHECKPOINT_ADVANCE`: pre-real
readiness/self-review is committed; Journey 1 first/replay passed with strict
invariants, and Journey 2 first reached a sanitized L0 generic-oracle
anomaly. No code or contract change has been made after the failure.)

## NEXT_EXACT_ACTION

Checkpoint this L0 finding before code changes. Then add only a bounded,
explicit resume selector to the generic runner if needed to avoid repeating
the successful Journey 1 pair, run one diagnostic J2 first observation in a
fresh context, and—only if it passes—run its one fresh-context replay. Do not
inspect the 502 body, change the contract/oracle, or run Journey 3 until the
J2 diagnostic decision is checkpointed. If the re-observation repeats the
anomaly, classify it L1 and continue only with an explicitly resumed,
independent Journey 3 context; Phase 2B completion remains blocked until all
three pairs pass.

## Exact Next Action

Record the J2 failure checkpoint, implement only the bounded generic resume
selector if required, revalidate locally, then run one fresh J2 diagnostic
observation; no third Journey 1 replay and no oracle weakening.

## Files Changed

See `FILES_CHANGED` above. All implementation paths are inside Nightwatch;
Alphaus repositories remain read-only.

## Validation Ledger

See `VALIDATION_LEDGER` above; the focused contract/engine suite is 12 passed,
the full local suite is 251 passed, and the latest implementation checkpoint
is `a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba`.

## Decisions Made During This Task

See `DECISIONS` above. The three selected journeys and fail-closed semantic
registry are frozen before real execution.

## Discoveries

See `CURRENT_EVIDENCE` and `REJECTED_JOURNEYS` above; no real anomaly exists.

## Blockers

None currently. Human auth recapture is a possible external blocker only if
the existing state fails the fresh boolean page-readability gate.

## Safety Events

No real safety event. Synthetic safety-stop cases are expected local tests.

## Deferred / Follow-Up

Phase 2C and all later functionality are deferred and prohibited in this
task.

## Resume Recipe

Follow the numbered `RESUME_RECIPE` below from a fresh context; do not infer
semantic decisions from conversation memory.

## RESUME_RECIPE

1. Read root `AGENTS.md`, `docs/CURRENT_STATE.md`, this task's `SPEC.md`,
   `PLAN.md`, `STATE.md`, and `JOURNEYS.md`.
2. Run `git status --short`, `git log --oneline -12`, `npx tsc --noEmit`, and
   `npm run agent:check`; reconcile any SHA checkpoint warning against Git.
3. Confirm focused synthetic validation remains 12 passed and review the
   current diff. Continue from `NEXT_EXACT_ACTION`.
4. Before any external target, require `PRE_REAL_PHASE_2B_IMPLEMENTATION_READY`
   and `PRE_REAL_SELF_REVIEW_PASS` in this state and run the exact gated
   command recorded here.
5. After each real first/replay pair, update `REAL_RUN_LEDGER`,
   `REPLAY_LEDGER`, safety/privacy totals, and `NEXT_EXACT_ACTION` before the
   next pair. Never reconstruct semantics from conversation memory.

## Completion Snapshot

Not complete. Populate only after all three pairs, strict replay matches,
zero safety totals, privacy PASS, full validation PASS, Nightwatch-only
closure commit, and a clean tree. Do not start Phase 2C.
