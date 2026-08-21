# SPEC — Nightwatch Phase 15 — Four-Session Local Project Completion (Session 1 executed)

Task ID: `phase-15-four-session-local-project-completion`
Phase: `15-S1-CORE-CONVERGENCE`
Authoring anchor: `78a39d733e05ffe5b85e9a85b2c1da2ff0e25642`
Session-1 starting SHA: `6324915b56df1d19faefd53e7d8156dd169a4cfd`
Required authorization (Session 1): `PHASE_15_S1_CORE_CONTRACT_CONVERGENCE_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## 1. Objective

Execute Session 1 of the four-session local project-completion program: converge the
semantic/source-contract platform accumulated across Phases 9–14 into a smaller,
explicit, version-safe architecture without weakening historical compatibility.
Sessions 2–4 remain separately authorized future work under this same task umbrella.

Session 1 is successful when all six workstreams are implemented coherently with
permanent focused tests green, one moderate semantic-platform integration pack is
green, validated checkpoints are pushed fast-forward, and the Phase-15
HARDENING_HANDOFF.md carries exact Session-1 evidence.

## 2. Frozen authority boundary (all four sessions)

Allowed: Nightwatch source/tests/synthetic corpus/docs; read-only Alphaus sibling
source where required; deterministic local tooling; local synthetic execution;
fast-forward Nightwatch Git checkpoints.

Forbidden: DEV/NEXT/production product execution; real campaign; data plane;
DynamoDB/BigQuery/Spanner/SQL; cloud/infra/Phase 6; Alphaus sibling writes;
external publication; AI/model authority; selfDev promotion/catalog mutation;
variant-B adoption; new endpoint/target authority; Phase 11B; Phase 13B.

## 3. Session-1 workstreams (frozen intent)

A. Contract lifecycle registry — one Nightwatch-owned registry/API enumerating
   historical, collection, deep, archived-historical, and current mechanical-probe
   contract families for existing approved targets; historical IDs immutable;
   explicit relationship metadata (predecessor/successor, scope, derivation
   version, evidence version, currentness requirement, campaign eligibility);
   fail-closed rejection of duplicate identities, target collisions, ambiguous
   successor chains, unknown versions.

B. Unified contract result vocabulary — stable categorical vocabulary spanning
   PROVEN, AMBIGUOUS, UNSUPPORTED, STALE, UNAVAILABLE, PARTIAL, NOT_APPLICABLE;
   deterministic adapters from Phase 9–14 module-specific results into one unified
   DTO without deleting historical DTOs; no raw product/customer values.

C. Identity/currentness convergence — centralized canonical identity helpers so
   source SHA stays provenance/currentness while normalized evidence plus
   derivation semantics drive semantic identity; eliminate duplicate ad hoc
   stable-json/digest logic ONLY where equivalence is mechanically provable;
   explicit compatibility tests for historical IDs/digests.

D. Resolver/admission composition — one higher-level source-contract resolution
   API composing existing admission, collection admission, currentness, mechanical
   analyzer evidence, and drift intelligence; fail closed on mixed currentness and
   ambiguous same-target selection; low-level APIs preserved untouched.

E. Contract schema validation hardening — strict unknown-field rejection for the
   new DTOs; cross-field coherence across targetId/expectationId/version/evidence/
   currentness/scope; deterministic round-trip serialization.

F. Migration map — source-owned compatibility map declaring which legacy APIs
   remain canonical, compatibility-only, or superseded-for-new-code; no deletion
   of compatibility code in this session unless all callers migrate with focused
   proof.

## 4. Testing cadence (frozen)

Implementation-first. Per workstream: typecheck, git diff --check, focused
permanent tests, narrow historical compatibility where the changed contract
requires it. End with ONE moderate semantic-platform integration pack covering
Phase 9A.1, 10, 11A.3, 12 coverage/cluster, 13 semantic bundle/routing, and
Phase 14 analyzer/currentness. Full Playwright and isolated full regression are
explicitly out of scope, as is the future repository-wide hardening campaign.

## 5. Required Session-1 terminal state

PHASE_15_S1_CORE_CONVERGENCE: IMPLEMENTED_FOCUSED_GREEN
PHASE_15_PROGRAM_STATE: SESSION_1_COMPLETE_SESSION_2_REQUIRED
NEXT ACTION: STOP

Fast-forward pushes only; never force-push; never reset or rebase legitimate work.
