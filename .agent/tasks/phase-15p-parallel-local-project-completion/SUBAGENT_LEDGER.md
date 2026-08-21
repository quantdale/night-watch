# SUBAGENT LEDGER — Phase 15P

Ownership boundaries and per-sub-agent outcomes. Updated continuously from
actual worktree/branch/test evidence; never pre-filled with assumed results.

Status vocabulary: PENDING → ASSIGNED (worktree created, prompt delivered) →
DELIVERED (handoff received) → INTEGRATED (cherry-picked into canonical main)
/ REJECTED (with reason) / BLOCKED (with evidence) / REVIEWER (read-only role).

| Agent | Assignment | Dependency cone (owned) | Worktree | Branch | Status | Implementation SHA | Notes |
|---|---|---|---|---|---|---|---|
| A01 | Contract lifecycle registry convergence | src/oracles/expectations/lifecycle/** (registry/lifecycle identity), new tests | /tmp/nightwatch-swarm-a01 | swarm/a01-contract-registry | INTEGRATED (wave 1) | 79fdfdf74c704cab9cb450b85e04a720a1bdd374 (upstream a2a841e) | NEW contractLifecycleModel.ts + 14-test suite; additive, no existing module touched |
| A02 | Semantic result/reason vocabulary convergence | src/oracles/expectations/lifecycle/contractResultVocabulary.ts + triage reason-code modules in cone, new tests | /tmp/nightwatch-swarm-a02 | swarm/a02-semantic-vocabulary | INTEGRATED (wave 1) | 487f1b6f71bd9ada09aff2adf9bcae7946e6cfaa (upstream f7039ec) | NEW semanticVocabulary.ts (8 total adapters, strict parsers, provenance registry) + 24-test suite |
| A03 | Resolution/currentness/drift platform | src/oracles/expectations/lifecycle/sourceContractResolution.ts + phase14 drift modules in cone, new tests | /tmp/nightwatch-swarm-a03 | swarm/a03-currentness-drift | INTEGRATED (wave 1) | 45e66a9e6bc8c983d0668b767c8f2df6cbc3b88a (upstream 211b9d7) | NEW sourceContractMovement.ts (movement classifier, fail-closed currentness ceiling) + 30-test suite |
| A04 | Schema/coherence/migration validation | src/oracles/expectations/lifecycle/{contractSchemaValidation,contractMigrationMap}.ts + DTO validators in cone, new tests | /tmp/nightwatch-swarm-a04 | swarm/a04-schema-coherence | INTEGRATED (wave 1) | 417d187cb13de98db611c4f2412f94fe62a9daab (upstream bcdfb04) | Cross-field coherence rules + historical-reader ownership table + 30-test suite |
| A05 | Campaign candidate lifecycle state machine | src/core/campaign/candidateLifecycle.ts + orchestrator wiring in cone, new tests | /tmp/nightwatch-swarm-a05 | swarm/a05-candidate-lifecycle | DELIVERED (wave 2 candidate) | e4b4f5d80a5cd12ee3e7bab57f2b9edc20ddb8d6 (upstream) | GATE_BLOCK event + load-bearing gate routing + finalize sweep; 23-test suite |
| A06 | Replay plan V2 / real-adapter binding | src/core/triage/{replayPlan,replayBinding,replayExecution*}.ts in cone, synthetic executors, new tests | /tmp/nightwatch-swarm-a06 | swarm/a06-replay-binding | DELIVERED (wave 2 candidate) | a0bf5f1d6b7b1227437696e68c74d9ec60bdb190 (upstream) | Branded ValidatedReplayPlanV2 + executeValidatedReplayPlanV2 seam; 41-test suite |
| A07 | Minimizer minimality truth | src/core/triage/minimizer.ts + types in cone, adversarial fixtures, new tests | /tmp/nightwatch-swarm-a07 | swarm/a07-minimality-truth | DELIVERED (wave 2 candidate) | 52870ba (upstream) | Soundness fix: survivor-deletion full-exercise + invocation-ledger cross-check; 17-test suite |
| A08 | Cluster/confidence/dossier pipeline | src/core/triage/{clustering,dossier,dossierV2}.ts + oracles semantic cluster in cone, new tests | /tmp/nightwatch-swarm-a08 | swarm/a08-triage-dossier | DELIVERED (wave 3 candidate) | dfdfd24d0f8e9b60c1a5f7ec2f3f9c1e21a44ba2 (upstream) | Deterministic tiebreakers, declared-gap confidence ceilings, strengthened READY; 20-test suite |
| A09 | Checkpoint/resume/version drift | src/core/campaign/{checkpoint,types,orchestrator resume path}.ts in cone, drift matrices, new tests | /tmp/nightwatch-swarm-a09 | swarm/a09-checkpoint-resume | DELIVERED (wave 2 candidate) | aadfe9b596f0356e1a277cf51f3fa0588f9f1bc9 (upstream) | Drift classifiers + unresolved-ledger idempotence fix; 17-test suite |
| A10 | Local project health/readiness API | new shared readiness module(s) under src/core/project/**, bin surface, new tests | /tmp/nightwatch-swarm-a10 | swarm/a10-local-readiness | DELIVERED (wave 3 candidate) | 08785dc8065013e2042a22e36461d285911c82a2 (upstream) | src/core/readiness/** + bin/nightwatch-status.mjs + status:local script; 21-test suite |
| A11 | Artifact/ledger/schema validators | validator modules for durable private artifacts in cone, new tests | /tmp/nightwatch-swarm-a11 | swarm/a11-artifact-validation | DELIVERED (wave 3 candidate) | 37d7a85f083e1779b9a722a0718be52055c28fd4 (upstream) | validateArtifact facade over 10 kinds composing existing validators; 23-test suite |
| A12 | Deterministic project snapshot + diff | new snapshot manifest module under src/core/project/**, new tests | /tmp/nightwatch-swarm-a12 | swarm/a12-project-snapshot | DELIVERED (wave 3 candidate) | e519881fb28aed8f0ef46f8ac5a3ef28a0725045 (upstream) | src/core/projectSnapshot/** manifest+compare with 5-way classification; 28-test suite |
| A13 | Privacy/authority by construction | cross-cutting review of integrated waves 1–3 cones; targeted fixes + adversarial tests | /tmp/nightwatch-swarm-a13 | swarm/a13-privacy-authority | PENDING | — | — |
| A14 | Synthetic corpus/adversarial matrix | corpus/** + cross-module scenario suites (>= 60 classes, >= 3 repeats) | /tmp/nightwatch-swarm-a14 | swarm/a14-adversarial-corpus | PENDING | — | — |
| A15 | Compatibility/dead code/version convergence | audit of waves 1–3 cones; proven-dead deletions or compatibility-only marks, new tests | /tmp/nightwatch-swarm-a15 | swarm/a15-compat-cleanup | PENDING | — | — |
| A16 | Release-candidate integration rehearsal | reviewer of A01–A15 outputs; final-seam fixes only as assigned by parent; rehearsal suite | /tmp/nightwatch-swarm-a16 | swarm/a16-release-rehearsal | PENDING | — | — |

## Overlap policy

Overlapping files discovered at assignment time convert the later assignee to
reviewer/advisor for those files. All conflicts are resolved by the parent
during cherry-pick, semantically, never by blind newer-wins.
