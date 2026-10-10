## Context

`runDirectAuthCapture` first calls `atomicallyReplaceValidatedStorageState`, marks `stateCommitted`, and only then calls `writeAuthCaptureRecord`. A crash or sidecar failure in that interval leaves new secret bytes paired with the old record or no record; the previous state has already been replaced and cleanup deliberately preserves the committed file. `runDevAuthRefresh` performs the same storage-state replacement but never calls `writeAuthCaptureRecord`, so a refresh deterministically leaves the existing record digest stale (or leaves no record). Current preflight correctly refuses that mixed state, but the capture/refresh reported success and ongoing callers can use it before the next lifecycle preflight.

The bundle is outside Git, contains secret storage state plus a non-secret sidecar, and must stay owner-only. A filesystem cannot atomically rename two independent names, so “write both atomically” needs an explicit generation/commit design rather than sequential renames presented as atomic.

## Goals / Non-Goals

**Goals:** one writer API and denominator; exact-byte record derivation; previous-or-new crash semantics; exclusive replacement; durable recovery truth; final consumer binding; sanitized categorical diagnostics; deterministic fault coverage.

**Non-Goals:** storing auth data in Nightwatch, changing credential/MFA authority, refreshing automatically beyond existing authorization, extending validity windows, or running a real capture in this planning campaign.

## Decisions

### Publish immutable generations behind one current pointer

Stage each secret artefact and its redacted record under a fresh private generation identity. Validate shape, ownership, permissions, target semantics, record schema, and digest equality from the staged bytes. Fsync both files and their private directory, then atomically publish one small current-generation pointer/manifest and fsync the parent. Readers resolve only a strict committed generation; orphan staging and incomplete generations are never current.

Alternative rejected: rename the two legacy paths sequentially. No ordering prevents a crash-visible mixed pair. Alternative rejected: write the sidecar first, because that merely reverses which mismatch is visible.

### Centralize every writer

Direct capture, DEV refresh, adoption/replacement, synthetic capture, and future writers use the same transaction primitive. A structural census fails when production code calls the low-level storage-state replacement or lifecycle-record writer as an independent publication path.

### Preserve and recover, never infer success

Acquire an exclusive destination-scoped lease before staging. The prior committed generation remains current until the new pointer is durable. Startup/read recovery may delete a proven orphan staging generation, but never guesses that an uncommitted generation succeeded and never deletes a valid prior generation. Ambiguous state returns `AUTH_CAPABILITY_TRANSACTION_INCOMPLETE` with safe generation IDs/digests only.

### Bind preflight to consumption

Successful preflight returns a bounded bundle identity containing the committed generation ID, lifecycle schema, artefact digest, environment/origin, and validity boundary. Browser/process creation reopens the current pointer and revalidates this identity immediately before consuming the state. A changed, missing, aliased, or expired generation refuses before the effect; long-running lanes retain their existing mid-run policy but cannot silently switch artefacts.

### Keep compatibility explicit

Legacy `<artefact>.auth-lifecycle.json` pairs are admitted only after strict pair validation and can be migrated to one immutable generation without changing secret contents. The migration is idempotent and retains the legacy pair until current-generation durability is proven. Status surfaces report legacy/migrated/incomplete categorically.

## Risks / Trade-offs

- [Extra files and indirection complicate operator inspection] → keep the current pointer small, versioned, owner-only, and expose a metadata-only status command.
- [A lease abandoned by a crash can block capture] → bind it to a nonce/process-start observation and provide conservative stale recovery that never removes a live writer.
- [Generation retention can accumulate secret files] → prune only non-current generations after a newer commit is durable and only under explicit bounded retention rules.
- [Preflight-to-launch revalidation adds I/O] → the bundle is small and the safety boundary outweighs a few local metadata/digest reads.

## Migration Plan

1. Inventory all writers/consumers and add a failing totality rule.
2. Introduce the generation store, bundle validator, lease, and fault-injection seams without changing current readers.
3. Convert direct capture and DEV refresh, then adoption/synthetic writers.
4. Convert preflight/launch consumers to generation-bound receipts.
5. Migrate valid legacy pairs lazily or with an explicit local command; preserve the old pair until success.
6. Run focused interruption/concurrency/privacy tests, hardening, full local/clean gates, and only then document the new format.

Rollback must select the still-valid previous generation; it must not reconstruct a sidecar from unknown secret bytes.

## Open Questions

None. The implementation may choose exact filenames, but it must satisfy previous-or-new visibility and same-byte proof rather than claiming multi-file rename atomicity.
