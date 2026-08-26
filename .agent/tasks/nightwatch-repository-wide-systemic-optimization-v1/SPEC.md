# Nightwatch Repository-Wide Systemic Optimization — Frozen Specification

Task ID: nightwatch-repository-wide-systemic-optimization-v1
Phase: REPOSITORY-SYSTEMIC-OPTIMIZATION-V1
Title: Repository-Wide Systemic Optimization
Status: IN_PROGRESS
Authorization class: NIGHTWATCH_REPOSITORY_SYSTEMIC_OPTIMIZATION_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Intent

Reduce the measured engineering-loop and runtime costs of Nightwatch's own
validation and analysis machinery (typecheck, continuity/project/hardening
checkers, Playwright suite execution, gate chain) without weakening any
verification, safety, privacy, determinism, or fail-closed property. All work
is LOCAL / SOURCE / SYNTHETIC. The campaign is evidence-driven: baseline
first, root-cause second, minimal high-leverage fix third, re-measure fourth.

## Required outcome

The repository must be left in a measurably or demonstrably better state:
lower validation latency and/or lower redundant work with identical
verification strength, protected by regressions where meaningful, with all
existing gates green (typecheck, hardening:check, project:check,
agent:check/audit, focused suites, quality-gate definition checks) and no
behavioral contract drift in validated outputs (receipts, digests, counts).

## Permanent boundaries

- LOCAL / SOURCE / SYNTHETIC only. No DEV/NEXT/production contact, no
  authenticated observation, no database/infrastructure operation, no Alphaus
  sibling write, no external publication, no runtime AI.
- Verification strength is never reduced: no test deletion/skipping, no
  weakened assertions, no suppressed failures, no unvalidated caching of
  pass/fail verdicts. Content-addressed incremental compilation and exact-
  semantics batching of read-only Git queries are in scope; verdict caching is
  not.
- Versioned contracts (`nightwatch.quality-gate.v1`,
  `nightwatch.semantic-compatibility.v1`, `nightwatch.agent-continuity.v2`,
  `nightwatch.project-state.v1`, receipts and digests) keep their schemas and
  semantics; execution mechanics may be optimized only where observable
  validated outputs remain identical or strictly equivalent.
- No credentials, raw source, customer values, or owner-only findings enter
  Git or task files.

## Optimization admission bar

A candidate must have: a measured or reproducibly demonstrated cost, an
identified mechanism, a fix that removes work rather than hides it, a
validation plan proving identical semantics, and no material regression on
another metric (memory, determinism, CI parity). Speculative micro-
optimizations are out of scope.

## Completion boundary

Completion requires: recorded baselines, implemented fixes for the admitted
P0/P1 candidates (or documented proof they are not worthwhile), before/after
evidence, focused validation for every touched subsystem, full typecheck +
hardening + agent + project checks green, documentation updated where
non-obvious decisions were made, continuity closure under v2, and a clean
pushed `main` per the AGENTS.md checkpoint policy.
