# SPEC — Phase 15P Parallel Local Project Completion

Task ID: phase-15p-parallel-local-project-completion
Phase: 15P-PARALLEL-LOCAL-PROJECT-COMPLETION
Status: IN_PROGRESS
Authorization class: PHASE_15_PARALLEL_16_AGENT_IMPLEMENTATION_LOCAL_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Frozen intent

Complete as much of the remaining LOCAL/SOURCE Nightwatch implementation
architecture as is safely possible in one session, across many independent
areas of the codebase, using a parent integrator plus up to 16 specialized
sub-agents on isolated local worktrees. The parent is the ONLY integrator:
it owns canonical main, conflict resolution, patch acceptance, wave
validation, canonical checkpoints, fast-forward pushes, and continuity.

## Assignments (frozen scope)

- A01 contract lifecycle registry convergence (identity, historical ID
  compatibility, active/superseded state, derivation version, evidence
  identity, collection scope, currentness, admission) — one deterministic
  lifecycle model; preserve Phase 9/10/11/14 semantics; never silently
  strengthen old durable IDs.
- A02 semantic result / reason vocabulary convergence (semantic outcomes,
  receipt outcomes, currentness, coverage, analyzer blockers, triage reason
  codes, safe failure classes); strict unknown-value rejection where
  appropriate; no breaking of historical serialized compatibility.
- A03 resolution / currentness / drift platform (expectation resolution,
  source currentness, Phase-14 contract drift, stale/unavailable handling,
  evidence and derivation-version movement) with a composed deterministic
  resolution API and stability proofs.
- A04 schema / coherence / migration validation over durable DTOs
  (expectations, receipts, replay plans, campaign evidence, dossiers,
  checkpoints, contract reports, compatibility readers); strict cross-field
  coherence; fail-closed unknown fields where frozen schemas require.
- A05 campaign candidate lifecycle as an explicit load-bearing state machine
  (observed → admitted → reproduced → minimized → clustered → triaged →
  dossier-ready → rejected/blocked/transient) with safety/privacy/currentness
  gates enforced.
- A06 replay plan V2 / real-adapter binding completion (occurrence-aware
  action identity, duplicate actions, exact vs reduced replay, exploration/
  API/journey distinctions, executor authority, plan-validation vs execution
  separation). Synthetic executors only.
- A07 minimizer minimality truth (genuine reduced candidates exercised;
  zero-reduction cannot claim 1-MINIMAL; confidence reflects evidence;
  bounded budgets; precondition divergence distinct from PASS; adversarial
  synthetic fixtures).
- A08 cluster / confidence / dossier pipeline convergence (semantic contract
  identity participation; noise-resistant clustering; PARTIAL/STALE/
  UNAVAILABLE never HIGH confidence; READY requires complete evidence;
  protocol-only compatibility).
- A09 checkpoint / resume / version drift truth (campaign fingerprint,
  checkpoint/replay/semantic-bundle/dossier/derivation versions,
  reservation/retry semantics, stop-before-executor on incompatible drift,
  one-at-a-time and multi-field drift matrices).
- A10 local project health / readiness API (deterministic safe status:
  source-contract health, currentness, approved target coverage, campaign
  readiness, checkpoint compatibility, blockers, external CI category,
  owner-scope restrictions; shared APIs not CLI-only duplicates).
- A11 artifact / ledger / schema validators for all durable private formats
  (checkpoints, observations, receipts, replay plans, clusters, reproduction
  records, dossiers, morning brief, source/coverage reports).
- A12 deterministic project snapshot + diff manifest with classification
  UNCHANGED / COMPATIBLE_CHANGE / SEMANTIC_CHANGE / AUTHORITY_CHANGE /
  INCOMPATIBLE_CHANGE; no runtime/customer data.
- A13 privacy / authority by construction improvements over the changed
  architecture (DTO raw-value removal, enum/digest tightening, pure-core
  import guards, executor-callback gating behind owner policy, durable-error
  leak elimination) with adversarial tests.
- A14 synthetic corpus / adversarial matrix expansion (>= 60 useful scenario
  classes across the new architecture; deterministic repetition >= 3; zero
  privacy leaks, false current, false admission, false minimality
  certification, version-drift executor escapes, determinism mismatches).
- A15 compatibility / dead code / version convergence audit within its cone
  (duplicate helpers, proven-dead branches, obsolete shims, competing version
  constants, scattered reason codes, unused exports); delete only proven-dead
  code, otherwise mark compatibility-only.
- A16 release-candidate integration rehearsal — reviewer/integrator role;
  after parent integrates accepted patches, performs read-only cross-
  examination plus assigned final-seam fixes, and builds the synthetic local
  release-candidate rehearsal spanning the full pipeline with >= 3 green
  deterministic repeats.

## Hard floors (absolute)

determinismMismatchCount = 0; privacyLeakCount = 0; falseCurrentCount = 0;
falseAdmissionCount = 0; falseMinimalityCertificationCount = 0;
versionDriftExecutorEscapeCount = 0; ownerPolicyEscapeCount = 0.

## Boundaries

No DEV. No NEXT. No production. No real campaign. No authenticated browser
execution. No Alphaus product API execution. No mutations. No DynamoDB /
BigQuery / Spanner / SQL. No GCP/GKE/Kubernetes/cloud archaeology. No AWS
runtime/IAM discovery. No Phase 6. No Alphaus sibling writes (read-only
source references only). No publication. No Slack/email/Jira handoff. No new
endpoint/target authority. No AI/model oracle authority. No selfDev
promotion. No catalog mutation. No variant-B adoption. No Phase 11B. No
Phase 13B. Sub-agent branches/worktrees stay local; only the parent writes
canonical main and pushes fast-forward.
