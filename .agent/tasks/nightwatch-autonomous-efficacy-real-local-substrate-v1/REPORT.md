# REPORT — nightwatch-autonomous-efficacy-real-local-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W8 — AUTONOMOUS EFFICACY ON THE REAL LOCAL SUBSTRATE

## Baseline

Populate from live M0 measurements before implementation. Do not backfill from expectation.

Known W7 reference only:

- live OpenCode Go real-substrate campaign: 8 investigations, 24 reasoner calls, 26 actions, 0 provider failures, ~595.5s, `NO_PROGRESS`, zero candidates;
- W7 real historical product-path proof: mechanically reproduced ouchan PRE_FAIL_POST_PASS with deterministic reasoner orchestration; this proves substrate/reproduction/admission, not live autonomous efficacy.

## Required before/after efficacy table

Populate with exact corpus/run identifiers and provider/model provenance.

| Metric | W8 baseline | W8 final | Notes |
|---|---:|---:|---|
| Unique source paths inspected | TBD | TBD | |
| Duplicate source-target rate | TBD | TBD | |
| Repeated tool/argument fingerprint rate | TBD | TBD | |
| Grounded hypotheses | TBD | TBD | |
| Verification-ready hypotheses | TBD | TBD | |
| Grounded reproduction attempts | TBD | TBD | |
| Candidates proposed | TBD | TBD | |
| Mechanically admitted findings | TBD | TBD | |
| VERIFIED_ROOT_CAUSE_REDISCOVERY | TBD | TBD | |
| EXACT_REDISCOVERY | TBD | TBD | strict metric unchanged |
| Negative-control false positives | TBD | TBD | must not worsen |
| NO_PROGRESS/stagnation rate | TBD | TBD | |
| Calls/actions to first meaningful hypothesis | TBD | TBD | |

## Implementation evidence

Populate milestone-by-milestone. Every delegated lane must include owned paths, worker SHA, orchestrator diff review verdict, post-reconcile acceptance command and result.

## Live-provider evidence

Populate only from actual subscribed CLI runs. Include provider/model provenance, exact command, campaign id, wall time, reasoner calls, tool actions, unique targets, hypotheses, reproduction readiness/attempts, candidate/admission results, and termination reason.

## Safety / leakage ledger

Record:

- hidden-ground-truth leakage checks;
- secret/audit-memory checks;
- sibling repo identity before/after real historical replay;
- DEV/NEXT/production contacts (expected 0);
- external writes (expected 0);
- force/history-rewrite events (expected 0).

## Regressions encountered

Record real failures and the actual fixes. Do not omit failed intermediate gates or rewrite them as clean first-pass success.

## Certification

Required final evidence:

- focused W8 suites;
- W7 provider/reproduction/admission suites;
- real historical opt-in proof when prerequisites are present;
- typecheck;
- hardening/agent/handoff/project/workspace/session checks;
- full `npm test`;
- `gate:local` FULL PASS;
- `gate:clean` PASS on a fresh Node 20 clone.

## Final truth table

Populate at closure with `PROVEN`, `NOT_PROVEN`, `BLOCKED`, or `NOT_AUTHORIZED` only.

Minimum claims to decide:

- bounded turn working memory;
- cross-investigation strategy memory;
- target diversity improvement;
- grounded hypothesis improvement;
- reproduction-readiness correctness;
- fixed-corpus efficacy improvement;
- live-provider historical verified root-cause rediscovery;
- live real-local diversified progress;
- false-positive non-regression;
- strict EXACT status;
- previously unknown bug status;
- DEV/NEXT/production status;
- parent programme status.

## Programme verdict

`IN_PROGRESS` until terminal acceptance is actually met.
