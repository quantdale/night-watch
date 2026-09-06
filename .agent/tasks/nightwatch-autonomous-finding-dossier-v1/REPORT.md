# Lane G REPORT — nightwatch-autonomous-finding-dossier-v1

## Implementation
- `src/core/autonomousFinding/types.ts` — draft input vocabulary + protocol
  re-exports. No handoff-cone import (AH-1 boundary).
- `src/core/autonomousFinding/dossier.ts` — `buildAutonomousFindingDossier`,
  fail-closed (`AUTONOMOUS_FINDING_INVALID:*`); requires evidence ≥1,
  reproductionCount ≥1, false-positive checks ≥1, provenance ≥1; S1–S4 only;
  authority is the exact `AUTONOMOUS_FINDING_AUTHORITY` reference.
- `src/core/autonomousFinding/projection.ts` — structural handoff projection:
  exact authority literals, all classifications UNKNOWN + basis/provenance,
  S-level cited in basis but never mapped to organizational vocabulary.
- `src/core/autonomousFinding/index.ts` — barrel.
- `tests/unit/autonomousFinding.test.ts` — 15 tests: authority literals,
  S1–S4 vocab, evidence fail-closed, grep-level submission-surface ban,
  projection assignability to `AlphausFindingHandoff['authority']`.

## Design note (boundary)
`src` files must not import `core/alphausHandoff` (hardening AH-1). The
projection therefore duplicates the authority/recommendation literals
structurally (documented in module header) and proves assignability at the
type level inside `tests/**`, a permitted importer. hardening:check PASS.

## Ownership violations
None. No edits to alphausHandoff, agentProtocol, aiReview, other lanes.

## Blockers / extra-lane needs
None.
