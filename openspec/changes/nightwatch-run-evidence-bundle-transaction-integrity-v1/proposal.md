## Why

`RunRecorder` treats a caller-supplied run ID as a directory name and recursively creates or reuses that directory. Construction truncates `manifest.json`, while event files append, so a collision or restart can combine a new manifest with old events. Manifest update parse failures are silently replaced with `{}`, and multi-file event publication writes the canonical stream before mirrors and in-memory state; a later failure can leave durable evidence that `finalize()` omits because the summary is derived only from memory. Most artifacts and the terminal summary are direct truncating writes without a bundle generation, commit marker, recovery state, or directory durability.

Observer callbacks compound this: console/page/download paths swallow recorder exceptions to avoid crashing the browser, allowing evidence loss to disappear from the run result. Existing tests normalize same-ID reuse and successful deterministic rewrites; they do not cover collisions, concurrent writers, symlinks, interruption, partial mirror failure, corrupt manifests, or false-clean finalization.

## What Changes

- Give every run an exclusively created immutable bundle generation and single-writer ownership; refuse an existing identity rather than mix generations.
- Replace independent direct writes with a versioned crash-consistent journal and derived materializations, with explicit `PREPARED`, `COMPLETE`, and `INCOMPLETE` bundle truth.
- Preserve immutable manifest identity and fail closed on corruption; never reset a failed parse to an empty object.
- Derive summaries and mirrors from validated durable canonical records, not process memory, and make observer/publisher failure categorically non-clean.
- Add filesystem confinement, owner-only/no-follow checks, bounds, fsync/rename ordering, recovery, collision/concurrency, interruption, and mutation proof.

## Capabilities

### New Capabilities

- `run-evidence-bundle-transaction-integrity`: Defines unique bundle generations, single-writer authority, canonical journaling, crash-consistent completion, derived views, recovery, privacy-safe failure escalation, and adversarial persistence proof.

### Modified Capabilities

None.

## Impact

- Affects `src/core/evidence/{runRecorder,destinationManifest}.ts`, browser observers, run-evidence readers/adapters, manual harnesses, and evidence tests.
- Composes with authenticated evidence minimization; this change owns transactional identity and publication, while that change owns the allowed authenticated payload.
- Does not cover ignored repository-local reports owned by `nightwatch-local-report-publication-integrity-v1` or owner-only production findings.
- Grants no browser, target, datastore, external-publication, or production authority.
