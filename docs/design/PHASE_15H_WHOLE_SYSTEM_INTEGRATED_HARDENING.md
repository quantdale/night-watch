# Phase 15H — Whole-System Integrated Hardening

## Purpose

Phase 15P deliberately traded validation for implementation throughput. Phase 15H is the inverse: no new architectural breadth for its own sake; instead prove, repair, and stabilize the combined local/source system.

The hardening dependency cone is the 105-file mass implementation plus any historical surface affected by those contracts.

## Design principles

### 1. Compilation is the first discriminator

The mass handoff predicts integration fallout. TypeScript errors are high-value evidence because they expose missed callers, stale enum exhaustiveness, deleted exports, and shape drift. Run the compiler before spending time on broad behavior suites.

### 2. Hardening fixes source, not tests around source

Tests are executable specifications only when still aligned with durable truth. When a test fails, first decide whether the implementation or the expectation is stale. Update expectations only with source/version/compatibility evidence. Never relax assertions simply because the mass implementation changed behavior.

### 3. Historical compatibility remains load-bearing

Phase 15P converged multiple vocabularies and version owners. Old serialized records/checkpoints/dossiers/snapshots may still exist. Current writers should use current contracts, while historical readers either parse explicitly or fail closed with an intentional version error. Silent reinterpretation is prohibited.

### 4. Authority is proven negatively

Frozen/gated subsystems are hardened by demonstrating they cannot execute through new convergence paths. Phase 6, Phase 11B, Phase 13B, real campaigns, and DEV are not acceptance targets in this phase.

### 5. Corpus definitions become executable evidence

Phase 15P created 66 adversarial scenario definitions. Phase 15H must prove those definitions are wired to deterministic builders/executors or explicit marker-only blocker assertions. A registry entry by itself is not a test.

### 6. Full topology matters after local convergence

After focused and historical matrices are green, run complete canonical and topology-correct isolated suites. This catches accidental reliance on sibling layout, local dirty files, module registration order, and removed exports that focused tests may miss.

## High-risk integration seams

1. `src/core/artifactValidation/index.ts` and replay-envelope registration order.
2. `src/core/campaign/checkpoint.ts` + `orchestrator.ts` after A05/A09/A16 overlap.
3. `CLUSTERED` lifecycle state exhaustiveness.
4. expanded A02 vocabulary/provenance registry versus stale exact-count assertions.
5. project snapshot required-field growth and historical compatibility.
6. A15 deleted exports/files without compiler proof.
7. duplicated private/sentinel screening semantics.
8. retry ceiling and resume refusal around budget exhaustion.
9. A07 minimality evidence integration with actual minimizer/replay paths.
10. shared version constants after owner convergence.

## Expected closure

The strong local terminal is `BLOCKED_EXTERNAL_CI` if every local/source gate is green but GitHub Actions still cannot execute due the external billing/spending condition. `COMPLETE` requires an actual Actions run whose steps execute and pass. Any unresolved local failure produces `BLOCKED`, regardless of CI state.
