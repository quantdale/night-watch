# SPEC — Nightwatch Phase 11A.4 — Source-Freshness & Full-Regression Closeout

Task ID: `phase-11a-4-source-freshness-full-regression-closeout`
Phase: `11A.4-SOURCE-FRESHNESS-FULL-REGRESSION-CLOSEOUT`
Title: Nightwatch Phase 11A.4 — Source-Freshness & Full-Regression Closeout
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Continuity protocol: `nightwatch.agent-continuity.v2`

## 0. Starting truth

Expected task-package base before publication:

`813fabd898f4989c319affcbbe99551e4620903f`

Phase 11A.3 substantive implementation:

`578a9917344c70ba96fe9bd8d06a604ca8964108`

Phase 11A.3 docs closure:

`813fabd898f4989c319affcbbe99551e4620903f`

The collection-admission implementation is independently supported by current Nightwatch source: `src/oracles/expectations/collectionAdmission.ts` is additive, uses a fixed target→collection-ID map, transforms only fixed supported positional invariants, preserves source evidence, and strict-validates the transformed expectation.

GitHub Actions is externally blocked before job execution by the known account billing/spending-limit condition. Exact CI success must not be claimed while that remains true.

Phase 11B is NOT_AUTHORIZED.

## 1. Confirmed verification gaps

### Gap A — source freshness

Phase 11A.3 SPEC §12 required:

- discover current `mobingilabs/ripple-api` remote SHA fresh;
- use a disposable read-only current snapshot;
- derive against that exact source.

The terminal report instead records:

`mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7`

and identifies it as current source. That SHA is the historical Phase-5/catalog pin used by the canonical sibling checkout. `src/core/source/siblingSource.ts` resolves local Git HEAD only and performs no remote lookup.

Classification:

`CONFIRMED_PHASE_11A_3_SOURCE_FRESHNESS_PROOF_GAP`

### Gap B — complete regression

Phase 11A.3 SPEC §24 required:

- complete Playwright regression, zero failed;
- isolated/source-equivalent regression per repository convention.

The terminal ledger records:

- `npm run test:unit` = 1247 pass / 1 skipped as “Full Playwright”;
- an isolated run of the focused Phase 11A.3 matrix.

Neither is the required complete repository Playwright regression.

Classification:

`CONFIRMED_PHASE_11A_3_FULL_REGRESSION_PROOF_GAP`

## 2. Objective

Close both proof gaps without widening product authority or redesigning Phase 11.

## 3. Bootstrap

Before work:

```bash
cd /home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch
git status --short
git branch --show-current
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Require:

- branch `main`;
- clean tree;
- `HEAD == origin/main`.

If remote advanced after this task package, read the current active task and reconcile from Git. Do not reset or force-push.

Read:

- `AGENTS.md`
- `.agent/ACTIVE_TASK.md`
- this task's PROPOSAL/SPEC/PLAN/STATE/REPORT
- `docs/design/PHASE_11A_4_SOURCE_FRESHNESS_FULL_REGRESSION_CLOSEOUT.md`
- predecessor Phase 11A.3 SPEC/STATE/REPORT
- `docs/design/PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION.md`

## 4. Remote source freshness is mandatory

Freshly resolve the authoritative remote branch head for `mobingilabs/ripple-api` using a read-only remote operation such as:

- `git ls-remote <remote> refs/heads/master`, or
- an authenticated equivalent that returns the branch SHA.

Do not treat canonical sibling `.git/HEAD`, the Phase-5 pin, a Nightwatch recipe comment, or a prior task report as remote freshness evidence.

Record:

- remote URL/repository identity, without credentials;
- branch name;
- exact 40-hex remote SHA;
- command class used;
- success/failure classification.

Never print credential-bearing URLs or auth material.

If the remote SHA cannot be resolved:

`PHASE_11A_4_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED`

STOP. Do not substitute the canonical sibling checkout.

## 5. Disposable current-source snapshot

Create a disposable private working copy outside canonical Alphaus sibling repositories, for example under `/tmp/nightwatch-phase11a4-source/`.

Requirements:

- snapshot/checkout exactly the fresh remote SHA;
- read-only investigation use;
- do not modify the canonical `REPOSITORIES/mobingilabs/ripple-api` checkout;
- do not mutate its refs, branch, index, worktree, or files;
- do not execute Alphaus application code;
- do not persist copied source into Nightwatch Git.

Before/after record safe canonical sibling integrity metadata sufficient to prove this task caused no sibling write.

## 6. Fresh-source mechanical derivation

Against the disposable exact remote snapshot, use the current production Nightwatch recipe/extraction/admission APIs to derive:

1. the four historical real-source expectations;
2. the four collection-wide expectations through `deriveCollectionWideRealSourceExpectations`.

Required safe report fields:

- source SHA;
- historical derived count / failure count;
- collection derived count / failure count;
- target IDs;
- expectation IDs;
- evidence digests;
- invariant kinds/counts;
- resolver state for DEV-reachable targets.

Do not dump source bodies or customer values.

Preferred acceptance:

- historical 4 / failures 0;
- collection 4 / failures 0;
- common-exchange collection expectation present;
- common resolver `RESOLVED` at the fresh SHA;
- payer/account-inventory currentness also reported.

If fresh source differs from prior reviewed source but mechanically reproduces the same recipe contract, fresh derivation is valid and the report must bind to the new exact SHA.

If relevant contract extraction fails, type-flow changes, route binding changes, required keys change, or common-exchange can no longer derive:

`PHASE_11A_4_BLOCKED_CURRENT_SOURCE_CONTRACT_DRIFT`

STOP before any DEV. Do not invent a replacement semantic contract in this task.

## 7. Fresh-source semantic canary

Using the fresh-source-derived common-exchange collection expectation:

- run the existing synthetic conforming response proof;
- run the later-row-only defect proof;
- run the >128-row partial-coverage proof;
- run resolver/currentness against the exact fresh SHA.

Required:

- historical positional later-row result remains baseline PASS/no finding;
- collection later-row result is ANOMALY/VIOLATION;
- partial tail is semantic + receipt `PARTIAL_COVERAGE`;
- shared Phase 9B acceptance fails on partial coverage;
- privacy leakage 0.

No product/network request occurs.

## 8. Complete Playwright regression

Run the actual complete repository regression:

```bash
npx playwright test --project=nightwatch --workers=1
```

Require:

- exit code 0;
- failed = 0;
- no new skip introduced by this task;
- record exact passed/skipped/failed counts.

`npm run test:unit` is useful supplemental evidence but MUST NOT be labeled “full Playwright”.

If complete regression fails, investigate only enough to classify whether failure is:

- task-caused Nightwatch defect;
- pre-existing/environment-conditional legitimate skip/failure;
- invalid isolated topology.

Do not waive a real failure.

If unresolved:

`PHASE_11A_4_BLOCKED_FULL_REGRESSION`

## 9. Isolated/source-equivalent full regression

Create an isolated/source-equivalent checkout according to current repository convention, with required sibling topology available read-only.

The isolated check must execute the **full relevant validation**, including the complete Playwright regression, not merely `tests/unit/phase11a3CollectionAdmission.test.ts`.

At minimum from the isolated checkout:

- `npm ci --ignore-scripts` or repository-equivalent dependency setup when required;
- `npm run typecheck`;
- `npm run hardening:check`;
- focused Phase 11A.3/11A.4 verification tests if added;
- `npx playwright test --project=nightwatch --workers=1`;
- `npm run agent:check` / project checks where topology permits;
- `git diff --check`;
- checkout clean before/after.

Report exact full-regression counts separately from canonical-checkout counts.

If the repository's established isolated topology requires local sibling mirrors, use read-only mirrors at source-equivalent commits; do not modify canonical sibling repositories.

## 10. Re-run focused historical matrices

At minimum ensure green:

- Phase 9
- Phase 9A.1
- Phase 9B
- Phase 10
- Phase 10B
- Phase 11
- Phase 11A.1
- Phase 11A.2
- Phase 11A.3
- any Phase 11A.4 tests introduced
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- canonical selfdev catalog-integrity check
- `git diff --check`

## 11. Source change policy

This task is verification-first.

Default allowed changes are `.agent/**` and `docs/**` only.

Nightwatch source/test changes are permitted only if one of the required verification checks exposes a concrete Nightwatch defect that falls inside the existing Phase 11A authorization. If that occurs:

1. reproduce permanently before fixing;
2. keep the fix narrow;
3. run the complete validation again;
4. create a new substantive implementation SHA;
5. record the exact defect classification.

Do not change Alphaus semantic authority to accommodate fresh source drift. Current source contract drift is a blocker requiring a separate review.

## 12. Reconcile predecessor truth

Phase 11A.3 durable docs currently overstate two facts:

- the `27bb007a...` sibling pin is called “current remote SHA”;
- `npm run test:unit` is called “Full Playwright”, and focused isolated matrix execution is called the isolated regression.

After actual fresh-source/full-regression proof, correct those predecessor statements to precise historical wording.

Do not rewrite D-64's architectural decision. Add a new closeout decision only if durable decision logging is warranted; discover the next D-number first.

## 13. GitHub Actions gate

After any substantive verification/fix checkpoint and after final docs closure, re-check GitHub Actions.

If jobs execute:

- require exact `completed/success` at the exact implementation/final SHA;
- ensure the current Phase 11A.3 matrix and all normal hardening steps actually ran.

If GitHub refuses to start the job for the already documented billing/spending-limit condition:

- record exact run ID, head SHA, status/conclusion;
- verify job has zero executed steps / billing annotation;
- classify `BLOCKED_EXTERNAL_CI`;
- do not claim CI success.

A real code/test failure is not an external-CI blocker.

## 14. Phase 11B readiness

Phase 11B remains `NOT_AUTHORIZED` throughout this task.

Readiness can only become `READY_FOR_SEPARATE_AUTHORIZATION` when ALL hold:

1. fresh remote source SHA resolved;
2. exact disposable fresh-source derivation succeeds;
3. common collection expectation resolves at that SHA;
4. later-row real-source-derived synthetic proof passes;
5. partial coverage remains non-pass;
6. canonical complete Playwright regression has 0 failures;
7. isolated/source-equivalent complete regression has 0 failures;
8. privacy/safety/authority checks green;
9. exact GitHub Actions CI green.

While Actions remains externally blocked:

`PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI`

## 15. Safety vector

Require:

- DEV 0
- NEXT 0
- production 0
- product mutation 0
- DB/data-plane 0
- infra/Phase 6 0
- Alphaus writes 0
- AI/model calls 0
- selfDev/promotion 0
- catalog mutation 0
- variant-B adoption 0
- publication 0

Remote Git source discovery and disposable read-only source checkout are allowed only for the narrow freshness proof.

## 16. Terminal states

### Local/source verification complete, external CI still blocked

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

### All gates including exact CI green

```text
PHASE_11A_4_SOURCE_FRESHNESS: VERIFIED
PHASE_11A_4_FULL_REGRESSION: VERIFIED
PHASE_11A_4_STATUS: COMPLETE
PHASE_11A_STATUS: COMPLETE
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE
PHASE_11B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

### Source freshness cannot be resolved or contract drift exists

Use the exact blocker and keep Phase 11B NOT_READY / NOT_AUTHORIZED.

## 17. Final principle

A local sibling pin proves compatibility with that pin. It does not prove current remote source.

A unit suite proves unit behavior. It does not become a complete repository regression because it has many tests.

Phase 11B readiness requires both forms of evidence to be exact: **fresh source authority** and **complete regression authority**, followed by exact green CI.
