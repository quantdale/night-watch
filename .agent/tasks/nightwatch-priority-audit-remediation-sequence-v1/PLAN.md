# Priority audit remediation sequence implementation

## Purpose

Implement five strict-valid audit remediations serially under one
owner-authorized C-00 campaign, then certify once and stop.

## Starting State

- Task ID: `nightwatch-priority-audit-remediation-sequence-v1`
- Starting Nightwatch SHA: `4a3df8cdc776c5ca47a9666f65afbd5c5519f092`
- Owned session: `sess-c9a1701b8a56` on
  `session/nightwatch-priority-audit-remedi-0e17af9c`
- Relevant architecture: release certification (`src/core/releaseCertification`,
  `bin/project-state-check.mjs`), child-process hardening
  (`bin/lib/hardening/rules/process-and-network.mjs`), private screening
  (`src/core/policy/privateScreening.ts`), authenticated evidence
  (`src/core/safety/redaction.ts`, `src/core/evidence/runRecorder.ts`),
  semantic admission (`src/browser/observers/networkObserver.ts`,
  `src/core/journeys/engine.ts`, `src/browser/network/fetchGuard.ts`).
- Dependencies: NW-AUD-006 authority model (landed); five planning OpenSpec
  changes strict-valid at base.
- Established facts that must not be rediscovered: Phase-0 recon on
  2026-09-22 verified all five defects live at this base; read-only censuses
  for Phases 2-5 were launched in parallel subagents.

## Scope

Nightwatch source, tests, hardening rules/probes, schemas/configuration,
synthetic Git/browser/network fixtures, synthetic private-data markers, local
child processes for bounded tests, OpenSpec/task continuity updates, and C-00
commits/integration from this owned worktree only.

## Non-Goals

Alphaus DEV/NEXT/production traffic; authenticated product execution; customer
data; real credentials; database/data-plane/cloud access; sibling mutation;
external publication; force push; history rewrite; any NW-AUD item outside
010/014/019/018/020.

## Safety Constraints

LOCAL / DETERMINISTIC / SYNTHETIC. No real secrets. No external contacts.
Serialization: one writer, five phases in fixed order. Validation cost policy:
`gate:dev` during edits, `gate:milestone` per phase checkpoint, full suite once
at final certification unless governance requires stronger.

## Architecture / Approach

Umbrella continuity owns orchestration; each remediation keeps its own
OpenSpec change and planning-task history. Implementation is serial: reproduce,
focused failing regression, implement smallest coherent fix, adversarial/
mutation proof, focused validation, coherent commit, honest OpenSpec/task
truth update, next phase. After Phase 5, cross-phase integration audit, then
one full certification, then C-00 integrate/release/remove.

## Milestones

### M0 — Campaign bootstrap

- Objective: owned session, umbrella continuity, handoff/agent/project green.
- Files/areas: `.agent/tasks/nightwatch-priority-audit-remediation-sequence-v1/`,
  `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/`,
  `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`.
- Implementation actions: start/claim C-00 session; write SPEC/PLAN/STATE/
  REPORT and umbrella OpenSpec; flip active routing and handoff to IN_PROGRESS;
  run continuity checks.
- Acceptance criteria: `session:status` PASS with owned worktree;
  `handoff:check`, `agent:check`, `project:check` PASS; workspace attention
  cleared.
- Validation commands: `npm run session:status`, `npm run handoff:check`,
  `npm run agent:check`, `npm run project:check`
- Status: COMPLETE

### M1 — Phase 1: NW-AUD-010 release evidence lineage integrity

- Objective: exact-checkpoint certification with categorical Git lineage.
- Files/areas: `src/core/releaseCertification/index.ts`,
  `bin/project-state-check.mjs`, `config/release-certification.v1.json`,
  `tests/unit/projectState.test.ts`, new synthetic Git fixtures/mutations,
  `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/`.
- Implementation actions: reproduce non-exact MET survival; implement
  relation enum + dual state + snapshot HEAD + verdict digest; synthetic Git
  matrix; mutations; update change tasks/audit truth.
- Acceptance criteria: focused release/project-state tests PASS; exact and
  non-exact matrix PASS; mutations detected; `gate:dev` and `gate:milestone`
  PASS; coherent checkpoint commit.
- Validation commands: focused Playwright project-state/release suites,
  `npm run gate:dev`, `npm run gate:milestone`
- Status: IN_PROGRESS

### M2 — Phase 2: NW-AUD-014 child-process boundary totality

- Objective: total invocation-based child-process boundary with closed
  profiles and minimal environments.
- Files/areas: `bin/lib/hardening/rules/process-and-network.mjs`,
  wrappers/consumers across `bin/`, census registry, sentinel env tests,
  `openspec/changes/nightwatch-child-process-boundary-totality-v1/`.
- Implementation actions: AST census; classify every invocation; close highest
  authority leaks; bounds/termination; sentinel and mutation proof; update
  change truth.
- Acceptance criteria: zero unknown invocation nodes; environment sentinel
  tests PASS; timeout/output/termination tests PASS; hardening probes PASS;
  `gate:dev`/`gate:milestone` PASS; coherent checkpoint.
- Validation commands: focused subprocess/hardening suites, `npm run gate:dev`,
  `npm run gate:milestone`
- Status: NOT_STARTED

### M3 — Phase 3: NW-AUD-019 private payload structural screening

- Objective: structure as primary privacy authority with total consumer
  census.
- Files/areas: `src/core/policy/privateScreening.ts`,
  `src/core/policy/privateArtifacts.ts`, private-store writers/readers,
  Control Center readers, hardening, privacy tests,
  `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/`.
- Implementation actions: reproduce quoted-key bypass; closed schemas/DTOs;
  writer/reader census; adversarial corpus; mutations; update change truth.
- Acceptance criteria: structural privacy tests PASS; reader/write
  revalidation PASS; consumer census PASS; privacy hardening PASS;
  `gate:dev`/`gate:milestone` PASS; coherent checkpoint.
- Validation commands: focused private-artifact/privacy suites,
  `npm run gate:dev`, `npm run gate:milestone`
- Status: NOT_STARTED

### M4 — Phase 4: NW-AUD-018 authenticated evidence minimization

- Objective: total typed persistence firewall with provenance-bound routes.
- Files/areas: `src/core/safety/redaction.ts`,
  `src/core/evidence/runRecorder.ts`, authenticated writers, publication
  primitives, privacy tests,
  `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/`.
- Implementation actions: reproduce minimization bypasses; route-template
  proof; writer census + final firewall; transition/publication integrity;
  reuse Phase 3 primitives where correct; mutations; update change truth.
- Acceptance criteria: route minimization, writer census, firewall,
  transition, publication, and privacy mutation tests PASS;
  `gate:dev`/`gate:milestone` PASS; coherent checkpoint.
- Validation commands: focused redaction/evidence suites, `npm run gate:dev`,
  `npm run gate:milestone`
- Status: NOT_STARTED

### M5 — Phase 5: NW-AUD-020 semantic request admission

- Objective: pre-effect semantic egress authority with causal generations and
  transport-total enforcement.
- Files/areas: endpoint semantics, journey engine, network observer, fetch
  guard, CDP/WebSocket/proxy paths, hardening, safety tests,
  `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/`.
- Implementation actions: reproduce passive/late/redirect gaps; admission
  handle; generation semantics; cross-layer binding; adversarial matrix with
  zero-upstream proof; mutations; update change truth.
- Acceptance criteria: endpoint/journey/browser/CDP/proxy/WebSocket and
  hardening tests PASS; refused requests open zero upstream connections;
  `gate:dev`/`gate:milestone` PASS; coherent checkpoint.
- Validation commands: focused safety/browser/proxy suites,
  `npm run gate:dev`, `npm run gate:milestone`
- Status: NOT_STARTED

### M6 — Cross-phase audit, full certification, C-00 closure

- Objective: integration review, single full certification, integrate/release/
  remove, terminal report and routing.
- Files/areas: cross-subsystem tests as required; all five OpenSpec task
  ledgers; umbrella REPORT/STATE; ACTIVE_TASK terminal flip; docs as needed.
- Implementation actions: run cross-phase checks; full certification suite;
  strict-validate five changes + umbrella; integrate with exact expectations;
  release/remove; final report sections A-N.
- Acceptance criteria: all DoD items met; safety counts zero; remaining audit
  backlog listed and not started; verdict exactly COMPLETE (or honest
  PARTIAL/FAILED).
- Validation commands: full certification list from the campaign prompt
  (typecheck, hardening, agent/handoff/project/workspace/session,
  `validation:universe`, strict OpenSpec, `npm test`, `gate:local`,
  `gate:clean`)
- Status: NOT_STARTED

## Validation Strategy

During implementation: focused tests + `npm run gate:dev`. Per phase
checkpoint: relevant focused suites + `npm run gate:milestone`. Heavy suites
only when subsystem materially changed. Full certification once after Phase 5.
Never skip a mandatory invariant; never inflate timeouts to force green.

## Decision Log

- 2026-09-22 — Follow the NW-AUD-006 precedent: one umbrella implementation
  campaign task + umbrella OpenSpec for handoff/continuity; the five
  remediation OpenSpec changes and planning tasks retain their own identities
  and planning-only history.
- 2026-09-22 — Phase order is fixed 010 -> 014 -> 019 -> 018 -> 020 so structural
  privacy primitives exist before authenticated-evidence reuse, and semantic
  admission (largest blast radius) lands last.
- 2026-09-22 — Phase-0 recon found all five defects still live at `4a3df8cd`;
  none is superseded.

## Discoveries

- `handoff:check` requires the active campaign OpenSpec route to contain
  tracked `audit.md` + `proposal.md` + `design.md` + `tasks.md` + specs; the
  five remediation changes intentionally lack `audit.md` (planning-only), so
  the umbrella change carries the campaign audit artifact.
- Session `start` leaves a STALE released record; `claim --adopt
  --expect-session` replaces it and mints the live session ID
  `sess-c9a1701b8a56`.
- `integrate` compatibility accepts task status IN_PROGRESS or COMPLETE;
  phase commits stay on the session branch until final integration.

## Deferred Work

- Any NW-AUD finding outside the five named remediations (including NW-AUD-021).
- External exact-head CI execution (billing-blocked; not claimed).

## Completion Criteria

All five remediations implemented and certified as specified in SPEC
acceptance criteria, with C-00 closed and `HEAD == origin/main`.
