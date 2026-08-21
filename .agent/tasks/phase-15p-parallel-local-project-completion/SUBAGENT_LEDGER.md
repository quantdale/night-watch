# SUBAGENT LEDGER — Phase 15P

Ownership boundaries and per-sub-agent outcomes. Updated continuously from
actual worktree/branch/test evidence; never pre-filled with assumed results.

Status vocabulary: PENDING → ASSIGNED (worktree created, prompt delivered) →
DELIVERED (handoff received) → INTEGRATED (cherry-picked into canonical main)
/ REJECTED (with reason) / BLOCKED (with evidence) / REVIEWER (read-only role).

| Agent | Assignment | Dependency cone (owned) | Worktree | Branch | Status | Implementation SHA | Notes |
|---|---|---|---|---|---|---|---|
| A01 | Contract lifecycle registry convergence | src/oracles/expectations/lifecycle/** (registry/lifecycle identity), new tests | /tmp/nightwatch-swarm-a01 | swarm/a01-contract-registry | PENDING | — | — |
| A02 | Semantic result/reason vocabulary convergence | src/oracles/expectations/lifecycle/contractResultVocabulary.ts + triage reason-code modules in cone, new tests | /tmp/nightwatch-swarm-a02 | swarm/a02-semantic-vocabulary | PENDING | — | — |
| A03 | Resolution/currentness/drift platform | src/oracles/expectations/lifecycle/sourceContractResolution.ts + phase14 drift modules in cone, new tests | /tmp/nightwatch-swarm-a03 | swarm/a03-currentness-drift | PENDING | — | — |
| A04 | Schema/coherence/migration validation | src/oracles/expectations/lifecycle/{contractSchemaValidation,contractMigrationMap}.ts + DTO validators in cone, new tests | /tmp/nightwatch-swarm-a04 | swarm/a04-schema-coherence | PENDING | — | — |
| A05 | Campaign candidate lifecycle state machine | src/core/campaign/candidateLifecycle.ts + orchestrator wiring in cone, new tests | /tmp/nightwatch-swarm-a05 | swarm/a05-candidate-lifecycle | PENDING | — | — |
| A06 | Replay plan V2 / real-adapter binding | src/core/triage/{replayPlan,replayBinding,replayExecution*}.ts in cone, synthetic executors, new tests | /tmp/nightwatch-swarm-a06 | swarm/a06-replay-binding | PENDING | — | — |
| A07 | Minimizer minimality truth | src/core/triage/minimizer.ts + types in cone, adversarial fixtures, new tests | /tmp/nightwatch-swarm-a07 | swarm/a07-minimality-truth | PENDING | — | — |
| A08 | Cluster/confidence/dossier pipeline | src/core/triage/{clustering,dossier,dossierV2}.ts + oracles semantic cluster in cone, new tests | /tmp/nightwatch-swarm-a08 | swarm/a08-triage-dossier | PENDING | — | — |
| A09 | Checkpoint/resume/version drift | src/core/campaign/{checkpoint,types,orchestrator resume path}.ts in cone, drift matrices, new tests | /tmp/nightwatch-swarm-a09 | swarm/a09-checkpoint-resume | PENDING | — | — |
| A10 | Local project health/readiness API | new shared readiness module(s) under src/core/project/**, bin surface, new tests | /tmp/nightwatch-swarm-a10 | swarm/a10-local-readiness | PENDING | — | — |
| A11 | Artifact/ledger/schema validators | validator modules for durable private artifacts in cone, new tests | /tmp/nightwatch-swarm-a11 | swarm/a11-artifact-validation | PENDING | — | — |
| A12 | Deterministic project snapshot + diff | new snapshot manifest module under src/core/project/**, new tests | /tmp/nightwatch-swarm-a12 | swarm/a12-project-snapshot | PENDING | — | — |
| A13 | Privacy/authority by construction | cross-cutting review of integrated waves 1–3 cones; targeted fixes + adversarial tests | /tmp/nightwatch-swarm-a13 | swarm/a13-privacy-authority | PENDING | — | — |
| A14 | Synthetic corpus/adversarial matrix | corpus/** + cross-module scenario suites (>= 60 classes, >= 3 repeats) | /tmp/nightwatch-swarm-a14 | swarm/a14-adversarial-corpus | PENDING | — | — |
| A15 | Compatibility/dead code/version convergence | audit of waves 1–3 cones; proven-dead deletions or compatibility-only marks, new tests | /tmp/nightwatch-swarm-a15 | swarm/a15-compat-cleanup | PENDING | — | — |
| A16 | Release-candidate integration rehearsal | reviewer of A01–A15 outputs; final-seam fixes only as assigned by parent; rehearsal suite | /tmp/nightwatch-swarm-a16 | swarm/a16-release-rehearsal | PENDING | — | — |

## Overlap policy

Overlapping files discovered at assignment time convert the later assignee to
reviewer/advisor for those files. All conflicts are resolved by the parent
during cherry-pick, semantically, never by blind newer-wins.
