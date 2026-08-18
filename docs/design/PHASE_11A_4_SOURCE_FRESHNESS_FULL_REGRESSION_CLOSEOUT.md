# Phase 11A.4 — Source-Freshness & Full-Regression Closeout

Status: AUTHORIZED_CORRECTIVE_CONTINUATION
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Task: `.agent/tasks/phase-11a-4-source-freshness-full-regression-closeout/`
Parent design: `docs/design/PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION.md`
Parent implementation: `578a9917344c70ba96fe9bd8d06a604ca8964108`

## Problem

Phase 11A.3 implemented the missing production real-source → collection-expectation admission bridge, but its terminal verification did not satisfy two explicit predecessor acceptance gates.

### Source-freshness evidence was not remote-current

The task SPEC required fresh discovery of the `mobingilabs/ripple-api` remote branch SHA and a disposable snapshot at that exact SHA. The final report instead records the canonical sibling checkout at the historical Phase-5 pin `27bb007ad0c798800b6bd3b29760c966422966e7` as “current-source”. Nightwatch's `src/core/source/siblingSource.ts` intentionally reads local `.git/HEAD` only; it does not contact or prove the remote branch.

Therefore the implementation is proven compatible with the local pin, but the report has not proven that the current remote source still reproduces the same contract.

### Full-regression evidence was narrower than the SPEC

The task SPEC required a complete Playwright regression and an isolated/source-equivalent complete regression. The final report records:

- `npm run test:unit` (unit directory only) as “Full Playwright”;
- isolated execution of the Phase 11A.3 focused matrix rather than the complete regression.

Those are meaningful passing checks, but they do not satisfy the named complete-regression gates.

## Classification

- `CONFIRMED_PHASE_11A_3_SOURCE_FRESHNESS_PROOF_GAP`
- `CONFIRMED_PHASE_11A_3_FULL_REGRESSION_PROOF_GAP`

These findings concern evidence quality. They do not by themselves invalidate the Phase 11A.3 code.

## Corrective strategy

Phase 11A.4 is verification-first and should not redesign Phase 11.

```text
fresh remote branch SHA
  -> disposable exact current source
  -> existing historical real-source derivation
  -> existing Phase 11A.3 collection admission
  -> existing atomic resolver/currentness
  -> synthetic semantic canary

Nightwatch canonical source
  -> actual complete Playwright regression

Nightwatch isolated/source-equivalent source
  -> actual complete Playwright regression
```

## Freshness authority

Current remote source means the remote branch head is discovered during this task using a read-only remote operation. It does not mean:

- the canonical sibling's local branch HEAD;
- a historical catalog pin;
- a recipe comment;
- a prior task report.

The disposable snapshot must be exact to the freshly discovered SHA. Canonical sibling refs/worktree remain untouched.

If remote lookup is unavailable, freshness is unresolved and the task stops. Do not silently downgrade to the local pin.

## Contract drift

Fresh source may have advanced without affecting the relevant contract. The current mechanical extractor/recipe decides this:

- fresh SHA + successful exact extraction/derivation = current expectation may be admitted at that fresh SHA;
- route/key/type-flow contract change = fail closed and block Phase 11B readiness;
- irrelevant source changes do not invalidate the expectation if current re-extraction reproduces the required evidence.

No new product business semantics are invented in this closeout.

## Full regression authority

The complete Nightwatch Playwright command is:

`npx playwright test --project=nightwatch --workers=1`

`npm run test:unit` is a unit-suite command and must be labeled as such.

The isolated/source-equivalent acceptance must also execute the complete regression, with the repository's required sibling topology supplied read-only. A focused isolated matrix is supplemental evidence only.

## CI boundary

GitHub Actions remains an independent authority. Local/source/full-regression success cannot substitute for an exact green CI run.

While GitHub refuses to start jobs because of the documented billing/spending-limit condition:

- Phase 11A may be `COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED` only after this closeout's local/source/full-regression gates pass;
- Phase 11B readiness remains `NOT_READY_EXTERNAL_CI`;
- Phase 11B remains `NOT_AUTHORIZED`.

Only exact green CI can move readiness to `READY_FOR_SEPARATE_AUTHORIZATION`.

## Safety boundary

No DEV, NEXT, production, product mutation, database/data-plane operation, infrastructure/Phase 6, Alphaus write, AI/model authority, selfDev/promotion, catalog mutation, or publication.

Allowed external activity is limited to read-only source freshness discovery and a disposable exact source checkout.

## Acceptance

Phase 11A.4 is locally verified only when:

1. a fresh remote SHA is resolved;
2. the exact disposable source mechanically derives current historical + collection expectations;
3. common-exchange collection expectation resolves and passes the synthetic later-row/partial truth matrix;
4. canonical complete Playwright has 0 failures;
5. isolated/source-equivalent complete Playwright has 0 failures;
6. focused historical compatibility/safety/privacy/continuity/catalog checks are green;
7. predecessor wording is reconciled to actual evidence.

CI readiness is evaluated separately after those gates.
