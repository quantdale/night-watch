# Task State

## Identity

Task ID: phase-13-real-campaign-semantic-runtime-integration
Phase: 13A-REAL-CAMPAIGN-SEMANTIC-RUNTIME-INTEGRATION
Title: Nightwatch Phase 13A — Real Campaign Semantic Runtime Integration & Contract Integrity
Authorization class: PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY
Status: IN_PROGRESS
Starting SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Last validated implementation SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Last substantive checkpoint SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LAST_VALIDATED_IMPLEMENTATION_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Objective

Integrate the locally proven Phase 9–12 semantic/replay/triage capabilities into the real campaign source architecture without executing DEV, while closing Phase 12 contract-integrity gaps and proving the entire integration through a permanent local shadow campaign.

## Current Milestone

Milestone ID: M1
Milestone status: IN_PROGRESS
What is being attempted: Overnight three-change implementation batch under token `PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY`. C1 (contract & identity correctness) source committed; C2 (semantic runtime plumbing) and C3 (replay + triage/clustering/dossier integration) pending.

## Completed Milestones

- Phase 12A predecessor locally/source verified at implementation SHA `4730c4e3c0f2d5c27864b5966bdf9c8c86bba6c4` and closure SHA `c05e507c2bbab62651057c3ca883eb3dbd48f4b4`.
- Phase 12A exact GitHub Actions remained externally billing/spending-limit blocked; no CI-success claim.
- Phase 13 architecture/spec package authored from current source review.
- C1 — contract & identity correctness: replay-plan v2 occurrence identity + strict API cardinality, semantic triage cross-field coherence matrix, AI-ready confidence ceiling. Source committed; typecheck + git diff --check green.

## Work In Progress

C2 — real-campaign semantic runtime plumbing (frozen source bundle + fixed mapping + observer seam wiring). C1 source already committed.

## Exact Next Action

Implement Change 2 (real-campaign semantic runtime plumbing): introduce strict frozen `SemanticCampaignBundle` + read-only freshness producer/consumer split, fixed approved journey/operation→target mapping, and wire the existing `semanticOracle`/`NetworkObserver` seam for fixed already-approved mappings only. Run typecheck + git diff --check, push FF checkpoint. No DEV.

## Files Changed

Spec publication only under `.agent/tasks/phase-13-real-campaign-semantic-runtime-integration/**` and `docs/design/PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION.md`.

No implementation source has been changed under Phase 13.

## Validation Ledger

Predecessor evidence only at publication:

- Phase 12 canonical complete Playwright: 1365 passed / 4 skipped / 0 failed.
- Phase 12 topology-correct isolated complete Playwright: 1365 / 4 / 0.
- Phase 12 focused: 127 passed.
- Phase 9/10/11 compatibility: 257 passed.
- campaign:synthetic: 27 passed.
- GitHub Actions at Phase 12 closure `c05e507...`: externally billing-blocked before job steps.

Phase 13 must rerun its own validations after implementation.

## Decisions Made During This Task

Decision: publish Phase 13 as a dormant spec rather than silently making it active.
Reason: spec publication is not implementation authority; the owner bootstrap prompt carries the explicit local/source-only authorization.
Evidence/constraint: continuity v2 separates durable task state from conversational authority and Phase 13 must not imply DEV authority.

## Discoveries

- Real Phase 7 campaign still assigns `invalidReducedReplay()` to journey/exploration/API candidates.
- Real campaign path does not yet consume the Phase 12 semantic-triage/dossier-v2 path end-to-end.
- Campaign version identity predates several load-bearing Phase 12 semantic/replay contracts.
- Replay-plan API original-cardinality validation has a source-level hole to reproduce.
- Replay-plan v1 lacks explicit duplicate-occurrence identity.
- Semantic triage partial-coverage coherence contains a no-op validation branch.
- Dossier-v2 AI-ready projection may expose legacy confidence stronger than semantic confidence; reproduce before fixing.

## Blockers

Implementation authority is not granted at spec publication.

GitHub Actions is also externally billing/spending-limit blocked at the predecessor state, but this does not prevent future authorized local/source implementation.

## Safety Events

NONE

## Deferred / Follow-Up

- Phase 13B contained DEV acceptance: NOT_AUTHORIZED.
- Phase 11B: NOT_AUTHORIZED.
- Any real campaign: NOT_AUTHORIZED.
- Differential expansion, Phase 6, multi-product expansion, AI authority, selfDev/promotion remain separate.

## Resume Recipe

Task has not started. Do not resume implementation without the exact owner authorization token. Once authorized: read SPEC, PLAN, every WORKSTREAM file and ACCEPTANCE_MATRIX, inspect live Git, transition to IN_PROGRESS, then execute the exact next action.

## Completion Snapshot

Overnight implementation batch in progress. C1 committed and awaiting hardening. C2/C3 being implemented. Not VERIFIED/COMPLETE; hardening campaign is required next.

```text
PHASE_13_OVERNIGHT_C1: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_OVERNIGHT_C2: IN_PROGRESS
PHASE_13_OVERNIGHT_C3: PENDING
PHASE_13A_STATUS: IN_PROGRESS
PHASE_13_HARDENING_CAMPAIGN: REQUIRED_NEXT
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: IMPLEMENT_C2
```
