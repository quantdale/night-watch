## Why

Parallel Playwright shards inherit the same operating-system temporary directory, so unrelated shard processes can perturb each other's filesystem observations. The current gate reproduced this as a `reviewStore.test.ts` false failure caused by another shard creating a file in `/tmp`; validation integrity must not depend on ambient cross-process state.

## What Changes

- Give every shard process a private, absolute temporary namespace through `TMPDIR`, `TEMP`, and `TMP`.
- Create one run-unique scratch root and derive one bounded child directory per shard.
- Preserve the existing explicit child-environment allowlist and proxy-state stripping.
- Add process-level adversarial coverage proving distinct shards observe distinct `os.tmpdir()` values and malformed shard identities fail closed.
- Clean the run-specific scratch root after serial or concurrent execution.

## Capabilities

### New Capabilities
- `shard-temp-isolation`: Deterministic per-shard operating-system temporary namespaces for validation processes.

### Modified Capabilities

None.
