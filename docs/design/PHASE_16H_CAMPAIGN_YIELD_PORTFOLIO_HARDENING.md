# Phase 16H — Campaign Yield & Portfolio Hardening

## Purpose

Phase 16A introduced a deterministic portfolio planner for choosing and budgeting already-approved read-only Nightwatch work. Phase 16H is the exhaustive local hardening layer required before any separately authorized contained DEV campaign consumes that planner's data-only handoff.

The design principle is simple: optimize campaign selection without letting prioritization become a new authority source.

## Architecture under test

```text
approved target registry
        |
source/currentness/depth/owner evidence
        |
portfolio model + strict parser
        |
explainable bounded score
        |
deterministic budget allocator
        |
campaign-plan manifest
        |
replan/currentness classifier
        |
shadow simulator / local reporting
        |
inert DEV handoff (separate authorization required)
```

## Hardening principles

1. Authority is a hard gate, never a score.
2. Currentness is fail-closed.
3. Novelty is semantic, not SHA churn.
4. Allocation can redistribute budget only inside already-approved members.
5. Starvation prevention cannot resurrect blocked work.
6. Yield metrics are sanitized local proxies, not real-world causal proof.
7. A manifest carries intent, not permission to execute.
8. Deterministic input produces deterministic ordering, allocation, identities, simulator output, and handoff bytes.
9. Complete canonical + topology-correct isolated regression is required because Phase 16A deliberately deferred it.
10. Any real DEV campaign is a later owner-gated phase.

## Primary adversarial families

- malformed/unknown portfolio DTOs;
- equal-score / input-order permutations;
- stale/unavailable/ambiguous evidence;
- duplicate-pressure extremes;
- starvation vs blocker conflicts;
- zero/tiny/exact-fit/oversubscribed budgets;
- reserve-budget edge cases;
- zero-denominator and duplicate-heavy yield accounting;
- SHA-only vs semantic source movement;
- derivation/authority movement;
- registry removal;
- simulator baseline anomalies;
- CLI malformed inputs and error sanitization;
- handoff authority confusion.

## Runtime boundary

Phase 16H is local/source/synthetic only. It must never execute the Phase-16A DEV handoff. The future DEV consumer must independently prove owner authorization, containment, currentness, checkpoint/resume compatibility, and no-production routing before product execution.
