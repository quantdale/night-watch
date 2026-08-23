# Phase 21 Living Plan

Task ID: phase-21-semantic-gap-closure
Phase: 21-SEMANTIC-GAP-CLOSURE
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Starting State

- Live starting SHA: `7a5f6d2ba5ece3bd3a4b21d5a4a15b9504cbd2ae`.
- `main` and `origin/main` are synchronized and clean at bootstrap.
- Phase 19 and Phase 20 are terminal and historical; neither may be reopened.
- Phase 20 baseline is recorded in SPEC.md and STATE.md without redefining
  its 86-gap total.

## Purpose

Close measurable Phase 20 lifecycle gaps through privacy-safe membership,
differential, replay, minimization, graph, and campaign integration while
preserving the existing authorities.

## Scope

The workstreams, synthetic fixtures/tests, local operator output, and durable
records required by SPEC.md and the acceptance matrix.

## Non-Goals

DEV/NEXT/production acceptance, infrastructure/data-layer work, sibling
writes, external publication, raw evidence, AI/self-development authority,
and changes to terminal Phase 19/20 history.

## Safety Constraints

Unknown, stale, malformed, unsupported, ambiguous, or privacy-unsafe inputs
fail closed. New modules have no network, executor, database, persistence,
cloud, or authority-granting capability. Raw values remain ephemeral.

## Architecture / Approach

Extend `src/core/semanticCoverage/**` and compose existing Phase 19
campaignIntelligence replay/minimization/dossier/planner authorities. Keep
membership comparison behind the in-memory `ProjectionContext` boundary and
return only bounded categories/digests.

## Milestones

- [x] M0 — bootstrap, authority reconciliation, exact baseline census, and
  Phase 21 continuity activation; closure ledger records 86 graph gaps with
  85 actionable and 1 source-proof irreducible.
- [x] M1 — versioned exact gap census/closure ledger and privacy-safe finite
  membership projection with hostile/privacy tests; focused privacy and ledger
  suites are green.
- [x] M2 — enum/set mutation applicability, source-bound membership oracles,
  and expanded synthetic product fixtures. Measurement: 46 generated / 46
  applicable / 46 detected / 0 surviving; 33 benign / 0 false positives.
- [x] M3 — deterministic differential pair discovery, explicit alignment, and
  cross-surface mutation campaign. Evidence: 22 candidate rows / 21 admitted
  pairs, with fixed scalar/list, absent/default, and set alignments.
- [x] M4 — replay adapter saturation and semantic replay-equivalence depth.
  Evidence: 67 contract-bound replay attempts, all reproduced, including
  exact, semantic-equivalent, representation-preserved, stale, and changed-
  contract classifications.
- [x] M5 — dependency-aware minimization and minimization-gap closure.
  Evidence: 67 dependency-aware reductions, all supported by semantic fixed-
  point proofs with explicit prerequisite edges.
- [x] M6 — mechanically-provable-uncovered closure, binding synthesis,
  metamorphic vocabulary exercise, and gap-driven campaign loop. Evidence:
  21 synthetic bindings admitted; 4/7 metamorphic kinds exercised and 3
  source-proof exclusions retained.
- [x] M7 — graph normalization, coverage quality, dossier V5, operator views,
  corpus/privacy/performance/cache integration, and consolidation. Evidence:
  final graph 239/233/3; ledger 83 closed, 0 actionable, 3 irreducible;
  full-lifecycle quality for 21 contracts; 151 adversarial cases / 23
  families; V5 and local operator views green.
- [x] M8 — focused/compatibility/full/parity validation and regression repair.
  Evidence: Phase 9–21 cone 1,295/1,295; owner provenance 91/91; canonical
  and topology-correct isolated full suites 2,333/2,329/4/0 with exact skip
  identity parity.
- [x] M9 — terminal documentation, validated commit/push, one CI inspection,
  synchronized clean main, and final handoff. Implementation checkpoint
  `69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a` and documentation checkpoint
  `04ad56c8baa904b8fc8537a41e4fa2e90602770b` were pushed without force; the
  one Actions inspection observed run `32672981417` / job `97276539731` with
  `failure` and `steps=[]`, recorded as the billing restriction.

## Workstream mapping

| Workstream | Milestone | Primary surface |
|---|---|---|
| A–B | M1 | `src/core/semanticCoverage/**`, closure ledger, projections |
| C | M2 | mutation generation/measurement and corpus fixtures |
| D–E, M | M3 | differential engine, alignment, synthetic surfaces |
| F–G | M4 | campaign replay V4 bindings and semantic equivalence |
| H–I | M5 | minimization V2 adapters and dependency proof |
| J–L, N | M6 | graph binding/planner/metamorphic integration |
| O–R | M7 | coverage quality, graph, dossier, operator views |
| S–U | M7–M8 | adversarial/privacy/performance/cache tests |
| V | M7–M8 | proven consolidation only |

## Validation cadence

Each milestone implements a bounded slice, runs focused tests, repairs all
failures, records exact output in STATE.md, and only then advances. Regular
gates are:

```text
npm run typecheck
npm run hardening:check
npm run campaign:synthetic
npm run agent:check
npm run project:check
```

Terminal validation additionally runs the Phase 9–21 compatibility cone,
`npm run test:owner-provenance`, the expanded synthetic campaign, canonical
full Playwright, topology-correct isolated full Playwright, and exact
enumeration/skip identity parity. External CI is inspected once after the
final validated push and reported separately from local truth.

## Decisions

- M0: start a fresh Phase 21 task at the synchronized requested SHA; preserve
  all Phase 19/20 history as terminal.
- M0: treat the Phase 20 operator output and current implementation as the
  exact baseline authority; no metric is redefined for convenience.
- M0: the graph-backed closure ledger preserves 86 graph records while
  explicitly separating 15 other graph-state records from the measured
  Phase 20 campaign-reason classes.
- M1: membership is a bounded in-memory comparison against source-bound
  contract metadata, with categorical output only; unsafe membership remains
  explicitly irreducible.
- M1: the existing Phase 20 mutation API keeps its baseline behavior when no
  membership authority is supplied; Phase 21 membership bindings are opt-in.

## Validation Strategy

Use focused deterministic unit/corpus matrices after each slice, then run the
Phase 9–21 compatibility cone and the established canonical/isolated parity
procedure. Do not adjust expected counts to hide failures.

## Decision Log

- M0: Phase 21 is a fresh successor task at the requested synchronized SHA.
- M0: the current Phase 20 operator output is the immutable baseline authority.
- M1: membership output is categorical and never carries raw members or
  reconstructible identity material.

## Discoveries

Record implementation evidence, regressions, and source/test disagreements in
STATE.md at each milestone; current code and tests outrank stale prose.

## Deferred Work

DEV/NEXT/production acceptance, infrastructure/data-layer work, external
publication, and contracts without fixed mechanical proof remain deferred.

## Completion Criteria

Every acceptance row is evidence-backed; actionable gaps are materially
reduced; irreducible gaps are explicit; privacy/benign/safety floors are zero;
all local validation and exact canonical/isolated parity are green; the tree
is clean and synchronized; external CI is reported truthfully after one
post-push inspection.

## Deferred / follow-up

DEV/NEXT/production acceptance, infrastructure/data-layer work, external
publication, and contracts without current mechanical proof remain deferred.

## Terminal status

COMPLETE. All authorized local milestones and acceptance criteria are closed.
The final live head is discovered from Git; external Actions is not claimed
green because the observed job returned `steps=[]` under the billing
restriction.
