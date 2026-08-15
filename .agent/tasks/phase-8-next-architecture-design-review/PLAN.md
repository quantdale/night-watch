# Nightwatch Phase 8 — Next-Architecture Design Review

## Purpose

Decide, from evidence, what should come next after the first canonical
owner-gated self-development adoption; make the decision durable
(design artifact + decision record + roadmap); produce an
implementation-ready spec for a later separately authorized task; and STOP.
No implementation, no promotion, no catalog mutation.

## Starting State

- Task ID: `phase-8-next-architecture-design-review`; Phase `8-DESIGN`;
  Starting SHA `4e4bf0843c9e33682e026b3931599d1b2b713374` (HEAD ==
  origin/main, clean worktree).
- Validated implementation `044c4a6e0095d14004cd50b44ceb47998e44e3ec`
  (preserved; docs commit is a documentation descendant).
- Catalog count 1 (A / EXPAND_SUMMARY), digest `sha256:bd35b934...`,
  contractDigest `sha256:d8012fae...`; B AVAILABLE_NOT_ADOPTED; promotion
  authority NONE; Phase 8 IN_PROGRESS; 8B.1 COMPLETE_VIA_SUCCESSFUL_RETRY_R1.
- Established evidence (do not rediscover): full Phase 8 capability record in
  ROADMAP (lines 660-1099), DECISIONS D-44..D-51, task STATE/REPORT files
  (12 tasks), promotion/currentness tokens
  (CANONICAL_ONE_FILE_ONLY, CANONICAL_PROMOTION_*), catalog bound 64,
  fixture baselines EMPTY/EXPAND_ONLY/EXPAND_AND_COLLAPSE, CI steps
  (hardening.yml 24 steps), project-state pins
  (`bin/project-state-check.mjs:172-174`), no rollback/unadopt machinery.

## Scope

- Evidence table A-R; objective reconstruction; options A-F (+ additional
  only if genuinely distinct); 14-criteria scoring; authority ladder L0-L6;
  axis separation; repeatability/exhaustion/artifact-lifecycle/source-change
  invalidation/rollback/removal/catalog-bound analyses; owner experience;
  automation vs manual boundary; one-command readiness concept; B-canary and
  portfolio-expansion verdicts; value vs demonstration analysis;
  opportunity cost; Phase 7/8 interaction; AI boundary; threat tables; state
  machine; authority transition table; one-shot semantics; identity;
  concurrency; write accounting; project-state/continuity/CI/test-baseline
  capacity; evidence-gap analysis; decision matrix; one primary
  recommendation; phase-naming; PHASE_8_COMPLETE criteria; next-task spec.
- Files: `.agent/tasks/phase-8-next-architecture-design-review/{SPEC,PLAN,
  STATE,REPORT}.md`, `.agent/ACTIVE_TASK.md`, `docs/design/
  PHASE_8_NEXT_ARCHITECTURE.md` (new), `docs/DECISIONS.md` (D-52),
  `docs/ROADMAP.md` (design record), `docs/CURRENT_STATE.md` (narrative only).

## Non-Goals

No B adoption, no sandbox run, no promotion chain, no catalog mutation, no
approval, no source/test/bin/workflow/package change, no project-state block
change, no status-pin change, no owner-policy change, no AI/model run, no
product/DB/infra/DEV/NEXT/production activity, no publication, no Phase 8C
invention.

## Safety Constraints

- Authorization `PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`; read-only
  introspection only; expected changed files `.agent/**`, `docs/**`.
- Candidate availability != promotion authorization.
- If implementation code is needed to finish: STOP, record as proposed
  follow-up.

## Architecture / Approach

1. Bootstrap (done): CASE D — HEAD == origin/main == expected SHA, clean.
2. Read durable authority (done): AGENTS.md, ACTIVE_TASK, CURRENT_STATE,
   ROADMAP, DECISIONS D-44..D-51, ARCHITECTURE/SAFETY_MODEL Phase 8
   sections, 12 task records, source mechanics, test/CI baseline
   (four parallel read-only evidence reviews; compared, not voted).
3. Analyze: evidence table, objective reconstruction, options scoring,
   threat model, state machine, decision matrix → exactly one primary
   recommendation.
4. Author: design artifact; D-52; ROADMAP update; CURRENT_STATE narrative.
5. Validate: typecheck, hardening:check, agent:check, agent:audit,
   project:check, selfdev:catalog-integrity, focused selfDev tests.
6. Commit docs (task records IN_PROGRESS form), push, exact CI.
7. Close under continuity v2 (terminal fields), commit, push, exact CI,
   final report, STOP.

## Milestones

- M0 — bootstrap + task creation + ACTIVE_TASK update — files
  `.agent/tasks/phase-8-next-architecture-design-review/*`,
  `.agent/ACTIVE_TASK.md` — status: IN_PROGRESS; criteria: CASE D confirmed,
  v2 records created — status: COMPLETE (this record).
- M1 — evidence gathering — criteria: capability table A-R, objective
  reconstruction, source/test/CI facts verified (four parallel read-only
  reviews + direct pin verification) — status: COMPLETE.
- M2 — options analysis + scoring + threat model + decision — criteria:
  all required options scored on the 14 fixed criteria, top-three threat
  tables, exactly one primary recommendation token selected — status:
  COMPLETE (see STATE; full detail in design artifact).
- M3 — design artifact + decision record + roadmap + current-state
  narrative — criteria: `docs/design/PHASE_8_NEXT_ARCHITECTURE.md` covers
  every required section; D-52 appended; ROADMAP marks next task
  DESIGNED/NOT_STARTED/NOT_AUTHORIZED; CURRENT_STATE machine block
  unchanged; narrative states recommendation — status: COMPLETE.
- M4 — validation — criteria: typecheck, hardening:check, agent:check,
  agent:audit, project:check, selfdev:catalog-integrity, focused
  selfDev/project-state tests all PASS; git diff --check clean — status:
  COMPLETE.
- M5 — docs commit + push + exact CI — criteria: commit contains only
  `.agent/**` + `docs/**`; fast-forward push; HEAD == origin/main; exact CI
  completed/success incl. hardening, project:check, agent:check, agent:audit,
  catalog integrity, whitespace — status: COMPLETE.
- M6 — continuity v2 closure + final CI + report — criteria: STATE/REPORT/
  ACTIVE_TASK terminal COMPLETE fields; closure commit pushed; final exact
  CI green; final report with one recommendation token; STOP — status:
  COMPLETE.

## Validation Strategy

- `npm run typecheck`; `npm run hardening:check`; `npm run agent:check`;
  `npm run agent:audit`; `npm run project:check`;
  `npm run selfdev:catalog-integrity`; focused tests
  (`npx playwright test tests/unit/selfDevPortfolio.test.ts
  tests/unit/selfDevAdoptionCatalog.test.ts tests/unit/projectState.test.ts
  tests/unit/agent-state.test.ts`); `git diff --check`. Full Playwright not
  required for a docs-only design task (documentation-descendant model);
  exact CI runs the full suite as the authoritative gate.

## Decision Log

- D0 (2026-08-15): Recommendation = CLOSE_PHASE_8. Reason: phase objective
  (one owner-gated canonical promotion + continuation) proven live; B is a
  structural canary with zero bug-hunting value; machinery states (0/1/2,
  EXHAUSTED) are fixture-proven; closure requires a separate authorized
  source change (project-state pins), so the review records the design and
  stops. Evidence: R1 SPEC objective; post-R1 sessions select B; portfolio
  tests; project-state pins at bin/project-state-check.mjs:172-174.
  Consequence: primary token `PHASE_8_NEXT_ARCHITECTURE: CLOSE_PHASE_8`;
  secondary `REPEATABLE_OWNER_GATED_ADOPTION` VIABLE_LATER; F rejected by
  design.
- D1 (2026-08-15): Phase naming = "Phase 8 closure" (not Phase 8C, not
  Phase 9). Reason: the recommended work closes the existing phase and
  selects the next investment; inventing 8C would imply Phase 8 capability
  work, and Phase 9 is a bug-hunting-phase concept for a separate decision.
- D2 (2026-08-15): Design document location = new `docs/design/` (no
  repository-native design location existed; verified absent). Consequence:
  `docs/design/PHASE_8_NEXT_ARCHITECTURE.md`.

## Discoveries

- `bin/project-state-check.mjs:172-174` hard-pins PHASE_8_STATUS
  IN_PROGRESS, PHASE_8B_1_STATUS COMPLETE_VIA_SUCCESSFUL_RETRY_R1,
  NEXT_PROMOTION_AUTHORITY NONE — so BOTH Phase 8 closure and a second
  adoption require a separate authorized source change; the design review
  cannot itself flip any of them.
- No prior design-review artifact exists; next capability was UNDESIGNED.
- No rollback/unadopt machinery anywhere (by design; CLI forbids `--rollback`).
- CI is fully cardinality-agnostic; no hard-coded count=0/1 assumption
  remains; only the CURRENT_STATE machine block is count-sensitive.
- Promotion flow tests cover promotion to count 2 under the EXPAND_ONLY
  fixture; no promotion test starts from a two-entry baseline (count-3
  postimage is untested — relevant only to a future second adoption).

## Deferred Work

- Phase 8 closure execution (separate authorization; source change to
  project-state pins + docs).
- Variant-B adoption (separate authorization; not recommended by this review
  as a standalone canary).
- Portfolio expansion (after closure; only with real bug-hunting semantics).
- Owner review queue (only meaningful after portfolio expansion).
- First-class rollback/unadopt machinery (rejected; dev-session Git restore
  is the model).
- Autonomous promotion (rejected by design; see artifact §F).

## Completion Criteria

- Design artifact + D-52 + ROADMAP + CURRENT_STATE narrative committed,
  pushed, exact CI green; all validations pass; project truth block
  unchanged; task COMPLETE under continuity v2 with terminal fields
  (PHASE_8_NEXT_ARCHITECTURE_DESIGN_STATUS: COMPLETE; Current milestone:
  COMPLETE / STOP; Work In Progress: NONE; Exact Next Action: STOP — selected
  next architecture requires separate owner authorization; Resume Recipe:
  Task complete. Do not resume.); final report contains one exact
  recommendation token; STOP.
