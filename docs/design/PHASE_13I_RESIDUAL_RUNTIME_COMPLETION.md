# Phase 13I — Residual Runtime Completion & Integrated Shadow Proof

Status at publication: DESIGNED / NOT_STARTED / NOT_AUTHORIZED
Architecture: `SEMANTIC_AWARE_CAMPAIGN_PROMOTION_WITH_OCCURRENCE_BOUND_REPLAY`
Required implementation authorization: `PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`

## 1. Context

Phase 13H proved several pieces independently but stopped correctly because the composed runtime architecture was still incomplete. The remaining work is local/source-only and concentrated in four seams: semantic promotion routing, occurrence-bound replay control at the real-adapter boundary, integrated synthetic shadow proof, and exhaustive version/resume fail-closed behavior.

## 2. Current split architecture

Current campaign promotion still behaves conceptually as:

```text
candidate
  -> protocol clusterAnomalies
  -> protocol reproduction/minimizer
  -> triageAnomaly
  -> BugDossier v1
```

while Phase 12/13 separately contain:

```text
semanticContractIdentity / semanticClusterKey
SemanticTriageEvidence
rankSemanticConfidence
BugDossierV2
TriageReplayPlanV2 + executeReplayPlanV2
SemanticCampaignBundle
```

Phase 13I closes that split without deleting historical protocol behavior.

## 3. Target dual-path architecture

```text
CAMPAIGN CANDIDATE
      |
      +---------------- protocol-only ------------------+
      |                                                  |
      v                                                  v
validated semantic control?                         protocol cluster
      |                                                  |
     yes                                                 v
      |                                            historical triage
      v                                                  |
semantic contract cluster                               v
      |                                           BugDossier v1
      v
exact replay/minimization
via occurrence-bound V2 plan + injected executor
      |
      v
strict SemanticTriageEvidence
      |
      v
rankSemanticConfidence
      |
      v
BugDossierV2 READY / UNRESOLVED
      |
      v
sanitized private checkpoint / morning brief
```

There is no implicit fallback from a malformed semantic candidate to semantic authority. If semantic identity/currentness cannot be established mechanically, keep the candidate protocol-only or unresolved according to explicit source-supported rules.

## 4. Replay boundary

Replay validation and replay execution are different authorities.

`validateReplayPlanV2` may prove only that the requested occurrence subset is structurally allowed. It can never certify that the product anomaly reproduced.

`executeReplayPlanV2` is the only semantic reproduction gateway for supported V2 paths. It receives an injected executor callback. In Phase 13I all proof executors are synthetic; the real-adapter source is only prepared to receive a future contained executor after separate authorization.

Duplicate action IDs make occurrence identity load-bearing. A minimizer sequence expressed only as action IDs is ambiguous when duplicate occurrences exist. The adapter must either carry occurrence selection explicitly from control state or fail closed when mapping is ambiguous; it must never choose a duplicate occurrence by convenience and call that authoritative.

Journey reduced replay remains unsupported because removing either step from the frozen read-only journey would invent precondition semantics not mechanically proven by the source contract.

## 5. Semantic identity

Semantic clustering is contract identity, not runtime coincidence. The cluster key binds:

- expectation identity;
- target identity;
- invariant definition identity;
- source repo;
- source normalized evidence digest;
- derivation version.

It intentionally excludes source SHA when normalized evidence/derivation are unchanged, as well as row ordinal, violating count, runtime timestamp, filesystem path, and raw values. This lets source movement that preserves the same mechanically derived contract remain one semantic class while still splitting real contract changes.

## 6. Semantic triage evidence

Semantic triage evidence is derived after replay/minimization. It cannot be supplied as a pre-certified candidate claim.

The promotion branch derives:

- semantic outcome and receipt/coverage truth from validated semantic observation evidence;
- source currentness from the frozen bundle/resolver/current source attestation;
- exact replay status/fingerprint from executor-backed replay;
- minimality/reproduction counts from the minimizer;
- missing-evidence codes from actual unresolved evidence.

Impossible cross-field tuples remain rejected.

## 7. Dossier-v2 authority

For semantic candidates, `BugDossierV2.status` is authoritative for READY/UNRESOLVED. Generic protocol confidence cannot override semantic confidence. AI-ready output is sanitized and descriptive only; it does not feed back into oracle, safety, currentness, or readiness.

Protocol-only findings keep dossier-v1 semantics for historical compatibility.

## 8. Persistence

If the checkpoint needs to persist semantic cluster or dossier-v2 state, evolve the schema explicitly. Do not overload a historical `AnomalyCluster` or `CampaignDossierRecord` with new semantics without a versioned validator change.

Resume must reject incompatible executable versions before replay/executor callbacks. The semantic bundle frozen in the manifest cannot auto-rebind to a newly moved source head.

## 9. Shadow campaign

The permanent Phase-13 shadow campaign is the acceptance oracle for integration. It uses the actual candidate routing, clustering, replay-plan validation/execution, semantic evidence construction, confidence, dossier, checkpoint, and brief modules with synthetic fixtures/executors only.

A positive semantic fixture must not become READY until its synthetic executor returns the exact anomaly fingerprint and its bounded minimization evidence meets the deterministic READY rules. Negative fixtures target every false-certification path.

At least three identical-input full repeats are required with zero serialized deterministic mismatches.

## 10. Safety and privacy

No new network/product authority is added. Raw runtime bodies stay transient inside existing semantic projection. Persisted campaign evidence contains only safe IDs, source provenance/control identity, categorical outcomes, bounded counts, fingerprints, action IDs, and sanitized source paths already permitted by existing policies.

Phase 6 remains frozen. L4 remains out of scope by owner.

## 11. Completion boundary

Phase 13I can establish local architectural completion. It cannot establish contained DEV acceptance. Phase 13B remains a separately designed and separately authorized bounded canary after exact CI is green.

If GitHub Actions remains externally billing-blocked, local completion may be recorded as `VERIFIED_LOCAL_NOT_CI_VERIFIED` but not `COMPLETE`.
