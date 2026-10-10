## Why

The real-source inventory records Git HEAD once before enumeration and content reads, but does not prove that the repository remains at that identity through completion. Discovery then re-reads inventory files through a call-scoped view that deliberately returns digest-mismatched bytes. Most join paths detect the mismatch, but route parsing does not: changed route bytes can be parsed and combined with the inventory's earlier SHA and file digest. The Phase 24 adapter then sets `sourceSnapshotMatches: true` unconditionally. A checkout or file transition during one discovery can therefore mint a current-looking candidate from mixed source generations.

The filesystem boundary also proves no-symlink ancestry and later opens/recurses by pathname rather than holding descriptor-relative directory identity across the operation. Parent replacement remains a time-of-check/time-of-use seam. Finally, admission enforcement is optional at the public boundary, which preserves synthetic compatibility but does not make a caller's real-versus-synthetic authority explicit.

## What Changes

- Introduce an exact bounded source-read transaction that binds repository identity before and after enumeration, reads, analysis, and candidate projection.
- Make inventory digest mismatch unavailable/stale to every analyzer; never return mismatched bytes as analyzable source.
- Derive snapshot-match and currentness claims from verified transaction evidence rather than constants or join-only status.
- Use race-resistant descriptor-relative/no-follow traversal and revalidation for source and Git metadata identities.
- Separate explicit synthetic fixture access from owner-approved real-source access; omission of an admission set grants no real-source authority.
- Account for currentness, enumeration, and content operations in one bounded ledger and make any incomplete/raced transaction non-cacheable and non-promotable.
- Add adversarial tests for route-file mutation, HEAD transition, directory replacement, same-metadata content replacement, cache interaction, and every source-file role.

## Capabilities

### New Capabilities

- `source-snapshot-transaction-integrity`: Defines one exact, race-resistant, admission-bound source generation from repository observation through semantic candidate projection.

### Modified Capabilities

None.

## Impact

- Affects `src/core/source/{siblingSource,scan,callScopedRead,surfaces,cache}.ts`, Phase 24 source candidate projection, source authority callers, and focused source/currentness tests.
- Does not read sibling repositories during implementation planning, broaden the owner-approved universe, or authorize DEV/production semantic execution.
