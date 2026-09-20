# Configuration layer authority integrity proposal

## Purpose

Convert NW-AUD-012 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no implementation authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No runtime/config/file behavior change, secret handling, or external action.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Strictly admit inputs once, construct a provenance-bound immutable snapshot,
use it for rendering and execution, bind child keys to the declaration, and
prove cross-process coherence non-vacuously.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: parser, launcher, child builder, tests, and prior owner spec inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-configuration-layer-authority-integrity-v1 --strict`.

## Decision Log

- 2026-09-20 — One admitted snapshot is the authority for validation, rendering, and execution.
- 2026-09-20 — Optional absence remains allowed; unreadable/malformed input does not collapse to absence.

## Discoveries

- Config output can claim `ENV_FILE` for a value no child/runtime consumes.
- Unknown names present only in `.env` are filtered out before reporting.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
