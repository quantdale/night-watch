# REPORT — Nightwatch Phase 11A.4 — Source-Freshness & Full-Regression Closeout

Task ID: phase-11a-4-source-freshness-full-regression-closeout
Phase: 11A.4-SOURCE-FRESHNESS-FULL-REGRESSION-CLOSEOUT
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close the two verification gaps discovered after Phase 11A.3 without widening Phase 11 authority:

- `CONFIRMED_PHASE_11A_3_SOURCE_FRESHNESS_PROOF_GAP`
- `CONFIRMED_PHASE_11A_3_FULL_REGRESSION_PROOF_GAP`

## Required evidence to populate

### A. Git/bootstrap

- starting live SHA
- bootstrap classification
- origin/main equality
- worktree cleanliness

### B. Fresh source

- remote repository/branch
- fresh remote SHA
- freshness command class/result
- disposable snapshot path/category
- canonical sibling task-caused writes
- historical derivation count/failures
- collection derivation count/failures
- current collection IDs / target IDs / evidence digests
- common resolver result
- payer/account resolver results
- source contract drift yes/no

### C. Semantic canary

- historical later-row baseline
- collection later-row result
- collection coverage state
- finding count
- partial semantic outcome
- partial receipt outcome
- Phase 9B partial acceptance result
- privacy leak count

### D. Canonical full regression

- exact command
- passed
- skipped
- failed
- exit code
- new skips

### E. Isolated/source-equivalent full regression

- isolated path/topology
- exact Nightwatch SHA
- sibling topology/source SHA handling
- typecheck/hardening
- exact full Playwright command
- passed
- skipped
- failed
- checkout clean before/after

### F. Focused compatibility

- Phase 9 / 9A.1 / 9B
- Phase 10 / 10B
- Phase 11 / 11A.1 / 11A.2 / 11A.3 / 11A.4
- campaign:synthetic
- owner-provenance
- agent:check
- agent:audit
- project:check
- catalog integrity
- git diff --check

### G. Predecessor reconciliation

- Phase 11A.3 “current-source” wording corrected
- Phase 11A.3 “Full Playwright” wording corrected
- Phase 11A.3 isolated-regression wording corrected
- decision number if a new durable decision is added

### H. CI

For every required pushed checkpoint:

- SHA
- run ID
- job status/conclusion
- step count/executed steps
- annotation/blocker or actual test result

Never infer CI PASS from local evidence.

### I. Safety vector

- DEV
- NEXT
- production
- product mutation
- DB/data plane
- infra
- Alphaus writes
- AI/model
- selfDev/promotion
- catalog mutation
- publication

All must remain zero except read-only remote source discovery/disposable source checkout.

## Terminal state

Populate only from actual evidence.

If local/source/full-regression proof is complete but GitHub Actions remains externally blocked:

```text
PHASE_11A_4_SOURCE_FRESHNESS: VERIFIED
PHASE_11A_4_FULL_REGRESSION: VERIFIED
PHASE_11A_4_STATUS: BLOCKED_EXTERNAL_CI
PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED
PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

If exact CI also becomes green, use the COMPLETE / READY_FOR_SEPARATE_AUTHORIZATION terminal state from SPEC §16. Phase 11B remains NOT_AUTHORIZED either way.
