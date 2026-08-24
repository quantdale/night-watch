# Task State

## Identity

Task ID: phase-22-contained-dev-semantic-calibration
Phase: 22-CONTAINED-DEV-SEMANTIC-CALIBRATION
Title: Nightwatch Phase 22 — Contained DEV Semantic Reality Calibration and Bounded Real-Campaign Acceptance
Authorization class: PHASE_22_CONTAINED_DEV_SEMANTIC_REALITY_CALIBRATION_ONLY
Status: IN_PROGRESS
Starting SHA: c06ecd0183c9f6b25297f8f830d7e00e2fe0578c
Last validated implementation SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
Last substantive checkpoint SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: c06ecd0183c9f6b25297f8f830d7e00e2fe0578c
LAST_VALIDATED_IMPLEMENTATION_SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

PHASE_22_STATUS: IN_PROGRESS
PHASE_21_STATUS: COMPLETE
PHASE_20_STATUS: COMPLETE
PHASE_19_STATUS: COMPLETE
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED

## Objective

Build a truthful, fail-closed bridge from current mechanically proven real
source through a frozen metadata-only acceptance manifest into at most six
read-only DEV targets, with category-only projections, one FIRST and optional
fresh-context replay per target, and calibrated confidence/dossier evidence.

## Current Milestone

M6 — mandatory local validation, manifest freeze, and final pre-DEV gates.

## Work In Progress

M1–M5 implementation is complete and locally focused-validated. The Phase 22
launcher has not contacted DEV; the next work is the mandatory local gate
cone, final manifest freeze, and executable pre-DEV decision.

## Exact Next Action

Commit the validated Phase 22 implementation, rerun the canonical suite from
that clean checkpoint, then regenerate/freeze the final manifest from a fresh
exact source snapshot and complete the final pre-DEV gates. Do not contact DEV
before all M6 gates pass.

## Completed Milestones

- Bootstrap Git inspection: PASS — branch `main`, clean worktree, and
  `HEAD == origin/main == c06ecd0183c9f6b25297f8f830d7e00e2fe0578c`.
- Historical review: Phase 21 complete records, Phase 9B/R1, Phase 10B,
  Phase 11A and relevant 11A.x records read. Phase 19–21 history remains
  untouched.
- `npm run agent:check`: PASS with the repository's existing checkpoint and
  legacy-history warnings; strict errors 0.
- M1 source re-derivation: PASS — remote master
  `mobingilabs/ripple-api@85e400a8b32fc23c05464033a2a6d5fff2a2890c`, disposable
  snapshot clean, four historical and four collection derivations with zero
  failures. Eligibility inventory: three DEV-admitted collection targets,
  one real-source target without runtime binding, and two synthetic-only
  approved targets.
- M2–M5 focused implementation: PASS — immutable six-target/twelve-context
  manifest bound to safe source/evidence identities; explicit Preflight V2
  facts; runtime privacy firewall receipts; replay V4/minimization policy;
  collection/membership/differential classifications; real confidence,
  Dossier V6, operator commands, and synthetic dry run.
- Focused validation: PASS — `npm run typecheck`; `npm run hardening:check`;
  `npx playwright test tests/unit/phase22Core.test.ts --project=nightwatch
  --workers=1` (7/7); `git diff --check`.
- Mandatory local cone: PASS — `npm run campaign:synthetic` (27/27),
  `npm run test:owner-provenance` (91/91), and `npm run agent:check` (strict
  errors 0; expected stale-baseline and legacy-history warnings).
- Canonical suite pre-check: 2,334 passed and 4 skipped, but 2 existing
  self-development CLI cases failed with `SELFDEV_AUTHORITATIVE_SOURCE_DIRTY`
  because this implementation was uncommitted. The suite must be rerun from
  the clean implementation checkpoint; this is not treated as a Phase 22
  implementation failure.

## Files Changed

- `.agent/ACTIVE_TASK.md`
- `.agent/tasks/phase-22-contained-dev-semantic-calibration/{SPEC,PLAN,STATE,ACCEPTANCE_MATRIX,REPORT,HANDOFF}.md`
- additive Phase 22 core/runtime/launcher/config/test files and package scripts

## Validation Ledger

- Bootstrap Git inspection: PASS — clean `main`, exact requested SHA, and
  `HEAD == origin/main`.
- Historical authority review: PASS — required contained-DEV precedents read;
  no external product systems contacted.
- M1–M5 local implementation validation: PASS — focused checks above; no
  DEV/NEXT/production contact.
- M6 pre-check: PASS for typecheck, hardening, focused Phase 22 tests,
  synthetic campaign, owner provenance, and continuity; canonical rerun is
  pending the clean implementation checkpoint.

## Scope boundary

Local/source/synthetic implementation and validation are authorized throughout.
The single DEV campaign is conditional on M6 and all executable gates. No
NEXT/production, mutation, DB/datastore, cloud/infra, sibling writes,
publication, AI, self-development, unbounded discovery, credentials, raw
authenticated evidence, screenshots, traces, DOM/raw-body persistence, or
storage-state copying is authorized.

## Decisions Made During This Task

- Use a fresh successor task; do not reopen Phase 19, Phase 20, or Phase 21.
- Freeze all real target identities before DEV contact; live selectors cannot
  expand the manifest.
- Treat current source and executable safety gates as stronger than prose.

## Discoveries

- Phase 9B-R1 and Phase 10B provide historical real common-exchange evidence,
  but their fixed single-target runners are not Phase 22's bounded campaign.
- Phase 11A.3 collection expectations are current-source-capable locally but
  need a new manifest-bound runtime admission layer.
- Fresh source discovery: `mobingilabs/ripple-api@85e400a8b32fc23c05464033a2a6d5fff2a2890c`
  was resolved read-only and verified in a clean disposable detached snapshot.
  Four collection expectations re-derived with zero failures; three current
  runtime bindings are eligible. No real membership contract or proven real
  second differential surface is admitted.

## Blockers

None. The standing exact-green implementation-CI requirement remains an M6
pre-DEV gate; no DEV contact has occurred.

## Safety Events

NONE — local implementation and read-only source inspection only; no DEV,
NEXT, production, mutation, sibling write, database, infra, or publication
event occurred.

## Deferred / Follow-Up

Contracts without current source proof, runtime binding, privacy-safe
projection, replay support, or explicit authority remain uneligible. Any
anomaly requiring expansion is deferred to a separately authorized task.

## Resume Recipe

Read ACTIVE_TASK.md, then this task's SPEC.md, PLAN.md, and STATE.md. Inspect
Git status/diff and run the smallest decisive validation. Continue with the
exact next action; no DEV before M6.

## Completion Snapshot

IN_PROGRESS. M1–M5 implementation is locally validated but not yet committed;
M6 mandatory validation, final source refresh, manifest freeze, and the
pre-DEV CI/auth/containment decision remain.
