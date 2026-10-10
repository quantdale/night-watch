## Why

`admitLocalFinding` claims every authority-bearing field is derived from harness-observed state and history. Two current paths contradict that.

If `state.candidateIds` is missing or not an array, membership checking is skipped and a history proposal alone can continue. Malformed runtime state therefore weakens the UNKNOWN_CANDIDATE gate instead of failing closed.

If qualifying receipts carry no evidence/provenance refs, admission invents `reproduction:<id>` so the dossier builder's required provenance list is never empty. That string is not an observed evidence ref. Title/severity also default when the draft omits them (`Local finding …`, `S3`), so an admitted dossier can look complete without observed presentation or provenance.

## What Changes

- Refuse admission when runtime state is present but candidate membership cannot be exact-validated.
- Refuse admission when qualifying receipts do not supply observed provenance/evidence refs; never synthesize `reproduction:` ids.
- Keep draft fields presentation-only; do not default severity/title into authority-shaped dossier slots without marking them ungrounded.
- Add malformed-state, missing-candidateIds, empty-provenance, and default-severity regressions.

## Capabilities

### New Capabilities

- `local-finding-admission-grounding-integrity`: Defines fail-closed candidate membership and observed provenance for mechanical admission.

### Modified Capabilities

None.

## Impact

- Affects `src/core/localInvestigation/admission.ts` and focused admission tests.
- Does not run a campaign, contact siblings, or change reproduction providers.
