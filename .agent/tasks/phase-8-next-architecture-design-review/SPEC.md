# Nightwatch Phase 8 — Next-Architecture Design Review

## Task purpose

Perform a strict-v2 design-review task that decides WHAT SHOULD COME NEXT
after the first canonical owner-gated self-development adoption (Phase
8B.1-R1, commit `24fc437`, catalog count 1, variant B
`AVAILABLE_NOT_ADOPTED`, promotion authority `NONE`). The review must
reconstruct the Phase 8 objective from durable evidence, evaluate the
required architecture options (close / repeatable lifecycle / owner queue /
portfolio expansion / rollback machinery / autonomous promotion) against the
hard design principles, select exactly ONE primary recommendation, record the
authority ladder, threat model, state machine, one-shot semantics, identity
requirements, and produce an implementation-ready specification for a later
separately authorized task. The design review itself executes NOTHING: no
variant-B adoption, no sandbox run, no promotion prepare/approval/APPLY, no
catalog mutation, no source behavior change. Output is docs-only
(`.agent/**`, `docs/**`).

## Established starting state

- Task ID: `phase-8-next-architecture-design-review`
- Phase: `8-DESIGN`
- Starting SHA: `4e4bf0843c9e33682e026b3931599d1b2b713374`
  (HEAD == origin/main == expected authorization SHA; worktree clean)
- Current validated implementation: `044c4a6e0095d14004cd50b44ceb47998e44e3ec`
  (preserved; the design docs commit is a documentation descendant, never a
  new runtime implementation checkpoint).
- Active task at start: `phase-8b-1-r1-1-1-canonical-catalog-authority-wording`
  COMPLETE (continuity v2).
- Phase statuses: 8 = IN_PROGRESS, 8A/8A.1/8A.1.1/8B/8B.0.1/8B.1.0/8B.1.0.1/
  8B.1.0.2 = COMPLETE, 8B.1 = COMPLETE_VIA_SUCCESSFUL_RETRY_R1 (original
  attempt BLOCKED/CLOSED; approval `17c97035...` permanently spent; R1
  approval `e065f088...` consumed exactly once).
- Canonical catalog: count 1 (variant A / EXPAND_SUMMARY); raw digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`;
  adoptedCaseId `adopted-case:sha256:90248aae...`; equivalentFingerprint
  `sha256:6a322450...`; contractDigest unchanged `sha256:d8012fae...`.
- Portfolio: frozen 2-variant `nightwatch.selfdev-synthetic-portfolio.v1`
  (EXPAND_SUMMARY, EXPAND_THEN_COLLAPSE); selector
  `selectNextSyntheticProposalVariant` returns B today, `null` (EXHAUSTED)
  when A+B adopted. EXHAUSTED is a designed healthy terminal state.
- Project-state v1 machine block: `PHASE_8_STATUS: IN_PROGRESS`,
  `PHASE_8B_1_STATUS: COMPLETE_VIA_SUCCESSFUL_RETRY_R1`,
  `NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED`,
  `NEXT_PROMOTION_AUTHORITY: NONE` — all hard-pinned by
  `bin/project-state-check.mjs` (lines 172-174); the pin is load-bearing:
  closing Phase 8 OR a second adoption requires a separate authorized change
  to that checker.
- Safety/authority model: six-point partition per D-51 (sandbox-mirror write;
  canonical-promotion executor is the only runtime canonical-target writer
  after the complete owner-gated chain; runtime never commits Git; candidates
  never write source; no generic runtime self-modification; development
  session commits). No rollback/unadopt machinery exists (by design; CLI
  forbids `--rollback`).
- Test baseline: fixtures EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE prove
  0/1/2 catalog states through the real renderer/stack; CI catalog-integrity
  step is cardinality-agnostic; no hard-coded count=0/1 test or CI assumption
  remains; promotion flow tests cover promotion to count 2 under fixtures.

## Required deliverables

1. v2 design-review task records (`SPEC/PLAN/STATE/REPORT.md`) +
   `.agent/ACTIVE_TASK.md` under `nightwatch.agent-continuity.v2`, status
   IN_PROGRESS during the review, COMPLETE at closure with terminal fields.
2. Dedicated design artifact `docs/design/PHASE_8_NEXT_ARCHITECTURE.md`
   (repository-native design location; `docs/design/` is created here)
   containing: current state; reconstructed Phase 8 objective; capability
   evidence table (A-R); options A-F (+ any genuinely distinct additional
   option) with 1-5 scoring on the 14 fixed criteria; authority ladder L0-L6;
   candidate/eligibility/authority axis separation; repeatability analysis;
   exhaustion analysis; artifact lifecycle map; source-change invalidation
   model; rollback model; removal/unadoption analysis; catalog bound
   analysis; owner experience; automation boundary; mandatory-manual
   boundary; one-command readiness concept; B-as-second-canary verdict;
   portfolio-expansion-before-B verdict; demonstration vs bug-hunting value;
   opportunity cost; Phase 7/8 interaction; AI boundary; top-three threat
   tables; recommended state machine; authority transition table; one-shot
   semantics; identity requirements; concurrency; write accounting;
   project-state implications; continuity implications; CI capacity;
   test-baseline capacity; evidence-gap analysis; final decision matrix;
   exactly one primary recommendation token; phase-naming decision; explicit
   PHASE_8_COMPLETE criteria; non-goals; implementation boundary; migration
   implications; proposed next task (implementation-ready spec).
3. One durable decision record appended to `docs/DECISIONS.md` (D-52)
   recording the selected architecture, rejected/deferred alternatives with
   reasons, owner authority boundary, and whether Phase 8 should close.
4. `docs/ROADMAP.md` update recording the selected design; proposed next
   phase/task marked `DESIGNED / NOT_STARTED / NOT_AUTHORIZED`; Phase 8
   closure recorded as PROPOSED (not executed).
5. `docs/CURRENT_STATE.md` narrative update stating the design
   recommendation; machine-checked truth block UNCHANGED (count 1, B
   available, authority NONE); no non-mechanical speculative fields added to
   project-state v1.
6. Read-only validation: `npm run typecheck`, `npm run hardening:check`,
   `npm run agent:check`, `npm run agent:audit`, `npm run project:check`,
   `npm run selfdev:catalog-integrity`, focused selfDev/project-state tests
   (design claims depend on test behavior); full Playwright not required for
   a docs-only design task.
7. Docs-only commit + push (fast-forward), exact CI success (all steps
   including hardening, project:check, agent:check, agent:audit, catalog
   integrity, whitespace), continuity v2 docs closure.

## Explicit non-goals

- NO variant-B adoption; NO sandbox run for B; NO promotion prepare/approve/
  apply/verify; NO catalog mutation; NO approval creation.
- NO implementation of the recommended architecture (any required source
  change is recorded as a proposed follow-up).
- NO change to `src/**`, `bin/**`, `tests/**`, `package.json`, workflow.
- NO owner-policy change; NO AI/model execution; NO product/DEV/NEXT/
  production/DB/infra activity; NO Alphaus repo writes; NO publication.
- NO project-state machine-block change; NO status-pin change.
- NO Phase 8C invented; phase naming decided from roadmap evidence.

## Safety constraints

- Authorization class: `PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`.
- Expected changed files: `.agent/**` and `docs/**` only. `AGENTS.md` only if
  the design creates a permanent operating rule (not expected).
- Candidate availability NEVER implies promotion authorization (variant B is
  evidence, not authorization).
- If implementation code appears necessary to complete the review: STOP and
  record it as a proposed follow-up instead.

## Acceptance criteria

- Exactly one primary recommendation token stated (e.g. CLOSE_PHASE_8) with
  evidence-based rationale and no "all options have tradeoffs" dodge.
- Design artifact exists and covers every required section; decision record
  appended; roadmap records the design with NOT_AUTHORIZED markers; project
  truth block mechanically unchanged.
- All read-only validations pass (typecheck, hardening, agent:check,
  agent:audit, project:check, catalog integrity, focused tests).
- Docs commit pushed fast-forward; exact CI completed/success at exact head
  SHA; worktree clean; final project:check PASS.
- Task closed COMPLETE under continuity v2 with terminal fields:
  PHASE_8_NEXT_ARCHITECTURE_DESIGN_STATUS: COMPLETE; Current milestone:
  COMPLETE / STOP; Work In Progress: NONE; Exact Next Action: STOP — selected
  next architecture requires separate owner authorization; Resume Recipe:
  Task complete. Do not resume.
