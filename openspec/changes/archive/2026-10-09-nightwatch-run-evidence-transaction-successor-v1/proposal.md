## Why

Synthetic reproduction shows two `RunRecorder` instances can share one run
directory, lose manifest updates, duplicate sequence numbers, and finalize a
summary that disagrees with durable JSONL. A torn append can still leave a
passing terminal summary. These are direct evidence-integrity failures.

## What Changes

- Reserve each run directory exclusively.
- Acknowledge appends only after fsync.
- Latch append/mirror/memory/durable divergence as non-clean.
- Validate durable JSONL before publishing terminal summary.
- Add focused crash/concurrency/adversarial tests; leave full journal recovery
  explicitly residual.

## Capabilities

### New Capabilities

- `run-evidence-transaction-successor-integrity`: Defines exclusive run
  identity, durable append acknowledgement, and fail-closed terminal truth.

### Modified Capabilities

None.

## Impact

- Affected code: `src/core/evidence/runRecorder.ts`, focused evidence tests,
  and continuity/OpenSpec records.
- Synthetic local runs only; no external or authenticated authority.
