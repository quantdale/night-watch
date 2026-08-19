# Phase 13H — Integrated Hardening & Runtime Completion

Status at publication: DESIGNED / NOT_STARTED / NOT_AUTHORIZED
Architecture: `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION`
Owner token: `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`

## 1. Context

The overnight Phase 13 batch deliberately optimized for implementation throughput and deferred proof. That was correct for the overnight goal, but it means `IMPLEMENTED_AWAITING_HARDENING` is not equivalent to runtime correctness.

Post-run source review found two especially important distinctions:

1. **validation is not execution** — a replay-plan checker may prove that a sequence is allowed, but it cannot prove the product reproduced an anomaly;
2. **semantic evidence presence is not semantic routing** — carrying `semanticFindings` into a historical dossier does not mean the campaign is using semantic clustering, semantic confidence, or dossier-v2 readiness.

Phase 13H makes those distinctions load-bearing.

## 2. Replay architecture

Target architecture:

```text
ORIGINAL APPROVED OCCURRENCES
          |
          v
STRICT REPLAY PLAN V2
 occurrence identity
 exact/reduced subset
          |
          v
PLAN VALIDATION
 allowed / rejected only
          |
          v
TYPED REPLAY BINDING
 journey / exploration / API
          |
          v
ACTUAL EXECUTOR CALLBACK
 synthetic during Phase 13H
 real only under future authority
          |
          v
EXECUTOR OUTCOME
          |
          +-- exact target fingerprint --> reproduced
          +-- different fingerprint -----> not reproduced
          +-- invalid/precondition ------> unresolved/invalid
          +-- safety/privacy ------------> blocked
```

The replay validator is never allowed to manufacture the lower half of this diagram.

## 3. Semantic campaign branch

Target architecture:

```text
SAFE CAMPAIGN OBSERVATION
        |
        +-- no validated semantic identity --> protocol branch
        |                                    historical cluster + dossier v1
        |
        +-- validated semantic identity ----> semantic branch
                                             semantic cluster identity
                                                    |
                                             exact replay/minimization
                                                    |
                                             semantic triage evidence
                                                    |
                                             categorical semantic confidence
                                                    |
                                             dossier v2
                                                    |
                                             derived READY / UNRESOLVED
```

The two branches must coexist. Protocol-only observations must not be forced into invented semantic contracts.

## 4. Frozen semantic campaign bundle

The bundle is campaign control evidence, not runtime customer data. It binds:

- source repo/ref/SHA;
- target/expectation identity;
- evidence digest;
- derivation/admission version;
- resolver state;
- fixed approved campaign mapping;
- deployment-status-unresolved truth.

A bundle is valid only if those fields are mutually coherent, not merely individually well-formed and hash-consistent.

## 5. Source currentness vs deployment

Source currentness means Nightwatch derived the contract from the current reviewed repository state. It does not prove that source is deployed. Phase 6 remains frozen, so deployment status stays unresolved.

This limitation must propagate to dossier missing-evidence truth rather than being silently upgraded.

## 6. Semantic confidence

Semantic confidence is categorical and deterministic. HIGH requires current/full/reproduced/safe/private semantic evidence under the current contract. It is blocked by partial coverage, stale/unavailable source, fingerprint mismatch, false-positive knowledge, safety/privacy nonzero, or unresolved identity.

AI-ready output may expose that confidence only as sanitized downstream evidence. It cannot be stronger and cannot feed back into oracle/readiness authority.

## 7. Clustering

Protocol cluster identity remains useful for protocol-only anomalies.

Semantic candidates need the Phase 12 semantic identity, where the cluster is about a violated source-backed contract rather than incidental runtime row position or unrelated source SHA motion.

The hardening campaign must prove:

- same contract/evidence/derivation dedups as defined by the current semantic cluster contract;
- evidence or derivation change splits;
- row ordinal/count does not cause accidental fragmentation;
- incompatible semantic/protocol schema identities do not silently collide.

## 8. Persistence and resume

If semantic dossier-v2 or semantic cluster state is persisted in campaign checkpoints, schema/version identity must be explicit. Old evidence may remain readable where safe, but an old checkpoint cannot be resumed under materially changed executable semantics without a fail-closed migration rule.

## 9. Hardening philosophy

The hardening campaign is evidence-driven rather than coverage-theater:

- every known overnight gap gets a pre-fix reproducer;
- every safety/privacy rule gets an adversarial test;
- every runtime claim must be traced to an actual callback result in the shadow campaign;
- complete canonical and isolated regressions run only after focused architecture correctness is green;
- GitHub CI is independent evidence, not a substitute for local proof and not something to fabricate when billing blocks job start.

## 10. Phase 13B gate

No DEV acceptance should even be designed as executable until Phase 13H proves the local architecture and exact CI is green. Phase 13B remains separate owner authority.