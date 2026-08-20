# WORKSTREAMS — Phase 14A

## Workstream A — Fresh-source baseline and blocker reproduction

- Resolve current remote SHA(s) for approved source repos.
- Create disposable exact snapshots; canonical siblings read-only/unchanged.
- Reproduce B1-B5 or classify current-source drift precisely.
- Freeze permanent regression fixtures for the historical blocker classes.

Deliverable: source-current baseline inventory with exact blocker evidence.

## Workstream B — Bounded source-contract analyzer

- Extend `src/oracles/expectations/extract/**` with versioned deterministic mechanical analysis.
- Support finite literals, casts, bounded branch unions, aliases, guaranteed return-envelope fields, and other SPEC-approved proof classes.
- Reject dynamic/runtime/DB/reflection/partial cases explicitly.
- Produce normalized source evidence and deterministic digest.

Deliverable: stronger analyzer with synthetic proof/rejection coverage.

## Workstream C — Existing PHP target depth

- Re-evaluate `ripple.account-inventory.read` and `ripple.billing-group-exchange.read` at fresh source.
- Admit only stronger source facts actually proven by the analyzer.
- Runtime/database value types remain ambiguous unless source explicitly normalizes them.

Deliverable: evidence-backed uplift or sharper blocker for each target.

## Workstream D — Conditional and chunked/interface targets

- Re-evaluate `ripple.billing-groups-legacy.read` conditional blob.
- Locate the authoritative static contract for `ripple.billing-groups.read`.
- If proto/generated/interface source mechanically proves finite shape/chunk semantics, add a bounded adapter; otherwise preserve a precise blocker.
- Never infer transport semantics from names/comments.

Deliverable: proven contract or fail-closed classification for each target.

## Workstream E — Admission, resolver, inventory, semantic identity

- Re-run complete approved-target inventory.
- If uplift exists, add additive versioned recipes/expectations without changing historical IDs.
- Prove resolver/currentness, wrong-SHA failure, collection compatibility, campaign-bundle coherence, semantic-cluster identity stability across source-SHA-only movement.
- If no uplift, registry stays unchanged.

Deliverable: truthful before/after coverage inventory and durable identities.

## Workstream F — Corpus, backtest, hardening and closure

- Build `corpus/phase14/**` >=30 source fixtures.
- >=3 deterministic repeats; all quality floors zero.
- Run focused compatibility, fresh-source canary, canonical + isolated full regressions, continuity/project/catalog/diff checks.
- Push validated implementation + docs closure fast-forward and inspect exact Actions truth.

Deliverable: complete Phase-14 acceptance ledger and truthful terminal state.
