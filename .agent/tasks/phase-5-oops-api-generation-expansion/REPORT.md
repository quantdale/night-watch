# Nightwatch Phase 5 — Restricted OOPS + Generated Read-Only API Corpus

Status: `IN_PROGRESS` — M0/M1 task creation, Phase 4 closure audit, and the
current OOPS source/binary audit are complete; adapter/source/API work remains.

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

The remaining report sections will be filled at M10 with current OOPS source
and binary provenance, adapter/relay/sandbox results, catalog counts and
operation ledger, scenario/replay corpus, DEV results, anomaly levels,
privacy/safety accounting, validation, and the final adversarial review. A
successful closure must leave Nightwatch clean and must not start Phase 6.

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

Perform the read-only current OOPS source and installed-binary audit described
in M1. Do not execute an existing or generated OOPS scenario until the
restricted profile and local-fixture plan are implemented.
