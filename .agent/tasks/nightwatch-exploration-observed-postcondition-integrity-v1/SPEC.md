# Exploration observed postcondition integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-026 without executing an exploration campaign.

## Established starting state

- The real Ripple runtime merges `expectedStructuralDelta` into private state and returns it as observed delta.
- The engine compares that copied value back to the catalog expectation.
- Local-only actions and UI state are not independently postcondition-checked.
- The existing mismatch test substitutes a fake runtime and does not catch the real adapter defect.

## Required deliverables

Proposal, design, capability spec, implementation checklist, and completed planning continuity.

## Non-goals

No implementation, browser/campaign execution, target traffic, or action-surface expansion.

## Safety constraints

Planning and read-only current-source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
