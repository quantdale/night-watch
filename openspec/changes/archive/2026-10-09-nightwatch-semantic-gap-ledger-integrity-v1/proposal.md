## Why

The semantic gap ledger can report false closure and an incomplete census. Callers may override a gap directly to `CLOSED` or `MERGED_REDUNDANT`; the resulting “evidence” is only a hash of the graph, gap key, and caller label. Rebuild indexes current records by a non-unique key, iterates only baseline records, silently omits newly introduced gaps, and marks every disappeared baseline gap obsolete without proving why. `remainingGapCount` is then copied from graph length and can disagree with the ledger records. Graph surface counting also sums per-binding set sizes, so the same surface repeated twice can create false differential eligibility.

## What Changes

- Make the ledger a lossless one-to-one census of the current graph plus explicit historical transitions.
- Require typed, producer-verified closure evidence for every closed, merged, or obsolete state; remove status overrides as authority.
- Use stable unique gap identity and reject collisions, duplicates, missing current gaps, or inconsistent counts.
- Count unique observation surfaces globally per contract.
- Add new-gap, duplicate-key, unexplained disappearance, forged closure, repeated-surface, and count-conservation tests.

## Capabilities

### New Capabilities

- `semantic-gap-ledger-integrity`: Defines lossless gap census and evidence-bound closure transitions.

### Modified Capabilities

None.

## Impact

- Affects semantic coverage graph construction/normalization, closure ledger/rebuild, closure planning, quality/report consumers, and Phase 21 tests.
- Does not change external execution or source-admission authority.
