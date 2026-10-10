## Why

Control Center finding summaries collapse dossier status with `status === 'READY' ? 'READY' : 'INCOMPLETE'`. The DTO already has `UNAVAILABLE` and `UNKNOWN`, but the projector never uses them for failed, blocked, unresolved, or unreadable dossiers. A protocol dossier that is falsely READY (NW-AUD-029) is shown as READY. A dossier that failed reproduction, is blocked, or could not be read is shown as INCOMPLETE, which reads as unfinished work rather than a negative or unknown conclusion.

The reviewer cone already requires FACT / RECOMMENDATION / UNKNOWN labelling. Findings summaries do not apply that rule to status.

## What Changes

- Project dossier status through an explicit mapping that preserves READY, INCOMPLETE, UNAVAILABLE, and UNKNOWN.
- READY SHALL require the same readiness facts the owning dossier cone requires; this change consumes that verdict and does not re-implement protocol readiness.
- Failed, blocked, unread, and privacy-elided rows SHALL NOT become INCOMPLETE by default.
- Add false-READY, failed-reproduction, unread, and privacy-elided projection tests.

## Capabilities

### New Capabilities

- `control-center-finding-status-projection-integrity`: Defines truthful finding-status projection for the Control Center summary surface.

### Modified Capabilities

None.

## Impact

- Affects `src/controlCenter/adapters/findingsAdapter.ts` and focused Control Center tests.
- Does not grant review writes, load private artifacts during planning, or reopen protocol-readiness ownership.
