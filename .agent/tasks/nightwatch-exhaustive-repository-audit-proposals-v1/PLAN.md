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
- 2026-09-20 — Decision: partition exact runtime-toolchain identity into its own remediation change; reason: immutable setup-action code does not bind the Node/npm executable it selects, and the clean gate has a separate unlocked `node@20` bootstrap plus receipt-parity gap; evidence: NW-AUD-004; consequence: `nightwatch-exact-runtime-toolchain-identity-v1` introduces the toolchain-integrity capability and strengthens reproducibility without implementing it.
- 2026-09-20 — Decision: partition evidence-retention transaction auditability into its own remediation change; reason: irreversible deletion occurs between a nonterminal empty receipt and a best-effort final overwrite, so crashes and final-write failures can destroy or misreport required audit truth; evidence: NW-AUD-005; consequence: `nightwatch-retention-crash-consistent-receipts-v1` specifies append-only prepared/outcome/terminal records, exclusive apply, honest recovery, and non-success without terminal truth.
- 2026-09-20 — Decision: partition C-00 session mutation authority into its own remediation change; reason: arbitrary-root mutators authorize the selected record rather than the invoking checkout, reaching both live-owner release and foreign integration; evidence: NW-AUD-006 and zero-mutation canonical-to-session dry runs; consequence: `nightwatch-session-mutation-authority-binding-v1` strengthens the published concurrency/workspace capability without claiming hostile same-user isolation.
- 2026-09-20 — Decision: partition change-shadow offline compiler bootstrap into its own remediation change; reason: the intentionally separate full-program compiler path invokes remote-capable `npx` and mutates a fixed derivative root before compiler admission, while completed loader and certification changes do not own arbitrary developer-command bootstrap; evidence: NW-AUD-007; consequence: `nightwatch-change-shadow-offline-runtime-integrity-v1` strengthens source-analysis runtime hardening without duplicating generic CLI contracts.
- 2026-09-20 — Decision: partition local ignored-report publication integrity into its own remediation change; reason: seven report/receipt writers share unsafe direct publication but require two distinct replacement authorities, and neither retention journals nor generic CLI contracts own this boundary; evidence: NW-AUD-009; consequence: `nightwatch-local-report-publication-integrity-v1` introduces a complete writer inventory, atomic current replacement, immutable topology receipts, and non-vacuous bypass enforcement without implementation.
- 2026-09-20 — Decision: partition release evidence lineage into its own remediation change; reason: the central release evaluator accepts raw MET with absent, future, divergent, or unresolved evidence because only strict ancestors are rejected; evidence: NW-AUD-010; consequence: `nightwatch-release-evidence-lineage-integrity-v1` requires exact checkpoint equality and categorical Git resolution without advancing the project verdict.

## Discoveries

- Current topology permits this seventh registered worktree under the eight-worktree bound.
- The pre-existing W13 live session remains separate and is not reused.
- Validation-universe completeness is current (494 = 257 authoritative + 237 classified, zero unclassified); the historical R-12 manifest gap is not a new finding.
- `bin/**` strict typecheck remains reporting-only, but production-completion tasks 15.7/15.11 already own that exact gap.
- The authoritative workflow's two mutable action tags and substring allowlist form the first non-duplicate material finding (NW-AUD-001).
- CI and clean certification bind only Node major 20; the clean wrapper can execute unlocked `node@20` before validation and receipts omit exact Node/npm identity. This is the second non-duplicate material finding (NW-AUD-004).
- Evidence retention records an empty `STARTED` receipt, deletes all candidates,
  and only then best-effort overwrites the receipt; finalization failure leaves
  an `APPLIED`/`PARTIAL` result and zero exit, while interruption can erase
  per-target truth. This is the third non-duplicate material finding
  (NW-AUD-005).
- C-00 mutators accept any selected `--root`; canonical-to-live-session dry
  runs reached both ownership-record replacement and a ready fast-forward
  integration plan. Current target classification does not bind caller intent.
  This is the fourth non-duplicate material finding (NW-AUD-006).
- The offline `change:shadow` path invokes `npx tsc` twice after mutating one
  fixed compile directory; local TypeScript is absent in this worktree and its
  only process test uses the pre-compile help path. This is the fifth
  non-duplicate material finding (NW-AUD-007). Generic argument/path output
  defects on the same command are duplicate NW-AUD-008.
- Seven ignored `artifacts/**` report/receipt writers publish through direct
  directory creation and file writes; current reports can follow links or lose
  the preceding complete generation, while timestamp-only gate-topology
  receipts can overwrite history. This is the sixth non-duplicate material
  finding (NW-AUD-009).
- Release-condition evidence binding rejects only strict ancestors; null,
  later `HEAD`, missing, future, and divergent identities can retain raw MET,
  and the Git adapter collapses negative ancestry with operational failure.
  This is the seventh non-duplicate material finding (NW-AUD-010).

## Deferred Work

- Implementation of every generated proposal.
- Any uncertainty requiring real Alphaus, authenticated, data-plane, or cloud evidence.

## Completion Criteria

The task is complete only when every tracked repository area has an evidence-backed audit disposition, every material unresolved issue has an apply-ready strictly validated OpenSpec change, all findings are severity-ranked and deduplicated, no product implementation changed, and the final continuity/report artifacts truthfully prove the coverage and proposal mapping.
