# W11 — Autonomous yield proof

## Purpose

Exercise the mature W7-W10 Nightwatch stack to measure, with evidence, whether
strict historical `EXACT_REDISCOVERY` is achievable under leak-free conditions
and whether a previously unknown owner-local defect can be discovered and
mechanically admitted. Close Production Completion Group 12.

## Starting State

- Task ID: `nightwatch-autonomous-yield-proof-w11-v1`
- Starting Nightwatch SHA: `158a97b8feceb6abf4ea4ccbacab1f20cc46bc35`
- Branch: `session/nightwatch-autonomous-yield-proo-72d452ea`
- Relevant architecture: W7 owner-local sensing + mechanical admission; W8
  bounded investigation memory + hypothesis lifecycle; W9
  `GO_VENDORED_PACKAGE_TEST` + disposable `bwrap --unshare-net` +
  `CURRENT_SOURCE_REPEATED_TEST_FAILURE` + separated byte accounting; W10
  capability projection + diverse index + host-owned `--repository` scope.
- Established facts that must NOT be rediscovered: the W7-W10 designs above;
  the M0 preflight measurements recorded in SPEC.md.

## Scope

Execution and measurement through the ordinary product path
(`nightwatch-agent campaign run`), the existing leak-isolated historical
machinery, and the existing mechanical admission route. Repository-local
implementation ONLY where execution proves a concrete Nightwatch defect.

## Non-Goals

Architecture rewrites; UI work; provider-wrapper rewrites; reasoning-memory
redesign; DEV/NEXT/production work; forcing a non-zero yield.

## Safety Constraints

As SPEC.md `## Safety constraints`. Sibling repositories read-only; provider
egress only through the configured reasoner CLI; hidden truth never reaches the
reasoner; leakage aborts publication.

## Architecture / Approach

The historical arm runs FIRST, so investigation quality is measured against
known truth before unknown-source yield can bias interpretation. It drives the
existing `createHistoricalLocalInvestigationContext` (leak-isolated visible
context) through `runLocalCliCampaign` with the real configured reasoner, then
scores with `scoreBenchmarkCandidate` using hidden truth AFTER the
investigation completes. The unknown arm runs the ordinary
`nightwatch-agent campaign run --reasoner=cli` product path under host-owned
`--repository` scope.

## Milestones

### M0 — Provider, toolchain and repository preflight

- Objective: measure current host capability and freeze a non-vacuous
  reachability threshold before opening execution.
- Acceptance criteria: provider structured probe passes; repository census
  non-zero; more than one repository visible; at least one deterministic
  reproduction-capable target; historical corpus available; mechanical
  admission path available; leakage guard green; hardening/gate baseline green.
- Validation: census script, structured reasoner probe, `session:status`.
- **Status:** COMPLETE

### M1 — Freeze the evaluation before running it

- Objective: commit the exact evaluation definition at a SHA before the first
  provider evaluation.
- Acceptance criteria: provider, corpus membership, negative controls,
  repository set, budgets, scoring, near-match distance, reproduction
  requirement, leakage rule, admission rule and `ENVIRONMENT_BLOCKED`
  denominator rule are all committed; the campaign fingerprint binds them; a
  widened resume fails closed.
- **Status:** COMPLETE

### M2 — Strict historical EXACT_REDISCOVERY

- Objective: run the frozen historical arm with the real reasoner and record
  per-case disposition and reason.
- Acceptance criteria: EXACT definition unweakened; near matches record
  distance and never promote; negative controls included; per-case
  `ENVIRONMENT_BLOCKED` recorded and excluded from numerator and denominator.
- **Status:** COMPLETE

### M3 — Analyze without overfitting

- Objective: classify misses into bounded categories; separate model-efficacy
  results from Nightwatch harness defects.
- Acceptance criteria: no prompt/model tuning to lift EXACT; any harness repair
  reruns the full frozen arm and reports BEFORE and AFTER.
- **Status:** COMPLETE

### M4 — Freeze the previously-unknown-defect campaign

- Objective: commit repository set, SHAs, budgets, stopping condition before
  execution.
- **Status:** COMPLETE

### M5 — Run the owner-local unknown-yield campaign

- Objective: execute substantial campaigns through the ordinary product path
  under host-owned `--repository` scope, across a materially wider slice.
- Acceptance criteria: mechanical admission only; `MISSING_REPRODUCTION`
  preserved; no new proof class; no synthesized evidence refs.
- **Status:** BLOCKED

### M6 — Yield accounting

- Objective: derive all metrics mechanically; state every denominator.
- **Status:** NOT_STARTED

### M7 — Leakage and anti-cheating audit

- Objective: inspect every reasoner-visible request blob for historical runs;
  prove the leakage checker live with canaries.
- Acceptance criteria: leakage 0, or `LEAKAGE_DETECTED` and no yield published.
- **Status:** COMPLETE

### M8 — Adversarial / resilience checks

- Objective: prove widened-resume, changed-budget, changed-provider,
  changed-corpus, missing-reproduction, forged-evidence, fabricated-count,
  unsupported-scope, malformed-output and timeout behaviours all fail closed.
- **Status:** PARTIAL

### M9 — Repair only evidence-found Nightwatch defects

- Objective: preserve evidence, reproduce in a focused regression, fix
  minimally, rerun focused proof and any affected arm.
- **Status:** NOT_STARTED

### M10 — Group 12 closure, validation, integration, release

- Objective: close 12.1-12.12 against live wording; update governed surfaces;
  full validation; integrate; release.
- **Status:** NOT_STARTED

## Validation Strategy

Focused: autonomous/runtime/memory/reproduction/admission, historical
efficacy/rediscovery, current-source reproduction, campaign resume/budget/scope,
leakage suites. Global: `typecheck`, `typecheck:bin`, `hardening:check`,
`hardening:rules`, `agent:check`, `handoff:check`, `project:check`,
`workspace:check`, `session:check`, `validation:universe`, `gate:local`,
`npm test`, `gate:clean` if available, strict OpenSpec validation.

## Decision Log

- 2026-09-19 — Decision: select the provider by a preference list declared
  BEFORE any probe, taking the first pass. Reason: comparing several providers
  and keeping the best scorer would contaminate the evaluation. Evidence:
  `opencode-go/omen-alpha` absent; `opencode-go/glm-5.3` passed at preference
  #2, so #3-#5 were never probed. Consequence: provider frozen before any
  evaluation result existed.
- 2026-09-19 — Decision: run the historical arm before the unknown arm.
  Reason: it tests investigation quality against known truth before
  unknown-source yield can bias interpretation.

## Discoveries

- Deterministic reproduction capability is concentrated in exactly ONE of the
  eight admitted repositories (`mobingilabs/ouchan`). Investigation breadth is
  8; execution breadth is 1. This bounds what 12.7 can honestly claim.
- Of 255 mined historical records (234 definable cases), only 5 carry both a
  non-empty `knownFailingTest` and a `minedReplay`, so the strict-EXACT-eligible
  real corpus is 5 cases, 4 of them Go and 1 JavaScript.

## Deferred Work

- Group 11 DEV semantic acceptance, Phase 9B/10B real DEV, DEV/NEXT bug hunt,
  production observation, CI route selection, external filing: all remain
  separately owner-authorized and out of W11.

## Completion Criteria

As SPEC.md `## Acceptance criteria`. W11 is COMPLETE when the campaign is
truthfully terminal — including with zero yield — with leakage 0, no fabricated
finding, Group 12 closed, validation green, integrated and released.
