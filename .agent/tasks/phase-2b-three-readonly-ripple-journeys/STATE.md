# Task State

## Identity

Task ID: `phase-2b-three-readonly-ripple-journeys`
Phase: `2B`
Status: `IN_PROGRESS`
Starting SHA: `ec4c14376923ffbe12356dd180218eb09cf4f75f`
Branch: `main`

## CURRENT_GOAL

Establish Nightwatch's first reusable authenticated behavioral-journey system
and prove exactly three meaningful, source-backed, semantically read-only
Ripple customer journeys with one fresh-context replay each.

## CURRENT_PHASE

M5 — synthetic/local validation after contract, semantic registry, reusable
engine, tripwire, evidence, and replay-comparison implementation.

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
- `npx tsc --noEmit`: PASS.
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

CONTRACT_AND_ENGINE_IMPLEMENTED; synthetic validation PASS. The generic
declarative engine is in `src/core/journeys/engine.ts`, generic contract/result
types in `src/core/journeys/types.ts`, and fresh-context comparison in
`src/core/journeys/replay.ts`. Real-run harness and pre-real review remain.

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

## VALIDATION_LEDGER

- `npx tsc --noEmit`: PASS.
- `NIGHTWATCH_ENV=local npx playwright test tests/unit/endpointSemantics.test.ts tests/unit/journeyEngine.test.ts --project=nightwatch --workers=1`: **12 passed**.
- `git diff --check`: PASS before this documentation checkpoint.
- Real DEV contexts: NONE. Real journey/replay IDs: NONE. DB queries: NONE.
- Alphaus repositories: read-only source inspection only; pre-existing Ripple
  UI/API worktree entries remain untouched.

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
bug candidates. No real target anomaly exists.

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

`a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c` (Phase 2A baseline; the current
Phase 2B implementation is still an uncommitted working tree at this point).

## LAST_CHECKPOINT_SHA

`b693b48f3f5fa1e3addfa53d44d0638fe3b10df7` (M1 inventory checkpoint). The
contract/engine checkpoint will be written after this implementation commit.

## NEXT_EXACT_ACTION

Run the required full local validation and inspect the diff. Then implement
one generic serial real-run harness that validates the existing auth/gate
before every context, uses the three definitions and explicit registry, runs
fresh contexts, compares replay evidence, and stops fail-closed. Do not run
DEV until the full pre-real validation and adversarial self-review are
checkpointed.

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
