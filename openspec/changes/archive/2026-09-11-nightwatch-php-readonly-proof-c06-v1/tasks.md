# Tasks — PHP Read-Only Proof (C-06)

- [x] M1 data-only effect-kind vocabulary: eight kinds, per-kind owner-approved
      admission policy, identifier tables seeded from the measured `ripple-api`
      wrapper surfaces, dynamic-dispatch and control-construct lists, analyzer
      bounds, deterministic digest (`src/core/source/effectVocabulary.ts`)
- [x] M2 mechanical route → middleware pipeline resolution from the route
      provider and the per-route routing flags, fail-closed on an unresolved
      attachment, an unknown flag or an unstated flag
      (`src/core/source/phpPipeline.ts`)
- [x] M3 bounded effect closure over pipeline entrypoints plus handler, with
      categorical refusals for dynamic dispatch, unresolved and unclassified
      callees, and every bound; same-file recursion only
      (`src/core/source/phpEffectClosure.ts`)
- [x] M4 kind-diverse, effect-mandatory admission lattice carrying the join
      precondition, the inventory-completeness assertion, the vocabulary
      digest, the effect ledger and the production admission
      (`src/core/source/readOnlyProof.ts`)
- [x] M5 discovery wiring: classification moves to the post-join proof stage,
      the eleven-row catalog stops classifying, the proof is carried on the
      surface descriptor (`v4 → v5`) and the counters read the proven
      operations (`src/core/source/surfaces.ts`, `surfaceTypes.ts`)
- [x] M6 negative corpus with zero false positives (both D-79 admissions, a
      closure write, a middleware external call, an unclassified callee, a
      depth overflow, a dynamic-dispatch callee, an ambiguous join) and a
      positive corpus proving non-triviality
      (`tests/unit/c06PhpReadOnlyProof.test.ts`, 38 cases)
- [x] M7 real read-only measurement over the approved universe, reported per
      repository and per effect kind (`audit.md` §A.4)
- [x] M8 documentation and programme truth; full validation; integration
      through the C-00 session tooling
