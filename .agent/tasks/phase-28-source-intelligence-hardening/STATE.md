# Task State

## Identity

Task ID: phase-28-source-intelligence-hardening
Phase: 28-EVIDENCE-DRIVEN-SOURCE-INTELLIGENCE-HARDENING
Title: Nightwatch Phase 28 — Evidence-Driven Source-Intelligence Hardening and Exact Producer-Flow Expansion
Authorization class: PHASE_28_EVIDENCE_DRIVEN_SOURCE_INTELLIGENCE_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
Status: IN_PROGRESS
Starting SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
Last validated implementation SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
Last substantive checkpoint SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
LAST_VALIDATED_IMPLEMENTATION_SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

PHASE_28_STATUS: IN_PROGRESS
PHASE_27_STATUS: COMPLETE_LOCAL_SOURCE_SYNTHETIC (historical, unchanged)
PHASE_26_STATUS: COMPLETE_LOCAL_SOURCE_EXPANSION (historical, unchanged)
PHASE_25_STATUS: COMPLETE_LOCAL_SOURCE_EXPANSION (historical, unchanged)
PHASE_24_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI (historical, unchanged)
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED

## Objective

Make approved-source intelligence more precise and resilient while admitting
only exact current mechanically proven coverage. Produce a safe rejection-gap
taxonomy, preserve currentness/cache fail-closed behavior, harden PHP lexical
and resolver budgets, integrate operator observability, and certify the full
local/source/synthetic validation cone.

## Current Milestone

M6 — source graph, review/operator, Phase 24, and quality-gate integration.

## Work In Progress

The fresh census and producer admission gate are closed for the current
snapshot: zero strict direct-literal local producer examples were found.
Taxonomy, precise flow diagnostics, source/token/index/branch budgets,
cache/currentness invalidation, deterministic taxonomy deltas, and performance
proxies are focused-green. The operator and quality-gate seams are integrated;
the next unit is durable documentation and full certification. No raw sibling
source or runtime value has been persisted.

## Exact Next Action

Run the `source-gaps` and `surfaces` operator projections, confirm their safe
summaries and measured structural metrics, then update current
architecture/project-state documentation without rewriting historical Phase
25–27 records.

## Completed Milestones

- M0 — read AGENTS.md and all required durable/Phase 27 records; confirmed the
  canonical repository, branch, clean worktree, fetch/prune, and synchronized
  live Git state.
- M1 — ran fresh `source-scan` and `surfaces` through the existing confined
  read-only source boundary; reproduced the six-repository inventory, surface,
  lifecycle, Phase 24, flow, and digest baselines recorded in PLAN.md. Ran a
  bounded ephemeral PHP producer census; no strict candidate passed admission.
- M2 — fixed bounded rejection-family vocabulary and deterministic source-gap
  taxonomy over sanitized inventory/surface DTOs; added operator `source-gaps`
  output and privacy-safe aggregate tests.
- M3 — preserved categorical response-flow rejection reasons at the surface
  boundary and removed the generic flow `UNSUPPORTED_SYNTAX` collapse; added
  precise proof-gap and taxonomy assertions.
- M4 — added source-byte, tokenizer, return-site, declaration-index, and
  per-flow declaration budgets; split budget rejection reasons and added
  pathological synthetic fixtures. Focused Phase 25/26/27/28 run: 15/15.
- M5 — extended cache identity with taxonomy version, preserved same-SHA
  dependency invalidation, added stale-content and reversed-input taxonomy
  tests, and added bounded before/after taxonomy deltas. Relevant Phase
  25/26/27/28 regression run: 22/22; synthetic campaign after the complete
  Phase 28 suite: 49/49.

## Files Changed

`.agent/ACTIVE_TASK.md`, the four Phase 28 continuity files, source taxonomy,
surface diagnostics, response-flow budgets, tokenizer bounds, cache identity,
CLI/operator output, quality-gate inventory, package scripts, Phase 28 focused
tests, performance metrics, and taxonomy-delta integration. Raw sibling source
is not present in any changed artifact.

## Decisions Made During This Task

`LOCAL_PRODUCER_ALIAS_FLOW` is not admitted for the current source snapshot;
Phase 28 is hardening-first. Rejected flow diagnostics must preserve the
resolver's categorical reason as the primary safe rejection category. Budget
exhaustion is represented by separate bounded categories for source bytes,
declaration indexing, return-site population, and resolved declaration count;
none is converted into proof.
Taxonomy output is schema v3 with explicit rejection-family and analyzer-
version dimensions, a 64-row per-dimension bound, and a versioned categorical
delta attached to the existing source invalidation report. Performance timing
is advisory and non-enumerable on the discovery DTO; the operator explicitly
projects it, so deterministic source evidence remains stable.

## Discoveries

Source snapshot: `srcsnapshot:sha256:04ff583971865f335902f5ad`.
Inventory: 6 current repositories; 1,732 files considered, 1,092 read, 1,078
admitted, 654 rejected, 12,449,877 bytes, 440 directories, 2 budget
rejections, 0 path/symlink rejections.
Surface: 128 operations, 127 route/request proofs, 83 response contracts, 175
semantic observations, 118 proven joins, 10 rejected joins, 47 mutation
capable, 5 independently proven read-only, lifecycle 45/80/3, Phase 24
3/125.
Flow: 13 attempts, 0 proven, 13 rejected, 0 resolved calls, max depth 0;
9 dynamic dispatch, 3 unsupported helper syntax, 1 incomplete branch.
Producer categories: 34 literal/control-flow, 16 multiple assignment, 12 no
local assignment, 4 opaque assignment, 0 strict direct-literal candidates.
Phase 28 focused fixture matrix: 10/10 passed; combined synthetic campaign:
49/49 passed. Relevant Phase 25/26/27/28 regression run: 22/22 passed.
Typecheck, hardening check, quality-gate spec, and gate inventory passed after
the hardening slice; the authoritative full cone remains pending.

## Blockers

None.

## Safety Events

NONE — only local Git inspection, confined read-only sibling-source reads, and
synthetic analysis have occurred. Prohibited real-world operation counts remain
zero.

## Validation Ledger

- Bootstrap/fetch/prune: PASS — canonical `main`, clean worktree, local
  `HEAD == origin/main == 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9`.
- Required authority reads: PASS — AGENTS, CURRENT_STATE, SAFETY_MODEL,
  DECISIONS, ROADMAP, ARCHITECTURE, ACTIVE_TASK, and complete Phase 27
  SPEC/PLAN/STATE/REPORT.
- Fresh source scan: PASS — exact inventory and snapshot metrics above.
- Fresh surface projection: PASS — exact surface, flow, lifecycle, and
  Phase 24 metrics above.
- Producer admission census: PASS — bounded ephemeral structural census,
  zero strict candidates; no raw values retained.

## Deferred / Follow-Up

No new proof family is currently justified. Runtime/property/service chains,
dynamic dispatch, namespaces/imports, inheritance/traits/interfaces,
factories/resources/DTOs, opaque and branch-dependent producers, and generic
PHP data flow remain fail-closed exclusions.

## Resume Recipe

Read ACTIVE_TASK.md, this task's SPEC.md, PLAN.md, and STATE.md; inspect Git
status/diff; run the smallest decisive operator projection test; update this
STATE.md; continue the exact next action. Do not rerun broad source discovery
unless a milestone requires current-source evidence.

## Completion Snapshot

IN_PROGRESS — M0–M5 are closed and focused-green; M6–M9, full validation,
documentation, and Git closure remain.
