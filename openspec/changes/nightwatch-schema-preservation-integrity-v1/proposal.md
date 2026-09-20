## Why

The schema-lifecycle export is the owner’s preservation step before migration or an ORPHAN decision, but the CLI silently skips unreadable/invalid records and slices the candidate list to 10,000 before the sanitizer computes `truncated`, making an incomplete export report `truncated: false`. Its destination check is lexical and inspects only the immediate parent, so a symlinked ancestor can redirect an “outside repository” path back inside the repository. The generic non-destructive migration primitive also proves path inequality only by raw string and always reports `originalRetained: true`, even if aliased paths or injected I/O make the new write touch the original.

## What Changes

- Make schema export inventory and completeness explicit: discovered, admitted, exported, omitted-by-limit, unreadable, malformed, changed-during-read, and unsupported records are counted and terminally classified.
- Forbid a complete/successful preservation claim whenever any candidate was skipped, changed, unreadable, invalid, or omitted without an explicit partial-export outcome.
- Resolve and pin source record identities while reading; refuse symlinks, non-regular files, replacement races, and unbounded records without exposing private paths or raw bytes.
- Constrain the export destination through symlink-free ancestor validation and real containment checks, then use exclusive owner-only durable publication.
- Replace string-only migration path separation with caller-independent source/destination identity and pre/post original-byte proof; never claim original retention without observing it after the attempted write.
- Add real filesystem alias, ancestor-symlink, limit, malformed-record, mutation-race, write/readback, and killed-process tests plus non-vacuous hardening mutations.

## Capabilities

### New Capabilities

- `schema-preservation-integrity`: Defines truthful bounded schema export, safe durable destination publication, and mechanically proven non-destructive migration identity/retention.

### Modified Capabilities

None.

## Impact

- Affects `bin/schema-lifecycle.mjs`, `src/core/schemaLifecycle/export.ts`, `src/core/schemaLifecycle/migration.ts`, schema lifecycle types/receipts, tests, and hardening.
- Does not migrate, orphan, delete, overwrite, or publish any owner record; implementation requires separate authority.
- Export content remains redacted and owner-local outside the repository.
