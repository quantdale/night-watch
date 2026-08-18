# PLAN — Nightwatch Phase 11A.4 — Source-Freshness & Full-Regression Closeout

Task ID: phase-11a-4-source-freshness-full-regression-closeout
Phase: 11A.4-SOURCE-FRESHNESS-FULL-REGRESSION-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Continuity protocol: nightwatch.agent-continuity.v2

## Purpose

Close the two remaining Phase 11A.3 verification gaps: prove the real-source collection admission against a freshly resolved remote source snapshot, and execute the actual complete + isolated Nightwatch Playwright regressions required by the predecessor SPEC. Preserve the existing Phase 11 implementation unless these checks expose a concrete Nightwatch defect.

## Starting State

- Source before this task package: `813fabd898f4989c319affcbbe99551e4620903f`.
- Phase 11A.3 implementation: `578a9917344c70ba96fe9bd8d06a604ca8964108`.
- Phase 11A.3 closure docs: `813fabd898f4989c319affcbbe99551e4620903f`.
- Collection-admission source is locally credible and focused matrix is green.
- Predecessor source-freshness proof used canonical sibling HEAD at historical pin `27bb007ad0c798800b6bd3b29760c966422966e7`, not a freshly resolved remote branch head.
- Predecessor validation ran `npm run test:unit` and a focused isolated matrix, not the required complete Playwright + isolated complete regression.
- GitHub Actions is externally blocked before job execution by account billing/spending-limit.
- Phase 11B is NOT_AUTHORIZED.

## Scope

Verification and evidence correction only: fresh remote-source resolution, disposable source snapshot, mechanical derivation/currentness canary, complete canonical Playwright regression, isolated/source-equivalent complete regression, focused historical matrices, continuity/docs reconciliation, and exact CI truth.

## Non-Goals

- No DEV/NEXT/production.
- No Phase 11B execution.
- No product mutation.
- No DB/data plane or infrastructure/Phase 6.
- No Alphaus source writes or ref mutation in canonical sibling repos.
- No new semantic/business contract.
- No campaign/minimization/differential redesign.
- No AI/model authority.
- No selfDev/promotion/catalog/B adoption.
- No publication.

## Safety Constraints

- Remote source operations are read-only and limited to freshness discovery / disposable checkout.
- Canonical sibling repositories remain untouched.
- Fresh source is never executed as application code.
- Source bodies are not copied into durable Nightwatch evidence.
- Customer/product data is not involved.
- Phase 6 stays frozen.
- Phase 11B authority remains absent.

## Architecture / Approach

No new architecture is planned. Verify the existing chain against current source:

```text
fresh remote branch SHA
  -> disposable exact source snapshot
  -> existing real-source mechanical derivation
  -> Phase 11A.3 collection admission
  -> existing resolver/currentness
  -> synthetic later-row + partial-coverage semantic proof
```

Then verify repository-wide compatibility through the true complete Playwright command in both the canonical and isolated/source-equivalent checkouts.

## Milestones

- M0 — IN_PROGRESS — bootstrap from fresh `origin/main`, read active task/spec, classify current Git/CI state.
- M1 — NOT_STARTED — resolve exact current `mobingilabs/ripple-api` remote branch SHA; stop if unresolved.
- M2 — NOT_STARTED — create disposable exact source snapshot; prove canonical sibling integrity.
- M3 — NOT_STARTED — run fresh-source historical + collection derivation/currentness canary and semantic later-row/partial proof.
- M4 — NOT_STARTED — run complete canonical Playwright regression and record exact counts.
- M5 — NOT_STARTED — run isolated/source-equivalent complete regression and record exact counts.
- M6 — NOT_STARTED — run focused historical matrices, hardening, privacy/authority, continuity/project/catalog checks.
- M7 — NOT_STARTED — reconcile predecessor Phase 11A.3 source-freshness/full-regression wording to actual evidence; record next decision if needed.
- M8 — NOT_STARTED — push validated verification/docs checkpoint and re-check exact GitHub Actions state.
- M9 — NOT_STARTED — terminalize truthful Phase 11A.4 / Phase 11B readiness state and STOP.

## Validation Strategy

Load-bearing checks are independent:

1. **Freshness:** remote branch head discovered fresh; exact disposable SHA mechanically derives current expectations.
2. **Semantic integration:** fresh-source-derived collection expectation still catches later-row defect and preserves partial coverage truth.
3. **Canonical full regression:** `npx playwright test --project=nightwatch --workers=1`, 0 failures.
4. **Isolated full regression:** same complete regression from source-equivalent isolated topology, 0 failures.
5. **Focused compatibility:** Phase 9 through Phase 11A.3 matrices + campaign/owner provenance + continuity/project/catalog/hardening.
6. **CI:** exact GitHub Actions result, never inferred from local success.

## Decision Log

- D-64 remains the Phase 11A.3 architecture decision and is not rewritten.
- Phase 11A.4 exists because verification evidence did not meet two predecessor SPEC gates; source correctness is not presumed false.

## Discoveries

- `src/core/source/siblingSource.ts` intentionally resolves local sibling `.git/HEAD` and performs no remote freshness lookup; therefore it cannot by itself satisfy a “current remote SHA” acceptance claim.
- `npm run test:unit` runs `playwright test tests/unit`; it is not equivalent to the complete repository command `npx playwright test --project=nightwatch --workers=1`.

## Deferred Work

- Phase 11B contained DEV collection-wide acceptance: only after Phase 11 local/source/full-regression evidence is complete, exact CI is green, and the owner separately authorizes DEV.
- High-confidence real semantic triage remains NEXT_AFTER Phase 11.

## Completion Criteria

1. Fresh remote source SHA is resolved and recorded.
2. Disposable exact source snapshot is used; canonical sibling task-caused writes = 0.
3. Historical + collection derivation succeeds at fresh source or contract drift is truthfully blocked.
4. Fresh-source common collection resolver is `RESOLVED` and later-row/partial synthetic proofs pass.
5. Canonical complete Playwright regression has 0 failures.
6. Isolated/source-equivalent complete Playwright regression has 0 failures.
7. Focused historical matrices and safety/privacy/continuity/catalog checks are green.
8. Predecessor overstatements are corrected to precise historical wording.
9. GitHub Actions is re-checked at exact checkpoint; external billing block is not mislabeled as test success.
10. Phase 11B remains NOT_AUTHORIZED; readiness is `NOT_READY_EXTERNAL_CI` until exact CI green.
