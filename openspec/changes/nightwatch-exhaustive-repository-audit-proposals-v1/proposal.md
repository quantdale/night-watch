## Why

Nightwatch has accumulated a large safety-critical TypeScript/Playwright codebase, extensive historical task state, and overlapping active OpenSpec programmes. A surface-level review cannot establish that unresolved defects, boundary bypasses, reliability gaps, architectural debt, and missing validation are either captured or consciously dismissed, so the repository needs one evidence-backed whole-tree audit and a deduplicated remediation portfolio before further implementation is authorized.

## What Changes

- Establish a complete, machine-checkable audit coverage model for every tracked repository area: runtime source, browser and API paths, safety policy and containment, evidence and persistence, semantic/source intelligence, campaign/runtime logic, Control Center, CLI/tooling, configuration, dependencies, tests, continuity, OpenSpec, and durable documentation.
- Require an evidence ledger that distinguishes confirmed issues, risks, missing validation, already-planned work, false positives, and explicitly deferred uncertainty.
- Rank confirmed issues by severity, impact, reachability, likelihood, and safety/privacy consequence instead of relying on file-count or intuition.
- Partition every material unresolved issue into a coherent implementation-ready OpenSpec change with proposal, design, delta specifications, tasks, and explicit positive/negative acceptance criteria.
- Cross-reference existing specs and changes so the portfolio closes real gaps without duplicating or silently superseding active work.
- Add a completion audit proving that every covered area and every material finding has a final disposition, all generated changes validate strictly, and no product implementation was modified during exploration.

## Capabilities

### New Capabilities

- `exhaustive-audit-coverage`: Defines whole-repository coverage, evidence quality, severity, deduplication, and disposition requirements for a planning-only Nightwatch audit.
- `remediation-proposal-portfolio`: Defines how material audit findings become coherent, complete, dependency-aware, strictly validated OpenSpec remediation changes.

### Modified Capabilities

None. This planning campaign does not change an existing product requirement; any product requirement changes discovered by the audit will live in their own remediation changes.

## Impact

- Adds planning and continuity artifacts only under `.agent/tasks/nightwatch-exhaustive-repository-audit-proposals-v1/`, `.agent/ACTIVE_TASK.md`, and `openspec/changes/`.
- Reads all tracked Nightwatch source, tests, tooling, configuration, history, specs, and documentation; it does not contact Alphaus environments or mutate sibling repositories.
- Produces a prioritized set of future implementation changes but does not alter runtime code, tests, dependencies, generated product artifacts, or release behavior.
