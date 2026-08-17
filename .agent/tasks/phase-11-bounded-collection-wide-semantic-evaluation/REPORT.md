# REPORT — Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation

Task ID: phase-11-bounded-collection-wide-semantic-evaluation
Phase: 11A-COLLECTION-WIDE-SEMANTIC
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

This REPORT is the durable execution handoff for Phase 11A. It is intentionally
IN_PROGRESS at spec publication time. The implementation executor must update it from
actual evidence only and terminalize it at closure. Do not copy expected values into the
final report unless the corresponding command/test/CI evidence exists.

## Required final report structure

### A. Bootstrap and authority

- starting SHA
- fresh `origin/main` SHA at execution bootstrap
- bootstrap classification
- authorization class
- task recovery/new-execution classification
- worktree/branch/remote state
- strict-v2 continuity result

### B. Pre-fix proof

- item-0 gap reproduction for FIELD_PRESENT
- item-0 gap reproduction for TYPE_MATCH
- item-0 gap reproduction for TYPE_IN_SET
- row-1 result
- row-57 result
- row-127 result
- first-uninspected-row result
- pre-fix truncation false-full-PASS evidence
- `CONFIRMED_ARRAY_TRUNCATION_COMMENT_DRIFT` disposition

### C. Architecture implemented

- explicit collection-scope representation
- proof generic `[0,...]` path semantics were not globally changed
- collection expectation identity/versioning decision
- historical expectation compatibility approach
- recipe/source-provenance change count
- projection schema changed: yes/no, with justification if yes
- projection item bound
- collection-relative path mechanism
- root invariant treatment
- supported collection-expanded invariant kinds

### D. Coverage state semantics

Report exact behavior for:

- `FULLY_EVALUATED_PASS`
- `VIOLATION`
- `EMPTY_NOT_APPLICABLE`
- `PARTIAL_COVERAGE_NO_VIOLATION`
- `PROJECTION_LIMIT_EXCEEDED`

Also report expectation-level aggregation and proof that partial coverage cannot be
silently erased by root PASS.

### E. Finding/receipt evidence model

- aggregation key
- same-invariant multi-row dedup result
- distinct same-kind contract attribution result
- `inspectedItemCount` model
- `violatingItemCount` model
- first-violation ordinal decision
- finding schema/version decision
- receipt/evaluation schema/version decision
- fingerprint strategy
- historical v1 compatibility result

### F. Corpus and detection metrics

Report raw counts:

- Phase 11 corpus file count
- later-row seeded defect count
- historical item-0 baseline detections
- collection-wide detections
- row-127 detection
- row-128 first-uninspected result
- truncated + observed violation result
- benign case count
- false-positive count
- empty-array result
- exact-128 valid result
- >128 valid result
- payer valid union result
- multi-violating-row result

### G. Privacy and determinism

- sentinel count
- sentinel leak count
- aggregate metadata validation result
- raw-value derivative checks
- deterministic repeat count
- deterministic mismatch count
- algorithmic bound

### H. Synthetic pipeline integration

- historical item-0 campaign baseline findings
- collection-wide campaign findings
- aggregate semantic findings admitted
- dossiers produced
- dossier privacy result
- proof no campaign/triage authority changed

### I. Regression and hardening

- typecheck
- hardening
- Phase 9 matrix
- Phase 9A.1 matrix
- Phase 9B matrix
- Phase 10 matrix
- Phase 10B matrix
- Phase 11 matrix
- campaign synthetic
- owner provenance
- full Playwright counts
- isolated/source-equivalent counts
- agent:check
- agent:audit strict errors
- project:check
- catalog integrity
- git diff --check

### J. Checkpoints

- substantive implementation SHA
- exact implementation CI run ID/result
- clean-checkout acceptance result
- D-62 or actual decision number
- docs closure SHA
- exact final CI run ID/result
- final HEAD
- origin/main
- worktree

### K. Boundary/safety vector

Report exact counts/status:

- DEV contacts
- NEXT contacts
- production attempts
- product mutations
- DB/data-plane activity
- infra activity
- AI/model calls
- Alphaus writes
- publication
- selfDev
- promotion intents
- approvals
- APPLY
- catalog writes
- variant-B adoption
- runtime Git writes

Normal Nightwatch development Git commits are expected and must be listed separately from
runtime Git authority.

### L. Terminal phase state

- Phase 8 status
- Phase 9 status
- Phase 10 status
- Phase 11A status
- `PHASE_11_COLLECTION_WIDE_SEMANTIC` status
- Phase 11B disposition
- `HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE` NEXT_AFTER status
- residual limitations
- final verdict
- next action

## Required successful terminal token

```text
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE
PHASE_11A_STATUS: COMPLETE
PHASE_10_STATUS: COMPLETE
NEXT ACTION: STOP
```

At closure also record exactly one Phase 11B disposition:

```text
PHASE_11B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
```

or

```text
PHASE_11B_DEV_ACCEPTANCE: NOT_NEEDED_FOR_PHASE_11_COMPLETION
```

Do not execute Phase 11B under this task.

## Current execution state

Phase 11A spec package has been published to the canonical remote. The task is
IN_PROGRESS at M0/M1 — permanent pre-fix baseline reproduction and item-0 gap
proof. No Phase 11 source implementation has been committed yet. The following
evidence exists:

- Spec package published: SPEC.md, PLAN.md, STATE.md, REPORT.md, ACTIVE_TASK.md.
- Design document published: `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`.
- Continuity v2 structural headings have been fixed in PLAN.md and STATE.md.
- CI workflow step for Phase 11 has been added to `.github/workflows/hardening.yml`.
- `LAST_VALIDATED_IMPLEMENTATION_SHA` and `LAST_SUBSTANTIVE_CHECKPOINT_SHA` aligned
  to `6158ef436a306d48b4399978df454f27a3d021a0` in STATE.md and ACTIVE_TASK.md.

All sections A–L above must be populated from actual command/test/CI evidence before
closure. No terminal token has been recorded.
