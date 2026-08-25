# Response-Flow Proof-Binding Hardening Plan

Task ID: response-flow-proof-binding-hardening
Phase: RESPONSE-FLOW-PROOF-BINDING-HARDENING
Status: COMPLETE
Starting SHA: 27fe332644d5065942223fc11576e8ee97777258
Authorization class: `RESPONSE_FLOW_PROOF_BINDING_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY`
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close a demonstrated false-positive proof-admission defect in the existing
bounded response-flow resolver without expanding the approved source universe
or introducing a new source-intelligence family.

## Starting State

The Phase 28 implementation is green and terminal. The live approved-source
census is structurally identical to Phase 28, so no new source family clears
the admission gate. The selected campaign is the narrowest demonstrated
correctness hardening: exact declaration/call binding in the existing
response-flow resolver.

Baseline proof metrics are unchanged from Phase 28: 13 flow attempts, 0
proven, 13 rejected, 0 resolved calls, maximum depth 0; 128 operations, 127
route proofs, 127 request contracts, 83 response contracts, 175 semantic
observations, 118 proven joins, 10 rejected joins, lifecycle 45/80/3, and
Phase 24 128 considered / 3 eligible / 125 excluded.

## Candidate ranking

1. Exact response-flow binding hardening — selected. Two deterministic probes
   reproduced false-positive `PROVEN` results in an existing authoritative
   proof path.
2. New producer/alias or dispatch family — rejected. The fresh source census
   is unchanged and contains no admissible new family; current flow attempts
   remain dynamic/unsupported/incomplete.
3. Broad source-read TOCTOU or cache-schema redesign — deferred. These are
   possible future hardening concerns but were not the smallest reproduced
   defect, and would expand the change cone without current-source impact.

## Scope

The campaign is limited to exact declaration and call binding in
`src/core/source/responseFlow.ts`, its permanent synthetic regressions, the
response-flow analyzer identity, and directly affected documentation or
validation records.

## Non-Goals

No dynamic dispatch, namespace/import resolution, inheritance, traits,
interfaces, property or service chains, factories, resources, DTOs, broad PHP
data-flow analysis, source-read redesign, Phase 24 policy change, or runtime
execution is included.

## Safety Constraints

Use only local synthetic fixtures and the existing confined read-only source
boundary. Do not contact DEV/NEXT/production, read credentials or customer
data, modify sibling repositories, execute PHP, persist raw source or
payloads, publish findings, or grant any owner/runtime authority.

## Architecture / Approach

Add conservative internal declaration metadata for staticness, visibility,
namespace, unsupported class shape, relative path, and source binding. Require
same-class calls to remain in the originating file; require named static calls
to target a public, non-namespaced, supported static method; and bind every
accepted declaration to the operation source SHA. Bump the response-flow
identity so existing source-surface caches cannot reuse pre-hardening results.

## Milestones

- M0 — COMPLETE. Bootstrap, fetch/prune, required authority reads, fresh
  census, integrated audit, and two false-positive probes completed.
- M1 — COMPLETE. Freeze binding contract, select versioning strategy, and add
  adversarial cases before implementation.
- M2 — COMPLETE. Implemented resolver binding and validated the focused
  dependency cone (72/72).
- M3 — COMPLETE. Validated downstream identity/cache/graph/review/Phase 24 and
  operator seams; no authority or metric drift occurred.
- M4 — COMPLETE. Re-ran the current census and full adversarial/privacy/
  determinism matrix; canonical and topology-correct isolated suites matched.
- M5 — COMPLETE. Completed all local gates, durable docs, continuity closure,
  implementation checkpoint, and the synchronized Git handoff.

## Decision Log

- Bump the response-flow schema identity because admissibility semantics are
  changing; the source analyzer-set identity and cache key must consequently
  invalidate old flow results.
- Keep the existing supported positive forms. Add only exact path/source and
  declaration-modifier checks; conservative rejection is preferred to a
  broader resolver.
- Keep the public sanitized declaration shape stable where possible; internal
  modifier metadata is used only for bounded resolution decisions and remains
  represented by content-bound declaration identity.
- Preserve Phase 24 as the only portfolio authority and preserve all current
  source metrics unless a current source proof genuinely changes.

## Validation Strategy

Focused: `tests/unit/phase27ResponseFlow.test.ts`, Phase 28 source tests,
cache/invalidation/source-boundary tests, and new hardening cases.

Final: typecheck, hardening, quality-gate spec/inventory, semantic
compatibility, synthetic campaign, owner provenance, agent continuity/audit,
project check, local and clean gates, canonical and topology-correct isolated
Playwright, `git diff --check`, privacy scan, and live Git/remote equality.

## Discoveries

The fresh six-repository census is byte-for-byte and structurally identical to
Phase 28. The only admissible campaign found by the integrated audit is this
correctness hardening; it is not a new proof family.

## Deferred Work

No new proof family is admitted. Dynamic dispatch, namespace/import,
inheritance/traits/interfaces, property/service chains, factories/resources/
DTOs, opaque producers, branch-dependent producers, and generic PHP data flow
remain fail-closed. Source-read snapshot coherence and future cache-schema
version audit remain separate candidates requiring fresh evidence.

## Completion Criteria

All focused and full repository validation passes; adversarial regressions
cover the rejected bindings and preserve existing positives; affected metrics,
cache identity, privacy, safety, and continuity records are truthful; the
canonical remote is pushed without force and local `HEAD == origin/main` with
a clean worktree.

## Final result

The campaign closed at validated implementation checkpoint
`1570547db9069c2a19d4c42c3e27e496ff1b5f01`. It repaired two reproduced
false-positive response-flow admissions without adding a new proof family or
changing source coverage, Phase 24 authority, or owner scope. Canonical and
topology-correct isolated full suites both passed 2,443 tests with 16
understood environment-conditional skips and zero failures. External CI was
not run and is not claimed green. A future campaign must start with fresh
evidence rather than a preselected phase.
