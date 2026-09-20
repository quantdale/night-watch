## Context

`runExport` filters a directory listing, applies `.slice(0, MAX_EXPORT_RECORDS)`, catches every per-record read/parse failure, and passes only successfully parsed records to `buildSanitizedExport`. That builder can mark truncation only when its own input exceeds the same cap, so the CLI’s earlier slice makes the flag false and omitted/failing candidates vanish. `writeSanitizedExport` uses `path.resolve`, checks the leaf and immediate parent with `lstat`, then directly performs `writeFileSync(..., flag: 'wx')`; it neither walks/pins ancestors nor proves durability. `executeNonDestructiveMigration` compares two caller strings, delegates all file behavior to injected callbacks, and returns `originalRetained: true` without rereading the original.

## Goals / Non-Goals

**Goals:** truthful export completeness; bounded snapshot/read identities; privacy-safe categorical failures; symlink-safe outside-repository durable publication; migration alias prevention and observed original retention; real race/fault tests.

**Non-Goals:** running a real migration, changing disposition policy, exporting raw/unredacted records, selecting ORPHAN, deleting old records, or making owner-private data a gate/Git artifact.

## Decisions

### Separate complete and partial outcomes

The exporter builds a manifest over the full bounded directory snapshot before serialization. `COMPLETE` requires every in-scope candidate to be safely read, parsed, sanitized, and included. Limits or failures produce `PARTIAL`/`REFUSED` with exact safe counts and codes; they never masquerade as complete. The CLI exits non-zero for preservation-incomplete outcomes unless the owner explicitly requested a bounded partial diagnostic that carries no migration/orphan authority.

### Pin identities through read and publication

Each source leaf is opened no-follow, verified regular/owner-safe/bounded, and compared with its admitted identity after read. Destination resolution walks existing ancestors without following prepared symlinks, rejects any real route into the repository/workspace, exclusively stages at 0600, flushes/verifies, atomically commits without replacement, and synchronizes the directory. Output reports only a safe basename/digest/counts.

### Migration retention is an observation, not a constant

The migration adapter supplies qualified source/destination handles or identities. The core proves they are different (including symlink/hardlink aliases), records the original preimage digest, writes the new record without replacement, verifies it, and rereads the original. `originalRetained: true` is legal only when the original identity and bytes still match; ambiguity is a separate non-success state.

## Risks / Trade-offs

- Previously tolerated corrupt records will now prevent a complete preservation receipt; this is necessary before irreversible owner decisions.
- Portable no-follow and directory durability may be unsupported on some hosts; unsupported becomes a categorical refusal.
- A diagnostic partial export remains useful, but its receipt must explicitly deny migration/orphan authority.

## Migration Plan

1. Introduce v2 export/receipt and identity-qualified migration adapter types.
2. Add safe inventory/read/publication primitives and retain v1 read compatibility where needed.
3. Route the CLI and future migration consumers through the new outcomes.
4. Add race/fault/mutation proof and full acceptance.

No record migration or ORPHAN decision occurs as part of implementation.

## Open Questions

None. Preservation must be truthful before it can support a destructive lifecycle decision.
