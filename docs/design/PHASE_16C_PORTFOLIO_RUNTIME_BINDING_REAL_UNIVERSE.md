# Phase 16C — Portfolio Runtime Binding & Real Approved Universe

## Context

Phase 16A added a deterministic local portfolio planner and inert DEV handoff. Phase 16H hardened that layer. Phase 16B then correctly failed closed before DEV because the handoff had no consumer in the existing real-campaign runtime, the authorization token had no runtime gate, the launcher had no plan input, fixture plans could select synthetic-only members, and abstract allocation units were not mapped into the real campaign budget model.

The missing feature is therefore not "make the handoff executable." The missing feature is a **safe admission and binding layer** that lets separately authorized runtime code consume an inert handoff while preserving the single existing Phase-7 execution architecture.

## Design principles

### 1. Handoff remains inert

`executable:false` stays true. A handoff is evidence + intent, never authority. A separate runtime authorization is supplied independently and checked immediately before portfolio admission and again before resume/executor use.

### 2. One runtime

Portfolio mode feeds the existing Phase-7 prepare/checkpoint/resume/orchestrator/executor chain. No second campaign engine, direct browser runner, alternate curl/API path, or bypass is allowed.

### 3. Real universe is derived, not invented

Runtime portfolio members come from current canonical Nightwatch journey/exploration/API runtime registries that are already read-only-approved. The builder must produce only identities that can mechanically bind to existing campaign work items. Synthetic Phase-16A fixtures remain local-test/demo data and cannot enter a real-universe manifest.

### 4. Portfolio narrows capability

Priority/allocation data decides which already-approved work receives budget. It cannot grant operation, endpoint, environment or mutation authority. Any budget translation must be monotone-restrictive relative to the existing fixed Phase-7 runtime profile.

### 5. Prepare freezes; resume verifies

Prepare is the sole point where plan/handoff/universe/binding/budget information becomes campaign state. Resume never replans silently. It verifies the exact frozen fingerprints plus current owner authorization before executor use. Material drift requires a new prepare.

### 6. Legacy path remains valid

The existing bounded non-portfolio Phase-7 flow remains available and semantically unchanged when no portfolio input is supplied. Portfolio metadata is additive and opt-in; legacy checkpoints are not retroactively invalidated.

## Intended composition

```text
canonical runtime registries
  -> real-approved-universe builder
  -> Phase-16A portfolio/scoring/allocation/manifest
  -> inert DevHandoffPackage
  + separate runtime authorization
  -> strict portfolio admission
  -> versioned restrictive budget mapping
  -> selected-member/runtime-work-item binding
  -> existing prepareCampaign
  -> frozen campaign manifest/checkpoint fingerprints
  -> existing resumeCampaign
  -> owner policy
  -> existing executor
```

## Failure model

The binding fails closed before executor-capable state for missing/wrong authorization, malformed/tampered plan/handoff, synthetic/unknown/ambiguous target, blocked/frozen member, stale/unavailable required evidence, budget expansion, mapping incompatibility, or version/fingerprint drift.

Failures use bounded categorical codes and never echo credentials, customer data, auth contents or arbitrary path/error strings.

## Testing model

Phase 16C itself is local/source/synthetic. It proves the entire composition through injected synthetic executors and deterministic fixtures, not DEV. A successor hardening campaign performs exhaustive cross-system regression. Only after that does a separately authorized contained DEV retry become eligible.

## Boundaries

Phase 6 remains frozen. Phase 11B/13B remain unauthorized. No production/NEXT, data plane, infrastructure, sibling writes, new target/endpoint authority, AI/model authority, self-development promotion or catalog mutation.
