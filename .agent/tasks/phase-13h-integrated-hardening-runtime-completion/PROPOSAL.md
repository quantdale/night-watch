# PROPOSAL — Nightwatch Phase 13H — Integrated Hardening & Runtime Completion

Task ID: `phase-13h-integrated-hardening-runtime-completion`
Phase: `13H-INTEGRATED-HARDENING-RUNTIME-COMPLETION`
Status at publication: `NONE` — designed, not started, not authorized.
Starting source anchor: `ae0f9ca706b6af4ca879873f8cd9b0ecada40251`.

## Why this task exists

The Phase 13 overnight batch intentionally optimized for implementation volume and explicitly deferred hardening. C1, C2, and C3 are therefore implementation candidates, not verified architecture.

Independent source review after the overnight batch found several load-bearing gaps that must be resolved before Phase 13 can be called locally complete:

1. The campaign orchestrator still clusters all observations through historical `clusterAnomalies()` and promotes findings through historical `triageAnomaly()` / `BugDossier` v1. The Phase 12 semantic cluster, semantic triage evidence, categorical semantic confidence, dossier-v2 readiness, and v2 readback path are not yet the live semantic-candidate branch.
2. The C3 replay helpers in `tests/manual/phase7-real-campaign.ts` validate sequence shape and then return a synthetic `FAILURE` carrying the original fingerprint. That is structural simulation, not replay execution. A future real campaign must never certify reproduction or minimization from validation alone.
3. Exploration/API C3 replay helpers do not actually consume the v2 occurrence-bound replay-plan as the runtime control object; duplicate occurrence identity can therefore be lost at the real adapter seam even though C1 introduced v2.
4. `SemanticCampaignBundle` validates each field and hashes the whole object, but current source does not enforce top-level target/expectation identity == `approvedMapping` target/expectation identity. Internally contradictory but self-consistent bundles can therefore be constructed.
5. One Phase 12 stale-source test now conflicts with the stricter C1 source-currentness/receipt truth table. Hardening must decide from the receipt semantics whether the fixture is invalid or whether the validator is too strict. Do not weaken currentness merely to make the old test pass.
6. Continuity validation currently reports PLAN-structure errors. Those must be repaired as part of closure, not dismissed as template noise.

## Selected architecture

`PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION`

Treat C1+C2+C3 as one integrated surface. First finish the missing runtime wiring and eliminate false-certification paths. Then execute the full hardening campaign that the overnight amendment deliberately deferred.

## Authority model

Publishing this package does not authorize execution.

Implementation/hardening starts only when the owner supplies:

`PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`

This is still local/source-only. It permits Nightwatch source/tests/docs/workflow edits required to repair and validate Phase 13. It does not permit DEV, a real campaign, NEXT, production, product mutation, DB/data-plane, infrastructure/Phase 6, Alphaus sibling writes, AI/model execution or authority, selfDev/promotion/catalog mutation, publication, or new endpoint/target authority.

## Completion standard

Phase 13H may close locally only when:

- no replay path can claim reproduction without an actual executor result;
- semantic candidates use semantic identity/triage/dossier-v2 while protocol-only candidates preserve historical behavior;
- replay v2 occurrence identity is load-bearing at the adapter boundary;
- bundle identity is cross-field coherent and fail-closed;
- stale/partial/unavailable evidence remains truthful;
- all required focused, shadow, hardening, compatibility, canonical-full, and isolated-full regressions pass;
- current-source canary is fresh and read-only;
- continuity is clean;
- GitHub Actions truth is recorded exactly.

If Actions remains externally billing-blocked before jobs start, the task may end `BLOCKED_EXTERNAL_CI` only after all local/source acceptance is genuinely green.

Phase 13B remains separately authorized and cannot run here.