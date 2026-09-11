# Nightwatch production completion programme

## Purpose

Turn the measured production-completion gap into closed, evidenced work:
make the ledger trustworthy, close every locally closable lane, convert
externally blocked lanes into expiring records with named owner actions,
demonstrate product yield honestly, remove or adopt dead architecture, bind
the CLI to its implementation statically, make the rule engine sound, give
persisted schemas a lifecycle, render the error taxonomy, declare the
configuration surface, produce accessibility evidence, and state a mechanical
definition of done.

## Starting State

- Task ID: `nightwatch-production-completion-programme-v1`
- Starting Nightwatch SHA: `36bd4930db978423f97e16f35250c2e66bfa112c`
- Architecture: 62 `bin/*.mjs` entry points loading `src/**` TypeScript by
  runtime string path; 319 schema literals; quality gate in
  `bin/quality-gate.mjs` with `config/quality-gate.v1.json` and
  `config/validation-universe.v1.json`; continuity v2 in `bin/agent-state.mjs`
  + `bin/agent-continuity-protocol.mjs`; workspace policy in
  `bin/workspace-integrity.mjs`; Control Center under `ui/control-center/`.
- Dependencies: OpenSpec CLI 1.6.0; Node 22; Playwright browser lane; the
  foreign live session `nightwatch-repository-hardening--e7b9be89` remains
  untouched.
- Established facts that must not be rediscovered: the baseline and findings
  in `openspec/changes/nightwatch-production-completion-programme-v1/audit.md`
  measured at `36bd493`; the permanent owner scope freeze; D-4, C-00, C-10,
  and the L6 containment envelope.

## Scope

All 21 task groups of the OpenSpec change, executed serially in one owned
session (groups are divided for ownership only; this execution is a single
writer by construction). Each group is validated independently and the
session is integrated by fast-forward, so a group's closure is a durable
checkpoint even if a later group is blocked.

## Non-Goals

Re-hardening already-proven capabilities; re-opening terminal findings;
self-authorizing owner/organizational decisions; production contact;
external publication; any change to the owner scope freeze, egress policy,
privacy firewall, or C-00.

## Safety Constraints

LOCAL only. No sibling writes. No credentials. No secrets in source,
artifacts, or `.agent`. Deletions declared under `## Declared Deletions`.
No force-push, no history rewrite, no touching another session.

## Architecture / Approach

Work in executing order: G1 → G2 → G14 → G15 → G16 → G17, then the
independent groups G3, G4, G5, G6, G7, G9, G20, G21, then G19 → G8 → G18,
then G10, G11, G12, and G13 last. Owner-decision checkpoints inside a group
are implemented as local machinery plus an explicit decision record; unless
the owner has stated a choice, the safest reversible alternative is recorded
and the decision stays open, never faked as taken. Every group registers its
checks in the validation universe and the required quality-gate groups where
the group's spec requires it, then runs the full local validation before
integration.

## Milestones

### G1 — Ledger truth and the spec baseline

- Objective: reconcile the 57 changes against 148 task records, archive every
  terminal change, publish `openspec/specs/`, and add the mechanical
  change↔task agreement check.
- Files/areas: `openspec/changes/**`, `openspec/specs/**`,
  `bin/agent-state.mjs`, `bin/nightwatch-status.mjs`,
  `config/quality-gate.v1.json`, `.agent/tasks/**`.
- Acceptance: `openspec list` has no terminal change with open boxes;
  `openspec/specs/` is non-empty; `openspec validate --all` exits zero; the
  agreement check is registered and negative-probed.
- Validation commands: `openspec validate --all`, `npm run agent:check`,
  `npm run typecheck`, `npm run hardening:check`.
- Status: IN_PROGRESS

### G2 — Validation lane state as data

- Objective: `nightwatch.validation-lane-state.v1` for all ten declared lanes
  with evidence, SHA, unblock condition and revisit date.
- Files/areas: `bin/validation-universe.mjs`, `bin/hardening-check.mjs`,
  `bin/agent-state.mjs`, `config/validation-universe.v1.json`, docs.
- Acceptance: every declared class has exactly one lane entry; non-PROVEN
  entries carry a condition; staleness is computed, never stored; negative
  probes pass.
- Validation commands: `npm run validation:universe`,
  `node bin/hardening-check.mjs`, `npm run agent:check`.
- Status: NOT_STARTED

### G3 — CI-topology clean gate and exact-head CI authority

- Objective: `gate:topology` under togglable absences; CI block record with
  run identity, block class, owner action and revisit condition; owner
  decision on the CI route.
- Files/areas: `bin/**`, `config/validation-universe.v1.json`,
  `config/quality-gate.v1.json`, `.github/workflows/hardening.yml`, docs.
- Acceptance: fail-closed path proven per absence; inverse assertion; two
  known defect classes reproduced as categorical regressions; record checks
  fail closed; owner decision recorded.
- Validation commands: `npm run gate:topology`, `npm run project:check`,
  `npm run agent:check`.
- Status: NOT_STARTED

### G4 — Operator CLI contract

- Objective: one shared parser/help/argument/exit-code/JSON contract across
  every `bin/*.mjs`; `quality-gate.mjs local --help` can never execute a gate.
- Files/areas: `bin/lib/**`, all `bin/*.mjs`, `config/validation-universe.v1.json`,
  `README.md`.
- Acceptance: non-zero sweep count; side-effect freedom under `--help`;
  exit codes 0/1/2/3/4; one JSON document on stdout; structural rule on.
- Validation commands: `npm run cli:contract` (new lane), `npm run typecheck`,
  `npm run hardening:check`.
- Status: NOT_STARTED

### G5 — Evidence lifecycle hygiene

- Objective: bounded owner-gated reclaim that actually runs; single
  Playwright output root; historical `test-results*` and scratch cleanup.
- Files/areas: `bin/evidence-retention.mjs`, `bin/nightwatch-hygiene.mjs`,
  `playwright.*.config.ts`, docs.
- Acceptance: unprovable means refused; dry-run lists exactly the removal
  set; tracked files and artifact stores untouched; footprint measured.
- Validation commands: `npm run retention:plan`, `npm run hygiene:clean` dry
  run, `git status --porcelain`.
- Status: NOT_STARTED

### G6 — Workspace and continuity drift closure

- Objective: claim-staleness as a first-class verdict; clear the stale
  canonical maintenance claim; disposition 31 legacy records and 16 branches.
- Files/areas: `bin/workspace-integrity.mjs`, `bin/agent-state.mjs`,
  `.agent/tasks/**`, docs.
- Acceptance: `CLAIM_TASK_TERMINAL`/`CLAIM_TASK_UNKNOWN` reported with
  attention; negative probes; `session:status` attention=0 after owner action;
  legacy warnings declared historical.
- Validation commands: `npm run workspace:check`, `npm run agent:check`,
  `npm run session:status`.
- Status: NOT_STARTED

### G7 — Documentation currency

- Objective: document roles, append-only archives, governed status words,
  current-truth size bound, ledger-governed status block.
- Files/areas: `docs/**`, `README.md`, `bin/hardening-check.mjs`,
  `src/core/source/censusFigureLedger.ts`.
- Acceptance: every doc has exactly one declared role; append-only enforced;
  bare stale statuses repaired by qualifier; negative probes pass.
- Validation commands: `npm run hardening:check`, `npm run project:check`.
- Status: NOT_STARTED

### G8 — Control Center residual truth

- Objective: whole-stylesheet dead-rule detection, native form-control
  runtime coverage, evidence-status taxonomy decision.
- Files/areas: `ui/control-center/**`, `tests/browser/**`,
  `config/validation-universe.v1.json`.
- Acceptance: selector reachability with both-direction exemptions; mutation
  proof; taxonomy adopted or flatness stated and guarded; UI and browser lanes
  pass.
- Validation commands: `npm --prefix ui/control-center run test`,
  `npm run control-center:ui:browser`, `npm run validation:universe`.
- Status: NOT_STARTED

### G9 — Dependency and supply-chain currency

- Objective: executed advisory assessment or recorded refusal; mechanized Vue
  review conditions; declared engines vs qualified runtimes; re-dated offline
  lockfile check.
- Files/areas: `package.json`, lockfile, `docs/HOST-CAPABILITY-MATRIX.md`,
  `bin/**`.
- Acceptance: lane reflects reality (never implied clean without execution);
  review date with interval; unqualified runtime reports unqualified.
- Validation commands: `npm run validation:universe`, `npm run agent:check`.
- Status: NOT_STARTED

### G10 — Deployment fact acquisition and the production track

- Objective: mechanical `PRODUCTION_READ_NO_DEPLOYMENT_FACT` refusal; C-08b
  critical-path record; bounded access request; owner action or honest
  closure of C-13/C-14.
- Files/areas: `src/core/source/deploymentBinding.ts`, `src/core/prodObserve/**`,
  docs, roadmap.
- Acceptance: guard mutation-proven; production-read reports unavailable with
  `POSITIVE_DEPLOYMENT_FACTS: 0`; passive observation proven passive.
- Validation commands: `npm run typecheck`, `npm test` (focused suites),
  `npm run hardening:check`.
- Status: NOT_STARTED

### G11 — Contained DEV semantic acceptance

- Objective: semantic layer reports acceptance class as data; local synthetic
  never satisfies DEV; owner decision to unblock or close permanently.
- Files/areas: `src/oracles/**`, `bin/semantic-compat.mjs`, docs.
- Acceptance: acceptance class rendered wherever capability is presented;
  Phase 9A.1 remains the only admission route; owner decision recorded.
- Validation commands: focused semantic suites, `npm run agent:check`.
- Status: NOT_STARTED

### G12 — Autonomous yield proof

- Objective: provider prerequisite recorded; strict `EXACT_REDISCOVERY` and
  previously-unknown-defect yield executed or honestly refused; measured yield
  published.
- Files/areas: `src/core/campaign/**`, `bin/**`, ledger-governed docs.
- Acceptance: pre-flight threshold enforced; false positives reported; zero
  yield stated as a result, never as an omission; leakage aborts.
- Validation commands: `npm run campaign:synthetic`, focused yield suites.
- Status: NOT_STARTED

### G13 — Release definition and verdict

- Objective: `nightwatch.release-certification.v1` extended with eight ordered
  advance conditions, each backed by a check; honest verdict.
- Files/areas: `bin/project-state-check.mjs`, `config/quality-gate.v1.json`,
  docs, task state.
- Acceptance: conditions resolve from check output; negative probe; lane
  counts carried with status; evidence SHA freshness enforced.
- Validation commands: `npm run project:check`, `npm run gate:local`.
- Status: NOT_STARTED

### G14 — Dead architecture closure

- Objective: reference graph with non-vacuous edge count; adoption or removal
  of `dtoFramework`/`adversarialCorpus`; eleven barrels resolved.
- Files/areas: `src/core/dtoFramework/**`, `src/core/adversarialCorpus/**`,
  eleven `index.ts` barrels, `bin/hardening-check.mjs`.
- Acceptance: reachability rule fails on an unreferenced module; retention
  list fails both directions; owner decision recorded.
- Validation commands: `npm run hardening:check`, `npm run typecheck`.
- Status: NOT_STARTED

### G15 — CLI-to-implementation contract

- Objective: literal loader paths, resolved paths and symbols, `tsconfig.bin.json`
  under `checkJs`, executing tests for twelve untested bins.
- Files/areas: `bin/lib/typescript-runtime-loader.mjs`, `bin/**`,
  `tsconfig.bin.json`, `config/validation-universe.v1.json`.
- Acceptance: non-zero resolved call-site count; symbol mismatches fail;
  fail-closed refusal asserted for gated launchers.
- Validation commands: `npx tsc -p tsconfig.bin.json`, new lane,
  `npm run validation:universe`.
- Status: NOT_STARTED

### G16 — Structural rule soundness

- Objective: code-only accessor, occurrence-complete totality rules, mutation
  probe per rule, decomposition of `bin/hardening-check.mjs`.
- Files/areas: `bin/hardening-check.mjs` (and new rule modules),
  `bin/**`, `tests/**`.
- Acceptance: five raw-source assertions converted and mutation-proven; 70
  rules report a detected mutation; byte-identical output after
  decomposition.
- Validation commands: `node bin/hardening-check.mjs`,
  `npm run rule-mutation` (new).
- Status: NOT_STARTED

### G17 — Schema version lifecycle

- Objective: declare all schema literals persisted/in-memory; migration
  dispositions; `VERSION_UNSUPPORTED` distinct from `CORRUPT`; sanitized
  export.
- Files/areas: `src/**` schema literals, `src/core/reviewStore/**`,
  `src/core/campaign/checkpoint.ts`, `ui/control-center/**`.
- Acceptance: undeclared literal fails; disposition required on bump;
  `READ_COMPATIBLE` fixture per version; `ORPHAN` only from `docs/DECISIONS.md`.
- Validation commands: new schema-lifecycle lane, `npm run typecheck`,
  focused review-store suites.
- Status: NOT_STARTED

### G18 — UI error taxonomy rendering

- Objective: render all five `ApiErrorKind`s distinguishably; failure-path
  differential harness; partial composition disclosure.
- Files/areas: `ui/control-center/src/**`, `tests/browser/**`.
- Acceptance: kind-driven coverage assertion (a sixth kind fails); no
  server-supplied text; mutation proof; partial-failure proof.
- Validation commands: UI tests, browser lane.
- Status: NOT_STARTED

### G19 — Configuration contract and UI decomposition

- Objective: declared/validated/printable environment surface;
  schema-validated environment files; reasoner CLI validation; `App.tsx`
  decomposition.
- Files/areas: `src/**` env readers, `config/environments/*.json`,
  `.env.example`, `ui/control-center/src/**`.
- Acceptance: undeclared read fails; malformed value refused before any
  effect; DOM-identical decomposition; per-view contract carriers.
- Validation commands: UI tests, root typecheck, `npm run hardening:check`.
- Status: NOT_STARTED

### G20 — Accessibility certification

- Objective: non-colour status encoding, measured WCAG 2.2 AA contrast,
  keyboard-complete workflows, automated structural audit with its own limit
  stated.
- Files/areas: `ui/control-center/**`, `tests/browser/**`.
- Acceptance: colour-only distinction fails; non-zero pair count; keyboard
  steps with visible focus; both-direction exemption list.
- Validation commands: browser lane, UI tests.
- Status: NOT_STARTED

### G21 — Authenticated capability lifecycle

- Objective: capture sidecar with lifecycle metadata; fail-closed pre-flight;
  observable auth state; renewal cadence documented.
- Files/areas: `src/auth/**`, `src/browser/fixtures/storageState.ts`,
  `bin/**` gated launchers, `ui/control-center/**`, docs.
- Acceptance: every non-VALID state refuses before any effect; metadata only
  (no cookie values); expired renders as an epistemic class.
- Validation commands: focused auth suites, `npm run status:local`.
- Status: NOT_STARTED

## Validation Strategy

Per group: focused suites plus `typecheck`, `hardening:check`,
`validation:universe`, and the group's own new checks. Per integration:
`npm run gate:local` at the group's implementation checkpoint and the full
offline regression at the programme checkpoint. Final: `gate:local`,
`npm test`, UI typecheck/tests/build, browser lane, `project:check`,
`agent:check`, `openspec validate --all`.

## Decision Log

- 2026-09-12 — Decision: execute all 21 groups serially in one owned session
  (`nightwatch-production-completion-programme-v1`) rather than one session
  per group; reason: the programme is a single-writer execution and each
  group's closure is integrated by fast-forward, preserving durability
  without multiplying session records; evidence: the OpenSpec change was
  unplanned/untracked and C-00 forbids canonical implementation writes;
  consequence: task continuity is one record with 21 milestones, and each
  group is still independently validated and integrated.

## Discoveries

- The OpenSpec programme change existed untracked in the canonical checkout
  with no task directory, routing block or ready handoff; execution requires
  opening that route first (group 1.1).
- The canonical checkout carries a stale `CANONICAL_MAINTENANCE` claim naming
  `nightwatch-control-center-render-truth-v1` (to be cleared in G6.4).

## Deferred Work

- Owner/organizational decisions the programme names remain decisions to be
  taken; they are implemented as records and gates, not self-authorized.

## Completion Criteria

All acceptance criteria in SPEC.md hold; every group is either completed with
evidence or recorded with its exact blocking class and next owner action; the
final tree passes the full local validation and is integrated by fast-forward
with `HEAD == origin/main`.
