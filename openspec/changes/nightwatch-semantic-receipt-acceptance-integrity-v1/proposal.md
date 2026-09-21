## Why

Semantic receipts and Phase 9B/10B summaries are acceptance evidence, but their authority is split and caller-controlled. The direct receipt validator checks only the format of `receiptId`; only the generic artifact facade recomputes it, while the schema lifecycle declares the weaker direct validator as the reader. Nested source provenance is not strictly validated and the receipt's outcome/count/coverage matrix permits contradictory combinations.

More importantly, the public builder and hook accept `acceptanceClass: CONTAINED_DEV` as an ordinary input. Phase 9B summarization does not validate receipts and derives the expected source/expectation identity from the first resolved receipt while counting a decisive PASS/ANOMALY from any selected receipt. Coherently assembled or mixed receipts can therefore satisfy contained-DEV acceptance without being bound to one actual contained observation generation.

## What Changes

- Define one exact authoritative semantic-receipt parser that recomputes identity, validates nested provenance, and enforces the total outcome/count/coverage matrix.
- Make `CONTAINED_DEV` producer evidence issued only by the gated contained observation runtime and bound to context/run/request/source generations.
- Keep the general builder permanently `LOCAL_SYNTHETIC`; caller labels cannot upgrade evidence class.
- Validate every receipt and finding before summarization and require one exact target/expectation/source/evidence/acceptance generation across the decisive set.
- Prevent mix-and-match acceptance where one receipt supplies identity and another supplies decisiveness.
- Treat historical v1 and structurally valid but producer-unbound v2 receipts as readable, non-authoritative evidence.
- Add resealing, extra-key, getter/prototype, nested-provenance, contradictory-matrix, class-upgrade, mixed-generation, and finding-binding tests.

## Capabilities

### New Capabilities

- `semantic-receipt-acceptance-integrity`: Defines producer-bound exact semantic receipts and non-composable contained-DEV acceptance evidence.

### Modified Capabilities

None.

## Impact

- Affects `src/oracles/semantic/{receipts,hook}.ts`, the semantic artifact/DTO reader, `src/core/phase9b/summary.ts`, semantic acceptance/deep acceptance, browser/API producers, lifecycle declarations, and focused receipt/acceptance tests.
- Does not authorize DEV contact, change semantic outcomes, or make historical acceptance claims retroactively false.
