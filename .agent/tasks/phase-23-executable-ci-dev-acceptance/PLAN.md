# Phase 23 Living Plan

Task ID: phase-23-executable-ci-dev-acceptance
Phase: 23-EXECUTABLE-CI-DEV-ACCEPTANCE
Authorization class: PHASE_23_CI_GATE_RECOVERY_AND_BOUNDED_DEV_ACCEPTANCE_ONLY
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Unify the current local/source/synthetic acceptance cone and GitHub Actions
into one executable, versioned, fail-closed quality gate; qualify it from a
pristine checkout; then make one conditional, freshly bound Phase 22 DEV
decision without weakening any historical phase or owner safety boundary.

## Starting State

- `main` and `origin/main` are clean and synchronized at
  `ac3df00195eef846a8e9e42615e90b4b912877d2`.
- Phase 19, Phase 20, Phase 21, and Phase 22 are terminal immutable history;
  Phase 22 is `BLOCKED_BEFORE_DEV` because Actions failed with `steps=[]`.
- The existing workflow is a long historical matrix of roughly thirty steps;
  current Phase 19–22 acceptance is broader and partly task-recorded.
- The owner freeze remains infrastructure/data-layer out of scope. No DEV,
  NEXT, production, database, or authenticated state is contacted during
  bootstrap or implementation.

## Scope

Additive quality-gate schema/runner/receipt/inventory/classifier/authority
modules, semantic compatibility manifest, clean-checkout qualification,
port/process lease hardening, thin workflow and parity rules, pre-DEV V3,
fresh source/auth/manifest preparation, and the one conditional existing Phase
22 launcher invocation.

## Non-Goals

No CI billing workaround, production or NEXT access, mutations, datastore or
infrastructure work, sibling writes, public/external publication, arbitrary
command execution, new semantic framework, Phase 22 manifest reuse, or edits
to Phase 19–22 historical task records.

## Safety Constraints

The permanent owner freeze is unchanged. All quality-gate commands are fixed
repository mappings; unknown groups, commands, environments, source states,
and operation classes fail closed. CI remains offline and read-only, emits no
private artifacts, and never contacts DEV, NEXT, production, databases, or
infrastructure. Real observations, if later authorized, remain bounded,
serial, category-only, and owner-local.

## Milestones

- [x] M0 — bootstrap, exact CI drift audit, and Phase 23 continuity records.
- [x] M1 — quality-gate schema, fixed command registry, shared runner, and
  safe receipts.
- [x] M2 — semantic compatibility entry point, inventory, and duplication
  controls.
- [x] M3 — clean-checkout/Linux equivalence and port/process lifecycle
  hardening.
- [x] M4 — thin Actions workflow and mechanically enforced workflow/gate
  parity.
- [x] M5 — external CI classifier, exact-head authority, and Preflight V3.
- [x] M6 — fresh source currentness, auth readiness, Phase 23 manifest, and
  no-contact dry run.
- [x] M7 — canonical and topology-correct isolated qualification with exact
  enumeration/skip parity.
- [x] M8 — validated implementation checkpoint, push, and one exact current
  Actions observation — COMPLETE.
- [x] M9A — conditional DEV acceptance — CLOSED (NOT APPLICABLE because the
  exact external gate had zero executed steps).
- [x] M9B — external CI block closure with zero DEV contact — COMPLETE.
- [x] M10 — privacy audit applicability decision, project-memory
  reconciliation, terminal task records, and clean handoff — COMPLETE.

## Validation Strategy

After every milestone run the narrowest affected focused tests, then repair
failures before accumulating unrelated changes. Repeated baseline checks are
`npm run typecheck`, `npm run hardening:check`, `npm run agent:check`,
`npm run project:check`, `npm run campaign:synthetic`, and
`npm run test:owner-provenance`. Before push, run the shared gate, Phase 9–23
compatibility, clean-checkout qualification, canonical and isolated full
suites, exact parity, and privacy/safety checks. GitHub Actions is inspected
only for the pushed current head and is never inferred from local results.

## Architecture / Approach

The quality-gate JSON is data-only. A fixed TypeScript command registry maps
known group IDs to repository-owned implementations; runtime input cannot
become a shell command. The same serial runner emits bounded safe receipts in
local, clean, and CI modes. The workflow only bootstraps Ubuntu/Node 20 and
invokes `npm run gate:ci`. Pure external-CI classification and exact-head
authority code receives sanitized observed facts; it has no network authority.
Existing Phase 22 source derivation, manifest, preflight, privacy, replay,
calibration, dossier, and launcher seams are reused only with fresh Phase 23
identities and conditional authorization.

## Decision Log

- M0: start a fresh successor task at the synchronized Phase 22 terminal
  head; preserve Phase 19–22 history byte-for-byte.
- M0: treat `steps=[]` as external execution blocking, never as a test
  failure, and never substitute local green for Actions green.
- M1: quality-gate groups are fixed and unknown groups/commands fail closed.
- M2: current compatibility coverage is represented by one versioned manifest;
  duplicate test-file execution requires an explicit reason code.
- M3: proxy leases affect Nightwatch test infrastructure only; production
  networking semantics remain unchanged.
- M5: pre-DEV authority binds current implementation head, gate-definition
  digest, executed required jobs, and non-skipped green results.
- M6: Phase 22 source and manifest identities are historical evidence only;
  fresh derivation is mandatory.
- M1: the authoritative gate is serial and fixed-command; CI does not carry a
  phase-by-phase test list. Its 30-minute workflow budget is bounded because
  the current serial compatibility cone is materially larger than the old
  matrix and includes install, continuity, provenance, and synthetic gates.
- M3: the proxy lease is coordinated in the system temp namespace and handed
  across Playwright config/global-setup/worker processes by an explicit token;
  process ownership is required for release, so a child cannot delete a
  parent lease accidentally.
- M5: an external Actions observer may make one bounded log read only after
  required job steps are non-empty; `steps=[]` terminates classification before
  any log read.

## Discoveries

M0 audit: the old workflow contains a manually expanding sequence of historical
Phase 8–12 matrices, repeated project/continuity checks, and no stable Phase
19–22 compatibility command. Phase 22's terminal cone was 1,302/1,302 and the
full canonical/isolated result was 2,336 passed / 4 skipped / 0 failed, but
Actions run `32681204267` for head `64cffaf...` failed before executable steps.
The Phase 23 inventory now preserves that baseline from the starting SHA and
reports the modern gate's 130 unique files with zero duplicate executions.

## Deferred Work

Any CI billing/platform repair, missing Node 20 runtime, unavailable source
snapshot, missing/expired owner-only auth, source drift, privacy uncertainty,
or external run that does not execute the required gate remains a terminal
blocker rather than an invitation to weaken the gate. Real anomalies remain
owner-only local evidence and never trigger route expansion or publication.

## Completion Criteria

The task closed as `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI`: the exact current-head
Actions run was observable but stopped before any step (`steps=[]`), so the
external gate was not green. DEV observations are exactly zero; no auth state
was read, and no privacy audit of DEV output was applicable. A future run would
require fresh owner direction and a new exact-head qualification.
