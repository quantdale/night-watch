# WORKSTREAMS — Phase 16H

## W1 — Model / parser / identity
- strict portfolio DTO parsing;
- canonical serialization;
- approved-target membership;
- duplicate/unknown-field rejection;
- identity/version invariants.

## W2 — Scoring hardening
- component bounds;
- stale/unavailable monotonicity;
- duplicate-pressure monotonicity;
- deterministic ties and input-order permutation;
- score digest semantics.

## W3 — Allocation hardening
- global budget cap;
- per-member floors/caps;
- reserve constraints;
- starvation controls;
- blocked-member zero allocation;
- retry/checkpoint bounds;
- deterministic unselected reasons.

## W4 — Yield-accounting hardening
- arithmetic edge cases;
- empty/invalid/transient/duplicate-heavy inputs;
- NaN/Infinity/negative rejection;
- privacy-safe categorical/digest outputs;
- synthetic-only claim discipline.

## W5 — Manifest / replan / version hardening
- strict manifest parser;
- coherent IDs/digests;
- inert runtime authority;
- exhaustive source/currentness/derivation/authority movement matrix;
- historical compatibility.

## W6 — Simulator / operator tooling
- simulator purity;
- plan/simulation determinism >=3;
- all CLI commands;
- stable errors/exit codes;
- no network/persistence/product authority.

## W7 — DEV-handoff safety
- data-only manifest;
- `executable:false`;
- DEV-only restriction;
- separate token requirement;
- containment/owner-policy/checkpoint obligations;
- no embedded auth or target expansion.

## W8 — Cross-phase / full-regression closure
- Phase 12-16 compatibility;
- complete canonical regression;
- topology-correct isolated regression;
- continuity/project/catalog/privacy/authority closure;
- exact CI truth.

Parent remains sole canonical integrator if delegated review/failure clusters are used. No concurrent mutation of the same checkout.
