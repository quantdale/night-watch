## Context

Project-state v2 previously allowed a COMPLETE active task to project
`PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`. That token means implementation and
local/clean certification succeeded. It does not mean Nightwatch has completed
its intended real DEV workflow.

## Goals / Non-Goals

**Goals:**

- Keep historical local-clean complete valid for COMPLETE tasks.
- Require
  `IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING` (or `IN_PROGRESS`)
  while the operational-acceptance task is IN_PROGRESS.
- Allow later operational terminals only with matching active-task status.
- Exercise real DEV only through existing serial launchers.

**Non-Goals:**

- Weakening fail-closed safety or existing mismatch rules.
- Treating CI non-evidence as CI certification.
- Manufacturing a real defect.

## Decisions

Pairing is table-driven in `bin/project-state-check.mjs` via
`COMPLETION_BY_ACTIVE_STATUS`. Tests drive the real checker on fixtures.

## Risks / Trade-offs

Human-led auth capture cannot be automated. Stale auth or DEV unavailability
must produce `OPERATIONAL_ACCEPTANCE_BLOCKED`, not a fabricated pass.
