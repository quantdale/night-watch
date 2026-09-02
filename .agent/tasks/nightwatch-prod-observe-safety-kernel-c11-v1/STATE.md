# Task State

## Identity

Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Phase: PROD_OBSERVE_SAFETY_KERNEL_C11_V1
Status: COMPLETE
Starting SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last validated implementation SHA: 787966061beb91de0002fd114ca04e488b44be48
Last substantive checkpoint SHA: 787966061beb91de0002fd114ca04e488b44be48
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-prod-observe-safety-k-5d5e338f
Last checkpoint: exact-head GitHub run 33665872548 / job 100367351818 at 150dfcc passed all eleven required groups on Node 20 with receipt receipt:sha256:1d991b9a10d4cad618c0f533; gate:local and gate:clean PASS at 7879660; canonical regression 3,141/3,128/13/0; substantive checkpoint 7879660
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_VALIDATED_IMPLEMENTATION_SHA: 787966061beb91de0002fd114ca04e488b44be48
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 787966061beb91de0002fd114ca04e488b44be48
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PROD_OBSERVE_SAFETY_KERNEL_C11_V1_STATUS: COMPLETE

## Objective

Implement and certify the `PROD_OBSERVE` production-qualification kernel
against MOCK/SYNTHETIC production only, proving that no request is issued
unless every required machine authority grants it, and that every pre-dispatch
denial leaves the mock server's received-request count at zero.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed. The `PROD_OBSERVE` kernel is
implemented and certified against MOCK production by exact-head CI run
33665872548 / job 100367351818 at `150dfcc` with all eleven required groups
PASS. C-12 P1 real production observation is NOT authorized and NOT started; it
requires a new explicit owner authorization.

## Completed Milestones

- **M1 — Design reconciliation.** Every historical requirement classified in the
  OpenSpec `audit.md`. Five SUPERSEDED by F-09 through F-12, P1 DEFERRED per
  F-13, six checks added by the review. The gate-count contradiction resolved:
  `design.md §5.2` says "eleven" while labelling `G0`–`G11`, which is twelve, and
  the acceptance criterion inherited it by being a COUNT. Replaced by
  `nightwatch.production-admission-chain.v1`, a NAMED ordered chain of eighteen
  gates with a definition digest and a machine-checkable historical mapping.

- **M2 — Authorization class and separation.** `eee2046`. `PROD_OBSERVE` grants
  are unforgeable at RUNTIME via a module-private registry, not by type
  branding — the DEF-C10-5 lesson. Consumption is a registry state transition,
  so a caller cannot un-consume by mutating what it holds and a structurally
  identical copy carries no consumed state. External-only config per F-09 with
  eleven fail-closed integrity codes. The allowlist is BUILT from the config;
  the cone never imports the deny table (F-10). `productionRunGate` shares no
  branch with `realRunGate` (F-11).

- **M3 — The admission chain.** `eee2046`, `b21e232`. Eighteen gates, each with
  its own categorical denial code bound by `GATE_DENIAL_CODES` so no gate can
  borrow another's reason. Kill switch at entry AND pre-dispatch. Route
  authority delegates to C-10.5's `assertSourceProvenRoute`. Privacy policy
  required with no default.

- **M4 — Budgets, breakers, containment.** `eee2046`, `f9e22bc`. Reservation
  before dispatch, consumed on reservation, never refunded on failure;
  concurrency cannot oversubscribe. Breakers terminal with no reset. Containment
  reported categorically with the CI `NOT_EXERCISED_BWRAP_UNAVAILABLE` carve-out
  never promoted to `PROVEN`.

- **M5 — Mock production and the denial matrix.** `b21e232`. A loopback-only
  mock server counting every request before any handler logic, including upgrade
  attempts. A 38-entry one-fault matrix covering all eighteen gates, each
  asserting the categorical reason belongs to that gate, the later gates are
  `NOT_EVALUATED`, the grant was not consumed, and `receivedRequestCount === 0`.
  Building it exposed two real defects: `G_CONFIGURATION_INTEGRITY` was
  unfalsifiable behind the window gate that reads its config, and
  `G_AUTHORIZATION_CLASS` could never deny.

- **M6 — Positive path and PQ receipt.** `b21e232`, `f9e22bc`. The positive
  synthetic path passes all eighteen gates and lands exactly one GET on the
  loopback server with budget reserved first and the grant CONSUMED. The receipt
  validates by IDENTITY, and a 16-entry tamper matrix fails closed on every
  case with its own rejection code.

- **M7 — Hardening and registration.** `f9e22bc`, plus the vacuity repairs.
  `checkC11ProdObserveBoundary` enforces the import graph both ways, F-11, the
  named chain and its ordering, the twice-evaluated kill switch, the in-chain
  reservation, the C-10.5 delegation, the no-default policy, the F-09 codes, the
  absence of any in-repo `config/observation/`, D-4, and gate registration.
  **22/22 negative probes detected, 0 vacuous** after repairing four.

## Work In Progress

NONE.

## Exact Next Action

STOP. C-11 is COMPLETE and certified. Any follow-up starts as a new authorized
task. The next production critical-path campaign is C-12 P1 PASSIVE PRODUCTION
OBSERVATION, which is NOT authorized here.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-prod-observe-safety-kernel-c11-v1/SPEC.md` | task scope, safety, acceptance | ADDED |
| `.agent/tasks/nightwatch-prod-observe-safety-kernel-c11-v1/PLAN.md` | milestones, approach, decisions | ADDED |
| `.agent/tasks/nightwatch-prod-observe-safety-kernel-c11-v1/STATE.md` | execution memory | ADDED |
| `.agent/tasks/nightwatch-prod-observe-safety-kernel-c11-v1/REPORT.md` | closure record | ADDED |
| `.agent/ACTIVE_TASK.md` | active campaign is now C-11 | MODIFIED |
| `.agent/EXECUTION_PROMPT.md` | C-11 handoff | MODIFIED |
| `openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/**` | dedicated OpenSpec change with the reconciliation | ADDED |
| `src/core/prodObserve/types.ts` | the versioned named eighteen-gate chain, denial codes, stage identity policy | ADDED |
| `src/core/prodObserve/authorization.ts` | runtime-unforgeable one-shot `PROD_OBSERVE` grants | ADDED |
| `src/core/prodObserve/observationConfig.ts` | external-only config loader and the independent allowlist | ADDED |
| `src/core/prodObserve/killSwitch.ts` | fail-closed kill switch with an injected probe | ADDED |
| `src/core/prodObserve/budget.ts` | reservation-before-dispatch budgets | ADDED |
| `src/core/prodObserve/breakers.ts` | terminal categorical breakers | ADDED |
| `src/core/prodObserve/productionRunGate.ts` | the admission kernel, separate from `realRunGate` | ADDED |
| `src/core/prodObserve/receipt.ts` | the PQ receipt and its identity-based validator | ADDED |
| `src/core/prodObserve/index.ts` | public surface; documents the imports it must never have | ADDED |
| `tests/unit/support/mockProduction.ts` | loopback mock production counting every request | ADDED |
| `tests/unit/c11ProdObserveKernel.test.ts` | chain identity, positive path, one-fault denial matrix | ADDED |
| `tests/unit/c11ProdObserveEvidence.test.ts` | authorization, config, budgets, breakers, receipt tampers, zero-contact | ADDED |
| `bin/hardening-check.mjs` | `checkC11ProdObserveBoundary` | MODIFIED |
| `config/synthetic-campaign.v1.json` | registers both C-11 suites | MODIFIED |

## Validation Ledger

Command: `git rev-parse origin/main`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: `060fef41205b29210d9bd8416aca97c03b028e4f`, the R-11 closure head; canonical checkout clean.

Command: R-11 predecessor closure check
Result: PASS
When: 2026-09-03
Relevant failure/output summary: R-11 `COMPLETE`, certified by exact-head run 33656654543 / job 100336766433 at `e11cf64` with all eleven required groups PASS.

Command: `npm run handoff:check`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: C-11 OpenSpec change complete with `audit.md`, `proposal.md`, `design.md`, `tasks.md` and one `specs/*/spec.md`.

## Decisions Made During This Task

Decision: Replace the historical gate COUNT with a versioned NAMED ordered chain.
Reason: `design.md §5.2` says eleven and labels twelve, and the master-plan acceptance criterion is phrased as a count, which an implementation can satisfy while omitting a check.
Evidence/constraint: the labels `G0` through `G11`; the review adds further load-bearing checks that no fixed number accommodates.

Decision: Eighteen gates, splitting host admission from resolved-address admission.
Reason: `G6` conflated two independent facts; a host can be admitted while its resolved address set is not.
Evidence/constraint: L5 `addressPolicy.ts` treats the resolved answer set as its own admission decision.

Decision: Prove zero contact network-side against an instrumented mock server.
Reason: an internal boolean cannot distinguish "denied" from "denied after dispatch".
Evidence/constraint: the brief requires the network-side count and explicitly refuses an internal boolean.

## Defects found and disposition

| ID | Defect | Disposition |
| --- | --- | --- |
| **DEF-C11-1** (introduced) | `G_CONFIGURATION_INTEGRITY` was UNFALSIFIABLE: the organizational window is read FROM the config and its gate came first, so a missing config denied as `ORGANIZATION_WINDOW_ABSENT` and the integrity gate could never be reached | CLOSED — reordered so integrity precedes the window; both now deny independently, and a hardening rule enforces the order |
| **DEF-C11-2** (introduced) | `G_AUTHORIZATION_CLASS` could never deny: it re-read the grant's own class, which `issueProdObserveGrant` always sets correctly, while an unregistered object was already refused by the preceding gate | CLOSED — the gate now compares the grant against the class the qualification CLAIMS, so aliasing denies in either direction |
| **DEF-C11-3** (introduced) | two import rules required a `core/` path segment, so the RELATIVE form of the same import (`../phase22/manifest`, `../environment`) slipped past | CLOSED — patterns match either form; a campaign-path rule added |
| **DEF-C11-4** (introduced) | the `realRunGate` production-host rule matched a bare name present at BOTH the declaration and the call site, so deleting the refusal left it green — DEF-R11-1's class in another file | CLOSED — anchored to the declaration and the guarded call site together |
| **DEF-C11-5** (introduced) | the historical-mapping rule matched an identifier that is a PREFIX of any renamed variant | CLOSED — anchored to the export |
| **Probe harness defect** | the negative-probe harness restored with `git checkout -- .`, which does not remove a `git add`-ed file, so one probe's planted config survived into the next three and they detected the leftover — three false positives | CLOSED — the harness resets the index, cleans untracked files, and verifies a green baseline before each probe |
| Test expectation (not code) | a matrix entry expected `testOnlyProductionMarkedRouteVocabulary` to be refused; it is DELIBERATELY a valid production capability | CLOSED — the adversarial case is the unmarked `testOnlyRouteVocabulary` |

## Discoveries

- The gate-count contradiction is load-bearing rather than cosmetic, because
  the acceptance criterion inherits it.
- `design.md §5.6` permits `ORDINARY_USER` at P2/P3 while the authorized stage
  policy requires `ORG_ENFORCED_READ_ONLY` from P2 onward. Recorded as a
  NARROWING rather than silently following either text.
- C-10 and C-10.5 already expose everything C-11 needs for source-bound route
  authority and opaque parameter handles, so C-11 consumes rather than
  reinvents: `deriveOpenApiRouteVocabulary`, `derivePhpRouteVocabulary`,
  `createOpaqueParameterHandle`, `createSafeRouteIdentity`,
  `assertNoConcreteParameterValue`, `assertHandleNotValue`,
  `createProductionPrivacyPolicy`, `assertProductionCone`.
- **Building the one-fault matrix is what found the two real gate defects, not
  review.** A gate can sit in a chain, look correct, and be incapable of
  denying — either because an earlier gate consumes its precondition
  (DEF-C11-1) or because it compares a value against itself (DEF-C11-2). This
  is the concrete argument for requiring a falsifying case per gate rather than
  a count of gates, which is the same argument the campaign makes about the
  historical acceptance criterion.
- The C-10/C-10.5 safety suites are registered in the SYNTHETIC_CAMPAIGN
  manifest rather than SEMANTIC_COMPATIBILITY, so C-11's belong there too. The
  registration rule accepts either authoritative manifest.
- Scanning cone source for forbidden references must strip comments: the cone
  deliberately DOCUMENTS what it must never import, because the absence of
  those imports IS the separation and a future reader needs to know it is
  deliberate. Scanning raw text would make that documentation a violation.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- C-12 P1 passive production observation, which requires new explicit owner
  authorization after review of the completed C-11 evidence.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: 787966061beb91de0002fd114ca04e488b44be48
Final documentation checkpoint: 150dfccb010ddc0a8f006819ca44b8104c22b66e
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,141 total / 3,128 passed / 13 skipped / 0 failed;
`SEMANTIC_COMPATIBILITY` 2,032/2,019/13/0; `OWNER_PROVENANCE` 91 passed;
`SYNTHETIC_CAMPAIGN` 366/366 with `deepContainmentLane: PROVEN` locally and
`NOT_EXERCISED_BWRAP_UNAVAILABLE` in CI; 110 C-11 tests, all gate-registered;
zero new skips; a 38-entry one-fault denial matrix over all eighteen gates with
`receivedRequestCount === 0` on every pre-dispatch denial; a 16-entry PQ
receipt tamper matrix; 22/22 hardening negative probes detected.
Artifacts: `gate:local` receipt `receipt:sha256:2ff143e71ea8974847053723`;
`gate:clean` inner `receipt:sha256:997ebf6461843448173e889d` and outer
`clean-receipt:sha256:5b366dd9f3dd05eb8cdd41f6` with `siblingWrites: 0`;
exact-head CI run 33665872548 / job 100367351818 at `150dfcc` with receipt
`receipt:sha256:1d991b9a10d4cad618c0f533`.
Known issues: none outstanding. DEF-C11-1 through DEF-C11-6 were introduced by
this campaign and are all closed; two were found only by building the one-fault
matrix, three only by negative probing, and one only by the clean Node 20 gate.
Recommended next task: C-12 P1 PASSIVE PRODUCTION OBSERVATION, which requires a
new explicit owner authorization after review of this evidence. C-11 grants no
authority over real production.
