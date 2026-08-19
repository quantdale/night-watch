# Workstream A — Real Replay Plans & Minimization Correctness

Parent task: `phase-12-semantic-yield-high-confidence-triage`
Authority: LOCAL/SOURCE-ONLY only. No DEV execution.

## A1. Confirmed starting gap

`tests/manual/phase7-real-campaign.ts` currently defines `invalidReducedReplay()` and assigns it to all three real anomaly-candidate classes:

- journey candidates;
- exploration candidates;
- API candidates.

The callback returns `INVALID` for every sequence. That makes the existing minimizer's reduced replay structurally unusable for real candidates.

Permanent baseline tests must reproduce this exact pre-fix behavior before it is removed or bypassed.

## A2. Preserve the existing minimizer

`src/core/triage/minimizer.ts` is already a deterministic replay reducer with:

- safe-action validation;
- order-preserving subsequence logic;
- bounded candidate/replay budgets;
- fresh exact replay first;
- exact anomaly-fingerprint matching;
- ddmin-style reduction;
- bounded one-deletion audit;
- honest `1-MINIMAL` / `BOUNDED_MINIMAL` / `NONE` claims.

Do not replace this with a second minimizer.

Change it only if permanent tests expose a real bug required by Phase 12.

## A3. Replay plan DTO

Introduce a versioned strict data-only replay plan, repository-native naming preferred, conceptually:

`nightwatch.triage-replay-plan.private.v1`

Required safe fields should be limited to facts such as:

- replayPlanId (deterministically recomputed);
- candidateKind: JOURNEY | EXPLORATION | API;
- anomalyFingerprint;
- originalActionIds in order;
- retainedActionIds in order for a candidate plan when materialized;
- target/journey/operation IDs already approved by current catalogs;
- route class already admitted by current triage policy;
- contract/catalog versions;
- semantic expectation identity / source evidence identity when present;
- source/campaign version identifiers;
- replay phase.

Unknown fields fail closed.

No raw product value, selector invented at runtime, URL parameter, body, credential, cookie, token, customer ID, cost, DOM, screenshot, trace, or source code text.

## A4. Sequence validity

A reduced candidate is eligible only when it is an order-preserving subsequence of the original occurrence sequence.

Reject:

- reordering;
- duplicates not present in the same occurrence structure;
- new action IDs;
- empty sequence when the candidate kind requires at least one action;
- action semantic class outside KNOWN_READ / LOCAL_ONLY;
- catalog/source mismatch;
- route/precondition mismatch;
- unsupported action kind.

Use occurrence identity when duplicate action IDs can appear; do not reduce correctness to set membership.

## A5. Journey replay planning

Journey replay is the hardest class and must fail closed.

The plan builder must inspect current journey contract/engine semantics and identify which step subsets are mechanically safe.

Rules:

- retained steps are original step IDs only;
- original order preserved;
- no new selector/action/route;
- dependency/precondition closure proven before executor exposure;
- route-class transitions must remain within the original frozen journey contract;
- contractVersion/contractDigest remain bound;
- a subset requiring a removed prerequisite is INVALID/PRECONDITION_DIVERGENCE without touching a browser.

If the current journey engine cannot safely execute a subset without rewriting contract semantics, do NOT fabricate support. It is acceptable to implement a precise replay-plan + validation layer and leave the actual future real executor binding as a documented blocker while still completing exploration/API/local replay work.

## A6. Exploration replay planning

Every retained exploration action must resolve to the existing approved Phase 4 safe-action catalog.

Require:

- action status APPROVED;
- semanticClass KNOWN_READ or LOCAL_ONLY;
- no SERVER_STATE preference effect;
- route effect UNCHANGED or APPROVED_ROUTE;
- same original ordered action occurrences;
- no planner/explorer invocation that creates new actions.

Replay uses the retained existing actions only.

## A7. API replay planning

API anomalies are currently one approved Phase 5 operation per candidate.

Required:

- exact replay plan may contain the original operation once;
- reduced empty sequence is INVALID/non-executable;
- no method/path/parameter/host is caller supplied outside the existing catalog operation;
- no new scenario-generation semantics;
- a successful exact replay may truthfully produce an `UNCHANGED` minimization result because there is no smaller non-empty candidate.

No API call occurs in Phase 12A.

## A8. Executor interface

The core replay plan must be separable from execution.

Define an executor callback/interface that receives only a validated replay plan/candidate and returns the existing safe `CandidateReplayOutcome` or a versioned equivalent.

Pure Phase 12 tests use synthetic executor doubles.

Any future real adapter remains behind existing DEV/auth/containment/owner-policy gates. The core must not import Playwright, network, filesystem, auth, or relay modules.

## A9. Reproduction truth

Only:

`status == FAILURE && anomalyFingerprint == targetFingerprint`

means REPRODUCES.

Different fingerprint, PASS, invalid precondition, source/contract mismatch, partial semantic coverage, safety nonzero, privacy nonzero, or executor error do not reproduce the target anomaly.

Do not use fuzzy matching.

## A10. Semantic anomaly binding

For semantic candidates, the replay plan/evidence should bind to safe deterministic semantic identity when available:

- expectationId;
- targetId;
- finding fingerprint;
- invariant-definition identity;
- source evidence digest;
- source SHA/currentness state;
- receipt outcome/coverage state.

This prevents a reduced replay from being accepted merely because some unrelated oracle failed.

## A11. Partial coverage

PARTIAL_COVERAGE is never an anomaly reproduction.

If a target anomaly was ANOMALY and replay produces PARTIAL_COVERAGE, classify as DOES_NOT_REPRODUCE or an explicit unresolved non-reproduction state, never fingerprint match.

## A12. Budgets

Preserve existing real budget semantics unless a source/test-proven correctness bug requires change.

Synthetic Phase 12 corpus may use the existing larger synthetic minimization budget.

Metrics must distinguish:

- executor replays;
- candidate guard rejections;
- candidate evaluations;
- budget-skipped candidates;
- exact replay;
- reduced replays.

## A13. Required tests

At minimum:

- current invalidReducedReplay baseline reproduced;
- strict plan schema/unknown fields;
- deterministic plan identity;
- action occurrence/subsequence validation;
- reordering/new action rejection;
- journey precondition invalidation;
- reducible journey synthetic example if mechanically supported;
- exploration reducible synthetic example;
- API exact replay/unchanged example;
- exact fingerprint match;
- different fingerprint non-reproduction;
- safety nonzero rejection;
- partial semantic replay non-reproduction;
- source/contract mismatch rejection;
- exact replay required first;
- 1-minimal case;
- bounded-minimal case;
- budget exhaustion honesty;
- repeated runs deterministic.

## A14. Acceptance

The workstream is locally VERIFIED only when at least one fixed multi-action seeded candidate that the baseline cannot minimize becomes genuinely minimized by the Phase 12 replay architecture, with zero authority expansion and zero false reproduction.
