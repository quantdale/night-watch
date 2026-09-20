## Why

The v1 protocol dossier constructor always emits `status: READY`, even when minimization reports `NO_REPRODUCTION`, `INVALID_ORIGINAL`, or a budget-exhausted incomplete result. `triageAnomaly` can persist that value before the campaign classifies the replay outcome, and the protocol branch later appends a `READY` ledger entry, bug candidate, and `READY` promotion result even when its lifecycle already ended `UNRESOLVED`. The same pipeline also labels browser/API agreement as two fresh-context reproductions although those are different observation channels, not two independently created browser contexts.

This can turn a non-reproduced protocol anomaly into an admitted finding and inflate confidence. Semantic v2 has stronger readiness logic, but it does not protect the compatibility v1 path.

## What Changes

- Derive protocol dossier status and promotion eligibility from the actual fresh replay, minimization, safety, and missing-evidence facts.
- Persist and ledger failed/incomplete protocol triage only as explicit unresolved/incomplete evidence, never as a ready finding.
- Make `hasAdmittedFindings`, morning-brief selection, and bug-candidate accounting consume one canonical readiness verdict.
- Replace inferred fresh-context counts with explicit context-generation attestations.
- Add wrong-fingerprint, invalid-original, budget-exhaustion, partial-persistence, and channel-vs-context regressions.

## Capabilities

### New Capabilities

- `protocol-dossier-readiness-integrity`: Defines truthful readiness, persistence, ledger, promotion, and confidence semantics for protocol-only triage.

### Modified Capabilities

None.

## Impact

- Affects `src/core/triage/{pipeline,dossier,confidence,summaries}.ts` and the protocol-only campaign promotion path.
- Preserves v1 read compatibility while preventing new false-ready v1 artifacts.
- Does not change semantic v2 eligibility or authorize any real campaign.
