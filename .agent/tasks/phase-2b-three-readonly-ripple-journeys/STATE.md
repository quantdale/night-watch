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

M7 — Journey 1 first observation and fresh-context replay.

## Completed Milestones

M0 continuity/task creation, M1 archaeology/inventory/freshness, M2 semantic
proof/selection/contracts, M3 generic engine design, M4 implementation, and
M5 synthetic/local validation and M6 pre-real validation/self-review are
complete. M7 is in progress; M8–M11 remain pending.

## Work In Progress

Full local validation and the adversarial pre-real review are PASS. The
pre-real readiness checkpoint is recorded in Nightwatch. No DEV context has
run yet; the next action is the gated serial Journey 1 pair.

## CURRENT_GOAL

Establish Nightwatch's first reusable authenticated behavioral-journey system
and prove exactly three meaningful, source-backed, semantically read-only
Ripple customer journeys with one fresh-context replay each.

## CURRENT_PHASE

M7 — first controlled DEV observation/replay after contract, semantic
registry, reusable engine, tripwire, evidence, and replay-comparison
implementation plus pre-real self-review.

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
- Real DEV contexts: NONE. Real journey/replay IDs: NONE. DB queries: NONE.
- Alphaus repositories: read-only source inspection only; pre-existing Ripple
  UI/API worktree entries remain untouched.
- `npm run journey:real -- --help`: PASS; launcher is opt-in and did not
  create a browser context.

## REAL_RUN_LEDGER

Phase 2B real runs: NONE. No browser context with external auth state has
been created for Phase 2B. No host approval, production attempt, proxy
violation, mutation, or database query occurred.

## REPLAY_LEDGER

Phase 2B replays: NONE. Synthetic comparator tests are not real replay IDs.

## AUTH_STATUS

External `$HOME/.nightwatch/auth/ripple-dev-state.json` remains outside Git
and has not been printed, copied, dumped, or persisted. Phase 2B has not yet
validated it for a real context. Before each of the six real contexts, use
only the existing boolean/provenance/page-readability helpers and the
Phase 2A gate. If invalid, stop with the human-auth blocker and do not run.

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

NONE. Synthetic negative cases are harness regression coverage, not Ripple
bug candidates. The local telemetry omission was a Nightwatch policy defect,
repaired in `a2bde6a`; no real target anomaly exists.

## UNRESOLVED

- Real DEV request set may contain passive unknown bootstrap traffic; this is
  expected and must remain separate from action-caused unknown.
- Real auth state must pass the fresh six-context boolean gate.
- Real source/deployment freshness remains the recorded local-source caveat;
  no fetch/pull is authorized.

## SAFETY_EVENTS

NONE. Synthetic tests intentionally exercised blocked production/unknown,
known mutation, and action-caused unknown paths against loopback only; those
are expected local assertions, not real safety events.

## PRIVACY_STATUS

PASS for contract/source docs and focused synthetic artifacts. Authenticated
synthetic evidence scan found no fake Authorization secret; engine evidence
contains fixed IDs/classes/booleans/counts/timings only. Real artifact audit is
pending.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba` (Phase 2B contract/engine/gated
runner plus exact local telemetry containment checkpoint; Phase 2A baseline
remains `a6d7c8b`).

## LAST_CHECKPOINT_SHA

`a2bde6aeb3d3a72c25029287ba45b7a0262fc3ba` (`CHECKPOINT_ADVANCE`: exact local
telemetry containment is repaired, TypeScript and full local Playwright
validation pass, and the gated serial real runner is ready for explicit
adversarial review; no DEV context has run).

## NEXT_EXACT_ACTION

Run the exact gated command:
`npm run journey:real -- --env=dev --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"`
This must execute Journey 1 first observation then its fresh-context replay,
serially. Before each context the runner must revalidate boolean auth facts,
the Phase 2A gate, repository snapshots, the explicit contract, and the
mutation tripwire. Do not start Journey 2 until the Journey 1 pair is
checkpointed. If auth is invalid, stop with the prescribed human-auth
blocker; do not inspect or print the state.

## Exact Next Action

Run the exact gated serial real-run command for Journey 1 first observation and
fresh replay shown in `NEXT_EXACT_ACTION`; stop before Journey 2 unless the
Journey 1 pair is successful and checkpointed.

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
