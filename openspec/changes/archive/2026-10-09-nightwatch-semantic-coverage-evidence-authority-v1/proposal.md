## Why

The Phase 20/21 coverage system treats structural DTOs and caller booleans as lifecycle proof. Inventory admission accepts caller-assembled candidates without validating identities or provenance; coverage updates can promote a candidate to `FULLY_COVERED` from arbitrary flags. Relational, differential, metamorphic, membership, graph, campaign, and quality builders similarly trust `mechanicallyProven`, `supported`, `reproduces`, `eligible`, or `explainable` inputs. Synthetic mutation measurement defaults detected defects to replayed, minimized, and high-confidence when lifecycle evidence is omitted, while the lifecycle builder fabricates replay/minimization receipts from flags and set membership instead of executing the semantic operation.

## What Changes

- Add exact validators and producer-bound evidence records for candidates, contracts, bindings, replay, minimization, differential, and dossier capabilities.
- Derive coverage/lifecycle state from validated receipts rather than caller booleans or mutable structural DTOs.
- Remove compatibility defaults that self-certify missing lifecycle evidence.
- Recompute all inventory, graph, campaign, and quality identities and reject duplicates, orphans, mixed generations, and stale evidence.
- Add forged-input, omitted-evidence, duplicate, recomputation, and mutation tests across every promotion edge.

## Capabilities

### New Capabilities

- `semantic-coverage-evidence-authority`: Defines authenticated local evidence for semantic contract and lifecycle coverage claims.

### Modified Capabilities

None.

## Impact

- Affects semantic coverage discovery, contracts, membership, graph, campaign integration, mutation/lifecycle, quality, caching, reports, and Phase 20/21 tests.
- Remains LOCAL/SYNTHETIC and grants no DEV, production, infrastructure, or data-layer authority.
