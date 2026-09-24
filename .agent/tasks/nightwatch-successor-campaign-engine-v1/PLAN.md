# Successor campaign engine v1

## Purpose

Run a fresh, evidence-led successor campaign loop from the certified baseline,
without reopening the completed priority remediation campaign.

## Starting State

- Task ID: `nightwatch-successor-campaign-engine-v1`
- Certified baseline SHA: `78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1`
- Resumed session: `sess-e6985828f7b7`
- Branch: `session/nightwatch-successor-campaign-en-628d8bb9`
- Relevant architecture: C-00 worktree governance; browser/network containment;
  run evidence and privacy; campaign/reasoner efficacy; validation/release
  receipts; Control Center; subprocess/L6 boundaries.
- Dependencies: previous priority campaign COMPLETE; NW-AUD-006 authority
  binding COMPLETE; current OpenSpec audit backlog is input, not authority.
- Established facts: fresh discovery found concrete remaining candidates in
  evidence-bundle transaction integrity, credential-use binding, semantic
  admission residual proof, subprocess census indirection, proxy-event
  persistence, shard receipt truth, and measured semantic-compatibility
  latency. The canonical blocker is resolved; A/B reproduction is now the
  immediate gate.

## Scope

Nightwatch source, tests, hardening, schemas, synthetic fixtures, OpenSpec and
continuity records, and C-00 commits/integration from the owned worktree only.

## Non-Goals

No real environment/authenticated execution, credentials, customer values,
database/cloud access, sibling writes, external publication, force push,
history rewrite, or reopening the prior completed campaign.

## Safety Constraints

LOCAL / SYNTHETIC / DETERMINISTIC. One writer. Preserve any new unexpected
canonical mutation. Do not run mutating validation while C-00 workspace status
is FAIL.

## Architecture / Approach

First revalidate the six provisional findings against the now-clean live
source. Mechanically reproduce shard false certification and run-evidence
transaction integrity using synthetic/local fixtures. Select one campaign by
impact × confidence × executability ÷ risk, then use the loop: reproduce,
define invariants, design, implement, add adversarial tests, run focused
checks and `gate:dev`, review, run `gate:milestone`, reconcile state, commit,
reassess, and repeat. Use full certification only at release groups.

## Milestones

### M0 — Fresh reassessment and C-00 bootstrap

- Objective: verify baseline, resolve the owner-attested canonical mutation,
  recover continuity without blind integration, and retain read-only discovery.
- Files/areas: `.agent/tasks/nightwatch-successor-campaign-engine-v1/**`,
  session worktree metadata, read-only reports outside Git.
- Implementation actions: bootstrap and owner resolution only; no product
  source changes.
- Acceptance criteria: canonical clean, `session:status` PASS, task/session
  identity coherent, no unauthorized effect.
- Validation commands: `git status`, `git diff --check`,
  `npm run session:status`.
- **Status:** COMPLETE

### M1 — Revalidate and reproduce the two strongest integrity candidates

- Objective: mechanically prove or disprove shard false certification and
  run-evidence transaction integrity on current source.
- Files/areas: `bin/run-shards.mjs`, `src/core/evidence/runRecorder.ts`,
  focused synthetic fixtures/tests, task evidence.
- Implementation actions: add no product fix yet; write isolated reproductions
  and record exact observed behavior.
- Acceptance criteria: both reproductions are deterministic, local/synthetic,
  and distinguish the claimed failure modes from controls.
- Validation commands: focused existing tests plus isolated fixture commands;
  no full certification yet.
- **Status:** COMPLETE

### M2 — Select and execute first successor campaign

- Objective: choose the strongest executable candidate after M1 evidence.
- Files/areas: `bin/run-shards.mjs`, a machine-readable shard result seam,
  focused validation tests, and the dedicated
  `nightwatch-shard-certification-integrity-v1` OpenSpec/task artifacts.
- Implementation actions: define acceptance, implement root cause, add
  adversarial regression, validate, adversarially review, checkpoint.
- Acceptance criteria: exact invariant and non-vacuous negative tests; no
  safety counter regression; focused and milestone gates pass.
- Validation commands: focused suites, `npm run gate:dev`, then
  `npm run gate:milestone`.
- **Status:** BLOCKED

### M3 — Child-process census indirection successor

- Objective: execute the selected child-process census indirection child after
  the shard child's classified gate blocker.
- Files/areas: `bin/lib/childProcessCensus.mjs`, process/network hardening,
  focused census tests, and the dedicated child artifacts.
- Implementation actions: reproduce supported namespace/alias forms, implement
  total discovery and unknown refusal, add mutations, validate, checkpoint.
- Acceptance criteria: supported indirection is discovered; unresolved imports
  fail closed; focused and milestone evidence is recorded.
- Validation commands: focused suite, `npm run gate:dev`, then
  `npm run gate:milestone`.
- **Status:** BLOCKED

### M4 — Run-evidence transaction integrity successor

- Objective: execute the selected run-evidence transaction child after the
  shard/census gate residuals were classified.
- Files/areas: `src/core/evidence/runRecorder.ts`, focused evidence tests,
  and the dedicated child artifacts.
- Implementation actions: reproduce same-run/torn-tail failures, implement
  exclusive identity, durable append acknowledgement, and fail-closed
  finalization, add mutations, validate, checkpoint.
- Acceptance criteria: no false PASS after detected durable divergence; normal
  recorder behavior remains green; residuals are explicit.
- Validation commands: focused evidence suite, `npm run gate:dev`, then
  `npm run gate:milestone`.
- **Status:** BLOCKED

### M5 — Popup L0 reproduction (deferred)

- Objective: reproduce the fire-and-forget popup guard race and determine
  whether a safe pre-navigation target barrier is locally implementable.
- Files/areas: `src/browser/context.ts`, synthetic browser fixtures, and the
  retained reproduction record.
- Implementation actions: reproduce the race; test a page-admission prototype;
  revert it when the first popup navigation bypasses the L1 barrier.
- Acceptance criteria: no false fix is claimed; the residual is explicitly
  classified for a future lower-level CDP target design.
- Validation commands: focused popup fixture and source inspection.
- **Status:** BLOCKED

### M6 — Proxy raw-event persistence successor

- Objective: close the raw configured proxy event-log write outside the
  authenticated recorder firewall and writer census.
- Files/areas: `src/proxy/events.ts`, `src/proxy/server.ts`,
  authenticated writer census/hardening, focused synthetic tests.
- Implementation actions: reproduce raw append before recorder projection,
  define a narrow owner-bound firewall/permissions contract, implement,
  adversarially test, validate, checkpoint.
- Acceptance criteria: raw authenticated event-log writes cannot bypass the
  final firewall or census; local unauthenticated behavior remains compatible.
- Validation commands: focused proxy/privacy tests, `npm run gate:dev`, then
  `npm run gate:milestone`.
- **Status:** BLOCKED

### M7 — Credential-use binding successor

- Objective: prevent credentials from entering a document/form that changed
  after preflight approval.
- Files/areas: `src/auth/devAutoLogin.ts`, `src/auth/loginForm.ts`, guarded
  browser capability code, synthetic auth security tests.
- Implementation actions: reproduce navigation/DOM/form replacement between
  retrieval and effects; implement a one-shot, revalidated, fail-closed binding.
- Acceptance criteria: no secret-bearing effect occurs after any identity/
  route/form/proxy/source drift; no real credential or target is used.
- Validation commands: focused auth/security tests, `npm run gate:dev`, then
  `npm run gate:milestone`.
- **Status:** BLOCKED

### M8 — Shard temporary-namespace isolation

- Objective: prevent parallel shard processes from sharing ambient OS temporary
  state and cross-perturbing validation tests.
- Files/areas: shard child environment, `run-shards.mjs`, generated bin types,
  focused process-level tests, and the dedicated child artifacts.
- Implementation actions: derive one run-unique private temp root per shard,
  preserve the allowlist/proxy stripping, add malformed-input refusal, and clean
  only the invocation-owned scratch root.
- Acceptance criteria: actual child `os.tmpdir()` values are distinct; inherited
  temp/proxy state cannot survive; existing shard semantics remain green.
- Validation commands: focused process/shard tests, `gate:dev`, then
  `gate:milestone`.
- **Status:** BLOCKED

### M9 — Live-source test hermeticity/currentness

- Objective: make the 12 residual source-intelligence tests deterministic across
  absent, stale, and exact-current sibling source without changing pins.
- Files/areas: test-only source authority helper and affected C-02/C-03/C-04/C-07,
  explain-surface, Phase 9, and Phase 12 tests.
- Implementation actions: classify source state, gate live historical assertions,
  use deterministic Git-backed fixtures, and correct run-local immutability.
- Acceptance criteria: no skip/rebind/count rewrite; synthetic controls always
  execute; exact-current live measurements remain available.
- Validation commands: affected suites under live/empty/stale/current states,
  `gate:dev`, then `gate:milestone`.
- **Status:** IN_PROGRESS

### M10 — Final adversarial reassessment and closure

- Objective: prove a legitimate terminal condition and reconcile final truth.
- Files/areas: task/report/OpenSpec/project-state surfaces as required.
- Implementation actions: final safety/privacy/evidence/efficacy/lifecycle/
  performance/UX/release/governance review; certification only if warranted.
- Acceptance criteria: no credible executable issue is silently deferred; final
  verdict and remaining work are precise.
- Validation commands: repository-defined certification battery as justified.
- **Status:** NOT_STARTED

## Validation Strategy

Use read-only discovery and cheap checks first. Use focused tests and
`gate:dev` for implementation. Use subsystem suites and `gate:milestone` at
campaign checkpoints. Reserve `npm test`, `gate:local`, and `gate:clean` for
release groupings or terminal closure. Never hide a red gate or classify it
green without understanding the cause.

## Decision Log

- 2026-09-24 — Owner authorized restoration of only `docs/CURRENT_STATE.md`
  after exact patch comparison and mechanical classification as unintended
  formatter/editor churn. The CSS fallback edit `#fff` -> `# fff)` was invalid
  and contradicted its surrounding prose; all other hunks were whitespace,
  table-separator, blank-line, or backtick-spacing churn.
- 2026-09-24 — Treat `1441cc8aa8c430ccffc743c99e4d9974d54d06dc` as durable
  discovery/continuity evidence, not as a blind integration candidate.
- 2026-09-24 — Treat fresh discovery as a successor backlog, not as permission
  to edit the completed priority campaign or assume NW-AUD-021 priority.
- 2026-09-24 — Select shard false certification first; its implementation is
  checkpointed, while the broad gate residual is classified as baseline/source
  drift.
- 2026-09-24 — Select child-process census indirection next. The reproduced
  namespace-require/method-alias bypass has high confidence and a small, bounded
  safety-authority correction; it is now checkpointed but BLOCKED by broad-gate
  residuals.
- 2026-09-24 — Select run-evidence transaction integrity next. Its synthetic
  reproduction directly demonstrates false passing summaries and lost durable
  state, giving it higher immediate correctness impact; it is now checkpointed
  but BLOCKED by the same broad source-drift residual.
- 2026-09-24 — Popup L0 readiness was reproduced but the attempted L1/page-event
  barrier did not intercept the first popup navigation; it was reverted and is
  deferred for a lower-level CDP target design.
- 2026-09-24 — Proxy raw-event persistence is implemented and focused/mutation
  validated, but its broad gate is blocked by 12 baseline/source-drift failures.
- 2026-09-24 — Select credential-use binding next. The remaining High-severity
  candidate has a direct synthetic post-precheck navigation/form race and a
  bounded fail-closed local test surface.
- 2026-09-25 — Credential clean milestone retained 12 independent live-source
  drift failures. The earlier parallel-only `reviewStore.test.ts` failure passed
  in isolation and is selected as M8 because inherited shard temp state is a
  concrete, bounded validation-integrity defect.
- 2026-09-25 — Isolation milestone retained the same 12 failures. An
  explicit-empty-sibling replay left 11 failing, selecting source-test
  hermeticity as M9. Popup remains lower-confidence/higher-risk design work.

## Discoveries

- Canonical is now clean at the certified baseline; C-00 status passes before
  the resumed writing session.
- Fresh lanes independently found: a high-value run-evidence bundle
  transaction gap; a high-value proxy raw-event persistence boundary not
  covered by the authenticated writer census; a concrete child-process census
  indirection bypass; a high popup L0 installation race; a shard-runner
  all-skipped/zero-executed false-PASS risk; and a measured semantic-
  compatibility bottleneck.
- The previous campaign's NW-AUD-018 killed-write/concurrent-recorder and
  NW-AUD-020 async/popup/frame/worker and stale-currentness items remain honest
  partials, not reopened history.

## Deferred Work

The live-source drift hermeticity/currentness child and popup L0 readiness remain
after shard temp isolation. The completed priority campaign remains terminal.

## Completion Criteria

A future completion requires a clean canonical checkout, a coherent active
task/session, fully implemented and validated successor campaigns (or
documented external exhaustion), periodic reassessment evidence, truthful
OpenSpec/task closure, and final C-00 integration/release/remove with
`HEAD == origin/main`.
