# Phase 21 — Semantic Gap Closure, Privacy-Safe Membership, and Differential Replay Saturation

Status: FROZEN INTENT

## Objective

Close a truthful, measurable majority of the actionable Phase 20 semantic
coverage gaps. The phase extends the existing Phase 19/20 authorities so that
mechanically justified contracts can become projectable, scenario-bound,
differential-capable, replayable, minimizable, stability-classified, and
high-confidence without weakening privacy, source proof, or owner authority.

## Baseline

The immutable Phase 20 fixture baseline is 6 source artifacts, 22 discovered
candidates, 21 admitted, and 1 `UNSUPPORTED_SYNTAX` rejection. Its graph has
157 nodes and 151 edges with 86 gaps: differential projection 20,
mechanically provable uncovered 16, replay 18, minimization 15, duplicate
semantic coverage 2, and unsupported analyzer 1. Mutation measurement is
34 generated / 32 applicable / 32 detected / 0 surviving, 31 benign controls,
0 benign false positives, 32 replayed, 32 minimized, and 32 high-confidence.
Phase 21 must report this baseline unchanged before reporting its delta.

## Authorization and safety boundary

Authorization class:
`PHASE_21_SEMANTIC_GAP_CLOSURE_LOCAL_SOURCE_SYNTHETIC_ONLY`

This phase is LOCAL / SOURCE / SYNTHETIC only. It may inspect approved source
through the existing path-confined read-only boundary, derive bounded
source-bound metadata, build synthetic fixtures, evaluate sanitized
projections, plan local campaigns, replay and minimize synthetic cases, and
write Nightwatch source/tests/task records. It must not contact DEV, NEXT, or
production; load authenticated state; query or mutate databases/datastores;
perform cloud/infra work; write sibling repositories; publish, message, or
email; persist raw real evidence; add AI/self-development authority; or infer
execution authority from priority or coverage.

## Required capabilities

1. Versioned `nightwatch.semantic-gap-closure.v1` census/ledger with one
   explicit record per baseline gap, bounded reason/blocker classes, closure
   eligibility/status, and deterministic before/after evidence.
2. Privacy-safe finite-set membership projections that emit only bounded
   categories and compare raw values only ephemerally against source-bound
   metadata. No raw string, source literal, identity token, or reconstructible
   digest may cross the projection boundary.
3. Applicable enum/set mutants, differential pair discovery/alignment under
   explicit equivalence proof, replay equivalence depth, dependency-aware
   minimization, scenario-binding suggestions, coverage quality levels, graph
   duplicate normalization, and a deterministic gap-driven campaign loop.
4. Dossier V5, local operator views, expanded adversarial/privacy corpus, and
   bounded operation/cache measurements composed with existing authorities.

## Non-goals

Real-product semantic acceptance, new execution authority, infrastructure or
data-layer work, external publication, raw value retention, fuzzy matching,
heuristic source meaning, generic parser broadening, AI evidence authority,
self-development promotion, or rewriting Phase 19/20 records.

## Design constraints

- Current tests and implementation outrank stale prose; source proof remains
  exact and source changes require fresh derivation.
- Every remaining gap has an explicit closure status and reason; irreducible
  gaps are not counted as covered.
- Unknown syntax, alignment, relation, replay outcome, dependency, cache
  input, or privacy condition fails closed with a stable bounded reason.
- All DTOs are deterministic, bounded, provenance/currentness-aware, and safe
  for local operator/dossier output. Raw values remain in-memory only.
- Existing Phase 9–20 schema readers and owner-scope gates remain compatible.

## Completion bar

Completion requires meaningful gap reduction with exact baseline/final
measurements, focused Phase 21 tests, Phase 9–21 compatibility, expanded
synthetic mutation/differential/replay/minimization campaign, owner-provenance,
typecheck, hardening, continuity, project-state, canonical full Playwright,
topology-correct isolated full Playwright, exact parity, zero privacy/benign
regressions, truthful external-CI inspection after the final push, and a
terminal handoff identifying every remaining gap class.
