# Phase 24 Authority Lifecycle + Whole-Repository Hardening Plan

Task ID: phase24-authority-lifecycle-hardening
Phase: 24-AUTHORITY-LIFECYCLE-HARDENING
Status: IN_PROGRESS
Authorization class: PHASE_24_AUTHORITY_LIFECYCLE_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close reproduced authority-lifecycle defects, complete the planner-required
whole-repository hardening sweep, and leave a safe deterministic workspace
hygiene mechanism and clean canonical checkout.

## Starting State

Live `main` and `origin/main` are both `755cb2e611355011c9d249142b2c2bf4f112327a`.
The old response-flow task is terminal. A fresh approved source census is
current and matches the Phase 28 structural baseline. Initial continuity
preflight exposed one checker classification gap: the planning-only
`.agent/EXECUTION_PROMPT.md` checkpoint is not yet recognized as an approved
documentation path. Initial work begins by repairing that local continuity
false positive, then proceeds through the authority and repository audits.

## Scope

Phase 24 authority lifecycle/currentness/invalidation and its artifact graph;
all major Nightwatch subsystems and safety boundaries; local Git/worktree,
branch, generated-output, and hygiene behavior; deterministic local synthetic
validation only.

## Non-Goals

External environments, credentials, real product traffic, Alphaus writes,
cloud/datastore/infrastructure operations, canonical promotion, external
publication, raw source persistence, and destructive or ambiguous workspace
cleanup are excluded by owner policy.

## Safety Constraints

Preserve fail-closed behavior and Phase 24 sole authority. Source access is
only through the approved confined read-only tooling. No executor callback may
run for an unknown or owner-blocked operation. All output must be privacy-safe,
bounded, deterministic, and free of raw source and runtime values. Every
workspace cleanup action must be dry-run-first, explicitly classified, and
limited to clean reachable safe targets.

## Architecture / Approach

Audit from canonical identity and currentness outward: establish logical
candidate versus source-incarnation identity, make availability and snapshot
proof explicit and granular, preserve lossless transition reasons, and bind
every durable artifact/cache/triage selection to the exact authority version.
Use table-driven adversarial matrices and synthetic fixtures before changing
contracts. Then perform an independent whole-repository seam review and
implement only reproduced defects. Finally build hygiene status/apply around
safe target classification, receipts, dry-run defaults, and deterministic
plans without relying on broad Git cleanup commands.

## Milestones

- M0 — COMPLETE: bootstrap continuity-v2 task, fresh source census,
  workspace inventory, and repair the planning-checkpoint classification gap.
- M1 — COMPLETE: Phase 24 authority/invalidation graph audit and adversarial
  reproduction matrix; five baseline failures reproduced, plus a stale review
  selection crossing case.
- M2 — COMPLETE: implement and validate reproduced Critical/High authority
  defects, including artifact/cache currentness binding; the full Phase 24–28
  and response-flow cone passed 102/102.
- M3 — IN_PROGRESS: whole-repository hardening audit and bounded repairs across
  all required audit classes.
- M4 — PENDING: implement and validate durable dry-run-first workspace hygiene;
  classify and safely reconcile only proven-clean reachable targets.
- M5 — PENDING: full validation ladder, source/provenance/privacy review,
  continuity closure, report, commit, push, and live Git equality.

## Validation Strategy

Run the narrowest relevant checks after each milestone, then the prompt ladder:
focused Phase 24/invalidation; Phase 25–28 and response-flow binding;
cache/currentness/provenance/portfolio/triage; Stage B tests; hygiene tests;
synthetic campaign; owner provenance; typecheck; hardening; agent check/audit;
project check; hygiene status; local and clean gates; canonical and isolated
full Playwright enumeration; and final Git/worktree hygiene. Record exact
counts, skips, failures, and safety scope in STATE and REPORT. Do not claim
external CI unless it actually executes for the live head.

## Decision Log

- M0 decision — treat `.agent/EXECUTION_PROMPT.md` as a planning/documentation
  checkpoint in continuity classification because the pulled commit is
  explicitly planning-only and contains no source, test, or config change.
- M1 decision — preserve stable logical candidate IDs unless evidence proves
  they conflate source incarnations; use a separate incarnation identity when
  needed rather than casually changing selection identity.
- M1 decision — omitted snapshot-match proof is not affirmative evidence; any
  uncertain source/currentness state fails closed and remains granular per
  repository where possible.
- M2 decision — version the invalidation ledger to v2 and require an explicit,
  sorted per-repository availability map; the old optional global boolean is
  not accepted as authority.
- M2 decision — preserve stable logical candidate IDs while carrying explicit
  prior/current IDs and source incarnations; candidate-decision digests bind
  replay plans and dossiers to the current Phase 24 decision without adding a
  second selector.
- M3 decision — no repair is accepted from an un-reproduced hypothesis; each
  finding must include a bounded synthetic regression and privacy review.

## Discoveries

- The six approved source snapshots and structural metrics exactly match the
  prior Phase 28 baseline.
- The initial worktree inventory contains 16 prunable missing `/tmp`
  registrations and unvalidated `swarm2/*` branch tips; all are preserved
  pending ancestry, cleanliness, and owner-work inspection.
- `npm run agent:check` currently reports a stale implementation baseline only
  because the planning-only execution prompt path is outside its checkpoint
  allowlist; this is the first local hardening target.

## Deferred Work

Any cloud, datastore, production, external publication, real campaign,
contained-DEV semantic acceptance, or canonical promotion remains owner-
blocked. Ambiguous/dirty/unmerged worktrees and branches remain preserved and
must be reported rather than deleted. New source-proof families remain
deferred unless the fresh local census and bounded analyzer establish them.

## Completion Criteria

All three mandatory stages are complete; every reproduced Critical/High
defect is repaired or explicitly blocked with a concrete reason; durable
contracts are versioned and adversarially tested; hygiene is dry-run-first and
safe; the full local validation ladder passes with exact results; no privacy or
safety violation occurred; task records are terminal and synchronized; and
local `HEAD == origin/main` with a clean worktree after a non-forced push.
