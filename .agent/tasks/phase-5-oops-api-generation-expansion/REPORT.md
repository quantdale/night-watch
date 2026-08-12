# Nightwatch Phase 5 — Restricted OOPS + Generated Read-Only API Corpus

Status: `IN_PROGRESS` — M0/M8 task creation, Phase 4 closure audit, current
OOPS audit, restricted adapter, catalog, local corpus, and pre-real gate are
complete; the frozen DEV ledger and final closure remain.

## Starting identity

- Starting Nightwatch SHA: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 4 implementation/checkpoint: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`.
- Phase 4 clean closure HEAD: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 6: `NOT STARTED`.

## Phase 4 closure reconciliation

The Phase 4 implementation and closure commits exist and are ancestral to
current HEAD. The native Phase 4 focused exploration suite passed 16/16,
TypeScript passed, `agent:check` passed with the approved-document warning,
and the closure worktree was clean before this task’s files were created.

The frozen source-defined exact-replay condition is the runner’s
`plannedActions.length > 1 && safetyIsZero(...)` selection predicate. The six
real matrix records each contain one planned action, so the exact-replay ledger
is `0/3 — NOT_APPLICABLE`; it is not relabeled as a pass and no nontrivial
sequence was skipped. Synthetic exact replay remains covered by the 16 tests.

The two Phase 4 `RUNTIME_FAILURE` records are retained as
`NIGHTWATCH_RUNTIME_ARTIFACT`: each followed successful anchor initialization,
attempted one approved action, returned `FAILED` with
`ACTION_TRANSITION_FAILED`, wrote an invalidated transition, and had no
semantic request delta or anomaly fingerprint. Both were fatal to their own
sequence but nonfatal to the corpus and had zero production/proxy/unknown/
mutation/action-unknown/DB safety counts. The E2 record additionally contains
non-causal optional font transport failures classified `DEV_INFRA_TRANSIENT`.
No product anomaly was admitted.

## Closure handoff

The remaining report sections will be filled at M10 with the frozen DEV
results, anomaly levels, privacy/safety accounting, final adversarial review,
and clean Nightwatch handoff. A successful closure must not start Phase 6.

## M1 OOPS audit checkpoint

The current read-only OOPS source is `master` at
`c4a129feb0b97dc0ae39f32c39a92abe834567f2`, tracking `origin/master`, clean,
0 ahead/behind. The installed Homebrew binary is `oops 1.2.8`, SHA-256
`8a52c99261875657553149ff79d3ba07b4bcae9ea1b5f19a2c99af57797a4fd0`, and
embeds commit `009440549ac37582296a26e668d1f6f105e14b6b`; it is therefore a
`BINARY_SOURCE_MISMATCH` and will not be used as Phase 5 source evidence.

The current source confirms arbitrary HTTP URLs/methods, `#!` script expansion,
`prepare`/`check`/assertion scripts, inherited script environment, 0777 script
files, raw response logging/file output, pre-process hooks, distributed/cloud
integrations, and optional Slack/GitHub reporting. Its `httpexpect` client uses
Go's proxy-aware default transport and follows redirects without Nightwatch
host revalidation. Each previously reported OOPS security finding is
`CONFIRMED_CURRENT`. No OOPS scenario was executed. Direct authenticated OOPS
egress is prohibited; the Nightwatch restricted adapter and loopback relay are
the next implementation boundary.

## Current next action

Execute the frozen six-operation DEV first/replay set once through the native
Nightwatch relay if the already-passed runtime gates remain healthy.

## M2–M8 implementation and pre-real checkpoint

The Nightwatch implementation contains a strict restricted
OOPS dialect, deterministic source-backed API catalog/generator, loopback
operation relay, metadata-only oracle, bounded OOPS subprocess adapter,
ephemeral auth bridge, Phase 3 staleness hooks, and a durable six-scenario
corpus. The current source-built OOPS binary was exercised only against local
loopback fixtures. The local focused suite is 15 passed after the corpus,
auth, sandbox, and pre-process/notification rejection coverage.

The catalog is intentionally small and explicit:

- 11 operations inventoried: 6 KNOWN_READ, 4 KNOWN_MUTATION, 1 UNKNOWN;
- 6 generation-eligible reads, all generated and locally verified through the
  current source-built OOPS path;
- J1 payer exchange, J2 common exchange, and J3 account inventory/billing
  stream are UI bridges; legacy billing groups and billing-group exchange are
  API-only expansions;
- the historical malformed-JSON operation remains UNKNOWN and is excluded.

Bubblewrap 0.9.0 is available and its unprivileged network-namespace probe
passed. That namespace cannot reach a relay bound in the parent Nightwatch
network namespace, so authenticated OOPS DEV execution is disabled rather than
weakening the relay boundary. The native Nightwatch relay path is the only
real DEV fallback authorized by the frozen Phase 5 task. The real budget is
12 serial requests: one first execution and one fresh replay for each of the
six frozen reads.

## M8 pre-real gate

The pre-real gate is accepted as `PHASE_5_PRE_REAL_API_READY`. The frozen set
contains six source-proven `KNOWN_READ` operations: the J1 payer-exchange,
J2 common-exchange, J3 account-inventory and billing-group stream bridges, and
two API-only expansion reads. The budget is twelve total serial requests,
one first execution and one fresh replay per operation, with a 350ms delay.

The security review answers are durable in STATE.md. Generated scenarios cannot
execute shell/script/command/pre-process features, enable notification or
distributed modes, select arbitrary destinations, represent mutations or
UNKNOWN operations, or contain credentials/customer values. OOPS receives an
explicit non-secret environment allowlist and no application auth. The current
source-built OOPS path is local-fixture-only because its verified isolated
network namespace cannot reach the parent loopback relay; the native Nightwatch
relay is the sole permitted authenticated DEV fallback.

Pre-real validation passed: TypeScript, 15 focused Phase 5 tests, the full
Nightwatch Playwright suite (333 passed), `agent:check` (PASS with the approved
checkpoint-advance warning), and `git diff --check`. No real API request,
production attempt, mutation, database query, or secret leak has occurred.
