# Exhaustive repository audit and OpenSpec proposals

## Purpose

Build a complete, prioritized, implementation-ready OpenSpec remediation portfolio from a whole-repository audit without implementing any fix.

## Starting State

- Task ID: `nightwatch-exhaustive-repository-audit-proposals-v1`
- Starting Nightwatch SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Session branch: `session/nightwatch-exhaustive-repository-ef157f7a`
- Relevant architecture: local TypeScript/Playwright safety and bug-hunting framework with fail-closed environment, containment, evidence, semantic-oracle, autonomous-runtime, and control-center layers.
- Dependencies: current repository source/tests/docs, existing OpenSpec inventory, local deterministic validation commands.
- Established facts that must not be rediscovered: owner scope is frozen; real Alphaus/data/cloud execution is excluded; W12 is terminal; the W13 worktree belongs to another session.

## Scope

All tracked Nightwatch source, tests, tooling, configuration, package/dependency surfaces, task/continuity machinery, OpenSpec artifacts, and durable documentation. Write scope is limited to this task's continuity records and OpenSpec planning artifacts.

## Non-Goals

No product implementation, dependency installation or upgrade, real-environment execution, sibling-repository audit, external publishing, or mutation of existing task/proposal ownership surfaces.

## Safety Constraints

LOCAL / SYNTHETIC / READ-ONLY inspection only. C-00 remains mandatory. No credentials, customer data, authenticated evidence, network product traffic, data-plane access, cloud operations, or sibling writes.

## Architecture / Approach

Use a coverage matrix rather than ad hoc browsing. Inventory the tree and dependency/test topology, inspect each subsystem, run narrow deterministic checks for candidate findings, deduplicate against existing proposals, rank by exploitability/impact/likelihood/reachability, and create one OpenSpec change per coherent remediation boundary. Maintain an audit ledger that proves both positive findings and inspected areas with no material issue.

## Milestones

### M0 — Governed activation and coverage model

- Objective: establish C-00 ownership, continuity, required durable context, OpenSpec inventory, and a complete audit taxonomy.
- Acceptance criteria: session passes; task routing is coherent; repository areas and evidence standards are enumerated; umbrella change exists.
- Validation commands: `npm run session:status`, `npm run agent:check`, `openspec status --change nightwatch-exhaustive-repository-audit-proposals-v1 --json`
- Status: COMPLETE

### M1 — Repository topology, dependencies, configuration, and build/tooling

- Objective: inspect manifests, configs, generators, scripts, CLI/bin code, dependency posture, build/typecheck/lint/test wiring, and release/checkpoint mechanics.
- Acceptance criteria: every surface is covered; candidate issues have decisive evidence and existing-plan cross-references.
- Validation commands: focused static searches and relevant read-only validation commands.
- Status: IN_PROGRESS

### M2 — Core safety, environment, policy, proxy, process/network containment, and authentication

- Objective: audit fail-closed policy boundaries and bypass/error/lifecycle cases.
- Acceptance criteria: trust boundaries, resource cleanup, normalization, race, denial, redaction, and negative-test coverage are assessed.
- Validation commands: focused existing unit/smoke suites only.
- Status: NOT_STARTED

### M3 — Browser, API, journeys, evidence, persistence, and replay

- Objective: audit browser containment, observers, direct/API paths, artifact recording, storage, replay, minimization, and privacy behavior.
- Acceptance criteria: every ingress/egress and persisted representation has an evidence-backed disposition.
- Validation commands: focused browser/unit suites only where decisive.
- Status: NOT_STARTED

### M4 — Source intelligence, semantic oracles, expectations, and contract lifecycle

- Objective: audit source confinement/currentness, extraction/admission, projections, invariants, receipts, schema lifecycle, and stale/unavailable behavior.
- Acceptance criteria: soundness, completeness, privacy, determinism, and fail-closed behavior are assessed with boundary tests.
- Validation commands: focused semantic/source suites only.
- Status: NOT_STARTED

### M5 — Campaign, autonomous runtime, investigation, reproduction, admission, and findings

- Objective: audit scheduling, budgets, checkpoint/resume, tool authority, provider handling, reproduction, novelty, triage, and local persistence.
- Acceptance criteria: state machines, partial failure, idempotency, concurrency, evidence provenance, and anti-fabrication guarantees are assessed.
- Validation commands: focused campaign/runtime suites only.
- Status: NOT_STARTED

### M6 — Control Center and reviewer/operator surfaces

- Objective: audit server/API/UI contracts, accessibility, security headers, write authority, state freshness, scale behavior, and user-facing truthfulness.
- Acceptance criteria: server and browser paths, contracts, error states, and missing end-to-end validation are covered.
- Validation commands: focused control-center and browser tests only.
- Status: NOT_STARTED

### M7 — Continuity, workspace isolation, validation framework, tests, and documentation truth

- Objective: audit task state machines, worktree/session lifecycle, hardening gates, validators, fixtures, test quality, documentation drift, and operational reliability.
- Acceptance criteria: false-positive/false-negative and vacuity risks are assessed; missing negative/mutation/concurrency coverage is recorded.
- Validation commands: focused agent/workspace/hardening/project/OpenSpec checks.
- Status: NOT_STARTED

### M8 — Finding adjudication, severity ranking, and proposal partitioning

- Objective: reproduce or decisively substantiate candidates, deduplicate existing work, and partition material issues into coherent OpenSpec changes.
- Acceptance criteria: every candidate has evidence, severity, impact, disposition, and proposal mapping.
- Validation commands: artifact consistency checks and focused reproductions.
- Status: NOT_STARTED

### M9 — Generate all apply-ready OpenSpec changes

- Objective: create proposal, design, delta specs, and tasks for every material unresolved issue.
- Acceptance criteria: all required artifacts exist, dependencies were read, requirements have scenarios, tasks are actionable, and strict validation passes.
- Validation commands: `openspec validate <change> --strict` for every created change.
- Status: NOT_STARTED

### M10 — Completeness audit and planning checkpoint

- Objective: prove the original exhaustive objective is satisfied and no implementation file changed.
- Acceptance criteria: coverage matrix is complete; every material issue maps to a validated proposal; residual uncertainties are explicit; diff is planning-only; required checks pass.
- Validation commands: `git diff --check`, `npm run agent:check`, `npm run workspace:check`, strict OpenSpec validation, planning-only diff/privacy inspection.
- Status: NOT_STARTED

## Validation Strategy

Prefer the narrowest decisive existing tests during exploration. Validate each OpenSpec change strictly after generation. At closure, run continuity/workspace/project/hardening checks relevant to planning artifacts, inspect the entire diff and privacy surface, prove no product code changed, and follow C-00 integration policy.

## Decision Log

- 2026-09-19 — Decision: use a dedicated umbrella audit campaign and separate remediation changes; reason: exhaustive coverage needs one ledger while implementation scopes need independent ownership and acceptance criteria; evidence: original objective plus existing multi-change OpenSpec topology; consequence: no monolithic catch-all implementation plan.
- 2026-09-19 — Decision: prohibit sibling-repository exploration; reason: the objective names this codebase and AGENTS forbids broad Alphaus rediscovery; consequence: all findings derive from Nightwatch repository evidence.
- 2026-09-19 — Decision: partition mutable CI action identity into its own remediation change; reason: the action refs execute before the repository-owned gate and the current substring allowlist has an independent supply-chain trust boundary; evidence: NW-AUD-001; consequence: `nightwatch-ci-action-supply-chain-integrity-v1` extends the existing exact-head CI capability without changing implementation.

## Discoveries

- Current topology permits this seventh registered worktree under the eight-worktree bound.
- The pre-existing W13 live session remains separate and is not reused.
- Validation-universe completeness is current (494 = 257 authoritative + 237 classified, zero unclassified); the historical R-12 manifest gap is not a new finding.
- `bin/**` strict typecheck remains reporting-only, but production-completion tasks 15.7/15.11 already own that exact gap.
- The authoritative workflow's two mutable action tags and substring allowlist form the first non-duplicate material finding (NW-AUD-001).

## Deferred Work

- Implementation of every generated proposal.
- Any uncertainty requiring real Alphaus, authenticated, data-plane, or cloud evidence.

## Completion Criteria

The task is complete only when every tracked repository area has an evidence-backed audit disposition, every material unresolved issue has an apply-ready strictly validated OpenSpec change, all findings are severity-ranked and deduplicated, no product implementation changed, and the final continuity/report artifacts truthfully prove the coverage and proposal mapping.
