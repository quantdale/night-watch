# Nightwatch Post-Phase-10 — Next Bug-Hunting Architecture Design Review

## Purpose

Recompute the post-Phase-10 useful-bug-yield bottleneck from CURRENT source
and durable records (NOT D-58's ranking), explicitly test item-0-only
semantic collection coverage as a primary candidate, re-verify the real
minimization gap, evaluate options A–J, select EXACTLY ONE next primary
bug-hunting architecture, assign the next phase number/name, make the
decision durable (design artifact + decision record + roadmap +
current-state), produce an implementation-ready specification for a later
separately authorized task, and STOP. No implementation, no DEV, no
Phase 6, no AI, no selfDev/promotion/catalog.

## Starting State

- Task ID: `post-phase-10-next-architecture-design-review`; Phase
  `POST-10-DESIGN`; authorization
  `POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`; Starting SHA
  `1d7dd6cb6525195e59602e106f50306859a7998d` (HEAD == origin/main, clean
  worktree, CASE D).
- Active task at start: `phase-10b-contained-dev-deep-semantic-acceptance`
  COMPLETE; PHASE_10_STATUS COMPLETE (10B VERIFIED/PASS/NONE_OBSERVED,
  D-60); 10A COMPLETE (D-59); 9B-R1 COMPLETE (D-57); catalog count 1
  (digest `sha256:bd35b934...`), B AVAILABLE_NOT_ADOPTED, promotion
  authority NONE.
- Real-source expectations: admitted 4 (common-exchange v2 L3, payer-
  exchange v2 L3, account-inventory v1 L2, billing-group-exchange v1 L2);
  DEV-reachable 3; real-DEV-accepted deep 1 (common-exchange); depth
  distribution [2,2,3,3] (L1 0, L2 2, L3+ 2).
- Known residual limitation (Phase 10A record §12): item checks inspect
  item 0 (blueprint convention); defects isolated to rows > 0 are not
  flagged.

## Scope

1. Git bootstrap + required durable reads (AGENTS, ACTIVE_TASK,
   CURRENT_STATE, ROADMAP, ARCHITECTURE, DECISIONS, SAFETY_MODEL, design
   docs POST_PHASE_9 + PHASE_10_DEEPER_SEMANTIC_CONTRACTS +
   PHASE_10B_DEV_ACCEPTANCE, task records: phase-9-deterministic-semantic-
   oracle-depth, phase-9a-1-real-source-expectation-admission,
   phase-9b-r1-auth-refreshed-dev-semantic-acceptance,
   post-phase-9-next-architecture-design-review,
   phase-10-deeper-real-source-semantic-contracts,
   phase-10b-contained-dev-deep-semantic-acceptance).
2. Reconstruct the exact Phase 10 proof table (capabilities A–M:
   recipe v2; type-flow extraction; common-exchange deep OBJECT; payer
   OBJECT|ARRAY; TYPE_IN_SET; source-evidence digest/currentness;
   baseline 0/4 vs deep 4/4 detection; benign FP 0; privacy; campaign/
   dossier integration; contained DEV common-exchange deep acceptance;
   FIRST/replay determinism; real semantic anomalies observed 0).
3. Source-audit the item-0 question end to end:
   `src/oracles/projections/projector.ts` (items retained up to
   maxArrayItemsInspected 128, arrayTruncated flag),
   `src/oracles/projections/types.ts` (DEFAULT_PROJECTION_LIMITS),
   `src/oracles/invariants/paths.ts` (resolvePathWithAmbiguity: ONE
   numeric index; beyond-window → NOT_APPLICABLE),
   `src/oracles/invariants/evaluate.ts` (single-node verdicts for
   FIELD_PRESENT/TYPE_MATCH/TYPE_IN_SET),
   `src/oracles/expectations/admission.ts` (invariants at [itemIndex,
   field]), `recipes/registry.ts` (itemIndex 0 in all 4 recipes);
   build a synthetic proof (throwaway test, deleted after the run) that a
   later-row violation passes today; classify
   CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP.
4. Re-verify the real minimization gap:
   `src/core/campaign/orchestrator.ts:799-802` (wrappedReplay) +
   `tests/manual/phase7-real-campaign.ts:360-366` (invalidReducedReplay
   INVALID for every reduced sequence) + `src/core/triage/minimizer.ts`
   (ddmin + one-deletion audit → 1-MINIMAL certification with zero genuine
   reduced replays); classify CURRENT / FIXED / PARTIALLY_FIXED /
   STALE_CLAIM; record CONFIRMED_REAL_MINIMIZATION_REPLAY_GAP.
5. Inventory dossier actionability (dossier.ts + semantic/dossier.ts +
   pipeline.ts), browser/API differential (differential.ts + real adapter),
   coverage-expansion ceiling (registry approved targets 6 / recipes 4 /
   billing-groups gRPC not JSON-observable / billing-groups-legacy
   AMBIGUOUS), payer second-canary value, change-intelligence value
   (map.ts exact ExchangeRate.php edges + recipe sourcePaths), campaign
   yield state (budget/reserves/storm — hardened).
6. Analysis + selection: bug-yield model re-estimate; 20-criteria scoring
   of A–J; top-three bug-yield impact table; top-three opportunity cost;
   primary bottleneck token; exactly one selected architecture; NEXT_AFTER;
   phase numbering (PHASE_11); completion criteria; authorization ladder;
   implementation-ready future-task spec.
7. Deliverables + validation: task records strict v2; design doc (19
   sections); D-61; ROADMAP; CURRENT_STATE; `npm run hardening:check`,
   `agent:check`, `agent:audit`, `project:check`,
   `node bin/selfdev-catalog-integrity.mjs`; docs-only push; exact CI
   verification; final report (90 items).

## Milestones

- M0 — bootstrap + durable reads (CASE D; verify expected SHA; read all
  required docs + 6 task records).
- M1 — source audit + Phase 10 proof reconstruction + coverage/depth
  inventory (item-0 trace, minimization trace, differential trace,
  coverage ceiling, change-intelligence, campaign).
- M2 — item-0 synthetic proof (throwaway test, removed) +
  CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP + minimization classification.
- M3 — analysis + selection (yield model, scoring, top-three, primary
  bottleneck token, architecture, phase number, completion criteria,
  future spec).
- M4 — deliverables (task records, design doc, D-61, ROADMAP,
  CURRENT_STATE).
- M5 — validation (hardening, agent:check/audit, project:check, catalog
  integrity, diff check).
- M6 — docs-only push + exact CI verification + closure (state/active
  task COMPLETE; final report).

## Non-Goals

No implementation of the selected architecture; no `src/**`, `bin/**`,
`tests/**`, `package.json`, `.github/**` changes; no DEV/NEXT/production
contact; no Phase 6, AI, selfDev/promotion/catalog; no future
implementation authority granted.

## Safety Constraints

No Nightwatch source/test/config/workflow changes. Phase 6 FROZEN_BY_OWNER;
AI non-authoritative; selfDev/promotion/catalog untouched; no DEV/NEXT/
production; no Alphaus writes; no publication. Docs-only: `.agent/**`,
`docs/**` only. Temporary throwaway proof tests removed before commit
(zero committed test changes; worktree ends clean except deliverables).

## Architecture / Approach

Evidence-first recomputation: verify Git state; read all durable records;
audit source for item-0 limitation (projection/blueprint/invariant/evaluator
end to end); synthetic proof (throwaway test deleted after run); re-verify
minimization gap; inventory differential/coverage/campaign from source;
score 10 options under 20 fixed criteria; select exactly ONE primary
architecture; produce task records (strict v2), design document (19
sections), decision record (D-61), ROADMAP and CURRENT_STATE updates; run
validations; push docs-only; verify exact CI; final report.

## Validation Strategy

`npm run hardening:check`; `npm run agent:check`; `npm run agent:audit`;
`npm run project:check`; `node bin/selfdev-catalog-integrity.mjs`;
`git diff --check`; full Playwright optional for docs-only review (unless
continuity rules require it); exact CI after push.

## Decision Log

D0-CASE D; D1-primary bottleneck COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP;
D2-primary architecture BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION;
D3-Phase 11 (not 10.x); D4-minimization gap CURRENT (D-58 finding #1);
D5-no distinct OPTION K.

## Discoveries

See STATE.md Evidence Summary (context-compaction-safe).

## Deferred Work

Triage (B — owns finding #1); coverage expansion (D); differential (C);
relational semantics (E); source-selection (F); campaign yield (G);
multi-product (I); selfDev (J); second DEV canary (H, fold into 11B).

## Completion Criteria

1. Task records complete + VALID under strict v2 (agent:check PASS).
2. Design doc has all 19 required sections.
3. D-61 appended to DECISIONS.md.
4. ROADMAP updated (Phase 11 DESIGNED_NOT_STARTED_NOT_AUTHORIZED).
5. CURRENT_STATE updated (header + post-Phase-10 section).
6. `hardening:check` PASS; `agent:check` PASS; `agent:audit` strict 0;
   `project:check` PASS; catalog integrity PASS; `git diff --check` clean.
7. Docs-only commit pushed fast-forward; exact CI green at final SHA.
8. Final report with all 90 items and terminal form.