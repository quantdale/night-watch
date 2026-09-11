# Proposal: Source-Analysis Runtime Hardening and Proof-Identity Preservation

## Change ID

`nightwatch-source-analysis-runtime-hardening-v1`

## Status

PLANNED / AUTHORIZED FOR LOCAL-SOURCE-SYNTHETIC IMPLEMENTATION BY THE EXECUTION PROMPT. Implementation has not started in this planning commit.

## Why

Nightwatch's previous repository-wide systemic optimization cut the local validation loop substantially without weakening gates, but it intentionally deferred two measured hotspots because they cross hardened entrypoints and source-evidence identity boundaries:

1. roughly twenty bin entrypoints carry near-identical TypeScript runtime transpile hooks; the source/census CLI spends a material fraction of runtime in repeated `typescript.transpileModule` work;
2. source discovery analyzes many operations over a much smaller set of unique handler files, rereading and reparsing exact source within one bounded snapshot.

These are now the strongest evidence-backed local engineering bottlenecks. The current roadmap does not justify inventing another product-facing phase or widening source-proof authority. The right successor is therefore a mechanics-and-proof campaign: remove redundant work while proving that evidence, contract, census and selection identities remain unchanged for identical inputs.

## Intended outcome

- One repository-owned TypeScript runtime loader replaces duplicated loader mechanics where semantics are truly identical.
- Exact-source reads and, only if safely provable, parse/tokenization work are reused within one source-discovery invocation.
- A differential parity harness makes evidence-identity preservation executable rather than assumed.
- Cold/warm performance and peak RSS are measured before and after.
- No product/environment/data/infra/publishing/self-development authority is added.
- Any optimization that cannot preserve the proof chain is rejected instead of forced.

## Scope

### In scope

- `bin/**` TypeScript runtime-loading/transpilation mechanics.
- `src/core/source/**` exact-snapshot read reuse and source-discovery mechanics.
- `src/core/semanticCoverage/sourceAnalyzers.ts` only to the extent necessary for proven shared parsing/work reuse.
- Relevant response-flow, cache/currentness, eligibility census, source review, operator/Control Center projection seams.
- Tests/fixtures needed to prove exact parity, invalidation, fallback and performance behavior.
- Native `.agent` task continuity and durable docs only where implementation changes project truth.

### Out of scope

- DEV/NEXT/production execution or authenticated observation.
- New endpoints, product surfaces, source-proof families or Phase 24 selection authority.
- Database/datastore/cloud/infrastructure operations.
- Sibling repository writes.
- External publication or owner-only finding movement.
- Runtime AI authority.
- Canonical self-development promotion.
- Disk-backed source-surface/evidence verdict caches.
- Changing semantic-compat workers=1 or other versioned determinism contracts merely for speed.
- Broad monolith splitting without a reproduced defect.

## Success criteria

1. Literal audit coverage includes every tracked file in the checkout and deeply reconciles all affected loader/source-analysis/evidence paths.
2. Duplicate TS loader mechanics are consolidated where differential behavior is identical.
3. Source-work reuse is exact-snapshot-bound, bounded, fail-closed and source-private.
4. For identical inputs, evidence digests, response/semantic contract IDs, deterministic digests, proof states, ordering and Phase 24 eligibility outputs are exactly preserved.
5. Focused/adversarial/full local gates are green without assertion weakening.
6. Measured engineering-loop/source-census runtime improves materially or the campaign documents a justified no-change outcome for a rejected candidate.
7. Final report records exact Git and CI truth; an external zero-step Actions block is never presented as green CI or as a Nightwatch code failure.

## Decision rule

Correctness and proof identity outrank performance. If reuse makes the implementation faster but changes same-input evidence identity, ordering, fail-closed classification, cache currentness or safety behavior, that optimization does not ship under this change.
