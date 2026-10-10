## Why

Production qualification receipts are treated as integrity evidence but their validator does not enforce an exact schema, all fixed types/enums, the current production-chain definition digest, or the relationship between a denial code and the gate that emitted it. The public sealing helper can authenticate any caller-assembled internally plausible value because its digest is tamper detection, not producer authority. Several qualification, authorization-lifecycle, ordering, and result fields therefore can be changed together and resealed without proving that the qualification engine observed them.

P1 rehearsal has the same authority gap at its boundary: `configIdentity` omits `evidenceDestination` and `expectedImplementationSha`, while the safe receipt has a builder/sealer but no strict parser that recomputes every identity and coherence relationship. These paths are local/mock and do not currently authorize production, but their evidence cannot support a future decision as strongly as their names imply.

## What Changes

- Define exact prototype-safe schemas and closed coherence matrices for qualification and P1 receipts.
- Recompute the current chain-definition digest and require each denial code to belong to its recorded gate, with first-denial and `NOT_EVALUATED` suffix semantics.
- Bind authorization lifecycle, stage/environment, source/checkpoint evidence, request counts, persistence outcome, and final result to the actual qualification execution.
- Replace open caller-controlled sealing as authority with producer-minted evidence identity; retain digests only for tamper detection.
- Include every authority-bearing P1 configuration field in canonical identity and add a strict safe-receipt parser.
- Add resealing, extra-key, wrong-gate, reordered-chain, omitted-config-field, forged-producer, and contradictory-result tests.

## Capabilities

### New Capabilities

- `production-observation-receipt-integrity`: Defines producer-bound, exact, canonically recomputed qualification and P1 rehearsal evidence.

### Modified Capabilities

None.

## Impact

- Affects `src/core/prodObserve/{receipt,productionRunGate}.ts`, `src/core/prodObserveP1/{scopeConfig,safeReceipt,observer}.ts`, and local/mock tests.
- Does not authorize production observation or change owner approval requirements.
