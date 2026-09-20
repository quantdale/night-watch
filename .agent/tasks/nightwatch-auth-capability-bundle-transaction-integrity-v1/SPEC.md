# Authentication capability bundle transaction integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-015 without capturing authentication or changing runtime implementation.

## Established starting state

- Parent audit starts at `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Direct capture commits storage state before its separate lifecycle sidecar.
- Automatic DEV refresh replaces storage state without writing a lifecycle sidecar.
- Existing preflight correctly refuses missing/stale records, so the writer path can report success yet leave a capability that the next run rejects.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Complete writer/consumer census, same-byte generation proof, crash-consistent pair publication, final consumer binding, concurrency/recovery/privacy tests.

## Non-goals

No product implementation, real credentials, browser capture, DEV/NEXT/production contact, or authorization change.

## Safety constraints

Planning and read-only evidence only; validation may parse local artifacts.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no authenticated/runtime/external action.
