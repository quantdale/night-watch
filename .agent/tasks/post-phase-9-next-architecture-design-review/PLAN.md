# Nightwatch Post-Phase-9 — Next Bug-Hunting Architecture Design Review

## Purpose

Recompute the post-Phase-9 bug-yield bottleneck from CURRENT source and
durable records (NOT the old Phase 9 runner-up ranking), select exactly ONE
next primary bug-hunting architecture, assign the next phase number/name,
make the decision durable (design artifact + decision record + roadmap +
current-state), produce an implementation-ready spec for a later separately
authorized task, and STOP. No implementation, no DEV, no Phase 6, no AI, no
selfDev/promotion/catalog.

## Starting State

- Task ID: `post-phase-9-next-architecture-design-review`; Phase
  `POST-9-DESIGN`; authorization
  `POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`; Starting SHA
  `aba46a9af1a1021ae58a1253f93fda297391576e` (HEAD == origin/main, clean
  worktree, CASE D).
- Active task at start: `phase-9b-r1-auth-refreshed-dev-semantic-acceptance`
  COMPLETE; PHASE_9_STATUS COMPLETE (9B-R1 VERIFIED/PASS, D-57); 9A.1
  COMPLETE; 9B BLOCKED historical (D-56); catalog count 1 (digest
  `sha256:bd35b934...`), B AVAILABLE_NOT_ADOPTED, promotion authority NONE.
- Real-source expectations: admitted 4 / DEV-reachable 3 / real-DEV-accepted
  1 (common-exchange shape; invariants passed 3 in FIRST+REPLAY).
- Established evidence (verify narrowly, do not rediscover): Phase 9 proof
  records (PHASE_9_ROADMAP §17-20, ARCHITECTURE Phase 9/9A.1/9B/9B-R1
  records, D-54..D-57, task STATE/REPORT files x4), oracle/invariant/
  expectation/receipt/recipe/admission source, triage source (minimizer/
  clustering/differential/localization/dossier/pipeline), campaign source
  (orchestrator/budget/selection), changeIntelligence source (map 6-repo/
  22-edge, selection fallback), journeys (3 reviewed contracts), real
  campaign adapter (`tests/manual/phase7-real-campaign.ts`), Phase 9B
  runner (`tests/manual/phase9b-contained-dev-semantic.ts`), sibling
  ripple-api read-only checkout @ `27bb007a`.

## Scope

1. Reconstruct Phase 9 proof (capabilities A–N; synthetic + real DEV
   evidence; no-anomaly ≠ no-need).
2. Re-estimate the yield equation; identify the NEW dominant term.
3. Real semantic coverage inventory (4/3/1) + coverage × depth matrix +
   expectation L1–L5 classification (verify from `admission.ts`: real
   expectations = root TYPE_MATCH ARRAY + FIELD_PRESENT per item key only).
4. Verify current triage / differential / change-intelligence / campaign /
   dossier claims from source: `invalidReducedReplay` stub
   (`phase7-real-campaign.ts:360-366`) + orchestrator wrapper (false
   1-MINIMAL certification risk — record as follow-up finding); class-only
   `compareBrowserAndApi`; 6-repo/22-edge map; fallback selection; real
   budget profile; dossier capability.
5. Depth ceiling from real source (read-only ripple-api): (object) cast
   sites, CURRENCY_RANGE_VALIDATE const, vendor permission lists — evidence
   for mechanically provable L3 invariants; account-inventory L2 ceiling.
6. Evaluate options A–H (+I only if genuinely distinct) on the fixed
   18-criteria matrix; select exactly ONE primary; name the phase.
7. Produce Phase-10 spec (task ID, authorization class, allowed files,
   forbidden authority, state machine, tests, CI, success token) +
   completion criteria + local/synthetic metric + 10A/10B split.
8. Durable records: design doc, D-58, ROADMAP, CURRENT_STATE, ACTIVE_TASK.
9. Validate (hardening, agent:check/audit, project:check, catalog
   integrity), commit/push docs-only, exact CI, terminal tokens, STOP.

## Non-Goals

No implementation of any option; no `src/**`, `bin/**`, `tests/**`,
`package.json`, `.github/**` changes; no DEV/NEXT/production contact; no
Phase 6 surface; no AI/model execution; no selfDev/promotion/catalog/
variant-B activity; no Alphaus writes; no publication; no new journey or
endpoint authority; no grant of any future implementation authorization;
no fixing of current-source defects (recorded as follow-up findings only).

## Safety Constraints

Read-only analysis + docs-only output. Sibling repos read-only (pinned
checkouts). No network beyond git fetch origin (Nightwatch repo only). No
credentials touched. Safety vector all zero except Nightwatch docs commits.


## Architecture / Approach

Evidence-first, source-grounded design review. No new subsystem is
designed in this task: the review audits the EXISTING pipeline
(oracles → campaign → triage → dossier) from source, reconstructs what
Phase 9 proved, and selects which EXISTING capability to deepen next. The
selected Phase 10 architecture (DEEPER_REAL_SOURCE_SEMANTICS) is
specified as an implementation-ready future-task spec (design only):
extractor vocabulary extension (const literals, cast sites, permission
lists) + recipe schema extension + enriched blueprints on the existing 4
admitted targets + extended fixture matrix + existing pipeline integration.

## Milestones

- M0 — bootstrap: CASE D verified; durable reads; source recon (done in
  audit phase).
- M1 — evidence tables: Phase 9 proof A–N; yield model; coverage × depth;
  expectation classification; triage/differential/CI/campaign/dossier
  verification; depth-ceiling source trace.
- M2 — option matrix A–H + scoring + bottleneck token + phase naming +
  top-three + opportunity cost.
- M3 — task records + design doc `docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md`.
- M4 — D-58 decision record; ROADMAP/CURRENT_STATE updates; ACTIVE_TASK.
- M5 — validation gates (hardening, agent:check/audit, project:check,
  catalog integrity).
- M6 — docs-only commit + push fast-forward + exact CI green.
- M7 — terminal tokens; STOP.

## Validation Strategy

- `npm run hardening:check` PASS.
- `npm run agent:check` / `npm run agent:audit` zero strict errors (expected
  warnings: legacy v1 tasks; STALE baseline while uncommitted pre-commit).
- `npm run project:check` PASS at a clean tree (dirty-only pre-commit).
- `npm run selfdev:catalog-integrity` PASS at a clean tree.
- `git diff --check` clean.
- Targeted existing tests only where an architectural claim needs proof (no
  full product run; full Playwright regression optional for docs-only
  design — run if cheap and decisive).

## Decision Log

- D0 — CASE D (expected exact clean source; no prior design-review task).
- D1 — Primary bottleneck INSUFFICIENT_REAL_SEMANTIC_DEPTH (columns
  shallow, rows capped).
- D2 — Primary architecture DEEPER_REAL_SOURCE_SEMANTICS (F), subordinate
  = admission/extractor extension for deeper blueprints on existing
  targets.
- D3 — Phase 10 (not a Phase 9.x continuation): Phase 9 terminal COMPLETE
  (D-57).
- D4 — Follow-up finding #1 recorded (false-1-MINIMAL certification risk),
  not fixed (source-change boundary).
- D5 — No parallel reviewer subagents; every claim source-verified; no
  genuinely distinct additional option I found.

## Discoveries

- The 9A.1 D2 note ("TYPE_MATCH where the source literally establishes the
  type") is NOT reflected in shipped `admission.ts` (root ARRAY +
  FIELD_PRESENT only) — extractor vocabulary cannot express casts/consts.
- Real minimization can certify a false 1-MINIMAL via the stub-replay
  wrapper (finding #1).
- Dependency map names COST_FINANCIAL_SEMANTICS with no enforcing oracle —
  Phase 10 depth directly addresses it.

## Deferred Work

- Phase 10 implementation (separate authorization).
- Coverage rows: billing-group-exchange (new reviewed journey rule);
  gRPC billing-groups (new stream-projection capability).
- Triage hardening incl. finding #1 (NEXT_AFTER).
- Differential, selection, yield intelligence, multi-product, selfDev
  (later/DEFER per option matrix).

## Completion Criteria

1. Exactly one primary architecture token from current-source evidence.
2. Phase number/name assigned with rationale.
3. 4–7 measurable Phase-10 completion criteria defined.
4. ≥1 local/synthetic success metric defined.
5. Implementation-ready future-task spec produced.
6. Decision record (D-58) + ROADMAP + CURRENT_STATE + design doc updated.
7. Validation gates green; docs-only commit pushed fast-forward; exact CI
   green.
8. Terminal tokens; STOP.

## Safety Vector

DEV contacts 0; NEXT 0; production 0; mutations 0; DB 0; infra 0; AI/model
0; Alphaus writes 0; publication 0; selfDev 0; promotion 0; catalog 0; B
adoption 0; runtime Git writes 0; Nightwatch docs commits expected only.
