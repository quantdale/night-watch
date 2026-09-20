# L6 qualification proof integrity proposal

## Purpose

Convert NW-AUD-017 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No containment/runtime implementation, browser or OOPS launch, or external network.

## Safety Constraints

LOCAL / READ-ONLY source evidence; planning writes only.

## Architecture / Approach

Use a closed witnessed-probe manifest with positive controls, exact executable/policy identity, an opaque qualification generation consumed at launch, and production-inaccessible synthetic constructors.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: Node/browser probes, decision predicates, runtime launch, tests, and child-process proposal boundaries inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/runtime execution not in scope.

## Validation Strategy

openspec validate nightwatch-l6-qualification-proof-integrity-v1 --strict.

## Decision Log

- 2026-09-20 — Absence of traffic at an untargeted observer is not denial proof.
- 2026-09-20 — Qualification must authorize the exact later runtime, not just a version label.

## Discoveries

- result.udp is produced but never read by directDenied.
- Browser TCP/UDP listener endpoints never enter the Chrome stimulus.
- makeReadyL6Capability is a public constant-only READY constructor.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no contained/authenticated runtime action.
