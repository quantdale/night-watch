# Active Task

Task ID: phase-19-autonomous-bug-yield
Phase: 19-AUTONOMOUS-BUG-YIELD
Title: Nightwatch Phase 19 — Autonomous Bug-Yield Expansion and Integrated Campaign Intelligence
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-19-autonomous-bug-yield
Starting SHA: a9dfba332a979b8358763cd737e26d4b4a435c9c
Last validated implementation SHA: a9dfba332a979b8358763cd737e26d4b4a435c9c
Last substantive checkpoint SHA: a9dfba332a979b8358763cd737e26d4b4a435c9c
Last documentation checkpoint SHA: a9dfba332a979b8358763cd737e26d4b4a435c9c
Last checkpoint: M6 — integrated intelligence, product adapter, corpus, cache, and local operator surface validated
Current milestone: M7 — affected regression cone, canonical/isolated validation, and exact parity
Next action: Run the affected regression cone and integration gates; repair regressions, then record exact canonical/isolated counts before terminal closure
Authorization class: PHASE_19_AUTONOMOUS_BUG_YIELD_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Terminal Boundary Tokens

```text
PHASE_19_STATUS: IN_PROGRESS
PHASE_18_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_17_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16CH_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16D_STATUS: NOT_AUTHORIZED
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
```

## Routing

Phase 18 remains a terminal historical record at
`.agent/tasks/phase-18-semantic-replay-confidence/`; do not reopen or mutate
it. Phase 19 execution memory is the task directory above.
Live HEAD is always discovered from Git (`LIVE_HEAD_AUTHORITY: GIT`).

## Scope boundary

This task is LOCAL / SOURCE / SYNTHETIC only. It authorizes Nightwatch source,
read-only source inspection, synthetic fixtures, deterministic campaign
planning/execution, replay and minimization, local tests, static analysis, and
sanitized generated evidence. It authorizes zero DEV/NEXT/production contacts,
authenticated sessions, storage-state loading, product/data mutation,
database/datastore/cloud/infra operations, Phase 6, Phase 11B, Phase 13B,
Phase 16D, sibling-repository writes, publication, messaging, AI authority,
self-development promotion, credentials, or real-finding persistence.

Phase 19 must preserve the owner freeze
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE` and may not
infer environment authorization from campaign selection or operator commands.

## Files Changed

- `.agent/ACTIVE_TASK.md` and the Phase 19 task control-plane records
- integrated deterministic campaign intelligence, impact, coverage, yield,
  replay, minimization, nondeterminism, clustering, confidence, dossier,
  diagnostics, product-adapter, and operator-interface changes
- Phase 19 data-driven synthetic/adversarial fixtures and focused regressions
- only the durable project architecture/current-state/safety decisions that
  describe implemented behavior; historical task records remain unchanged

## Validation Ledger

Phase 19 validation is pending. The following Phase 18 results are retained
only as the regression baseline until this task records new results.

- Bootstrap and Gate Zero were completed from the live starting SHA; no
  external systems were contacted.
- Current focused results: `npm run typecheck` PASS; Phase 18 semantic-depth
  22 passed; affected semantic/triage cone 143 passed; owner-provenance 91
  passed; `npm run hardening:check` PASS; and `npm run campaign:synthetic` 27
  passed. The focused continuity repair matrix passed 106.
- Canonical regression: 2,285 enumerated; 2,281 passed; 4 skipped; 0 failed.
  Skips are the three unavailable source-built OOPS tests at
  `tests/unit/phase5Api.test.ts:197`, `:246`, `:280`, plus
  `tests/unit/selfDevSandboxConfinement.test.ts:147` (base uid condition).
  The local Playwright marker is `status=passed`, `failedTests=[]`.
- `npm run agent:check` passed with three expected checkpoint/legacy warnings;
  `npm run agent:audit` reported `tasks=61 strict_v2=37 legacy_v1=24
  strict_errors=0 legacy_warnings=33`; `npm run project:check` passed after
  the post-repair documentation waypoint.
- Post-repair canonical and topology-correct isolated regressions both passed
  2,281 / skipped 4 / failed 0 with exact enumeration and skip parity; both
  trees are clean.
- GitHub Actions run `32637996369` / job `97190524900` for pushed head
  `0a184adc18a5185cfdf00e1b91699ec617983d1b` completed as failure with
  `steps=[]` under the standing billing/spending restriction; it was inspected
  once, not retried, and is not claimed green.

## Decisions

- Phase 19 composes existing Phase 9–18 portfolio, change-intelligence,
  semantic, replay, and triage contracts behind additive versioned DTOs; it
  does not replace proven readers.
- Planning, coverage, yield, nondeterminism, clustering, confidence, and
  dossier outputs contain bounded explainable components and stable safe
  identities; no opaque score or raw evidence is authoritative.
- Safety, authority, and source-currentness gates run before selection and
  execution; a high-priority item can never bypass them.

## Resume Recipe

1. Read `SPEC.md`, `PLAN.md`, and `STATE.md` in this task directory.
2. Inspect live Git status and the current diff.
3. Run the smallest validation named by `Exact Next Action`.
4. Continue the current milestone without reopening Phase 18.

## Completion Snapshot

Not complete. Phase 19 is in progress; no completion claim or external-CI
claim is made.
