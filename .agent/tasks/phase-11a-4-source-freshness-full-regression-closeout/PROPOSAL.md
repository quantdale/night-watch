# PROPOSAL — Nightwatch Phase 11A.4 — Source-Freshness & Full-Regression Closeout

Task ID: phase-11a-4-source-freshness-full-regression-closeout
Phase: 11A.4-SOURCE-FRESHNESS-FULL-REGRESSION-CLOSEOUT
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## Why this task exists

Independent synthesis of the Phase 11A.3 terminal report found two verification gaps in the otherwise credible real-source collection-admission implementation at `578a9917344c70ba96fe9bd8d06a604ca8964108`.

First, the Phase 11A.3 SPEC required a **freshly discovered remote SHA and a disposable current snapshot** of `mobingilabs/ripple-api`. The terminal report instead calls the canonical sibling checkout at the historical Phase-5 pin `27bb007ad0c798800b6bd3b29760c966422966e7` the “current-source” canary. The existing `src/core/source/siblingSource.ts` reads local `.git/HEAD`; it does not prove a remote branch is current. A pinned/local sibling checkout is valid as a historical source fixture, but it is not evidence that the current remote contract still mechanically derives.

Second, the Phase 11A.3 SPEC required a **complete Playwright regression with zero failures plus an isolated/source-equivalent full regression**. The terminal evidence records `npm run test:unit` (1247 pass / 1 skip) as the “Full Playwright” result and records an isolated run of the new focused matrix only. Those are useful tests but do not satisfy the explicitly required full repository regression.

These are verification defects, not evidence that the collection-admission source code is wrong.

Classifications:

- `CONFIRMED_PHASE_11A_3_SOURCE_FRESHNESS_PROOF_GAP`
- `CONFIRMED_PHASE_11A_3_FULL_REGRESSION_PROOF_GAP`

## Objective

Close only those two evidence gaps, reconcile Phase 11A.3 durable claims to the actually proven state, and re-establish the truthful Phase 11 readiness boundary.

The task must:

1. fresh-discover the relevant `mobingilabs/ripple-api` remote branch SHA without mutating the canonical sibling checkout;
2. create/use a disposable read-only current-source snapshot outside canonical sibling repositories;
3. mechanically derive the historical and collection expectation sets from that fresh snapshot;
4. fail closed if remote freshness cannot be resolved or if the current source no longer reproduces the reviewed contract;
5. run the actual complete Nightwatch Playwright regression (`npx playwright test --project=nightwatch --workers=1`) with zero failures;
6. run the repository-convention isolated/source-equivalent **full** regression rather than only the Phase 11A.3 matrix;
7. preserve all Phase 11A.1/11A.2/11A.3 implementation semantics unless these checks expose a concrete Nightwatch defect;
8. re-check GitHub Actions and preserve `BLOCKED_EXTERNAL_CI` while jobs are refused before execution.

## Authority boundary

No DEV, NEXT, production, product mutation, database/data-plane access, infrastructure/Phase 6, Alphaus writes, campaign/minimization redesign, differential work, AI/model authority, selfDev/promotion/catalog mutation, variant-B adoption, or publication.

Phase 11B remains `NOT_AUTHORIZED`.

This closeout does not grant Phase 11B merely by succeeding locally. Phase 11B readiness additionally requires exact green GitHub Actions CI.
