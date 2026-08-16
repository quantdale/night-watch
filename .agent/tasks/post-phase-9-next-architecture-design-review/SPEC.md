# Nightwatch Post-Phase-9 — Next Bug-Hunting Architecture Design Review

## Task purpose

Perform a strict-v2, context-free, evidence-first design-review task that
recomputes the Nightwatch bug-yield bottleneck from CURRENT source after the
terminal Phase 9 (deterministic semantic oracle depth: projection layer,
source-backed expectations, evaluation receipts, and the Phase 9B-R1
contained DEV semantic acceptance VERIFIED/PASS), and decides WHAT SHOULD
NIGHTWATCH BUILD NEXT. The review must reconstruct what Phase 9 actually
proved (synthetic + real DEV), re-estimate the useful-bug-yield equation
(surfaces × P(defect) × P(detection) × P(actionable)), inventory current
real-source semantic coverage and depth, verify the current triage /
differential / change-intelligence / campaign-budget / dossier state from
source (NOT from Phase 9 roadmap lore), evaluate the required options A–H,
select exactly ONE primary bug-hunting architecture, assign the next phase
number/name from evidence, and produce an implementation-ready
specification for a later separately authorized engineering task. The
review itself executes NOTHING: no `src/**`, `bin/**`, `tests/**`,
`package.json`, or `.github/**` change; no DEV/browser/API contact; no
Phase 6; no AI; no selfDev/promotion/catalog activity. Output is docs-only
(`.agent/**`, `docs/**`).

## Established starting state

- Task ID: `post-phase-9-next-architecture-design-review`
- Phase: `POST-9-DESIGN`
- Authorization class: `POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`
- Starting SHA: `aba46a9af1a1021ae58a1253f93fda297391576e`
  (HEAD == origin/main == expected authorization SHA; worktree clean —
  CASE D, verified 2026-08-16).
- Active task at start: `phase-9b-r1-auth-refreshed-dev-semantic-acceptance`
  COMPLETE (continuity v2; terminal: "the next architecture requires a
  separate design review").
- Phase statuses: 8 = COMPLETE, 9 = COMPLETE (narrative
  COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED via 9B-R1 PASS / D-57),
  9A.1 = COMPLETE, 9B = BLOCKED historical (D-56, NOT_PROVEN, spent),
  9B-R1 = COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED / PASS /
  PRODUCT_SEMANTIC_MISMATCH NONE_OBSERVED.
- Canonical catalog: count 1, raw digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`;
  variant B `AVAILABLE_NOT_ADOPTED`; `NEXT_PROMOTION_AUTHORITY: NONE`;
  project-state v1 machine block intact.
- Real-source expectation baseline (verify, do not assume): admitted 4
  (ripple.common-exchange.read, ripple.payer-exchange.read,
  ripple.account-inventory.read, ripple.billing-group-exchange.read);
  DEV-reachable 3; real-DEV-accepted 1
  (`ripple.common-exchange.read.real-source-shape` @ ripple-api `169df39d`,
  evidence digest `ev:sha256:608265368c9a086f43c94e5c`).
- Sibling read-only checkouts pinned: mobingilabs/ripple-api @
  `27bb007ad0c798800b6bd3b29760c966422966e7` (canonical checkout; remote
  master advanced to `169df39d` — read-only remote truth only).

## Scope

- Phase 9 proof reconstruction (capabilities A–N); current finding-yield
  model; real semantic coverage inventory; coverage × depth matrix;
  expectation-quality classification (L1–L5); what Phase 9B-R1 did NOT
  prove; second/third DEV-canary value; triage timing; differential timing;
  source-selection timing; coverage ceiling; depth ceiling; multi-product
  verdict; options A–H (+ additional only if genuinely distinct); fixed
  18-criteria scoring; new primary bottleneck token; top-three bug-yield
  impacts; opportunity-cost analysis; authority ladder; architectural reuse;
  expectation-drift cross-cutting assessment; synthetic fault-injection
  value; current dossier value; current minimization honesty (source
  trace); current differential reachability; decision record (next live
  D-number); roadmap + current-state updates; strict-v2 task closure;
  docs-only CI.
- Explicit NON-goals: no implementation; no source/test/workflow changes;
  no DEV/NEXT/production contact; no Phase 6; no AI/model execution; no
  selfDev/promotion/catalog/B-adoption; no Alphaus writes; no publication;
  no new journey or endpoint authority; no grant of any future
  implementation authorization.

## Decision authority (this task)

This task SELECTS one primary architecture and DESIGNED-NOT-AUTHORIZED phase
status. It grants NO implementation authority. Any later implementation
requires a fresh owner authorization (expected token:
`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`; not granted here).

## Outputs

1. `docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md` (repository-native design
   document: proof summary, pipeline, coverage×depth matrix, finding
   history, new bottleneck, option matrix, source evidence, top-three
   analysis, selected architecture, phase naming, completion criteria,
   implementation boundary, future authorization class, explicit
   non-goals).
2. Task records SPEC/PLAN/STATE/REPORT (this directory, continuity v2).
3. `docs/DECISIONS.md` next live D-number decision record.
4. `docs/ROADMAP.md` + `docs/CURRENT_STATE.md` narrative updates.
5. `.agent/ACTIVE_TASK.md` transition to this task IN_PROGRESS, then
   COMPLETE.

## Completion contract

Status COMPLETE only when: exactly one primary architecture token selected
from current-source evidence; phase number/name assigned; 4–7 measurable
Phase-10 completion criteria defined; ≥1 local/synthetic success metric
defined; implementation-ready future-task spec produced; decision record,
roadmap, current-state updated; design doc written; hardening:check,
agent:check, agent:audit, project:check, selfdev catalog integrity pass;
docs-only commit pushed fast-forward with exact green CI (hardening, Phase
9, Phase 9A.1, Phase 9B harness, project:check, agent:check, completed-task
continuity audit, catalog integrity, campaign synthetic, whitespace);
terminal tokens; STOP. No future placeholders in live fields.

## STOP conditions

Any need to modify `src/**`, `bin/**`, `tests/**`, `package.json`,
`.github/**`; any DEV/NEXT/production contact; any Phase 6 surface; any
promotion/catalog/selfDev action; any unexpected source advance (re-run
CASE classification and STOP with
`POST_PHASE_9_ARCHITECTURE_REVIEW_STOPPED_SOURCE_ADVANCED`).
