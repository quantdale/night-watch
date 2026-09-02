# Task State

## Identity

Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Phase: PROD_OBSERVE_SAFETY_KERNEL_C11_V1
Status: IN_PROGRESS
Starting SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last validated implementation SHA: aa5d1e678c8227826d8e3552e58135c9ccbc7393
Last substantive checkpoint SHA: aa5d1e678c8227826d8e3552e58135c9ccbc7393
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-prod-observe-safety-k-5d5e338f
Last checkpoint: 2026-09-03 — M1 through M7 closed. The eighteen-gate kernel is implemented; 109 C-11 tests green including a 38-entry one-fault denial matrix with network-side zero-contact proof and a 16-tamper PQ receipt matrix; 22/22 C-11 hardening negative probes detected after repairing four vacuous rules; SYNTHETIC_CAMPAIGN 365/365 with deepContainmentLane PROVEN
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_VALIDATED_IMPLEMENTATION_SHA: aa5d1e678c8227826d8e3552e58135c9ccbc7393
LAST_SUBSTANTIVE_CHECKPOINT_SHA: aa5d1e678c8227826d8e3552e58135c9ccbc7393
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PROD_OBSERVE_SAFETY_KERNEL_C11_V1_STATUS: IN_PROGRESS

## Objective

Implement and certify the `PROD_OBSERVE` production-qualification kernel
against MOCK/SYNTHETIC production only, proving that no request is issued
unless every required machine authority grants it, and that every pre-dispatch
denial leaves the mock server's received-request count at zero.

## Current Milestone

Milestone ID: M8
Milestone status: IN_PROGRESS
What is being attempted: the full C-11 validation sequence, integration through
C-00, and exact-head GitHub Actions with all eleven required groups PASS.

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

Implementation is complete for M2 through M7; nothing is half-edited. The
negative-probe harness lives in the session scratchpad only.

## Exact Next Action

Run the full C-11 validation sequence — `typecheck`, `hardening:check`,
`handoff:check`, `project:check`, `agent:check`, `agent:audit`,
`gate:inventory`, `test:semantic-compat`, `campaign:synthetic`, the complete
canonical regression, `gate:local`, `gate:clean` — committing first and not
touching the tree while a gate runs. Then integrate through C-00 and obtain
exact-head GitHub Actions.

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

1. Read SPEC.
2. Read PLAN, especially the Decision Log.
3. Read the OpenSpec `audit.md` and `design.md`; the design reconciliation and
   the eighteen-gate chain are COMPLETE — do not re-derive them.
4. Inspect `git status` and the current SHA in the owned session worktree.
5. Run `npm run typecheck` and `npm run hardening:check`.
6. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete — with real evidence, never placeholders.
