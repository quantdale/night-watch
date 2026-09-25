# Final product completion (terminal campaign)

Task ID: nightwatch-final-product-completion-v1

## Purpose

Reach and hold an honest terminal verdict. After this campaign every one of
the 228 audited items has one recorded disposition, the release-certification
spine is checkpoint-neutral and satisfiable, exact-head CI is green and
deterministic at the final substantive checkpoint S, the autonomous hunt path
persists and reports durable truthful results, operator surfaces (CLI, README,
Control Center) match reality, and the repository ends `main`-only with a
clean tree. The observable capability after it: an operator can install, check
health, run a bounded autonomous hunt, and see durable truthful results in the
CLI and the Control Center, while `project:check` certifies
`PROJECT_COMPLETE_AND_CI_CERTIFIED` at S.

## Starting State

- Task ID: nightwatch-final-product-completion-v1
- Starting SHA: `1f786a4e1b7e4967d06c930946f1107e32931e8a` (= `origin/main`,
  clean canonical, single worktree at pre-flight).
- OpenSpec change: `openspec/changes/nightwatch-final-product-completion-v1/`
  (proposal/design/audit/tasks + seven delta specs), strict-validated PASS.
- Architecture context: the certification spine
  (`src/core/releaseCertification`, `bin/project-state-check.mjs`,
  `config/*.json` bindings), the C-00 session machinery
  (`bin/nightwatch-session.mjs`, `bin/lib/session-authority.mjs`), the ledger
  surface (`bin/lib/openspec-ledger.mjs`), and the operator CLI surface (76
  `bin/*.mjs` entry points) are the load-bearing areas.
- Established facts that must not be rediscovered: the five structural traps
  (A-01 evidence-bindings chase, R2-N6 source task-status literal,
  A-02/D-01 unimplemented probes, X-04 post-certification decay, D-04
  HANDOFF_TRUTH vs session-declared pushes) and the 228-item census with its
  tiering in `audit.md`.

## Scope

Phases 1-15 of `openspec/changes/nightwatch-final-product-completion-v1/tasks.md`
as milestone M0-M14 below. Nightwatch source/tests/hardening/schemas/config,
synthetic fixtures, OpenSpec and task continuity records, local bounded child
processes, and C-00 integration from the owned session only.

## Non-Goals

- L/XL contained-DEV redesigns (NW-AUD-016 full, 025 full, 026, 037, 038):
  quarantined, not built.
- Owner scope, production track (C-12/C-13/C-14/P4), Phase 6 execution, any
  authorization beyond OD-3.
- New reproduction executors; ripple-api re-admission; dependency majors
  beyond a ratchet.

## Safety Constraints

- LOCAL / OFFLINE / SYNTHETIC only; the OD-3 external exceptions are exactly:
  GitHub Actions read/observe, C-00 fast-forward pushes, one bounded paid
  provider proof run, one npm registry advisory query.
- No Alphaus DEV/NEXT/production contact, authenticated Alphaus runtime,
  credentials, customer data, database/data-plane/cloud access, sibling
  writes, external publication, force push, or history rewrite.
- One writer under C-00; never mutate another owner's worktree; Alphaus
  sibling repositories stay read-only.
- Real findings stay in the owner-only local store; synthetic values only in
  repository content.

## Architecture / Approach

Work the phases strictly in order (tasks.md 1-15): owner pre-flight on
canonical (P0), one C-00 session bootstrap (M1), then the certification spine
must land before any evidence binding (M2), the CI-green deterministic spine
(M3), release-certification machinery (M4), the T1 operator-truth chains
(M5-M7), T2 contained-DEV integrity (M8), D-129 CLI/typecheck debt (M9),
residual dispositions and documentation (M10), operator proofs (M11), the
adversarial completion audit (M12), ledger closure (M13), and the close-out
choreography (M14). Each milestone: implement → validate → repair → record
exact results in STATE → commit. The final substantive commit S is pushed
alone through `integrate --expect-head S`; CI `EXECUTED_PASS` at S is observed
with `gh` and ingested; only then the documentary receipt commit lands on
approved paths.

## Milestones

### M0 — Owner pre-flight on canonical (P0; tasks 1.1-1.4)

- Objective: verify the audited base, fix A-04/A-06, and leave canonical clean
  with the planning change staged outside Git for M1 restore.
- Files/areas: `.git/nightwatch-session.v1.json` (session CLI only), orphan
  branch `session/nightwatch-successor-campaign-en-c8bcb74c`,
  `openspec/changes/nightwatch-final-product-completion-v1/audit.md`.
- Implementation actions: re-verify base and record drift in audit.md; adopt
  the RELEASED canonical MAINTENANCE record naming this task; record and
  delete the orphan branch (OD-3); strict-validate the change; move the
  planning change and task continuity staging to the session scratchpad.
- Acceptance criteria: drift recorded; canonical record names this task;
  branch `1441cc8a` recorded before deletion; canonical clean; `workspace:check`
  PASS.
- Validation commands: `git status --short --branch`, `git worktree list`,
  `npm run workspace:check`, `openspec validate
  nightwatch-final-product-completion-v1 --strict`.
- **Status:** COMPLETE

### M1 — Session bootstrap (tasks 2.1-2.3)

- Objective: one owned C-00 session worktree whose first checkpoint commits
  the planning change and this task continuity together.
- Files/areas: session worktree, `openspec/changes/nightwatch-final-product-completion-v1/**`,
  `.agent/tasks/nightwatch-final-product-completion-v1/**`, `.agent/ACTIVE_TASK.md`,
  `.agent/EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md` live-state block.
- Implementation actions: `session start` + claim; restore the planning change
  unchanged; create continuity v2 records; flip ACTIVE_TASK/EXECUTION_PROMPT to
  this campaign IN_PROGRESS; align the live-state block; run
  session/handoff/agent/project checks; one bootstrap commit.
- Acceptance criteria: checks recorded (expected failures explicitly coded);
  bootstrap commit contains the change and continuity together; C-00 topology
  invariants PASS.
- Validation commands: `npm run session:check`, `npm run handoff:check`,
  `npm run agent:check`, `npm run project:check`, `npm run workspace:check`.
- **Status:** COMPLETE

### M2 — Certification anchors and ratchets (tasks 3.1-3.7)

- Objective: make evidence bindings, document-role corrections and
  `LIVE_TASK_STATUS` checkpoint-neutral before any evidence is bound (A-01,
  R2-N6), with project:check evidence assertions and the ledger/ratchet
  guards.
- Files/areas: `src/core/source/censusFigureLedger.ts`,
  `config/release-evidence.v1.json` (new), `config/document-role-corrections.v1.json`
  (new), `bin/project-state-check.mjs`, `bin/run-shards.mjs`,
  `bin/lib/openspec-ledger.mjs`, hardening rules/probes, tests.
- Implementation actions: derive `LIVE_TASK_STATUS` from `.agent/ACTIVE_TASK.md`;
  register the two binding files in `APPROVED_CHECKPOINT_PATHS` behind a
  diff-shape guard; add the hardening probe and the project:check assertions;
  install the per-file bin type-check ceiling ratchet; require disposition
  tokens on struck ledger items and report BLOCKED tasks as their own class.
- Acceptance criteria: a task open/close passes with no `src/` edit; a
  non-binding mutation classifies substantive; strict positive/negative tests.
- Validation commands: focused suites, `npm run gate:dev`, `npm run gate:milestone`.
- **Status:** COMPLETE

### M3 — CI-green, deterministic and hermetic spine (tasks 4.1-4.13)

- Objective: exact-head CI green and deterministic at the new anchor; honest
  skip identity; sibling-hermetic `gate:clean`; `gate:topology` and the UI lane
  in certification; HANDOFF_TRUTH classified for session-declared pushes;
  CI runtime pinned and current (R2-01/N1/N2/N3, D-02/D-04/D-05/D-10/11/12/18/19/24,
  X-02/X-08, NW-AUD-001).
- Files/areas: `tests/unit/c03GrpcTopology.test.ts`,
  `tests/unit/reviewStore.test.ts`, `tests/unit/observerSemanticLedger.test.ts`,
  `bin/campaign-synthetic.mjs`, `bin/quality-gate*.mjs`, `bin/gate-topology.mjs`,
  `bin/run-shards.mjs`, `bin/planner-handoff-check.mjs`/session authority,
  `.github/workflows/hardening.yml`, skip-policy tooling, tests.
- Acceptance criteria: CI `EXECUTED_PASS` observed at the spine checkpoint;
  undeclared skips fail; `gate:clean` sibling-absent by default with measured
  sibling identity; UI gate group in local/ci/clean modes.
- Validation commands: focused suites, `npm run gate:milestone`, `gh` CI
  observation (OD-3).
- **Status:** IN_PROGRESS

### M4 — Release-certification machinery (tasks 5.1-5.7)

- Objective: the seven unimplemented release probes wired (G14/G17/G18/G19/G21/G12,
  G20 accessibility record), `implemented` honesty rule, post-certification
  demotion semantics (X-04), schema DECIDED state (A-19/A-20), CI block-record
  wiring (A-14/D-03).
- Files/areas: `src/core/releaseCertification/**`, `bin/project-state-check.mjs`,
  `bin/schema-lifecycle.mjs`, `bin/agent-state.mjs`, CI block record, tests.
- Acceptance criteria: every wired check reports `implemented:true` only when
  wired; a later substantive commit demotes to a truthful report instead of
  breaking the gate; focused + `gate:milestone` PASS.
- **Status:** NOT_STARTED

### M5 — Autonomous hunt result integrity (tasks 6.1-6.17)

- Objective: durable identity-bound AgentFindingRecords, truthful terminated
  resume, reasoner-identity/budget/maxTurns binding, provider-failure taxonomy,
  bounded interruptible execution, Git-HEAD reproduction provenance, truthful
  `findings` output (C-01..C-29, NW-AUD-044/045/046/047).
- Files/areas: `src/core/localInvestigation`, `src/core/agentRuntime`,
  `src/core/reasoner`, `src/core/ownerLocalReproduction`, `src/core/triage`,
  `src/core/campaign`, `bin/nightwatch-agent.mjs`, `bin/nightwatch.mjs`,
  `bin/nightwatch-reasoner-print.mjs`, tests, private owner-local state schema.
- Acceptance criteria: run→resume regression on one state dir; atomic record
  write before checkpoint deletion; dead-provider and signal regressions;
  deterministic fake-reasoner synthetic hunt suite registered in the gate.
- **Status:** NOT_STARTED

### M6 — Finding truth surfaces and Control Center data (tasks 7.1-7.11)

- Objective: dossier readiness verdict, total status projection, role-typed
  replay contexts, `campaign-state/` subtree, Control Center
  Runs/Findings/Safety views with real data, one sibling-root resolver, honest
  synthetic labelling (B-01/B-02/B-10/B-11/B-12/B-17/B-18, C-08/09/10/20/21/22/25,
  X-01, NW-AUD-025/029/048).
- Files/areas: `src/controlCenter/**`, `src/core/triage`, `src/core/campaign`,
  `ui/control-center/**`, tests (unit + UI + browser).
- Acceptance criteria: no READY verdict from a non-READY dossier; newest-N run
  window with truncation truth; UI typecheck/test/build green.
- **Status:** NOT_STARTED

### M7 — Narrowed source, semantic and configuration over-claims (tasks 8.1-8.5)

- Objective: narrow NW-AUD-012/036/039/040 to what is proven, with tests
  proving the narrower claims.
- Files/areas: `src/core/source/**`, launchers, semantic receipt surfaces,
  analyzers, tests.
- Acceptance criteria: unknown `.env` keys refused; HEAD re-check and digest
  mismatch refusal; incomplete evidence never PASS; HEURISTIC results excluded
  from proven candidate selection.
- **Status:** NOT_STARTED

### M8 — Contained-DEV lane integrity (tasks 9.1-9.13)

- Objective: fix the T2-FIX S/M contained-DEV defects and quarantine the
  T2-GATE redesigns behind the DEV-lane precondition registry (NW-AUD-015/021/022/023/024/028/035/043,
  R2-02/03/04/05/06/07/08).
- Files/areas: `src/browser/**`, `src/proxy/**`, `src/auth/**`,
  `src/core/evidence/runRecorder.ts`, phase7 harness, hardening mutation
  probes, tests.
- Acceptance criteria: launcher refusal with owner token for quarantined
  lanes; adversarial matrices green; the full probe campaign runs after
  committed probes.
- **Status:** NOT_STARTED

### M9 — D-129 debt: CLI contract and bin type-check (tasks 10.1-10.6)

- Objective: all 76 entry points on the shared CLI contract and bin
  type-check BLOCKING with 0 exemptions (A-12/A-13/B-05/B-06/B-07/D-13/D-14,
  X-03/X-12, R2-58).
- Files/areas: all `bin/*.mjs`, `config/bin-typecheck.v1.json`, shared parser
  rule + probe, README claim, `bin/run-shards.mjs` batches.
- Acceptance criteria: 76/76 conformance; zero diagnostics; the gate lane is
  blocking; declared deletions for retired bins.
- **Status:** NOT_STARTED

### M10 — Residual dispositions, quality debt and behaviour documentation (tasks 11.1-11.7)

- Objective: T3/T4 S-fixes, one DECISIONS entry per ACCEPTED_RESIDUAL item,
  DECISIONS D-144 plus the behaviour entries, SAFETY_MODEL/ARCHITECTURE
  updates, dependency assessment extension (D-08/D-09).
- Files/areas: `docs/DECISIONS.md`, `docs/SAFETY_MODEL.md`,
  `docs/ARCHITECTURE.md`, affected source, ratchets, tests.
- Acceptance criteria: every residual decision is owner-signed with a revisit
  trigger; docs contradict no implemented behaviour.
- **Status:** NOT_STARTED

### M11 — Operator proofs (tasks 12.1-12.5)

- Objective: README operator quickstart matching CLI help; deterministic
  synthetic hunt receipts; the one authorized bounded paid proof run (OD-3);
  owner-local AgentFindingRecord verification; clean-clone install proof.
- Files/areas: README, `bin/nightwatch.mjs` flags, `bin/campaign-synthetic.mjs`,
  receipts (owner-local), `gate:clean`.
- Acceptance criteria: receipts record provider calls, source actions,
  reproduction attempts, admissions/refusals, sibling identity before/after,
  and the leak scan; a blocked provider records
  `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION` as EXTERNAL.
- **Status:** NOT_STARTED

### M12 — Adversarial completion audit (tasks 13.1-13.2)

- Objective: read-only adversarial lanes attack the completed surfaces; every
  reproduced defect gets a fix plus regression (T0/T1) or a census
  disposition; affected gates re-run.
- **Status:** NOT_STARTED

### M13 — Ledger closure and live-rendered documentation (tasks 14.1-14.6)

- Objective: NW-AUD originals reconciled with SHA citations; stale task
  records terminal; every change archived with its disposition; documentation
  rendered from live `project:check` and `gh` output; `openspec validate
  --all --strict` PASS with exactly one active change remaining (this one).
- **Status:** NOT_STARTED

### M14 — Close-out choreography and certification (tasks 15.1-15.7)

- Objective: full authoritative validation set at S; final substantive commit S
  pushed alone via `integrate --expect-head S`; CI `EXECUTED_PASS` at S
  ingested; release and worktree removal; canonical gate trio; documentary
  receipt commit; archive this change; terminal topology proof; final
  13-section completion report.
- **Status:** NOT_STARTED

## Validation Strategy

Focused suites and `npm run gate:dev` during implementation; relevant suites
plus `npm run gate:milestone` at each milestone commit; `npm run gate:local`
for groupings; full certification only for the justified release grouping at
S. Continuity/session truth via `npm run session:check`, `npm run agent:check`,
`npm run project:check`, `npm run workspace:check`, `npm run handoff:check`.
Never classify a missing, unknown, all-skipped, or zero-executed validation
result as PASS.

## Decision Log

- 2026-09-25 — Decision: adopt the released canonical MAINTENANCE record for
  this task and release it inside P0, staging the continuity record transiently
  in canonical because `release` binds continuity against
  `.agent/ACTIVE_TASK.md` + `.agent/tasks/<id>/STATE.md` bytes (measured
  `SESSION_CONTINUITY_MISMATCH` otherwise). Reason: tasks.md 1.4 requires a
  released claim AND a clean canonical before `session start`; evidence:
  `bin/lib/session-authority.mjs admitContinuity`, commit `b0f9b1f2`.
  Consequence: canonical is clean at P0 end; the full continuity is restored
  and committed in the M1 bootstrap checkpoint.
- 2026-09-25 — Decision: `PROJECT_VERDICT_EFFECT: PRESERVE`. Reason: D-98
  semantics; the current project state projects `OPERATIONALLY_ACCEPTED` and
  an IN_PROGRESS task may preserve it only with PRESERVE (the campaign works
  toward the D-129 terminal verdict at S without falsifying interim truth).

## Discoveries

- P0 pre-flight reproduced the audited baseline exactly; one numeric drift
  (`status:local` open-items 188, not the audit's inline 75) is recorded in
  `audit.md`'s pre-flight drift record.
- `release` continuity admission (record task == ACTIVE_TASK task, resolvable
  STATE, status compatibility) makes the literal P0 ordering require the
  transient activation staging described in the Decision Log.

## Deferred Work

- T2-GATE contained-DEV redesigns (NW-AUD-016 full, 025 full, 026, 037, 038):
  quarantined behind the DEV-lane precondition registry (M8).
- TF external prerequisites (production track, DEV storage re-capture,
  ripple-api re-admission, owner-gated legacy migration) stay owner actions
  with revisit triggers; recorded per OD-1.

## Completion Criteria

Exactly those in `SPEC.md`: all 228 items dispositioned (OD-1);
`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129 with CI `EXECUTED_PASS` at S
(OD-2); bin type-check BLOCKING 0 exemptions and 76/76 CLI contract (OD-2);
operator proofs recorded (OD-3); ledger closed with this change archived last;
terminal topology `main`-only, clean, equal to `origin/main`; final 13-section
completion report delivered.
