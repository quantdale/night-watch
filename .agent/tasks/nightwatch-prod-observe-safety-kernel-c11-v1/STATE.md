# Task State

## Identity

Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Phase: PROD_OBSERVE_SAFETY_KERNEL_C11_V1
Status: IN_PROGRESS
Starting SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last validated implementation SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last substantive checkpoint SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-prod-observe-safety-k-5d5e338f
Last checkpoint: 2026-09-03 — C-11 opened at the R-11 closure head; the design reconciliation is complete and the eighteen-gate versioned admission chain is defined
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_VALIDATED_IMPLEMENTATION_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PROD_OBSERVE_SAFETY_KERNEL_C11_V1_STATUS: IN_PROGRESS

## Objective

Implement and certify the `PROD_OBSERVE` production-qualification kernel
against MOCK/SYNTHETIC production only, proving that no request is issued
unless every required machine authority grants it, and that every pre-dispatch
denial leaves the mock server's received-request count at zero.

## Current Milestone

Milestone ID: M2
Milestone status: IN_PROGRESS
What is being attempted: the `PROD_OBSERVE` authorization class with one-shot
consumption, the distinct `productionRunGate`, the external-only observation
config loader, the independent production allowlist, and the import-graph
separation hardening rules.

## Completed Milestones

- **M1 — Design reconciliation.** Every historical requirement classified
  CURRENT / SUPERSEDED / NARROWED / EXPANDED / DEFERRED_TO_LATER_STAGE in the
  OpenSpec `audit.md`. Five requirements are SUPERSEDED by independent-review
  findings F-09 through F-13, one is DEFERRED (P1), and six checks are added by
  the review. The gate-count contradiction is resolved: `design.md §5.2` says
  "eleven" while labelling `G0`–`G11`, which is twelve, and the acceptance
  criterion inherited the ambiguity by being phrased as a COUNT. Replaced by
  `nightwatch.production-admission-chain.v1`, a versioned NAMED ordered chain of
  eighteen gates with a definition digest, and the mapping from the historical
  twelve identifiers is documented in `design.md`. Validation:
  `npm run handoff:check` PASS.

## Work In Progress

M2 has not begun editing `src/`. The design artifacts are complete and
committed.

## Exact Next Action

Create `src/core/prodObserve/` and implement, in order: the `PROD_OBSERVE`
authorization class with one-shot `ALREADY_CONSUMED` semantics; the external
observation config loader with the F-09 integrity requirements; the independent
production allowlist built solely from that config; and `productionRunGate` as
a decision path sharing no branch with `realRunGate`.

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
