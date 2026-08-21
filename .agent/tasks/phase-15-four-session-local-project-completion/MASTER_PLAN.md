# Phase 15 — Four-Session Local Project Completion Program

Status at publication: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
Authoring anchor: 78a39d733e05ffe5b85e9a85b2c1da2ff0e25642
Continuity: nightwatch.agent-continuity.v2

## Goal

Use four sequential fresh CLI sessions to finish the remaining LOCAL/SOURCE implementation architecture after Phase 14, then hand the combined result to one separately authorized integrated hardening campaign.

"Project completion" in this program means implementation-complete for the current private/local source architecture. It does NOT mean DEV acceptance, CI verification, production readiness, Phase 11B/13B execution, or removal of owner gates.

## Session sequence

1. Session 1 — Core Contract & Semantic Platform Convergence
   Authorization: PHASE_15_S1_CORE_CONTRACT_CONVERGENCE_LOCAL_ONLY
   Spec: SESSION_1_CORE_CONVERGENCE.md

2. Session 2 — Campaign, Replay, Minimization & Triage Runtime Convergence
   Authorization: PHASE_15_S2_CAMPAIGN_TRIAGE_CONVERGENCE_LOCAL_ONLY
   Spec: SESSION_2_CAMPAIGN_TRIAGE_CONVERGENCE.md

3. Session 3 — Local Autonomous Operations & Developer Tooling Completion
   Authorization: PHASE_15_S3_LOCAL_OPERATIONS_COMPLETION_LOCAL_ONLY
   Spec: SESSION_3_LOCAL_OPERATIONS_TOOLING.md

4. Session 4 — Codebase Convergence & Implementation-Complete Release Candidate
   Authorization: PHASE_15_S4_IMPLEMENTATION_CLOSURE_LOCAL_ONLY
   Spec: SESSION_4_IMPLEMENTATION_CLOSURE.md

After Session 4 only:

PHASE_15_IMPLEMENTATION_STATE: IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING
PHASE_15_INTEGRATED_HARDENING: REQUIRED_SEPARATE_OWNER_AUTHORIZATION

## Permanent boundaries for all four sessions

Allowed: Nightwatch source/tests/synthetic corpus/docs; read-only Alphaus sibling source where required; deterministic local tooling; local synthetic execution; fast-forward Nightwatch Git checkpoints.

Forbidden: DEV/NEXT/production product execution; real campaign; data plane; DynamoDB/BigQuery/Spanner/SQL; cloud/infra/Phase 6; Alphaus sibling writes; external publication; AI/model authority; selfDev promotion/catalog mutation; variant-B adoption; new endpoint/target authority; Phase 11B; Phase 13B.

## Cross-session rules

- Each session is fresh-context and MUST fetch/fast-forward clean main first.
- Git/source/test evidence wins over conversation memory.
- Each session reads MASTER_PLAN + its own session file + predecessor handoff/state.
- Each session performs substantial implementation and focused tests, but does NOT run the final repository-wide hardening campaign.
- Each session pushes at least one source-bearing checkpoint and one continuity/handoff checkpoint when work succeeds.
- If one workstream is blocked, continue independent authorized workstreams.
- Never mark a session complete merely because code compiles; focused behavioral proof is required.
- Never mark the overall program complete before Session 4.
- GitHub Actions billing failure is recorded once per relevant push; do not loop/retry.

## Handoff protocol

Each session must append to HARDENING_HANDOFF.md:
- starting SHA;
- source-bearing implementation SHA(s);
- final session SHA;
- changed dependency cone;
- public contract/version changes;
- focused tests actually run + raw counts;
- tests intentionally deferred;
- known risks;
- exact CI truth;
- next session bootstrap requirements.

Session 4 must convert the handoff into the complete dependency-cone input for the future integrated hardening campaign.
