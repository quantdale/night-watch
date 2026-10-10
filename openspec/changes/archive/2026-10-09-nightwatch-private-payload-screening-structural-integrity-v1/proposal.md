## Why

Nightwatch applies its canonical private-payload regex to JSON.stringify output at private stores and readers. The labeled-value expression expects token: value, but serialized object keys are quoted, so ordinary objects such as {token: ordinaryplaintexttoken}, {password: ordinaryplaintextpassword}, and {customer: ordinarycustomerid} all pass. Sentinel-shaped test values still fail, masking that the normal structural channel is unscreened. Generic private stores and Control Center readers therefore cannot independently enforce their claimed no-secret/no-customer-data boundary.

## What Changes

- Replace regex-over-serialized-JSON admission with bounded structural parsing and recursive key/value/provenance validation.
- Define closed per-artifact schemas and safe DTO brands for every private-store writer and Control Center reader; arbitrary unknown objects no longer satisfy privacy by scanning.
- Keep text-shape scanning only as defense in depth for bounded diagnostic/text fields, with decoded/canonicalized variants and explicit limits.
- Make all store/read/publish paths fail closed with categorical diagnostics on malformed, ambiguous, prototype-hostile, cyclic, oversized, or unknown inputs.
- Add quoted-key, ordinary-value, nested/container, encoding, alias, mutation, and complete writer/reader census tests.

## Capabilities

### New Capabilities

- private-payload-screening-structural-integrity: Defines structural privacy admission, closed DTO/schema ownership, bounded text defense, total consumer enforcement, and non-vacuous validation for owner-local artifacts and readers.

### Modified Capabilities

None.

## Impact

- Affects src/core/policy/privateScreening.ts, privateArtifacts.ts, private-store writers, production firewall defense in depth, Control Center findings/run readers, hardening rules, and privacy tests.
- Preserves owner-only storage and existing production typed projection while removing regex scanning as primary structural authority.
- No real finding, credential, customer value, external publication, or product implementation is created by this planning change.
