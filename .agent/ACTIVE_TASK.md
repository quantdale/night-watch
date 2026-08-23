# Active Task

Task ID: phase-18-semantic-replay-confidence
Phase: 18-SEMANTIC-REPLAY-CONFIDENCE
Title: Nightwatch Phase 18 — Semantic Contract Depth, Replay Fidelity and Confidence-Aware Triage
Status: COMPLETE
Task directory: .agent/tasks/phase-18-semantic-replay-confidence
Starting SHA: 80212fcb5dc4e8648b174b209636090a17c89c5c
Last validated implementation SHA: 937f887413e5231b385940bd310b7708bc4a0a0e
Last substantive checkpoint SHA: 937f887413e5231b385940bd310b7708bc4a0a0e
Last documentation checkpoint SHA: 0a184adc18a5185cfdf00e1b91699ec617983d1b
Last checkpoint: M7 — terminal closure after exact parity and truthful external-CI inspection (0a184adc18a5185cfdf00e1b91699ec617983d1b)
Current milestone: COMPLETE — terminal local/source/synthetic closure; external CI blocked
Next action: STOP — future engineering requires a new local/source/synthetic task and fresh scope
Authorization class: PHASE_18_SEMANTIC_REPLAY_TRIAGE_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Terminal Boundary Tokens

```text
PHASE_18_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_17_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16CH_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16D_STATUS: NOT_AUTHORIZED
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
```

## Routing

Phase 17 remains a terminal historical record at
`.agent/tasks/phase-17-change-aware-campaign-evidence-hardening/`; do not
reopen or mutate it. Phase 18 execution memory is the task directory above.
Live HEAD is always discovered from Git (`LIVE_HEAD_AUTHORITY: GIT`).

## Scope boundary

This task is LOCAL / SOURCE / SYNTHETIC only. It authorizes Nightwatch source,
read-only source inspection, synthetic fixtures, deterministic replay and
minimization, local tests, static analysis, and sanitized generated evidence.
It authorizes zero DEV/NEXT/production contacts, authenticated sessions,
storage-state loading, product/data mutation, database/datastore/cloud/infra
operations, Phase 6, Phase 11B, Phase 13B, Phase 16D, sibling-repository
writes, publication, messaging, AI authority, self-development promotion,
credentials, or real-finding persistence.

## Files Changed

- `.agent/ACTIVE_TASK.md` and the Phase 18 task control-plane records
- bounded semantic expectation/currentness, projection, invariant, oracle, and
  evidence changes under `src/oracles/**`
- occurrence-bound replay fidelity, minimization evidence, confidence, dossier,
  portfolio coverage, and hardening changes under `src/core/**` and `bin/**`
- Phase 18 synthetic fixtures and focused regression tests under `corpus/phase18`
  and `tests/unit/`
- truthful Phase 15 semantic integration expectations for the repaired
  minimization/confidence boundary

## Validation Ledger

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

- New semantic invariant kinds and projection fields are additive to existing
  versioned readers; unknown kinds and hostile prototypes fail closed.
- Rich currentness and replay-fidelity states are carried in a strict private
  V3 receipt, while legacy v1/v2 evidence remains readable when absent.
- Replay adapters emit observed semantic finding/contract identity and minimal
  occurrence ordinals; expected identity is never copied into observed fields.
- A semantic campaign is not minimal or HIGH-confidence unless the same
  semantic finding identity survives the relevant replay; unsupported journey
  reduction is recorded as unresolved evidence.

## Resume Recipe

This task is terminal. For historical verification, read
`.agent/ACTIVE_TASK.md`, the Phase 18 `SPEC.md`, `PLAN.md`, `STATE.md`,
`REPORT.md`, and `HANDOFF.md`, then discover live Git state. Do not resume
this task; future engineering requires a new local/source/synthetic task.

## Completion Snapshot

COMPLETE. Local/source/synthetic implementation, exact canonical/isolated
parity, continuity/project truth, and the authorized checkpoint push are
complete. External CI run `32637996369` / job `97190524900` executed zero
steps under the billing/spending restriction, so the truthful terminal state
is local complete / external-CI blocked, not CI green.
