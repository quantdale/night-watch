# Task State

## Identity

Task ID: nightwatch-production-privacy-firewall-c10-v1
Phase: PRODUCTION_PRIVACY_FIREWALL_C10_V1
Status: IN_PROGRESS
Starting SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
Branch: session/nightwatch-production-privacy-fi-5af2d530
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
LAST_VALIDATED_IMPLEMENTATION_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PRODUCTION_PRIVACY_FIREWALL_C10_V1_STATUS: IN_PROGRESS

## Objective

Make raw production/customer data structurally incapable of reaching persistent
Nightwatch artifacts: an allowlisted structural projection with no persistence
authority as the primary boundary, an independent persistence firewall as the
second, and the four around-the-boundary leakage paths (F-14 key names, F-16
request parameters, page console output, F-17 browser profile) closed, plus the
F-15 digest confusion and the F-18 Control Center exposure.

## Current Milestone

M0 — task records and the dedicated OpenSpec change carrying the Workstream A
persistence-cone audit.

## Completed Milestones

None yet.

## Verified Starting Facts

- `origin/main` = `a152889a71eec6c67d82b05e5984df6423fe88d4`, canonical
  checkout clean, single worktree at campaign start. Repository confirmed
  `quantdale/night-watch`.
- Predecessor `nightwatch-exact-head-ci-baseline-repair-v1` = COMPLETE, its
  validated implementation `b99ce4e61166e52b554dd6ac07b7678b433959da`.
- Session worktree `session/nightwatch-production-privacy-fi-5af2d530` claimed
  as `OWNED_SESSION`; `session:status` verdict PASS, all seven workspace groups
  PASS, `canonicalSafe=true`, `attention=0`.
- F-14 confirmed IN CODE: `src/oracles/projections/types.ts` `ProjectionField.name`
  holds the raw key literal; `serializer.ts:writeField` writes it into canonical
  bytes; `projectionDigest` hashes those bytes. The repository's only digest
  family therefore ingests unproven dynamic key literals — F-14 and F-15
  simultaneously.
- `identity.ts` tokens are encounter-order labels, not hashes, and the context
  refuses serialization. Sound foundation for ephemeral correlation.
- `src/browser/context.ts` uses `browser.newContext()` only; no
  `launchPersistentContext`, no `userDataDir`. F-17's verified finding holds.
- `findingsAuthority.ts:321` resolves the root internally;
  `createFindingsAuthorityForTests(root)` at line 327 accepts an arbitrary root
  — the named F-18 hole.

## Work In Progress

M0 — the task records are written and the dedicated OpenSpec change is written
and staged. Remaining in M0: satisfy `handoff:check` and `agent:check`, then
open M1/M2.

## Files Changed

- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — activated for C-10.
- `.agent/tasks/nightwatch-production-privacy-firewall-c10-v1/{SPEC,PLAN,STATE,REPORT}.md` — new.
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/{audit,proposal,design,tasks}.md`
  and `specs/production-privacy-firewall/spec.md` — new.

## Validation Ledger

| When | Command | Result |
|---|---|---|
| M0 | `node bin/nightwatch-session.mjs status` | PASS — `OWNED_SESSION`, all seven workspace groups PASS, `canonicalSafe=true`, `attention=0` |
| M0 | `git rev-parse origin/main` | `a152889a71eec6c67d82b05e5984df6423fe88d4` — matches the expected starting state |

## Decisions Made During This Task

- **D-C10-1** — additive versioned production projection rather than a v1
  rewrite; `ProjectionField.name` is load-bearing across Phase 9/9A.1/10/10A.
- **D-C10-2** — no durable value digest in the production persistence contract;
  the concept is removed rather than invented, and correlation is an ephemeral
  encounter token.
- **D-C10-3** — the tracked `design.md §6.2/§6.4` per-campaign salt is
  SUPERSEDED by independent-review F-15/MA-11/UA-11 and the supersession is
  recorded, not silently applied.
- **D-C10-4** — the key-vocabulary resolver is injected as a frozen value
  object, because its proof sources live behind filesystem loaders that would
  break projection-cone import isolation.

Full reasoning and evidence are in `PLAN.md` `## Decision Log`.

## Exact Next Action

Write the dedicated OpenSpec change
`openspec/changes/nightwatch-production-privacy-firewall-c10-v1/` with
`audit.md` (the Workstream A persistence-cone classification), `proposal.md`,
`design.md`, `tasks.md` and at least one `specs/*/spec.md`; `git add` it so it
is tracked; then run `npm run handoff:check` and `npm run agent:check`.

## Blockers

None.

## Safety Events

None.

## Discoveries

- **DISC-C10-1** — the repository's single digest family
  (`proj:sha256:`) is simultaneously the F-14 and F-15 defect: it is the
  structural comparison digest AND it ingests raw dynamic key literals.
- **DISC-C10-2** — `runRecorder` authenticated mode already suppresses
  screenshots and minimizes URLs, but it is a mode toggled by callers, not a
  production invariant; C-10 must not rely on it as the production boundary.

## Deferred / Follow-Up

None recorded yet.

## Resume Recipe

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-production-privacy-fi-5af2d530`
   and run `node bin/nightwatch-session.mjs status`; a non-`PASS` verdict is a
   stop condition.
2. Read `SPEC.md`, then `PLAN.md`, then this file; resume from
   `## Exact Next Action`.
3. Run the smallest decisive validation for the open milestone before adding
   new work: `npm run typecheck` and `npm run hardening:check`.

## Completion Snapshot

Not complete. This section is filled at campaign close with the substantive
implementation SHA, the exact-head GitHub Actions run and job, the local and
clean gate receipts, the complete regression totals, the C-10 suite totals, and
the persistence-audit, sentinel-corpus and import-isolation results.
