## Why

Nightwatch treats a storage-state artefact and its digest-bound lifecycle sidecar as one authenticated capability, but current writers do not publish that pair as one recoverable transaction. The automatic DEV refresh replaces the artefact without writing any lifecycle record, while direct capture renames the artefact before separately writing the sidecar; ordinary refresh therefore creates an immediately stale/unknown-age capability and an interruption can destroy the previously valid pair.

## What Changes

- Define one authentication-capability bundle transaction used by direct capture, automatic DEV refresh, adoption, and every future writer.
- Stage and validate the storage state plus lifecycle record against the exact same bytes before either becomes the committed current bundle.
- Serialize writers per destination and publish a recoverable generation/commit marker so readers observe the complete previous or complete new pair, never a mixed pair.
- Preserve the previous valid bundle until the replacement and its durable commit are proven; surface categorical incomplete/recovery states without exposing secret material.
- Bind preflight results to the exact committed generation consumed by browser/process launch and revalidate at the final effect boundary.
- Add interruption, concurrency, stale-sidecar, automatic-refresh, alias/symlink, durability, and privacy tests across every writer and consumer.

## Capabilities

### New Capabilities

- `auth-capability-bundle-integrity`: Governs complete writer coverage, same-byte lifecycle derivation, crash-consistent publication/recovery, reader generation binding, concurrency, and secret-safe evidence for authentication state bundles.

### Modified Capabilities

None.

## Impact

- Affects `src/auth/capabilityLifecycle.ts`, `src/auth/directRunner.ts`, `src/auth/devAutoLogin.ts`, `src/browser/fixtures/storageState.ts`, authenticated launchers/preflights, and focused auth/storage-state tests.
- The existing sidecar fields and external owner-only storage class remain compatible; migration may add a generation manifest or transaction journal beside them.
- Does not capture credentials, contact DEV, automate MFA, weaken expiry/environment checks, or authorize any authenticated run during this planning change.
