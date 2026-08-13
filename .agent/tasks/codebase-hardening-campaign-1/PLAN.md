# Nightwatch Codebase Hardening Campaign I

## Purpose

Make the already-running private Nightwatch campaign stack fail closed when
durable inputs, resume state, process environment, filesystem context, policy
provenance, or owner-facing summaries are stale, malformed, or misleading.
The observable outcome is a locally validated hardening baseline, not new
product coverage.

## Starting State

- Task ID: `codebase-hardening-campaign-1`
- Starting Nightwatch SHA: `c14aebff9ae85814aa31f518e7f8fa4afbdeb7da`
- Relevant architecture: `src/core/campaign/` is the Phase 7 orchestrator;
  `src/core/policy/ownerScope.ts` is the owner freeze; `src/core/safety/` and
  `src/proxy/` are the canonical product egress boundaries; private triage
  writes outside the repository.
- Dependencies: existing Phase 2C/3/4/5, private-triage, safety, and
  continuity contracts remain authoritative and must be reused.
- Established facts that must not be rediscovered: Phase 7 is complete and
  historical; Phase 6 is frozen; the source remote is private `origin/main`;
  real findings and auth state are external-only; no real campaign is needed
  for this hardening task.

## Scope

Audit and, where evidence supports it, repair the manifest/checkpoint,
budget, process, filesystem, environment-policy, real-target, Oops,
morning-brief, typecheck/static, CI, continuity, privacy, and maintainability
boundaries listed in SPEC. Record rejected hypotheses and deferred work when
the current implementation already satisfies a concern or a safe repair is
not justified.

## Non-Goals

No new bug-hunting feature, Phase 8, real DEV execution, infrastructure/data
work, Alphaus repository mutation, credentials, private artifact ingestion,
external publication, broad dependency/framework upgrade, or unprotected
large refactor.

## Safety Constraints

All validation is local/synthetic/static/fixture-based. Product network,
production, DEV, NEXT, databases, infrastructure, and external publication
must remain at zero. Child-process fixtures receive fake sentinel strings only.
Any source checkpoint pushed to the private remote must be validated,
privacy-scanned, diff-checked, committed intentionally, and verified with
`HEAD == origin/main`; force-push is prohibited.

## Architecture / Approach

Use a small set of typed runtime boundaries rather than trusting interfaces:

1. Canonical manifest and checkpoint validators reconstruct identities,
   validate ledger/resource arithmetic, and return sanitized fail-closed
   classifications before orchestration callbacks.
2. A deterministic planner accounts for mandatory coverage and bounded
   reproduction reserve within the existing real profile; impossible policy
   combinations are rejected or explicitly represented before freeze.
3. One explicit child-environment builder is shared by authenticated launchers
   and auth-capture where compatible with the human flow. Every child process
   site is classified for shell, argv, cwd, timeout, output, and provenance.
4. Private artifact/config roots use stable repository/config roots, safe path
   resolution, atomic owner-only writes, and adversarial synthetic fixtures.
5. Target policy, Oops provenance, brief semantics, continuation fields, and
   static checks are strengthened only where current code demonstrates a gap.
6. The orchestrator is decomposed only at cohesive, characterized boundaries;
   if extraction does not improve auditability with low risk, it is deferred.

## Milestones

### M0 — Recovery, task creation, and threat-model freeze

- Objective: route the active task without reopening Phase 7 and record frozen
  scope/threat model.
- Files/areas: `.agent/ACTIVE_TASK.md`, new task `SPEC/PLAN/STATE/REPORT`.
- Implementation actions: complete bootstrap; create task files; preserve the
  Phase 7 task as `COMPLETE`.
- Acceptance criteria: `npm run agent:check` recognizes the task shape and the
  working tree contains only intended task-state changes.
- Validation commands: `npm run agent:check`, `git diff --check`.
- Status: COMPLETE

### M1 — Independent read-only review and finding ledger

- Objective: inventory trust boundaries and confirm/reject the prompt's
  probable gaps against current code and tests.
- Files/areas: campaign, process/auth launchers, policy/config, artifacts,
  Oops, briefs, tsconfig/package/CI, high-risk modules.
- Implementation actions: run up to five bounded read-only review tracks;
  record evidence, classification, and exact repair order in STATE/REPORT.
- Acceptance criteria: no implementation begins from an unverified checklist
  item; owner freeze and no-go boundaries are explicit.
- Validation commands: focused read-only inspection, existing tests as needed.
- Status: COMPLETE

### M2 — Manifest, checkpoint, continuity, and budget integrity

- Objective: make persisted campaign authority reconstructable and resume
  fail closed before executor callbacks.
- Files/areas: `src/core/campaign/{types,identity,checkpoint,budget,orchestrator}.ts`,
  tests/unit/campaign.test.ts, `bin/agent-state.mjs`, related task state.
- Implementation actions: add strict validators, tamper/corruption matrix,
  feasibility analysis, and explicit continuity SHA fields without rewriting
  historical reports.
- Acceptance criteria: all malformed/tampered fixtures reject; budget cannot
  reset; impossible reproduction promises fail or are truthfully marked.
- Validation commands: focused campaign tests, typecheck, synthetic campaign.
- Status: COMPLETE

### M3 — Process, filesystem, configuration, target, and executable boundaries

- Objective: remove arbitrary environment/CWD/provenance authority and retain
  production/owner fail-closed behavior.
- Files/areas: auth/launcher sites, `privateArtifacts.ts`, environment loader,
  real-run gate, Oops process/sandbox, tests and static checks.
- Implementation actions: canonical environment builder, sentinel fixtures,
  safe roots/permissions/symlink tests, explicit DEV-only gate, stronger Oops
  digest binding or quarantine.
- Acceptance criteria: no arbitrary parent secret reaches sensitive children;
  malicious CWD/config/symlink fixtures fail or are ignored; production and
  owner-frozen classes remain impossible.
- Validation commands: focused auth/process/filesystem/policy/Oops suites,
  static hardening check, typecheck.
- Status: COMPLETE — pushed implementation checkpoint `428cfee93e478c3730de2725d2690ad91f5ea150`

### M4 — Evidence truthfulness, privacy structure, static coverage, CI,
maintainability

- Objective: make owner summaries honest and safety-critical source easier to
  compile and independently inspect.
- Files/areas: campaign brief/triage DTOs, root configs, launchers, package
  scripts, `.github/workflows`, high-risk module tests.
- Implementation actions: distinguish L0/budget/brief states; complete TS
  includes; add proportionate JS checks/hardening command; add minimal private
  read-only CI if safe; audit dependencies and state-machine exhaustiveness.
- Acceptance criteria: brief test matrix passes; CI cannot access DEV/secrets or
  upload findings; hardening checks are deterministic and local.
- Validation commands: brief/privacy/unit suites, typecheck, hardening check,
  CI YAML inspection, agent check.
- Status: COMPLETE — included in the same validated implementation checkpoint;
  brief DTOs, TypeScript coverage, launcher checks, hardening check, and
  private read-only CI are present.

### M5 — Integrated adversarial validation and checkpoint

- Objective: exercise real validation entry points with a local fixture matrix,
  clean-checkout proof, architecture review, and final source checkpoint.
- Files/areas: integrated tests/fixtures, task state/report, project docs if
  durable architecture changed.
- Implementation actions: run required local tests serially; inspect privacy
  surface/diff; verify Alphaus repository integrity by read-only checks where
  already recorded; commit and push only validated source.
- Acceptance criteria: all applicable acceptance checks pass, no real DEV or
  prohibited operations occurred, and local/remote HEADs agree on a clean tree.
- Validation commands: full required validation ledger, `git diff --check`,
  `npm run agent:check`, `git push origin main`, `git fetch origin`.
- Status: COMPLETE — source, full-suite, clean-checkout, final state/report,
  and closure verification are recorded and pushed.

## Validation Strategy

Use focused tests after each boundary change, then serially run typecheck,
hardening/static checks, focused unit suites, campaign synthetic fixtures,
privacy/secret scans, full existing Playwright tests, `npm run agent:check`,
and `git diff --check`. Do not run `campaign:real`, auth capture, product
journeys, databases, infrastructure, or external publication. Near closure,
validate a source-only checkout without owner state or Alphaus repositories.

## Decision Log

- 2026-08-14 — Decision: create a new native hardening task rather than
  reopening Phase 7; reason: Phase 7 is durably complete and the request is a
  separate owner-approved local hardening campaign; evidence: current
  `ACTIVE_TASK.md`, Phase 7 REPORT, and clean starting Git state; consequence:
  Phase 7 history remains immutable.
- 2026-08-14 — Decision: freeze the threat model at accidental corruption,
  stale state, secret leakage, boundary confusion, and auditability defects;
  reason: the task excludes a malicious root/compromised OS; consequence: use
  structural validation and owner-only permissions without unnecessary key
  management.

## Discoveries

- Bootstrap `git fetch origin` completed after full access was enabled; local
  `HEAD` and `origin/main` both equal the reported starting SHA.
- Five bounded read-only tracks completed on 2026-08-14. Direct source
  reconciliation confirmed the manifest fingerprint, checkpoint, budget,
  child environment, filesystem/config, Oops, brief/privacy, and coverage/CI
  findings recorded in STATE.
- The hardening implementation order is M2 persistence/budget, M3 process and
  policy boundaries, then M4 brief/privacy/static/CI/auditability.

## Deferred Work

- Any real DEV regression check that cannot be proven with synthetic/local
  fixtures must be recorded as `REAL_DEV_REGRESSION_CHECK_REQUIRED` and not
  executed automatically.
- Phase 8, owner-frozen infrastructure/data operations, and external
  publication remain out of scope.

## Completion Criteria

All SPEC acceptance criteria are evidenced in STATE/REPORT; all applicable
local/synthetic/static checks pass; no prohibited activity occurs; Phase 7 and
Phase 6 statuses are preserved; a validated checkpoint is pushed to private
`origin/main`; local `HEAD == origin/main`; and the Nightwatch worktree is
clean and recoverable.
