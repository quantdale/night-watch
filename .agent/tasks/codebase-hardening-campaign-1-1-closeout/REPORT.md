# Nightwatch Codebase Hardening Campaign I.1 Closeout — Report

Status: IN_PROGRESS — source fix and local validation complete; final
documentation/remote-CI disposition pending.

This report is the handoff for the narrow I.1 corrective closeout. It keeps
the historical Hardening Campaign I report unchanged and records the
independently confirmed checkpoint-integrity correction.

## Scope

Local/synthetic/static checkpoint integrity and durable-state reconciliation
only. The historical Hardening Campaign I report remains unchanged.

## Initial evidence

- Starting SHA: `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- Starting `origin/main`: `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- Confirmed defect: a zero remaining disabled exploration dimension could
  satisfy `BUDGET_EXHAUSTED` terminal validation.
- No exact exhaustion-cause field exists in the checkpoint schema.
- Historical Hardening I closure CI for the reviewed closure SHA is recorded
  as `CONFIRMED_PASS_AT_HARDENING_CLOSURE`; the old report's pending wording
  remains historical.

## Checkpoint terminal-integrity result

The old predicate treated any zero `budgetRemaining` value as proof of
exhaustion. The bounded real policy has
`maxExplorationContexts=0`, so the unused initial checkpoint naturally has
`explorationContexts` remaining at zero while all positive-cap dimensions are
unused and retain full capacity.

The validator now accepts `BUDGET_EXHAUSTED` only when at least one generic
dimension proves `limit > 0`, `used == limit`, and `remaining == 0`. The
existing `used + remaining == limit` arithmetic invariant remains required
for every dimension. The deterministic sanitized rejection reason is
`CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:BUDGET_STOP_WITHOUT_POSITIVE_LIMIT_EXHAUSTION`.

No exact failed-reservation dimension was present in the current checkpoint
schema, so the minimum generic invariant was used without a schema migration.
The change is checkpoint-validation-only; campaign budget consumption,
manifest feasibility, scheduling, network policy, auth, private persistence,
and owner policy were not changed.

## Regression matrix

- Zero-limit false positive: PASS. The real bounded policy has disabled
  exploration `0/0`, all positive-cap dimensions are unused with full
  remaining capacity, and corrupting only the terminal labels rejects before
  any executor callback.
- Positive exhaustion: PASS. A real orchestrator checkpoint that consumes a
  positive `totalActions` limit is accepted with exact arithmetic.
- Mixed dimensions: PASS. A disabled exploration `0/0` dimension alongside a
  genuinely exhausted positive browser-context dimension is accepted.
- Adjacent terminal-state review: PASS. `COMPLETE_CLEAN`,
  `COMPLETE_WITH_FINDINGS`, `PARTIAL_AUTH_BLOCKED`, `PARTIAL_SAFETY_BLOCKED`,
  `PARTIAL_RUNTIME_INFRA_FAILURE`, `ABORTED_OWNER_POLICY`, and
  `INCOMPLETE_PROCESS_INTERRUPTION` were reviewed in the same validator; no
  additional directly adjacent repair was admitted.

## Checkpoint identities

- Starting SHA / starting remote: `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- Validated implementation SHA: `5de817764a4d58eaa1a5c0109464667f552cda5e`.
- Substantive checkpoint SHA: `5de817764a4d58eaa1a5c0109464667f552cda5e`.
- Source push: PASS; local `HEAD == origin/main` at the implementation SHA.
- Documentation checkpoint: pending; its SHA will be reported without
  embedding a self-referential value in this report.

## Validation and safety

- Focused campaign checkpoint/budget/resume suite: 27/27 PASS.
- Focused agent-state suite: 14/14 PASS.
- Full local Playwright suite: 399/399 PASS, one worker.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- `npm run campaign:synthetic`: 27/27 PASS.
- `npm run agent:check`: PASS with the expected source-baseline warning
  before source commit and approved-documentation warning after state edits.
- `git diff --check`: PASS.
- Changed-file privacy scan: PASS; only synthetic fixture values are present.
- Product network contacts: 0.
- DEV contacts: 0; NEXT contacts: 0.
- Production attempts: 0.
- Database queries: 0.
- Infrastructure queries: 0.
- External publication attempts: 0.
- Alphaus repository modifications: 0.
- Credentials, storage state, customer values, raw bodies, authenticated
  evidence, and private findings persisted or committed: 0.

## Historical and remaining status

- Hardening Campaign I: `COMPLETE`.
- Phase 7: `COMPLETE`.
- Phase 6: `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Historical closure CI for `ba5b518736281f48640982fcbdb6c874bc3e3123`:
  `CONFIRMED_PASS_AT_HARDENING_CLOSURE`.
- New final documentation-SHA CI: pending until the exact pushed SHA is read.
- Branch protection and workspace-root naming remain out of scope; no Phase 8
  work is started.

To be filled at closeout with exact focused/full test results, SHA continuity,
privacy inspection, and remote workflow evidence. No real product, DEV/NEXT,
production, database, infrastructure, or publication operation is authorized
or expected.
