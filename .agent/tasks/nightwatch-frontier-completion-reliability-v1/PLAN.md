# PLAN — nightwatch-frontier-completion-reliability-v1

## Purpose

Advance the repository-owned local finding-intelligence, human-review, and
C-12 offline-rehearsal frontier; certify it adversarially; and reconcile
durable documentation to final truth.

## Starting State

Base `f99df10cdcbae5a6f291c781a650501f386de83c` == `origin/main`, canonical
clean, one session worktree. Predecessor `nightwatch-plan-explain-coherence-v1`
COMPLETE/STOP. AH-1 delivered `src/core/alphausHandoff/` and
`src/core/c12Readiness/` plus the operator runbook and Alphaus context doc.

Gaps proven in M1: no recurrence / defect-class / probable-duplicate /
expectation-provenance vocabulary; no C-12 P1 offline rehearsal; review
digest-binding existed for AI drafts but not for dossier/handoff artifacts.

## Scope

Nightwatch repository source, tests, schemas, contracts, CLI, reviewer
surfaces, local-only simulations and fixtures, finding intelligence and
review workflow, C-12 synthetic/offline rehearsal and readiness, flake
forensics, determinism/performance/leak/test-infrastructure fixes,
documentation/OpenSpec/lifecycle/hardening/diagnostics, commits and pushes.

## Non-Goals

Reviewer-UI redesign; repository-wide refactors; dependency upgrades beyond
restoring provably-required packages; retry-policy invention.

## Safety Constraints

PROHIBITED: production / NEXT / DEV contact; C-12, C-13, C-14 live execution;
C-08b organizational work; Slack, Leslie, Pondr, Notion, or external bug
filing; credential acquisition or change; production configuration, browser,
or login; deployment, restart, rollback, feature-flag change; sibling
repository writes; force push; history rewrite.

## Architecture / Approach

Three new pure local cones under `src/core/`, each isolated from the
production cones and from each other by hardening rules, sharing only
`identity/canonicalDigest`. The C-12 rehearsal drives the REAL P1 core and
mocks only external edges, so it cannot drift into a second implementation.

## Milestones

### M1 — W0 repository truth + capability map

- Objective: independently verify predecessor claims and map the finding pipeline.
- Files/areas: git state, `.agent/**`, `src/core/**` inspection.
- Implementation actions: reconcile Git; verify each claimed artifact exists; run a representative predecessor batch; map source evidence → observation → candidate → replay → finding → dossier → handoff → review.
- Acceptance criteria: claims verified or discrepancies recorded; gaps proven, not assumed.
- Validation commands: `git status --short --branch`, `npx playwright test tests/unit/alphausFindingHandoff.test.ts`
- Status: DONE — 79/79 predecessor batch green; three gaps proven.

### M2 — W1 finding lifecycle + immutable review binding

- Objective: post-dossier local review lifecycle whose decisions bind to exact artifacts.
- Files/areas: `src/core/findingReview/`.
- Implementation actions: states + transitions; receipt bound to finding/dossier/handoff digests, source SHA, campaign ID, handoff and privacy-projection versions; fail closed as `FINDING_REVIEW_STALE` on any drift.
- Acceptance criteria: a regenerated artifact rejects a prior receipt; local review never equals organizational sign-off.
- Validation commands: `npx playwright test tests/unit/findingReviewLifecycle.test.ts`
- Status: DONE — 12 passed.

### M3 — W2 finding intelligence

- Objective: deterministic, evidence-backed, advisory-only relationships.
- Files/areas: `src/core/findingIntel/`.
- Implementation actions: relationship classes from mechanical fields only; recurrence bound to chronology; defect classes with counterexamples; provenance ranking that caps confidence.
- Acceptance criteria: prose similarity never classifies; missing inputs yield UNKNOWN; every result advisory with human final authority.
- Validation commands: `npx playwright test tests/unit/findingIntel.test.ts`
- Status: DONE — 19 passed.

### M4 — W3/W4 reviewer surface + synthetic pipeline

- Objective: human-copyable filing report and an end-to-end synthetic campaign.
- Files/areas: `src/core/findingReview/report.ts`, `tests/unit/syntheticFindingCampaign.test.ts`.
- Implementation actions: textual FACT/RECOMMENDATION/UNKNOWN labelling; classification safety; metamorphic corpus.
- Acceptance criteria: no severity recommendation reads as fact; team without evidence refused; corpus non-tautological.
- Validation commands: `npx playwright test tests/unit/humanFilingReport.test.ts tests/unit/syntheticFindingCampaign.test.ts`
- Status: DONE — 6 + campaign suite passed.

### M5 — W5 C-12 offline rehearsal

- Objective: production-faithful local rehearsal with zero production contact.
- Files/areas: `src/core/c12Rehearsal/`.
- Implementation actions: drive `evaluateP1ObservationScope`, `attachP1ObservationSession`, `issueP1ObserveGrant` against mock edges pinned to `.invalid`; deterministic receipt; attribution and negative matrices.
- Acceptance criteria: only the clean passive scenario passes; every receipt on every path carries `NOT_CONFERRED_SYNTHETIC_ONLY`.
- Validation commands: `npx playwright test tests/unit/c12LocalRehearsal.test.ts`
- Status: DONE — 11 passed.

### M6 — W6 environmental-flake forensics

- Objective: reproduce and characterise the reported renderer stall before changing anything.
- Files/areas: control-center browser lane.
- Implementation actions: two independent 50-iteration batches, every failure recorded.
- Acceptance criteria: measured rate reported honestly; no retry policy invented.
- Validation commands: `npx playwright test --config=playwright.control-center.config.ts` x100
- Status: DONE — 100/100, 0 failures; the ~5% claim did not reproduce.

### M7 — W7/W8 red team + determinism

- Objective: falsify privacy, authority, and determinism claims.
- Files/areas: all three cones, `bin/frontier-determinism.mjs`, `bin/hardening-check.mjs`.
- Implementation actions: sentinel plants across every field; authority-leak mutations; 41 reversible mutations with byte-exact restore; fresh-process determinism under varied TZ/locale.
- Acceptance criteria: 0 mutation survivors; 1 unique semantic digest.
- Validation commands: `node bin/frontier-determinism.mjs 20`, mutation harness
- Status: DONE — 41 introduced / 39 detected / 2 controls / 0 survivors; 20 runs / 1 digest.

### M8 — W9/W10 architecture + documentation truth

- Objective: reconcile every durable document to final truth.
- Files/areas: `docs/CURRENT_STATE.md`, `docs/C12-OPERATOR-RUNBOOK.md`, `docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md`, `docs/DECISIONS.md`.
- Implementation actions: FC-1 current-authority rows; rehearsal-vs-live state matrix; FC-1 additions with evidence classes preserved; D-87 reconciled and D-118 added.
- Acceptance criteria: no document claims more than the implementation proves.
- Validation commands: `npm run hardening:check`
- Status: DONE.

### M9 — W11 certification

- Objective: full regression, gate matrix, clean clone, REPORT.
- Files/areas: whole repository.
- Implementation actions: regression on the committed tree; `gate:local`; clean-clone verification; defect ledger and requirement ledger.
- Acceptance criteria: green gates or precisely documented blockers.
- Validation commands: `npx playwright test --reporter=line`, `npm run gate:local`
- Status: DONE — gate:local PASS 11/11, gate:clean PASS Node 20, regression 3885/0/13 x2.

## Validation Strategy

Layered and independent: typecheck, hardening structural rules, focused
suites, full regression, mutation campaign with byte-exact restore,
fresh-process determinism, repeated environmental-lane execution, the
repository's own `gate:local`, and a clean clone that depends on no local
residue.

## Decision Log

- Restore `vue@2.6.12` rather than weaken `rippleReadiness.test.ts` (D-118).
- Make authority literal checks occurrence-complete after M12/M13 survived.
- Record M16 as an equivalent mutant with evidence rather than force a test.
- Do not invent a renderer-stall retry policy; report the measured rate.

## Discoveries

- Two hardening rules were defined but never invoked (DEF-FC-02).
- Stale `node_modules` masked a removed dependency across a full regression
  and a "clean gate PASS" claim (DEF-FC-03).
- An `includes(literal)` hardening rule is satisfied by any surviving
  occurrence, so it can pass while an unsafe value sits on another line.

## Deferred Work

- Control Center surfacing of relationship / recurrence / defect-class fields.
- Scale benchmarking at 1k/5k/10k findings.
- C-12 live execution (external, unauthorized).

## Completion Criteria

All milestones terminal; 0 mutation survivors; full regression green on the
committed tree; gates green or blockers documented with evidence; every
durable document reconciled; safety accounting all zero.
