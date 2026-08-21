# Session 3 — Local Autonomous Operations & Developer Tooling Completion

Authorization required: PHASE_15_S3_LOCAL_OPERATIONS_COMPLETION_LOCAL_ONLY
Precondition: Session 2 terminal marker and handoff are present on live main.

## Objective

Make the completed local/source architecture operable through coherent, deterministic, private local tooling instead of phase-specific manual fragments. This session improves local orchestration and inspection only; it grants no product-environment execution authority.

## Required implementation work

A. Unified local status/health command
- Add one read-only command/API that summarizes project state, active task, source-contract coverage, campaign contract versions, catalog integrity, current blockers, hardening readiness, and CI truth classification.
- Machine-readable JSON plus concise text rendering.
- Deterministic output for fixed Git/source inputs; no timestamps in identity-bearing data.

B. Local planning/dry-run command
- Build a deterministic dry-run planner for a hypothetical campaign using only existing approved journeys/actions/API operations and synthetic/local fixtures.
- It may show selected work items, budget projection, required contract versions, replay/minimization capability, and expected blocked reasons.
- It MUST NOT create browser contexts, product requests, auth, network calls, or execution authority.

C. Contract/campaign readiness diagnostics
- Unify Phase-14 contract health with Phase-13 campaign readiness into a safe categorical readiness report.
- Distinguish READY_LOCAL_SYNTHETIC, BLOCKED_SOURCE, BLOCKED_VERSION, BLOCKED_AUTHORITY, BLOCKED_EXTERNAL_CI, NOT_APPLICABLE.
- Never call DEV/production readiness proven from local state.

D. Artifact and checkpoint validator tooling
- Provide explicit CLI/API validation for manifests, checkpoints, replay plans, semantic evidence, dossier v1/v2, source-contract reports, and hardening handoffs.
- Strict unknown-field and cross-field checks.
- Validation must be read-only and never repair artifacts silently.

E. Deterministic project snapshot manifest
- Add a private-safe project snapshot DTO covering Nightwatch Git SHA, version contracts, approved target IDs, source evidence digests, corpus counts, compatibility markers, and active task identity.
- Exclude secrets, auth paths, customer data, raw bodies, local absolute sensitive paths, and authenticated artifacts.
- Provide stable digest and comparison classification for two snapshots.

F. Local operator workflow convergence
- Reduce phase-specific command duplication by composing shared library APIs where safe.
- Add package scripts for the new status/readiness/validate/dry-run surfaces.
- Keep historical scripts working unless explicitly compatibility-only and all callers/tests are migrated.

G. Synthetic end-to-end operator rehearsal
- Add synthetic fixture flow: project snapshot -> readiness -> dry-run plan -> synthetic campaign outcome -> triage/dossier -> validation -> morning brief/status.
- No network/browser/auth.
- Repeat >=3 with zero mismatches, zero privacy leaks, zero safety violations.

## Testing cadence

Focused tests for each command/API and one moderate local-operations integration suite. Typecheck, hardening:check, campaign:synthetic, agent:check, project:check, diff-check. No full canonical/isolated regression and no real environment.

## Required terminal state

PHASE_15_S3_LOCAL_OPERATIONS_COMPLETION: IMPLEMENTED_FOCUSED_GREEN
PHASE_15_PROGRAM_STATE: SESSION_3_COMPLETE_SESSION_4_REQUIRED
NEXT ACTION: STOP

Append exact evidence and dependency-cone changes to Phase-15 HARDENING_HANDOFF.md. Push fast-forward only.