## Why

Seven repository-local report and receipt writers publish directly beneath the ignored `artifacts/` tree with `mkdirSync` plus `writeFileSync`. They can follow a prepared ancestor or leaf symlink into an owner file, truncate the previous complete `current.json` before a replacement is durable, and—in the gate-topology case—overwrite a historical receipt when two runs share one millisecond timestamp.

## What Changes

- Introduce one governed publication boundary for ignored repository-local reports and receipts, with explicit profiles for replaceable `current.json` reports and immutable historical receipts.
- Require complete serialization, schema validation, and size admission before any destination mutation; symlink-free confined ancestry; private permissions; exclusive temporary publication; durability ordering; and categorical privacy-safe failures.
- Make current-report replacement atomic and concurrency-defined so every observable destination is either the preceding complete report or the newly admitted complete report.
- Give gate-topology receipts collision-resistant content-bound identities and exclusive no-replace publication so concurrent runs cannot silently overwrite history.
- Add a mechanically complete writer inventory and bypass guard covering cache-key, record-identity, release-freshness, silent-zero-output, test-oracle-quality, change-intelligence, and gate-topology publication.
- Preserve explicit operator output selection only when the destination satisfies the same path, file-type, confinement, and publication policy; unsafe destinations fail before mutation.
- Add adversarial process tests for ancestor and leaf symlinks, interruption stages, collisions, concurrency, permissions, stale temporary files, and external sentinels.

## Capabilities

### New Capabilities

- `local-report-publication-integrity`: Defines inventory, admission, confinement, atomic-current, immutable-receipt, concurrency, durability, privacy, and verification requirements for ignored repository-local report and receipt publication.

### Modified Capabilities

None.

## Impact

- Affects publication paths in `bin/cache-key-contract.mjs`, `bin/record-identity.mjs`, `bin/release-freshness.mjs`, `bin/silent-zero-output.mjs`, `bin/test-oracle-quality.mjs`, `bin/change-intelligence.mjs`, and `bin/gate-topology.mjs`.
- Introduces a shared local-report publisher and a structural enforcement rule/test that prevents later direct-write bypasses.
- Changes failure timing and concurrent-writer behavior for local ignored artifacts, but does not change report schemas, grant external publication, or alter owner-only/private artifact stores.
- Coordinates with `nightwatch-change-shadow-offline-runtime-integrity-v1` at the change-intelligence seam; generic argument parsing and human-facing CLI output remain owned by the production-completion operator CLI contract.
