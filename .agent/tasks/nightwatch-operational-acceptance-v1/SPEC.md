# Nightwatch Operational Acceptance

## Task purpose

Determine whether the current Nightwatch system successfully performs its
intended owner workflow against the actual approved DEV target. Preserve the
historical `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` record as local/synthetic
certification only. Do not describe the project as completely finished until
a truthful operational verdict is earned.

## Established starting state

- Task ID: `nightwatch-operational-acceptance-v1`
- Phase: `OPERATIONAL_ACCEPTANCE_V1`
- Authorization class: `NIGHTWATCH_OPERATIONAL_ACCEPTANCE_V1`
- Starting SHA: `a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd`
- Predecessor: `nightwatch-final-completion-and-l6-containment-v1` (`COMPLETE`,
  historical `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`)
- Last validated implementation SHA at task start:
  `e278da19f5fbc62107528033716f271cbb64e1de`
- Continuity protocol: `nightwatch.agent-continuity.v2`

## Required deliverables

- A continuity-v2 successor task bound as the active campaign.
- Project-state reclassification to
  `IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING` (or a later
  truthful operational terminal) without weakening historical local-clean
  validity.
- Preflight of current local/clean gates as non-operational evidence.
- Serial real DEV execution of `journey:phase2c`, `explore:phase4`,
  `api:phase5`, and `campaign:real` prepare-then-resume.
- Owner UX, second-run/resume, fail-closed adversarial cases, and one
  truthful verdict from the four operational tokens.

## Explicit non-goals

Production contact, DEV mutation, Alphaus repository writes, infrastructure
or data-layer operations, credential automation, publishing findings,
copying storage-state into Git, manufacturing a real defect, weakening
fail-closed safety, unfreezing Phase 6, or treating synthetic test counts as
operational acceptance.

## Safety constraints

- DEV only (`appdev.alphaus.cloud` / `apidev.alphaus.cloud`).
- External storage-state remains outside the repository.
- Owner-only findings remain under `$HOME/.nightwatch/findings/`.
- No cookies, tokens, storage-state bytes, or raw findings in Git, task
  files, or GitHub.
- Existing L0–L6 containment and owner-scope freeze stay fail-closed.

## Acceptance criteria

- `npm run agent:check` and `npm run project:check` pass on the successor
  task.
- Historical `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` cannot be projected as
  operational completion while this task is pending.
- One of `OPERATIONALLY_ACCEPTED`,
  `REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN`,
  `OPERATIONAL_ACCEPTANCE_BLOCKED`, or `OPERATIONAL_ACCEPTANCE_FAILED` is
  selected with captured sanitized evidence.
- Canonical Git topology is a single `main` locally and remotely after
  cleanup.
