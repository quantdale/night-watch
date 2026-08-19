# Task State

## Identity

Task ID: phase-13-real-campaign-semantic-runtime-integration
Phase: 13A-REAL-CAMPAIGN-SEMANTIC-RUNTIME-INTEGRATION
Title: Nightwatch Phase 13A — Real Campaign Semantic Runtime Integration & Contract Integrity
Authorization class: PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY
Status: IN_PROGRESS
Starting SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
Last validated implementation SHA: 967ef7afee02f3877b20193ecac83432ce778055
Last substantive checkpoint SHA: 967ef7afee02f3877b20193ecac83432ce778055
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0fc467bbee5dc63af68d4ff3664427a497aabc02
LAST_VALIDATED_IMPLEMENTATION_SHA: 967ef7afee02f3877b20193ecac83432ce778055
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 967ef7afee02f3877b20193ecac83432ce778055
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Objective

Integrate the locally proven Phase 9–12 semantic/replay/triage capabilities into the real campaign source architecture without executing DEV, while closing Phase 12 contract-integrity gaps and proving the entire integration through a permanent local shadow campaign.

## Current Milestone

Milestone ID: M1
Milestone status: DONE (implementation) — awaiting hardening campaign
What is being attempted: Overnight three-change implementation batch under token `PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY`. All three changes implemented and checkpointed; hardening deferred.

## Completed Milestones

- Phase 12A predecessor locally/source verified at implementation SHA `4730c4e3c0f2d5c27864b5966bdf9c8c86bba6c4` and closure SHA `c05e507c2bbab62651057c3ca883eb3dbd48f4b4`.
- Phase 12A exact GitHub Actions remained externally billing/spending-limit blocked; no CI-success claim.
- Phase 13 architecture/spec package authored from current source review.
- C1 — contract & identity correctness: replay-plan v2 occurrence identity + strict API cardinality, semantic triage cross-field coherence matrix, AI-ready confidence ceiling. Source committed `2aab111`; typecheck + git diff --check green.
- C2 — real-campaign semantic runtime plumbing: frozen `SemanticCampaignBundle` + read-only freshness split, fixed approved journey/operation→target mapping, oracle/observer seam wiring. Source committed `e0941aa`; typecheck + git diff --check green.
- C3 — real replay + semantic triage/clustering/dossier integration: occurrence-aware replay binding (exploration/API exact+reduced, journey exact + explicit reduced-unsupported), class-specific replay helpers removing generic stub, manifest/checkpoint version identity for 8 load-bearing contracts, preserved semantic triage/cluster/dossier route. Source committed `967ef7a`; typecheck + git diff --check green.

## Work In Progress

HARDENING_HANDOFF.md populated; focused smoke ~27 campaign cases passed; one intentionally deferred semantic regression left for hardening.

## Exact Next Action

Populate final continuity docs, run `agent:check`, and push durable fast-forward docs checkpoint. Then STOP. Do not claim VERIFIED/COMPLETE. Hardening campaign is REQUIRED_NEXT.

## Files Changed

- `src/core/campaign/types.ts` — campaign version fingerprint extended with 8 Phase 12/13 load-bearing contracts.
- `src/core/campaign/identity.ts` — exact-keys validation for the new version fields.
- `tests/manual/phase7-real-campaign.ts` — real replay binding (exploration/API/journey) + fixed version wiring.
- `tests/unit/campaign.test.ts`, `tests/unit/semanticCampaign.test.ts`, `tests/unit/phase10Campaign.test.ts` — full fingerprint fixtures.
- Prior C1/C2: `src/core/triage/replayPlan.ts`, `src/core/triage/semanticTriageEvidence.ts`, `src/core/triage/dossierV2.ts`, `src/core/source/semanticCampaignBundle.ts`, `src/core/campaign/realCampaignSemanticWiring.ts`, `src/oracles/semantic/campaignTargetMapping.ts`.

## Validation Ledger

Predecessor evidence only at publication:

- Phase 12 canonical complete Playwright: 1365 passed / 4 skipped / 0 failed.
- Phase 12 topology-correct isolated complete Playwright: 1365 / 4 / 0.
- Phase 12 focused: 127 passed.
- Phase 9/10/11 compatibility: 257 passed.
- campaign:synthetic: 27 passed.
- GitHub Actions at Phase 12 closure `c05e507...`: externally billing-blocked before job steps.

Phase 13 overnight batch (implementation-only):

- C1 typecheck: PASS
- C1 git diff --check: PASS
- C2 typecheck: PASS
- C2 git diff --check: PASS
- C3 typecheck: PASS
- C3 git diff --check: PASS
- Focused smoke `tests/unit/campaign.test.ts --workers=1`: 27 passed / 0 failed
- One deferred semantic regression (`phase12SemanticTriage` stale receipt coherence) intentionally left FAILING for hardening; no test relaxed overnight.

Phase 13 must rerun full acceptance and completeness validations in the REQUIRED_NEXT hardening campaign.

## Decisions Made During This Task

Decision: publish Phase 13 as a dormant spec rather than silently making it active.
Reason: spec publication is not implementation authority; the owner bootstrap prompt carries the explicit local/source-only authorization.
Evidence/constraint: continuity v2 separates durable task state from conversational authority and Phase 13 must not imply DEV authority.

Decision: extend `CampaignVersionFingerprint` with 8 explicit load-bearing contracts rather than a single bundled hash.
Reason: per-workstream D9 requires every included value to participate individually in manifest identity; a bundled hash would hide which contract drifted.

Decision: keep journey reduced replay explicitly `PRECONDITION_DIVERGENCE` rather than inventing subset execution.
Reason: frozen 2-step journey definitions (`NAVIGATE_APPROVED_ROUTE` → `WAIT_STRUCTURAL_CHECKPOINT`) require structural closure that cannot be proven safe for arbitrary subsets without inventing semantics.

Decision: leave the stale `ANOMALY` receipt vs `STALE` source coherence failure as-is overnight.
Reason: strict cross-field coherence from C1 is intentionally hard to satisfy; hardening must reconcile the fixture to `EXPECTATION_SOURCE_STALE` or document the contradiction as the READY block — no test расслаблен.

## Discoveries

- Journey engine is full-execution only (no subset param); subset would imply route/structural semantics invention.
- Semantic triage stale ↔ receipt `ANOMALY` pairing is correctly strict; hardening must align fixtures.

## Blockers

None blocking implementation. GitHub Actions may remain externally billing-blocked; do not wait on it.

## Safety Events

NONE

## Deferred / Follow-Up

- Phase 13B contained DEV acceptance: NOT_AUTHORIZED.
- Phase 11B: NOT_AUTHORIZED.
- Any real campaign: NOT_AUTHORIZED.
- Differential expansion, Phase 6, multi-product expansion, AI authority, selfDev/promotion remain separate.

## Resume Recipe

Fetch origin/main; verify `HEAD == origin/main`; read HARDENING_HANDOFF.md and this STATE.md; execute the REQUIRED_NEXT hardening campaign under a separate owner authorization. Do not resume implementation under the overnight token.

## Completion Snapshot

Overnight three-change implementation batch COMPLETE at `967ef7a`, awaiting hardening. Not VERIFIED/COMPLETE; hardening campaign is required next.

```text
PHASE_13_OVERNIGHT_C1: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_OVERNIGHT_C2: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_OVERNIGHT_C3: IMPLEMENTED_AWAITING_HARDENING
PHASE_13A_STATUS: IMPLEMENTED_AWAITING_HARDENING
PHASE_13_HARDENING_CAMPAIGN: REQUIRED_NEXT
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```
