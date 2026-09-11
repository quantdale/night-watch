# Design: Proof-Preserving Runtime and Source-Analysis Reuse

## Design goals

- Remove measured duplicate computation, not verification.
- Keep all proof-generating semantics in their existing authorities.
- Make cache/reuse identity explicit and complete.
- Fail closed or fall back to the authoritative uncached behavior when identity cannot be established.
- Keep raw source ephemeral and non-persistent.
- Provide executable before/after parity evidence at every public seam.

## Existing architecture that must remain authoritative

Nightwatch currently has separate but coupled authorities for source scanning/currentness, route/handler joins, syntax-aware analyzer observations, response-flow proof, response/semantic contract construction, gap taxonomy, read-only/eligibility censuses, Phase 24 integration and operator/Control Center projection. The optimization must not create a parallel implementation of any of those authorities.

The source analyzer builds structural observations and evidence digests. `surfaces.ts` then sorts proven shapes and binds those observation digests into response evidence, response-contract IDs and semantic-contract IDs. This means a seemingly harmless parser/output reordering can rewrite durable proof identity. The design therefore treats exact observable parity as a first-class contract.

## Component A — central TypeScript runtime loader

### Target shape

Introduce one small repository-owned bin support module (exact path chosen after local census; expected shape such as `bin/lib/typescript-runtime-loader.mjs`) that owns bounded temporary `.ts` loading for CLI entrypoints.

The API should make caller semantics explicit, e.g. a function equivalent to:

- install the temporary hook;
- compile exact source bytes with explicit options;
- load a bounded declared module list;
- restore the previous hook in `finally`;
- return loaded exports;
- expose no environment execution authority.

Do not hide compiler options in undocumented globals. If the census finds option differences, model them as explicit profiles or keep that caller separate.

### Cache design

Minimum safe cache identity:

`sha256(loader-version, typescript-version, canonical-compiler-options, exact-source-bytes)`

Filename/path must participate when TypeScript output or source-map/module behavior can depend on it. Include every other load-bearing input discovered by differential testing.

Preferred layering:

1. process-local map for repeat transpilation in one CLI process;
2. optional ignored derivative cache only if measured value remains and atomic/stale/interruption behavior is proven.

A cache entry is compiler output only. It is not a test verdict, semantic proof, source-surface result or eligibility decision.

### Failure semantics

- Never leave the hook installed after success or failure.
- Never retain a partial/failed compile as a valid cache entry.
- Nested/concurrent use must be deliberately supported, serialized, or rejected; do not rely on accidental global-hook behavior.
- Errors preserve caller-visible exit/error semantics unless an existing bug is reproduced and intentionally repaired.

## Component B — call-scoped exact source reads

The safest source optimization is to avoid reading the same approved immutable snapshot path repeatedly within one discovery/integration call.

Introduce a call-scoped read-through view or helper around the existing sibling-source reader. It must not outlive the discovery snapshot.

Minimum key:

`repoId + exact source SHA + relativePath + expected contentDigest/current inventory identity`

The implementation may reuse `null` only if doing so preserves the authoritative currentness semantics for that immutable call scope. If the underlying abstraction permits mutation during a call, prefer positive-content memoization and re-evaluate null/currentness behavior rather than assuming stability.

No raw source leaves memory and no new filesystem persistence is introduced.

## Component C — optional shared parse/token work

This component is admitted only after A and B are complete and the baseline parity harness exists.

Problem: many operations can point at the same handler file but different symbols. Re-tokenizing identical PHP/TS/Go/OpenAPI source for each symbol is mechanical waste, but analysis remains symbol/hint-specific.

Safe separation:

- immutable source representation/cache key is file/snapshot/content identity;
- parsed/tokenized representation may be file-shared;
- symbol, hints, extended-proof flags and observation surfaces remain per-analysis inputs;
- observation rendering, analyzer ID/version, rejection mapping and evidence-digest construction remain the existing authority.

Do not cache final analyzer observations unless the full input tuple is proven complete and doing so adds measurable value. Prefer sharing the lower-level parse/token structure so verdict generation still executes normally.

If changing the analyzer API would cause identity drift or materially increase complexity, reject this component and retain only read reuse.

## Component D — differential parity harness

Create a reusable test/helper that can run the legacy/reference path and candidate path over identical synthetic and current approved-source snapshots without persisting raw source.

Compare deeply and, where the existing CLI contract is deterministic, byte-for-byte:

- inventory and counters;
- operation/surface descriptors;
- joins/currentness;
- analyzer diagnostics and evidence digests;
- response-flow proofs;
- response/semantic identities;
- gap taxonomy;
- readonly/eligibility censuses;
- Phase 24 inputs/portfolio/selection;
- source review/explain projections;
- safe deterministic digests and CLI JSON.

The harness should report the first structural path that differs while avoiding raw source/value leakage.

## Invalidation and correctness invariants

1. Different repo/source SHA/path/content identities never share source-derived reuse.
2. Same input produces identical public outputs cold and warm.
3. Source content mutation invalidates compiled/parsed reuse even when timestamp metadata does not change.
4. Timestamp-only mutation cannot alter a content-addressed result where mtime is not an authority.
5. Analyzer-set/response-flow/compiler version movement invalidates affected derivative work.
6. Unknown or malformed identity fails closed or uses the authoritative uncached path.
7. Cache corruption/interruption cannot manufacture proof.
8. Existing bounds on source size, output count, parser depth and privacy sentinel handling remain enforced before proof admission.

## Performance measurement

Measure the same commands before and after, with cold/warm state documented. At least:

- representative affected bin CLIs;
- `campaign:eligibility-census` / `campaign:source-gaps` or current equivalent source-census commands;
- focused tests that repeatedly spawn the CLIs;
- semantic compatibility total wall time;
- full local gate when practical.

Capture peak RSS for the source-census path because parse sharing can trade CPU for memory. Reject a speedup that causes a disproportionate memory regression or unbounded cache growth.

## CI behavior

Do not redesign `.github/workflows/hardening.yml` solely because current Actions jobs fail before step execution. The repository already documents a billing/spending-limit/platform block. Observe exact-head CI once after the final push. Only a run that actually executes steps can validate repository code.

## Rollback strategy

The implementation is mechanics-only and should be incrementally committable. If the centralized loader causes an entrypoint regression, keep that caller on the prior behavior while fixing the shared contract. If source-work reuse changes proof identity, revert that layer without reverting independently proven loader consolidation. Do not version-bump evidence contracts merely to excuse optimization-induced drift.
