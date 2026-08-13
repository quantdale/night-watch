# Nightwatch — Private Evidence Minimization + Autonomous Triage

## Purpose

Provide the highest-value next layer of Nightwatch debugging using only local
source intelligence and contained DEV application evidence: reduce failures,
deduplicate them, correlate browser/API/source evidence, and leave a concise
private dossier.

## Starting State

- Starting clean Nightwatch HEAD: `2792795ae69a5535a769180e3e2f38096a186769`.
- Phase 0/1/1.1/1.2, Phase 2A/2B/2C, Phase 3, Phase 4, and Phase 5 are closed.
- Phase 6 implementation is preserved at `483fbe4f41f235e3e1e0a12e0613954f3db4aefe`,
  latest clean checkpoint `2792795ae69a5535a769180e3e2f38096a186769`, and is
  frozen by owner; its six-query budget remains unused and no datastore query
  has run.
- Existing Phase 2C fingerprints/replay, Phase 4 safe actions/exact replay,
  Phase 3 dependency map/source freshness, and Phase 5 API oracle/catalog are
  the integration surfaces. Alphaus repositories are read-only inputs.
- Nightwatch has no Git remote. Real evidence therefore remains owner-only
  local state, not repository history.

## Scope

Implement `src/core/policy`, `src/core/triage`, private artifact storage,
versioned task/corpus fixtures, and focused regression tests. Update project
and Phase 6 owner-freeze documentation.

## Non-Goals

Infrastructure/data-layer expansion, deployment status, team coordination,
external publication, customer responses, mutation, new DEV exploration, and
LLM invocation.

## Safety Constraints

- Never modify Alphaus repositories or use their worktrees as write targets.
- No cloud/datastore commands; the owner gate must reject them before an
  executor callback. No credentials or authenticated evidence in fixtures.
- Use existing `OutboundPolicy`, proxy, safe-action catalog, auth gate,
  mutation tripwire, route envelope, and metadata-first evidence contracts.
- Real DEV validation is bounded and passive; synthetic/local validation is the
  primary proof when no natural anomaly is available.

## Architecture / Approach

`OwnerScopePolicy -> approved original sequence -> candidate subsequence gate
-> bounded replay -> exact fingerprint -> stable feature sanitizer -> cluster /
dedup -> browser/API differential + Phase 3 source candidates -> conservative
boundary/confidence -> atomic private dossier -> overnight/morning summary`.

Phase 6 code remains available for synthetic tests but its real invoker is
owner-policy blocked. The private artifact store defaults outside the
repository to the operator's owner-only Nightwatch namespace and has no
publication method that can succeed.

## Milestones

### M0 — Owner freeze and task creation

- Status: COMPLETE.
- Update Phase 6 state/report/current-state/roadmap/decisions, establish the
  new active task, audit Nightwatch remote privacy, and capture relevant
  Alphaus read-only before-state only when source correlation is exercised.
- Validation: clean recovery files, `npm run agent:check`, `git status`.

### M1 — Central owner policy and private storage

- Status: COMPLETE.
- Add the frozen operation policy, Phase 6 gate integration, atomic owner-only
  artifact store, no-publication guard, and policy regression tests.

### M2 — Deterministic minimization

- Status: COMPLETE.
- Add subsequence-only bounded minimization with precondition/safety gates,
  exact fingerprint matching, explicit minimality guarantees, and synthetic
  matrix.

### M3 — Cluster, dedup, differential, and source relevance

- Status: COMPLETE.
- Add sanitized clustering, duplicate suppression, browser/API differential,
  Phase 3 change relevance, source freshness, and fault-boundary localization.

### M4 — Dossiers, false positives, confidence, and summaries

- Status: COMPLETE.
- Add versioned dossier/recipe/AI-ready schemas, false-positive catalog,
  categorical confidence and priority ranking, overnight summary, and morning
  brief.

### M5 — Compatibility, adversarial privacy, and full validation

- Status: COMPLETE.
- Exercise synthetic dossier matrix, legacy evidence compatibility, storage
  crash recovery, owner-policy regression, privacy sentinels, existing safety
  suite, and bounded DEV checks only if naturally useful.

### M6 — Closure and clean checkpoint

- Status: COMPLETE.
- Final architecture/adversarial review passed; no natural DEV anomaly was
  admitted, no real minimization was run, and the terminal task state is
  documentation-only and private/local.
- Complete architecture/adversarial reviews, update durable state/report,
  commit Nightwatch only, verify clean/recoverable tree, and leave the next
  private/local task exact.

## Validation Strategy

Run focused TypeScript/Playwright unit tests after each milestone. Before any
DEV work run `npx tsc --noEmit`, focused minimizer/cluster/dossier/privacy/
policy tests, existing safety tests, full Playwright, `npm run agent:check`,
`git diff --check`, and `git status --short`. No real minimization is run when
no naturally admitted anomaly exists.

## Decision Log

- 2026-08-13 — Phase 6 is frozen by owner, not complete, failed, blocked for
  handoff, or abandoned. This task replaces its external-data continuation.
- 2026-08-13 — Exact subsequence replay is the minimizer authority; no new
  action generation is permitted.
- 2026-08-13 — Dossier IDs exclude timestamps and customer data; private local
  storage is used because Nightwatch has no remote.
- 2026-08-13 — AI-ready output is deterministic packaging only; AI cannot be
  an oracle or trigger access.

## Discoveries

- Existing Phase 2C fingerprints already contain the stable app-layer classes
  needed for clustering; Phase 5 adds direct API status/content/parse classes.
- Existing Phase 3 dependency edges provide direct/shared/transitive source
  relevance but do not establish deployed cause.
- Existing Phase 6 `GatedReadToolInvoker` is the only real-data execution
  default and is the correct quarantine point for `OWNER_POLICY_BLOCKED`.

## Deferred Work

Natural DEV anomaly minimization, optional contained Chrome DevTools cross-check,
owner-requested local AI summarization, and any future owner-approved scope
change remain deferred. No Phase 6 cloud/datastore resumption is recommended.

## Completion Criteria

All SPEC criteria pass, no external operation is invoked, no Alphaus repo is
modified, private findings are local-only, and the final report records exact
validation and unresolved questions without overstating root cause.
