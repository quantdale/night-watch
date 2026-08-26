# Nightwatch Source-Analysis Runtime Hardening — Frozen Specification

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Title: Source-Analysis Runtime Hardening + Proof-Identity Preservation
Status: IN_PROGRESS
Authorization class: NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Intent

Reduce measured duplicate TypeScript runtime-loader and source-analysis work
inside Nightwatch while preserving the existing source, semantic, replay,
eligibility, Phase 24, safety, privacy, determinism, and fail-closed
authorities. This is a local/source/synthetic mechanics campaign. Identical
inputs must retain identical safe outputs and proof identities.

## Required outcome

The campaign must complete the OpenSpec change
`nightwatch-source-analysis-runtime-hardening-v1` end-to-end:

- audit every tracked file and all affected loader/source/evidence seams;
- consolidate equivalent TypeScript loaders with per-caller proof, or reject
  the consolidation with measured evidence;
- add only bounded, call-scoped exact-snapshot source reuse that preserves the
  existing sibling-source authority;
- investigate shared parse/token work only if residual cost and exact parity
  justify it, otherwise document the rejection;
- provide an executable differential harness over complete safe observables;
- add adversarial, privacy, invalidation, fallback, hook, concurrency, and
  same-symbol/different-symbol regression protection;
- measure performance and RSS honestly without weakening verification; and
- close native continuity, OpenSpec tasks, local/clean/isolated gates, Git,
  and exact external-CI truth.

A zero improvement or zero deeper-parser-admission result is valid only when
the campaign records the evidence and retains independently proven wins.

## Permanent boundaries

- LOCAL / approved read-only source / synthetic only.
- No DEV, NEXT, production, authentication state, product mutation,
  database/datastore/SQL, cloud/infrastructure, Alphaus sibling write,
  publication, external coordination, runtime AI, or self-development
  promotion.
- No application-code execution in source-analysis proof paths. Existing
  source readers remain confined, read-only, bounded, and authoritative.
- Raw sibling source, customer values, credentials, cookies, bodies, traces,
  arbitrary private paths, and owner-only findings remain ephemeral or
  outside this repository. They must not enter DTOs, caches, task records,
  reports, logs, or Git.
- No disk-backed source-surface/evidence/verdict cache. Any reuse is bounded
  and in-memory unless a separately proven ignored compiler-derivative cache
  is strictly justified.
- Do not change analyzer IDs/versions, response-flow identities, digest
  canonicalization, rejection taxonomy, currentness semantics, selection,
  replay, dossier, Control Center, owner policy, or Phase 24 authority merely
  to make an optimization pass.
- Unknown, stale, unavailable, malformed, ambiguous, unsupported, oversized,
  corrupted, or unidentifiable input fails closed or follows the existing
  authoritative uncached path; reuse never manufactures proof.

## Proof and acceptance bar

Every optimization requires a measured/reproducible cost, an identified
mechanism, an implementation that removes work, and a differential proof that
same-input safe outputs remain equal. Equality includes ordering, proof
states, analyzer diagnostics and evidence digests, response-flow and contract
identities, semantic IDs, source-gap and census digests, Phase 24 inputs and
reasons, review projections, and deterministic CLI bytes where contractual.

The final result must include exact task progress, baseline/post timings and
RSS methodology, focused/adversarial results, full local and clean validation,
canonical/isolated parity where required, continuity/project truth, a clean
pushed `main`, and an exact-head Actions observation. A zero-step external
Actions run is recorded as an external platform/billing block, never as green
CI or a code failure.

## Frozen planning source

The ordered implementation tasks and requirements are frozen in:

`openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/`

The repository `AGENTS.md` and the execution prompt take precedence over this
specification when evidence or safety rules disagree.
