# PROPOSAL — Nightwatch Phase 13A — Real Campaign Semantic Runtime Integration & Contract Integrity

Task ID: `phase-13-real-campaign-semantic-runtime-integration`
Phase: `13A-REAL-CAMPAIGN-SEMANTIC-RUNTIME-INTEGRATION`
Status at publication: `NONE` — designed, not started, not authorized.
Starting source anchor: `c05e507c2bbab62651057c3ca883eb3dbd48f4b4`.

## Why this phase exists

Phase 9–11 built deterministic semantic expectations, deeper source-derived contracts, collection-wide evaluation, and real-source collection admission. Phase 12A then built a strict replay-plan DTO, synthetic replay adapters, semantic-aware categorical confidence, dossier v2, semantic cluster identity, current-source coverage inventory, and a permanent yield backtest.

The remaining bottleneck is no longer another isolated pure core. It is **integration into the real campaign architecture without executing DEV**.

Current source still proves several gaps:

1. `tests/manual/phase7-real-campaign.ts` assigns `invalidReducedReplay()` to journey, exploration, and API anomaly candidates. The real runtime path therefore cannot consume the Phase 12 replay machinery yet.
2. The Phase 7 campaign manifest/version fingerprint predates Phase 12 replay-plan, semantic-triage, dossier-v2, semantic-cluster, collection-admission, and collection-evaluation contracts. A future campaign could otherwise resume across material semantic-runtime changes without a sufficiently specific version identity.
3. Campaign candidates can carry Phase 9 `semanticFindings`, but the orchestrator still drives the historical triage/dossier-v1 path. The new Phase 12 semantic-triage evidence, categorical semantic confidence, dossier v2 readiness, and semantic cluster identity are not yet the real campaign's end-to-end evidence path.
4. The real campaign context does not currently establish a fresh remote source-derived semantic expectation bundle in the same fail-closed way used by the contained semantic canaries.
5. Three Phase 12 contract-integrity cases need permanent closure before runtime binding:
   - replay-plan API single-action validation is not strict enough when `originalActionIds.length !== 1` but one retained action remains;
   - replay plans use action-ID arrays and therefore cannot unambiguously bind duplicate action occurrences carrying different occurrence context;
   - semantic triage evidence does not currently reject an incoherent `PARTIAL_COVERAGE` outcome/coverage-state combination.
6. Dossier v2's AI-ready projection currently receives the legacy generic confidence input even when semantic confidence is stricter. The sanitized downstream package must never present confidence stronger than the deterministic semantic confidence that gates the dossier.

## Selected architecture

`REAL_CAMPAIGN_SEMANTIC_RUNTIME_INTEGRATION`

Build one source-only integration layer that makes the existing real campaign *ready* to consume:

- current real-source collection expectations;
- semantic response receipts/findings;
- Phase 12 semantic triage evidence;
- strict occurrence-bound replay plans;
- bounded real replay adapters;
- semantic-aware clustering and dossier v2;
- frozen manifest/version identity for those contracts;
- fresh-source attestation before semantic authority is considered current.

Then prove the whole path with an end-to-end local shadow campaign using the actual integration modules and synthetic executors/fixtures.

## Productivity model

This is intentionally a broad task. It contains coordinated workstreams rather than a sequence of tiny closeouts:

A. Phase 12 contract-integrity hardening.
B. Current-source semantic campaign bundle and target mapping.
C. Real browser/journey semantic observer wiring.
D. Real replay-plan/executor binding for journey, exploration, and API candidates.
E. Campaign candidate/orchestrator/checkpoint/manifest evidence and version integration.
F. Dossier-v2, semantic confidence, cluster/dedup, and AI-ready coherence.
G. End-to-end shadow campaign + permanent integration backtest.
H. Hardening, canonical full regression, topology-correct isolated regression, continuity, and CI truth.

The task must not stop after one workstream if other independent authorized work remains possible.

## Authority model

The presence of these files in GitHub does **not** authorize implementation.

Implementation becomes authorized only when the owner pastes the short executor prompt carrying:

`PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION_LOCAL_ONLY`

That authority is local/source-only. It permits Nightwatch source/tests/docs/workflow changes required by this specification. It does not permit DEV, Phase 11B, a real Phase 12/13 campaign, NEXT, production, mutations, DB/data-plane, infrastructure/Phase 6, Alphaus writes, AI/model execution or authority, self-development/promotion/catalog mutation, publication, or new endpoint/target authority.

## Relationship to external CI

GitHub Actions is currently externally blocked by the documented billing/spending-limit condition. That must not waste local engineering time.

Phase 13A must execute every authorized local/source workstream and every local/full/isolated validation first. If Actions still refuses to start jobs afterward, the truthful terminal state is `BLOCKED_EXTERNAL_CI`, with local implementation evidence complete and no CI-success claim.

## Future DEV

No DEV is part of Phase 13A.

A future contained acceptance may be designed as Phase 13B only after:

- Phase 13A local implementation is complete;
- exact CI is green on the source-bearing checkpoint;
- source freshness is re-established at runtime;
- the owner separately authorizes the contained DEV execution.

Phase 13B must be a bounded canary, not an overnight autonomous campaign by default.
