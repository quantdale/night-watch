# Nightwatch Operational Acceptance

## Purpose

Prove or truthfully fail real DEV operational acceptance for Nightwatch, after
cleaning the Git topology and reclassifying local/clean certification as
non-operational.

## Starting State

- Task ID: `nightwatch-operational-acceptance-v1`
- Starting Nightwatch SHA: `a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd`
- Predecessor: `nightwatch-final-completion-and-l6-containment-v1` COMPLETE
  with historical `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`
- Relevant architecture: real launchers `bin/phase2c-real.mjs`,
  `bin/phase4-real.mjs`, `bin/phase5-real.mjs`, `bin/phase7-real.mjs`;
  project-state v2; continuity v2; owner-scope freeze
- Established facts that must not be rediscovered: L6 local proof, 2,604
  synthetic tests, and local/clean certification are historical; they do not
  prove operational acceptance

## Scope

Git topology cleanup; successor task and truthful project-state mapping;
preflight local/clean gates; serial real DEV owner workflow; owner UX and
adversarial fail-closed cases; one of four operational verdicts.

## Non-Goals

Production contact, DEV mutation, Alphaus writes, infrastructure/data-layer
ops, credential printing, manufacturing defects, weakening validators,
Phase 6 unfreeze, canonical promotion.

## Safety Constraints

DEV only. External storage-state. Owner-only findings. No secrets in Git.
Fail-closed safety stays. No force-push.

## Architecture / Approach

Keep four separable workstreams: (1) read-only Git inventory then deletions
only after redundancy proof; (2) successor task plus status-mapping tests
before live docs change; (3) local/clean preflight; (4) real DEV only through
existing serial launchers.

## Milestones

### M1 — Git topology cleanup — COMPLETE

- Objective: one canonical clone, local `main` only, remote `main` only.
- Files/areas: canonical Git refs, duplicate clones, plan branches.
- Implementation actions: fetch/prune, audit clones, prove redundancy, delete.
- Acceptance criteria: `git branch` is only `main`; `git ls-remote --heads origin`
  is only `refs/heads/main`.
- Validation commands: `git fetch --prune origin`; `git branch`; `git ls-remote --heads origin`
- Status: COMPLETE; rechecked immediately before deletion. Canonical parent
  contains only `nightwatch/.git`, local branches contain only `main`, and
  `origin` contains only `refs/heads/main`. The nine redundant isolated clones
  were moved to the desktop trash for recovery, and the 32 redundant swarm
  refs plus two historical remote `plan/*` refs were deleted with ordinary
  Git operations.

### M2 — Reclassify project truth — COMPLETE

- Objective: operational-acceptance pending without erasing local-clean history.
- Files/areas: `bin/project-state-check.mjs`, `tests/unit/projectState.test.ts`,
  `.agent/`, `docs/CURRENT_STATE.md`.
- Implementation actions: extend pairing map; add fixture tests; activate task.
- Acceptance criteria: agent/project checks pass; historical local-clean cannot
  be projected as operational completion while pending.
- Validation commands: `npx playwright test tests/unit/projectState.test.ts --project=nightwatch --workers=1 --retries=0`; `npm run agent:check`; `npm run project:check`
- Status: COMPLETE

### M3 — Local preflight — COMPLETE

- Objective: prove cleanup/docs did not damage the project.
- Validation commands: `npm run typecheck`; `npm run hardening:check`; `npm run agent:check`; `npm run project:check`; `npm run gate:local`; `npm run gate:clean`
- Status: COMPLETE

### M4 — Real DEV owner workflow — IN_PROGRESS

- Objective: serial phase2c/phase4/phase5/campaign prepare+resume against DEV.
- Status: IN_PROGRESS; 2026-08-30 20:00 human capture is page-valid until 2026-08-31. Phase2c/phase5/campaign previously passed; phase4 exposed four selector defects and one response-oracle race, repaired through `e8f071f` and interrupted mid-rerun. Now resuming serial workflow from current HEAD.

### M5 — UX, second run, efficacy, adversarial — IN_PROGRESS

- Objective: owner UX, resume after persisted state, fail-closed cases, verdict.
- Status: IN_PROGRESS; local owner/resume/adversarial evidence passed; real second-run and efficacy now executable with valid auth and repaired oracles.

### M6 — Final report and topology close — IN_PROGRESS

- Objective: sanitized report, one of four verdicts, push without force.
- Status: IN_PROGRESS; topology already `main`-only locally and remotely; report and CURRENT_STATE will be finalized after the serial DEV rerun earns its verdict.

## Validation Strategy

Project-state fixture tests drive the real checker. Continuity v2 and
project-state v2 must pass. Real DEV evidence outranks local certification.
Repair implementation defects with regressions and re-run the affected real path.

## Decision Log

- 2026-08-29 — Decision: add operational-acceptance completion tokens to
  project-state v2 without removing historical local-clean; reason: COMPLETE
  identity mapping would let an in-progress task keep projecting
  `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` only if we left ACTIVE complete,
  which this campaign forbids; evidence: checker pairing tests 29–37;
  consequence: pending status is
  `IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING`.
- 2026-08-30 — Verdict: select `OPERATIONAL_ACCEPTANCE_BLOCKED`; reason:
  phase2c, phase4, phase5, and campaign prepare all failed closed at the
  human-owned DEV auth boundary, repeated verified waits produced no capture,
  and no browser/product/API executor ran. The task may be resumed only after
  a fresh human-authenticated audit.

## Discoveries

- Canonical HEAD `a17c6ae` matches `origin/main`. Many local swarm branches and
  isolated clones exist; unique files are already on `main`. Remote `plan/*`
  branches are historical planning docs only.
- The first cleanup pass did not delete unmerged refs or clones; current
  redundancy evidence is retained in the task state and must be rechecked
  immediately before each ordinary deletion.
- Current DEV attempts on 2026-08-30 supersede the historical valid-auth
  snapshot: phase2c stopped before browser context, and phase4/phase5/campaign
  prepare stopped in guarded auth replacement. No product or API work ran.
- Local owner/resume/adversarial evidence remains green: 47 launcher/auth
  boundary tests, 39 owner/checkpoint/resume tests, and 17 integrated triage
  and release-resume tests passed.
- Topology cleanup completed after an immediate redundancy recheck; only the
  human-owned auth refresh remains on the critical operational path.

## Deferred Work

- Complete Git topology deletion of unmerged swarm branches, remote plan
  heads, and proven-redundant isolated clones once ordinary Git deletion is
  permitted.

## Completion Criteria

One of the four operational verdicts is recorded with sanitized evidence,
validators pass without weakening, canonical `main` is the sole branch, and
no secrets or raw findings are tracked.
