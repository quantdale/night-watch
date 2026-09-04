# Plan — MA-8 / F-13 P1 Observation-Scope Prerequisite

## Purpose

Implement and certify the missing P1-specific observation-scope admission
architecture (MA-8 / F-13, canonical E-16), so a future C-12 P1 passive
production observation is architecturally executable with zero requests
attributable to Nightwatch — without Nightwatch creating the production
subject or issuing production traffic. Local/mock certification only; zero
real production contact.

## Starting State

- Task ID: `nightwatch-p1-observation-scope-ma8-v1`, starting from
  `0195a39e60e82b80439ec10ad5a36453804fe030` (HEAD == origin/main, clean tree,
  single worktree, no live owned session).
- Predecessor `nightwatch-overnight-reliability-r13-v1` COMPLETE.
- E-16 verified canonical
  (`docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md:1345`).
- C-11 COMPLETE with P1 explicitly deferred per F-13; its eighteen-gate
  request chain never executes for a session that issues no request.
- Exact-head CI inspected once at start (run `33841467907`: `runner_id = 0`,
  empty runner name, zero steps — external blocker, not a product failure).

## Scope

- New sibling cone `src/core/prodObserveP1/`: versioned named P1
  observation-scope chain, one-shot `P1_OBSERVE` grants, external-only scope
  config, admission evaluator, four-class attribution, terminal session
  classification, bounded passive session runner, kill switch.
- Seven local test suites (admission matrix, config loader, attribution +
  lifecycle, privacy sentinels, passive capability, seeded properties, mock
  subject integration) registered in the synthetic lane and declared as MA-8.
- `checkP1ObservationScopeBoundary` hardening + bounded mutation campaign.
- OpenSpec change, threat-model note, decisions, current-state docs, REPORT.

## Non-Goals

- C-12 execution; any real production, DEV, NEXT, or C-08b contact.
- Creating, requesting, reading, or persisting credentials, sessions, tokens,
  profiles, production hosts, or customer identifiers.
- Modifying `src/core/prodObserve/**`, `src/core/prodPrivacy/**`,
  `src/core/prodEvidence/**`, or weakening any existing rule.
- Sibling-repository writes; history rewrites; force pushes.

## Safety Constraints

Per SPEC.md. Additionally: no mutation of certified cones (consumption only);
new files plus append-only registrations (manifests, hardening dispatch,
docs); all fixtures loopback/local with `.invalid` hosts and synthetic
sentinels; implementation only in the owned session worktree
`session/nightwatch-p1-observation-scope--3bd1d83d`.

## Architecture / Approach

- Sibling cone, never inside `src/core/prodObserve/` (C-11's boundary asserts
  its cone's contents and reverse-isolation; P1 beside it keeps both intact).
- C-11 reverse-isolation forbids importing `core/prodObserve`, so P1 carries
  its own module-private one-shot registry, external-only loader, and
  fail-closed kill-switch evaluation — small documented duplication per F-12.
- Distinct class `P1_OBSERVE`, stage pinned to `P1`; L6 reconciled via the
  explicit P1-specific invariant (option B, decided in design.md §6).
- Criterion `ZERO REQUESTS ATTRIBUTABLE TO NIGHTWATCH` with UNKNOWN failing
  closed; terminal classification makes vacuous PASS impossible.
- Every gate individually falsifiable (the DEF-C11-1/DEF-C11-2 lesson);
  code-confinement enforced at runtime; chain-definition digest.

## Milestones

- M1 — Reconciliation and campaign scaffolding: COMPLETE.
- M2 — Design reconciliation note: COMPLETE (`design.md`).
- M3 — Admission chain + subject + config: COMPLETE (types, authorization,
  scopeConfig, killSwitch, observer; typecheck clean).
- M4 — Attribution + terminal classification + privacy wiring + session:
  COMPLETE (attribution, session; privacy/evidence consumed unchanged).
- M5 — Test matrix: COMPLETE (7 suites, 127 tests green; manifests +
  MA-8 declaration registered).
- M6 — Hardening + mutation campaign: IN PROGRESS
  (`checkP1ObservationScopeBoundary` written, hardening PASS; mutation probes
  pending).
- M7 — Full validation, repeatability, clean clone, review, docs, REPORT,
  integration, release: PENDING.

## Validation Strategy

- Focused: typecheck, per-suite Playwright runs, `hardening:check`.
- Mutation: ≥13 bounded probes, each must fail verification, restore
  byte-identical, re-pass; survivors are test defects.
- Full: `gate:local`, canonical regression, agent/project/workspace/handoff
  checks, fresh-process reruns, clean Node 20 gate, exact-head CI inspection
  (single, no rerun loop).
- No test deletion/skip/retry/timeout-inflation as a correctness fix.

## Decision Log

- Sibling cone over membership (C-11 boundary untouched; consumption only).
- Pattern duplication over importing `core/prodObserve` (F-12 both
  directions; each duplication justified at its site).
- MA-8 declaration in the certification registry although the task id is
  ledger-exempt (machine-checked registration discipline; R-12 tests pin no
  exact set).
- Chain order: integrity precedes identity and window (DEF-P1-1, found by the
  matrix — the DEF-C11-1 class recurring).
- Session `completedCleanly` separated from evidence verdict (a killed session
  never completes cleanly even with clean evidence).

## Discoveries

- E-16 is canonical repository truth, not a predecessor invention.
- The master-plan `P1 → P2` gate text still says "zero requests issued by
  Nightwatch"; code implements the F-13 corrected criterion; historical text
  stays historical.
- DEF-P1-1: `P1_IMPLEMENTATION_IDENTITY` read the config before
  `P1_CONFIGURATION_INTEGRITY`, making integrity unfalsifiable for null
  config — reordered, order now hardening-enforced.
- The audit flags `0644` tmp files (`UNSAFE_PERMISSIONS`) and unknown root
  filenames; privacy tests write `0600` and the repo-dir fault uses the
  gitignored `artifacts/` root.

## Deferred Work

- C-12 P1 passive production observation (new explicit owner authorization
  after review of this campaign's evidence).
- C-08b deployment facts, C-07 DEV, C-13/C-14 — all out of scope.
