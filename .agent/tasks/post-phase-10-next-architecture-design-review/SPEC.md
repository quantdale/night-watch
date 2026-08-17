# Nightwatch Post-Phase-10 — Next Bug-Hunting Architecture Design Review

## Task purpose

Perform a strict-v2, context-free, evidence-first design-review task that
recomputes the Nightwatch useful-bug-yield bottleneck from CURRENT source
after the terminal Phase 10 (deeper real-source semantic contracts:
recipe schema v2, item-level type-flow contracts, TYPE_IN_SET; Phase 10A
LOCAL/SYNTHETIC COMPLETE; Phase 10B contained DEV deep-semantic acceptance
VERIFIED/PASS/NONE_OBSERVED; D-59 + D-60), and decides WHAT SHOULD
NIGHTWATCH BUILD AFTER PHASE 10. The review must:

- verify live Git state and classify bootstrap (CASE A/B/C/D);
- reconstruct the exact Phase 10 proof (capabilities A–M, synthetic + real
  DEV evidence, no-anomaly ≠ no-need);
- recompute the bug-yield equation
  `surfaces × P(real defect) × P(detection) × P(actionable)` and identify
  the LOWEST / most suppressive multiplier — WITHOUT automatically
  selecting triage just because it was NEXT_AFTER in D-58;
- inventory current real semantic coverage (admitted recipes, L1–L5
  distribution, DEV-reachable, DEV-accepted, journeys, targets, invariant
  kinds, collection semantics) and build the mandatory
  depth × row-coverage matrix;
- explicitly audit the Phase 10 residual limitation "item checks inspect
  item 0" end to end (blueprint → admission → invariant path → projection
  lookup → evaluator → finding), with a synthetic proof, and classify
  `CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP` where proven;
- re-verify the real minimization gap (`invalidReducedReplay`) and
  classify CURRENT / FIXED / PARTIALLY_FIXED / STALE_CLAIM;
- inventory current dossier actionability, browser/API differential
  capability, coverage-expansion ceiling, payer second-canary value,
  change-intelligence value, and campaign-yield state from source;
- evaluate the required options A–J (+K only if genuinely distinct) under
  the fixed 20-criteria scoring model, explain load-bearing scores,
  show top-three bug-yield impact and opportunity cost;
- select EXACTLY ONE next primary bug-hunting architecture, assign the
  next phase number/title from evidence, define 4–8 measurable completion
  criteria, set the future authorization ladder, and produce a complete
  implementation-ready future-task specification;
- make the decision durable (design document + decision record + roadmap +
  current-state), run the required validations, push the docs-only
  checkpoint, and verify exact CI.

The review itself executes NOTHING beyond docs: no `src/**`, `bin/**`,
`tests/**`, `package.json`, or `.github/**` change; no DEV/browser/API
contact; no campaign:real; no Phase 6; no AI; no selfDev/promotion/catalog
activity; no future implementation authority granted.

## Established starting state

- Task ID: `post-phase-10-next-architecture-design-review`
- Phase: `POST-10-DESIGN`
- Authorization class: `POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`
- Starting SHA: `1d7dd6cb6525195e59602e106f50306859a7998d`
  (HEAD == origin/main == expected authorization SHA; worktree clean —
  CASE D confirmed 2026-08-16).
- Terminal prior state (durable records): `PHASE_8_STATUS: COMPLETE`;
  `PHASE_9_STATUS: COMPLETE`; `PHASE_10A_STATUS: COMPLETE`;
  `PHASE_10B: COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED`;
  `PHASE_10B_DEV_RESULT: PASS`; `DEEP_INVARIANT_DEV_VALIDATION: VERIFIED`;
  `PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED`; `PHASE_10_STATUS: COMPLETE`;
  canonical catalog count 1 (digest `sha256:bd35b934...`); variant B
  AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`
  (D-51..D-60; ACTIVE task phase-10b COMPLETE at the start).
- Prior design-review selection (D-58, superseded now): primary bottleneck
  `INSUFFICIENT_REAL_SEMANTIC_DEPTH` → `DEEPER_REAL_SOURCE_SEMANTICS`
  (Phase 10) — selected, implemented, and terminally completed. The
  current review must NOT assume D-58's ranking remains current.

## Scope boundaries

- Allowed: inspect Nightwatch source, tests, Git history, task records,
  decisions, architecture, roadmap; read Alphaus sibling repos READ-ONLY
  where architecture evidence requires it (disposable /tmp snapshots,
  canonical checkouts untouched); run existing LOCAL/SYNTHETIC Nightwatch
  tests where useful to prove a design claim (temporary proof artifacts
  removed before commit; zero committed test changes); create the strict-v2
  design-review task; create the repository-native post-Phase-10 design
  document; update roadmap/current-state/architecture/decisions; select
  exactly ONE next primary bug-hunting architecture; assign the next phase
  number/title; produce the implementation-ready specification for the
  future phase; commit/push DOCS-ONLY design state; verify exact CI.
- Forbidden: implementation of the selected architecture; `src/**`,
  `bin/**`, `tests/**`, `package.json`, `.github/**` changes; DEV/NEXT/
  production contact; product mutation; database/data-layer queries;
  infrastructure queries; Phase 6; AI/model execution; AI oracle authority;
  Alphaus source writes; selfDev; promotion; catalog mutation; variant-B
  adoption; publication; runtime Git writes.

## Deliverables

1. `.agent/tasks/post-phase-10-next-architecture-design-review/{SPEC,PLAN,STATE,REPORT}.md`
   (strict continuity v2; final status COMPLETE).
2. `.agent/ACTIVE_TASK.md` updated to this task (COMPLETE at closure).
3. `docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md` — repository-native
   design document with the 19 required sections.
4. `docs/DECISIONS.md` — next live decision record (D-61).
5. `docs/ROADMAP.md` — truthful post-Phase-10 section (Phase 11
   DESIGNED_NOT_STARTED_NOT_AUTHORIZED).
6. `docs/CURRENT_STATE.md` — header + post-Phase-10 design review record;
   project-state protocol unchanged (machine truth block byte-identical;
   no competing live anchors).
7. Docs-only commit(s) pushed fast-forward; exact CI verified.

## Success tokens

- `POST_PHASE_10_ARCHITECTURE_DESIGN_STATUS: COMPLETE`
- `PHASE_10_STATUS: COMPLETE` (terminal, unchanged)
- `CURRENT_PRIMARY_POST_PHASE10_BOTTLENECK: <exact value from evidence>`
- `POST_PHASE_10_NEXT_ARCHITECTURE: <exactly one value>`
- `NEXT_PHASE: PHASE_11` (or evidence-backed alternative)
- `NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED`
- `NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`
- NEXT ACTION: STOP.

## Stop conditions

- Any requirement to change `src/**`, `bin/**`, `tests/**`, `package.json`,
  `.github/**` to complete the review → record and STOP (design review is
  docs-only).
- Source drift on `main` (HEAD ≠ origin/main, or remote advanced) → STOP and
  reconcile (`POST_PHASE_10_DESIGN_STOPPED_SOURCE_ADVANCED`).
- Any discovered privacy leak or safety event → STOP + escalation.
- If a later substantive phase already advanced `main` → STOP
  (`POST_PHASE_10_DESIGN_STOPPED_SOURCE_ADVANCED`).