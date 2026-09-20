# DEV credential use binding proposal

## Purpose

Convert NW-AUD-021 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No login/runtime implementation or real secret use.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Bind a non-forgeable one-shot capability to exact live document/form/source/proxy identity and revalidate at every credential-bearing effect.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: provider, preflight, login helper, token exchange, tests, and existing auth changes inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/credential use not in scope.

## Validation Strategy

openspec validate nightwatch-dev-credential-use-binding-v1 --strict.

## Decision Log

- 2026-09-20 — Generic selectors and an earlier URL check do not authorize secret use.
- 2026-09-20 — Any partial-use failure destroys the page capability and is non-retryable.

## Discoveries

- Provider ordering is good but the returned locators are not bound to the document generation during use.
- Later expected token-exchange validation detects a bad flow only after credentials may have been exposed.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no credential use.
