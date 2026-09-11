# Deep Audit: Durable Artifact + Control Center Truth Hardening

Status: PLANNING COMPLETE — implementation not started
Change ID: nightwatch-durable-artifact-and-control-center-truth-hardening-v1
Audited main: 49034831377f243054261361b4d1a7d783c0fc4f
Target branch: main
Execution budget: approximately 12 productive engineering hours
Safety scope: LOCAL / repository source / synthetic fixtures only

## Audit basis and coverage

This planning pass does not pretend that a remote connector re-read 1,320 blobs one by one after the connector hit its per-call ceiling. Instead it uses the repository's immediately preceding, locally executed exhaustive audit as the byte-for-byte baseline and then reconciles every delta to current main.

The predecessor source-proof campaign recorded a literal git ls-files sweep of:

- 1,320 / 1,320 tracked regular files
- 14,395,035 bytes
- 287,839 lines
- manifest digest 5cad2a5a8eb9336c52c4e8e741e666033c91ebec66cc64ed82bfba9cf5f45942

Current GitHub tree at this planning head also contains exactly 1,320 tracked blobs. The tree breaks down approximately as follows:

- 407 src files
- 232 tests
- 51 bin files
- 112 corpus fixtures
- 430 .agent files
- 30 docs files
- 10 OpenSpec files
- 14 UI files
- configuration and root files for the remaining paths

The validated implementation checkpoint of the predecessor was 3be590b1a7b4de8e1caccfeb4f1642da66f486ad. From that checkpoint to this planning head, only campaign closure / continuity documentation changed. No executable source changed after that validated implementation checkpoint. From predecessor start 54090566dad7ba3f65c9ffb2a398e4fcf1fad52b to current main, the executable delta is confined to the already-closed source-proof hardening files and their tests.

Therefore the predecessor's literal all-file audit remains the exhaustive executable-content baseline for this planning pass. The executor MUST still repeat a fresh local 1:1 tracked-file census before implementation because this is a new campaign and main can move.

## Current system map reviewed

### Source discovery and proof chain

The repository is already through Phase 28, read-only eligibility expansion, response-flow proof binding hardening, source-analysis runtime hardening, and source-proof soundness/static discovery hardening.

Current durable source facts remain:

- 128 operations
- 127 route proofs
- 127 request proofs
- 118 proven / 10 rejected joins
- 43 response-proof surfaces after the predecessor removed 40 unsound PHP proofs
- Phase 24 at 3 eligible / 125 excluded
- zero newly admitted static read-only family in the predecessor

Disposition: do not reopen source-proof expansion merely to raise counts. The predecessor explicitly found no safe new family.

### Campaign orchestration / checkpointing

The 2,074-line src/core/campaign/orchestrator.ts remains the largest authority-bearing runtime hotspot. Planner review covered version-drift handling, owner preflight, privacy/safety stop behavior, process interruption, reproduction/promotion stop mapping, dossier readback, checkpoint construction, and resume entry points.

No new concrete fail-open was established in this pass. The current safeErrorCode path collapses untrusted errors to bounded categorical codes. Version drift is rechecked before execution. Safety/privacy failures stop and checkpoint.

Disposition: no broad orchestrator refactor in this campaign. Any incidental issue discovered by the executor must be reproduced and triaged separately unless it directly breaks the artifact-validation/currentness contract below.

### Browser and network containment

The L0-L5 browser containment stack remains substantial and fail-closed:

- shared browser launch contract
- mandatory loopback proxy
- disabled QUIC
- disabled non-proxied WebRTC
- service/shared-worker blocking
- CDP Fetch guard
- background-networking / hints hardening
- proxy liveness checks and evidence

The safety model still explicitly documents unresolved browser-process DNS-prefetch / resolver activity and a future L6 process/network containment layer. The shared Chromium launch contract does not currently include a host-resolver-rules catch-all. Chromium documentation describes host-resolver-rules as a way to prevent direct browser DNS resolution when using a proxy.

Disposition: legitimate future campaign candidate, but not selected now. It is a known, explicitly documented residual and requires platform-specific empirical proof. The artifact-authority defect below is current, local, deterministic, and directly contradicts an existing strictness contract, so it has higher immediate value.

### Private artifact filesystem policy

src/core/policy/privateArtifacts.ts has strong owner-local boundaries: absolute external root, no symlink components, owner-only permissions, exclusive temporary creation, fsync/rename replacement, immutable-link path, and no-replace handling.

Control Center run/findings readers also use fixed roots, no-follow/symlink checks, size limits, stable descriptor reads, bounded records, privacy screening, and explicit partial-corruption states.

Disposition: retain these controls. The selected problem is the semantic/runtime validation of the JSON after safe file read, not path traversal.

## Selected findings

### F-01 — durable dossier validation is materially shallower than the facade contract

Planner severity candidate: HIGH evidence-integrity, mandatory reproduction before implementation.

The durable artifact facade says malformed or coherence-invalid data is rejected before it can contaminate later triage/promotion stages. For kind dossier, it delegates to:

- src/core/artifactValidation/dossierKindValidation.ts
- src/core/triage/dossier.ts validateBugDossier
- src/core/triage/dossierV2.ts parse/validateBugDossierV2

The runtime checks are incomplete relative to the typed dossier interfaces.

Examples visible in current code:

1. v1 validateBugDossier checks version/status, L4 exclusion, selected safety/privacy counters, optional semantic evidence, and sentinel absence. It does not recursively validate the full runtime shape of candidateId, timestamps, journeys, minimal sequence, reproduction, browser/API differential, sourceChangeCandidates, likelyFaultBoundary, confidence, severity, priority, alternatives/missing evidence, or other typed fields.
2. v2 validateBugDossierV2 checks root object/prototype, required top-level keys, a few nested-object prototypes, status/scope/safety/privacy, optional semantic objects, recipe action IDs, and sentinels. It likewise does not deeply validate many required nested values.
3. dossierKindValidation exact-keys the v1 root and then calls the typed validator; the cast does not create runtime safety.
4. The facade documentation repeatedly calls this a strict validation boundary.

The existing Phase 15P artifact-validation test matrix checks version dispatch, root unknown fields, scope, safety, and stub coherence, but does not contain a systematic nested-field mutation matrix for dossier v1/v2.

Required reproduction: start from producer-built valid v1/v2 dossiers, mutate one nested field at a time, and prove which malformed values currently return validateArtifact('dossier').valid === true. Record only reproduced false accepts as defects.

### F-02 — findings source-currentness aggregation is optimistic for mixed evidence

Planner severity candidate: HIGH operator-truth correctness, mandatory reproduction.

The same rule exists independently in:

- src/controlCenter/authorities/findingsAuthority.ts sourceCurrentness
- src/controlCenter/adapters/findingsAdapter.ts sourceCurrentness

Both do:

1. map sourceChangeCandidates to sourceFreshness
2. if ANY entry is SOURCE_CURRENT_LOCALLY or REMOTE_FRESHNESS_CONFIRMED, return CURRENT
3. else if ANY entry is LOCAL_TRACKING_REF_ONLY, return SOURCE_STALE
4. else return SOURCE_UNAVAILABLE

This makes CURRENT dominate stale or unknown evidence in a mixed list. A dossier containing one current candidate and one LOCAL_TRACKING_REF_ONLY candidate is projected CURRENT. A current + UNKNOWN mix is also projected CURRENT.

That is not conservative aggregation for an operator-facing whole-dossier currentness label.

Required reproduction:

- current + stale => current code returns CURRENT
- current + unknown => current code returns CURRENT
- stale only => SOURCE_STALE
- unknown only / empty => SOURCE_UNAVAILABLE
- all current classes => CURRENT

The corrected whole-dossier rule should be fail-closed. Unless owning semantics prove a more precise model, expected precedence is:

- any UNKNOWN => SOURCE_UNAVAILABLE
- otherwise any LOCAL_TRACKING_REF_ONLY => SOURCE_STALE
- otherwise a non-empty set containing only current freshness classes => CURRENT
- empty => SOURCE_UNAVAILABLE

The executor must verify whether source candidate relevance/confidence can independently make a CURRENT sourceFreshness misleading. Do not silently conflate relevance and freshness; if they are intentionally distinct, document that distinction and keep the public label semantically exact.

### F-03 — currentness derivation is duplicated across authority and adapter layers

Planner severity candidate: MEDIUM architecture / drift risk.

Control Center V2's durable design says existing domain authorities remain authoritative and the UI adds no second selector or proof authority. Yet raw dossier currentness is independently derived in findingsAuthority and findingsAdapter.

Even if both are repaired identically, duplicate authority logic is a future divergence vector.

Required outcome: one currentness authority. Prefer one of:

- authority produces sanitized FindingsDossierMetadata and adapter only projects metadata; or
- a single pure exported reducer owned at the authority/domain seam is consumed by both paths.

Do not create a third implementation.

### F-04 — shallow validation can turn downstream sanitizers into accidental schema authorities

Planner severity candidate: MEDIUM/HIGH depending on reproduction.

Control Center sanitizers are intentionally strong and field-by-field, but they are a web projection boundary, not the durable artifact schema authority. If validateArtifact accepts a malformed dossier and a later consumer happens to reject/null it, the durable facade contract is still broken. If a later consumer normalizes it into a plausible value, the defect becomes fail-open.

Required outcome: consumers may remain defensive, but malformed durable dossier data must be rejected at the dossier validator itself.

## Non-selected findings / deferred candidates

### D-01 — browser DNS resolver / future L6 containment

Real documented residual. Candidate follow-up after this campaign. Do not fold Docker, root firewalling, or network namespaces into the selected task without separate authorization.

### D-02 — source-proof coverage expansion

Rejected for this campaign. The immediately preceding campaign completed this area and found no safe new family. Do not manufacture coverage.

### D-03 — broad campaign-orchestrator decomposition

Not selected. Size alone is not a defect. Refactor only with a reproduced correctness or maintainability failure and a separate plan.

### D-04 — GitHub Actions zero-step billing/platform block

Known external condition. Do not churn workflow logic to make a no-runner result look green.

## Campaign objective selected

Restore the invariant:

A durable dossier is either deeply valid under its accepted historical schema or rejected before any authority/adapter consumes it; and a Control Center finding can never claim stronger source currentness than every source-currentness fact required by that dossier supports.

The campaign also performs a bounded mutation audit of the rest of the durable-artifact facade so another obvious typed-cast false-accept is not left adjacent to the repaired dossier path.

## Planner stop condition

Planning ends after this OpenSpec + execution handoff is committed. No source implementation belongs in the planner commit.
