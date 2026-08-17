# SPEC — Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation

Task ID: phase-11-bounded-collection-wide-semantic-evaluation
Phase: 11A-COLLECTION-WIDE-SEMANTIC
Title: Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## 0. Frozen intent

This SPEC is frozen implementation intent. On 2026-08-17 the owner explicitly changed
the workflow to spec-driven development and authorized creation of the complete Phase 11
execution package directly on the canonical private GitHub repository, followed by a
short CLI bootstrap prompt that fetches and executes this remote task.

The CLI prompt is transport only. The durable authority is this task package plus
`docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md` on `origin/main`.

Phase 11A is LOCAL/SYNTHETIC implementation only. Phase 11B contained DEV validation is
NOT authorized by this SPEC.

## 1. Objective

Close the confirmed `COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP`: current source-backed item
contracts evaluate only item 0 even though the safe projector retains up to 128 items.
Implement bounded collection-wide evaluation over every safely projected item, explicit
coverage states, aggregate privacy-safe findings, and honest partial coverage when an
uninspected tail exists.

The implementation must increase semantic row coverage without increasing product,
network, data-plane, AI, or self-development authority.

## 2. Normative design

The normative design is:

`docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`

It is part of this SPEC. If this SPEC and that design disagree, the stricter safety /
historical-compatibility interpretation wins and the agent must record the conflict
rather than silently reconcile it.

## 3. Required architecture

- Collection scope is explicit and declarative.
- Existing numeric SafePath semantics remain positional; no global `[0,...]` magic.
- Preferred collection invariant shape is a fixed wrapper equivalent to
  `COLLECTION_ITEM_CONTRACT` over a source-backed item-relative
  `FIELD_PRESENT` / `FIELD_ABSENT` / `TYPE_MATCH` / `TYPE_IN_SET` contract.
- Root invariants run once; item contracts run over each projected item.
- Historical Phase 9/10 expectation identities keep historical item-0 meaning.
- Collection-wide expectations get distinct, stable identities.
- Existing source semantics/provenance stay unchanged; Phase 11 changes breadth only.
- Projection v1 stays unchanged unless a concrete blocker forces STOP.
- Existing 128-item projection bound is reused.
- No raw-body second traversal.

## 4. Coverage states

Required fixed vocabulary:

- `FULLY_EVALUATED_PASS`
- `VIOLATION`
- `EMPTY_NOT_APPLICABLE`
- `PARTIAL_COVERAGE_NO_VIOLATION`
- `PROJECTION_LIMIT_EXCEEDED`

Required dominance:

- observed violation => `VIOLATION`, even when truncated;
- no observed violation + truncated => `PARTIAL_COVERAGE_NO_VIOLATION`;
- empty collection => `EMPTY_NOT_APPLICABLE`;
- complete non-truncated pass => `FULLY_EVALUATED_PASS`;
- projection failure is fail-closed and never a product anomaly.

Partial coverage must not be erased by an unrelated root PASS.

## 5. Finding aggregation

Never emit one finding per row.

Aggregate one finding per expectation + deterministic invariant-definition identity.
Distinct same-kind source contracts must remain attributable. Safe aggregate metadata:

- coverage state
- inspected item count
- violating item count
- optional structural first-violation ordinal

Raw row values, IDs, strings, numeric values, and customer identities are forbidden.
Row ordinal and violation counts must not create fingerprint explosion.

## 6. Required corpus and proof

Create permanent synthetic `corpus/phase11/**` fixtures covering:

- row 1 wrong type
- row 57 wrong type
- row 57 missing required field
- payer row 1 outside TYPE_IN_SET
- row 127 violation
- >128 rows with an observed within-window violation
- first-uninspected-row defect at row 128
- empty collection
- valid multi-row arrays
- exactly 128 valid rows
- >128 valid rows
- valid payer OBJECT/ARRAY mixtures

For the fixed later-row defect corpus compare historical item-0 behavior with collection-
wide behavior. Report baseline and Phase 11 detection counts.

## 7. Acceptance gates

1. Pre-fix blind spot reproduced permanently in baseline tests.
2. Collection scope is explicit; positional semantics are regression-protected.
3. Every observable within-window planted later-row defect is detected.
4. Row 127 is detected.
5. Row 128 beyond the projection cap does not claim anomaly and does not claim full PASS.
6. Truncated + observed violation is `VIOLATION`.
7. Truncated + no observed violation is `PARTIAL_COVERAGE_NO_VIOLATION`.
8. Empty collection is benign / item contract not applicable.
9. Multiple violating rows create one aggregate finding per invariant definition.
10. Distinct same-kind contracts retain attribution.
11. Benign corpus false positives = 0.
12. Privacy sentinel leaks = 0.
13. Deterministic repeat mismatches = 0.
14. Historical Phase 9/10/10B semantics remain interpretable and test matrices green.
15. Synthetic campaign/dossier integration carries only safe aggregate semantic evidence.
16. Full Playwright regression = 0 failures.
17. Exact implementation CI and exact final CI are green.
18. Canonical selfDev catalog remains byte-identical: count 1, digest
    `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`.
19. DEV/NEXT/production/product mutation/DB/infra/AI/Alphaus writes = 0.

## 8. Authorized source areas

Expected allowed areas:

- `src/oracles/invariants/**`
- `src/oracles/semantic/**`
- `src/oracles/expectations/**` only for additive explicit collection identity/scope
  derivation required by this SPEC
- `corpus/phase11/**`
- `tests/unit/**`
- narrow existing synthetic integration tests
- `bin/hardening-check.mjs`
- `.github/workflows/hardening.yml`
- `.agent/**`
- `docs/**`

A projection schema change is NOT authorized by default. If needed, STOP with the
specified blocker rather than widening scope.

## 9. Not authorized

No DEV/NEXT/production. No product mutation. No new journey/endpoint/recipe target. No
Alphaus source write. No database/data-layer query. No infrastructure. Phase 6 remains
frozen. No AI/model execution or authority. No real campaign. No real minimization fix.
No browser/API differential. No source-change selection redesign. No campaign-yield
redesign. No deeper L4 business semantics. No selfDev/promotion/catalog/B adoption. No
publication.

`HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE` remains NEXT_AFTER and is explicitly outside this
task.

## 10. Hardening requirements

Collection evaluator/invariant core must consume only safe projections + declarative
contracts and must not import/use filesystem, network, child processes, browser/page
objects, persistence, AI, DB/infra, selfDev/promotion, or raw response bodies.

Iteration must be bounded to the already-projected `items` array; never loop to raw
`itemCount` or re-project unseen items.

## 11. Validation

At minimum run:

- `npm run typecheck`
- `npm run hardening:check`
- existing Phase 9 / 9A.1 / 9B / 10 / 10B focused matrices
- new Phase 11 matrix
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- selfdev catalog integrity
- `git diff --check`
- `npx playwright test --project=nightwatch --workers=1`
- isolated/source-equivalent full-history regression as required by the repo

Add CI step exactly/naturally named:

`Phase 11 bounded collection-wide semantic evaluation matrix`

CI remains local/synthetic and must never contact DEV.

## 12. Checkpoint protocol

- Bootstrap from fresh `origin/main`; Git wins.
- Reproduce baseline before implementation.
- Implement within scope.
- Validate focused/full/isolated.
- Create one substantive implementation checkpoint and push fast-forward.
- Verify exact green CI at that SHA.
- Run clean-checkout Phase 11 acceptance.
- Add the next decision record (expected D-62; discover live number).
- Terminalize task/docs and push docs closure.
- Verify exact green final CI.
- STOP.

## 13. Stop conditions

- `PHASE_11A_STOPPED_SOURCE_ADVANCED`
- `PHASE_11A_BLOCKED_COLLECTION_SCOPE_DESIGN`
- `PHASE_11A_BLOCKED_EXPECTATION_IDENTITY_AMBIGUITY`
- `PHASE_11A_BLOCKED_HISTORICAL_COMPATIBILITY`
- `PHASE_11A_BLOCKED_PARTIAL_COVERAGE_FALSE_PASS`
- `PHASE_11A_BLOCKED_FINDING_AGGREGATION_AMBIGUITY`
- `PHASE_11A_BLOCKED_PRIVACY`
- `PHASE_11A_BLOCKED_DETERMINISM`
- `PHASE_11A_BLOCKED_TRIAGE_SCOPE_EXPANSION`
- `PHASE_11A_BLOCKED_PROJECTION_SCHEMA_EXPANSION`
- `PHASE_11A_BLOCKED_FULL_REGRESSION`
- `PHASE_11A_BLOCKED_CATALOG_DRIFT`
- `PHASE_11A_BLOCKED_CI`
- `PHASE_11A_BLOCKED_CONTINUITY`

Do not weaken semantics or safety to clear a blocker.

## 14. Phase 11B decision

At Phase 11A closure choose exactly one:

- `PHASE_11B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`
- `PHASE_11B_DEV_ACCEPTANCE: NOT_NEEDED_FOR_PHASE_11_COMPLETION`

Do not execute DEV under this task.

## 15. Success token

```text
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE
PHASE_11A_STATUS: COMPLETE
PHASE_10_STATUS: COMPLETE
NEXT ACTION: STOP
```
