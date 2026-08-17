# PLAN — Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation

Task ID: phase-11-bounded-collection-wide-semantic-evaluation
Phase: 11A-COLLECTION-WIDE-SEMANTIC
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Implement the authorized local/synthetic Phase 11 architecture defined by
`docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`: remove the item-0-only blind
spot while preserving historical positional semantics, bounded projection, privacy,
source provenance, and all Phase 8/9/10 boundaries.

## Starting State

- Owner-authorized implementation base before this spec package:
  `b4a34e53ae7342def056dd135eb0f0abb6b43902`.
- Phase 10 is terminal COMPLETE; Phase 10B real deep common-exchange acceptance is PASS.
- D-61 selected `BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION` as Phase 11.
- Confirmed gap: all four real collection expectations are item-0-only.
- Projector retains up to 128 safe projected array items.
- Real minimization gap remains NEXT_AFTER and is out of scope.
- Phase 6 remains FROZEN_BY_OWNER.
- Phase 8 catalog remains count 1, variant B AVAILABLE_NOT_ADOPTED, promotion authority
  NONE.

## Scope

Primary implementation areas:

- collection-aware semantic invariant evaluation
- explicit collection scope / current expectation identities
- coverage-state propagation
- aggregate finding evidence
- synthetic corpus + precision/privacy/determinism tests
- synthetic campaign/dossier passthrough
- hardening + CI
- continuity/docs

No new Alphaus product authority.

## Milestones

### M0 — Fresh bootstrap and durable recovery

- Fetch `origin`.
- Require local branch `main`, clean worktree, `HEAD == origin/main`.
- Read `AGENTS.md`, `.agent/ACTIVE_TASK.md`, this SPEC/PLAN/STATE, and the Phase 11 design.
- If remote advanced beyond the spec package for unrelated substantive work, stop and
  reconcile from Git rather than resetting.
- Run `npm run agent:check` and `npm run project:check` read-only to understand the
  current continuity state.

### M1 — Permanent pre-fix baseline proof

Create permanent tests that reproduce the item-0 gap before changing behavior:

- row 1 wrong TYPE_MATCH => current item-0 semantics miss
- row 57 wrong TYPE_MATCH => miss
- row 57 missing FIELD_PRESENT => miss
- payer row 1 outside TYPE_IN_SET => miss
- first uninspected row defect => current result can appear PASS

Also prove projector retains multi-item safe structure and cap 128.

Record `CONFIRMED_ARRAY_TRUNCATION_COMMENT_DRIFT` for the stale projector comment.

### M2 — Explicit collection-scope and identity design

Implement the smallest explicit declarative collection scope consistent with the design.
Do not modify generic positional SafePath meaning.

Required outputs:

- distinct collection-wide expectation identity
- historical item-0 expectations unchanged
- root invariants remain single evaluation
- item invariants become collection-relative through one deterministic mechanism

If this cannot be done without global path reinterpretation or identity ambiguity, STOP.

### M3 — Coverage-state evaluation

Implement:

- FULLY_EVALUATED_PASS
- VIOLATION
- EMPTY_NOT_APPLICABLE
- PARTIAL_COVERAGE_NO_VIOLATION
- PROJECTION_LIMIT_EXCEEDED / existing exact equivalent

Ensure partial coverage survives expectation-level aggregation and downstream receipts.

### M4 — Aggregate findings and versioning

Implement one finding per invariant definition, not per row.

Add only safe aggregate metadata required by the design. Make strict schema/versioning
changes deliberately, preserving historical finding/receipt compatibility.

Prove fingerprints are stable across row position for the same invariant contract.

### M5 — Phase 11 corpus

Create `corpus/phase11/**` with the mandatory defect and benign fixtures from the SPEC.
No DEV/customer data.

### M6 — Focused Phase 11 matrices

Implement focused tests for:

- row 1 / 57 / 127 detection
- row 128 partial coverage
- truncated + observed violation
- empty array
- exact 128 valid
- >128 valid partial
- payer union cases
- multi-row finding dedup
- same-kind distinct-contract attribution
- positional backward compatibility
- coverage metadata validation
- privacy sentinels
- deterministic repeats
- historical parser compatibility
- campaign/dossier integration

### M7 — Hardening and CI

Add narrow hardening guards. Add workflow step:

`Phase 11 bounded collection-wide semantic evaluation matrix`

CI is local/synthetic only.

### M8 — Full local validation

Run every command required by SPEC §11 plus complete Playwright and isolated/source-
equivalent regression. No new skips.

### M9 — Substantive implementation checkpoint

- Inspect diff and boundaries.
- Commit the validated implementation.
- Push fast-forward to `origin/main`.
- Fetch and require `HEAD == origin/main`, clean worktree.
- Wait for exact green CI on that implementation SHA.

### M10 — Clean-checkout acceptance

From a clean source-equivalent checkout at the implementation SHA, rerun Phase 11
acceptance and report raw counts:

- later-row defect corpus size
- baseline detections
- collection-wide detections
- row-127 result
- row-128 result
- benign count / false positives
- aggregate finding/dedup counts
- privacy sentinel count / leaks
- deterministic repeats / mismatches
- full regression counts

### M11 — Closure and decision record

- Add D-62 or actual next live decision number.
- Correct stale `arrayTruncated` comment only after behavior is true.
- Update ROADMAP/CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL as appropriate.
- Create/update Phase 11 implementation record.
- Decide Phase 11B disposition without running DEV.
- Preserve `HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE` as NEXT_AFTER unless new structural
  evidence requires a separate design review.
- Terminalize SPEC/PLAN/STATE/REPORT and ACTIVE_TASK under continuity v2.

### M12 — Final docs checkpoint and STOP

Push docs closure fast-forward, wait exact final CI, verify clean `HEAD == origin/main`,
then STOP.

## Implementation constraints

- No generic numeric-path reinterpretation.
- No second raw-body traversal.
- No increased array inspection bound.
- No one-finding-per-row model.
- No hidden partial coverage beneath semantic PASS.
- No new product/source semantic assertion.
- No campaign/triage authority expansion.
- No Phase 6, AI, selfDev, promotion, or catalog changes.

## Non-Goals

No new Alphaus product authority, no DEV/NEXT/production execution, no product mutation,
no DB/data-layer operations, no infrastructure archaeology, no AI/model authority, no
Phase 6 changes, no selfDev/promotion/catalog changes, no public publication.

## Safety Constraints

- No generic numeric-path reinterpretation.
- No second raw-body traversal.
- No increased array inspection bound.
- No one-finding-per-row model.
- No hidden partial coverage beneath semantic PASS.
- No new product/source semantic assertion.
- No campaign/triage authority expansion.
- No Phase 6, AI, selfDev, promotion, or catalog changes.
- Real findings remain in owner-only local store.

## Architecture / Approach

Remove the item-0-only blind spot using explicit bounded collection scope over the
existing safe projection (up to 128 items). Preserve historical positional semantics.
Make partial coverage load-bearing at the invariant level. Aggregate findings without
per-row explosion. Support FULLY_EVALUATED_PASS, VIOLATION, EMPTY_NOT_APPLICABLE,
PARTIAL_COVERAGE_NO_VIOLATION, and PROJECTION_LIMIT_EXCEEDED coverage states.

## Validation Strategy

The Phase 11 matrix is necessary but not sufficient. Historical Phase 9/10 suites and
complete Playwright must remain green. Privacy and deterministic baseline comparison are
load-bearing acceptance evidence.

## Checkpoint discipline

Normal development may create local commits as needed, but only validated durable
checkpoints are pushed. Do not force push. If remote advances unexpectedly, stop and
reconcile rather than overwrite.

## Decision Log

- D-61: selected `BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION` as Phase 11 architecture.
- Owner authorized Phase 11A implementation on 2026-08-17.

## Discoveries

- `CONFIRMED_ARRAY_TRUNCATION_COMMENT_DRIFT` — projector comment overstates current
  truncation handling; correct behavior first, then comment.
- Real minimization reduced-candidate replay gap remains CURRENT but NEXT_AFTER.

## Deferred Work

- Real minimization gap repair (NEXT_AFTER, not Phase 11 scope).
- Phase 11B DEV acceptance (requires separate owner authorization).
- High-confidence real semantic triage (NEXT_AFTER unless new evidence).

## Completion Criteria

All SPEC acceptance gates are satisfied; substantive + final exact CI green; continuity
strict-v2 clean; safe catalog unchanged; no DEV/product/data/infra/AI activity; terminal
success token recorded; STOP.
