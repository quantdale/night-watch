## Context

`cleanupProductionProfile` checks only absolute path plus filename prefix before recursive forced removal. `sweepStaleProductionProfiles` defaults age to zero and removes any non-symlink matching entry, with no marker/lease or active-run check. `ProductionFindingsStore.write` enforces payload privacy and private staging, but the final rename replaces existing files on common platforms and capacity is a check-then-act count. `auditProductionPersistence` treats missing roots and failed reads/stats/directories as absence, stops walking when its global budget is exceeded without recording truncation, and returns `clean: violations.length === 0`.

## Goals / Non-Goals

**Goals:** deletion authority tied to exact created profiles; active/inactive truth; immutable finding history; linearized capacity; durable commit; complete audit accounting; incomplete never clean; privacy-safe diagnostics and robust local fault proof.

**Non-Goals:** authorize production contact, redesign the production structural projection, expose production findings to Control Center, or delete/migrate existing owner data automatically.

## Decisions

### Mint profile generations and leases

Profile creation verifies/resolves a configured owner-only base, creates an exclusive unpredictable directory, writes a private immutable marker containing a safe generation and lease identity, and returns a non-serializable cleanup capability bound to base, path identity, marker, and creation stat. Plain paths do not grant recursive-delete authority.

Normal cleanup revalidates the exact capability, base ancestry, no-follow path components, directory identity, marker, ownership/mode, and absence of replacement. It renames the exact directory to an owned tombstone before bounded deletion so path substitution cannot redirect traversal.

Stale sweeping inventories markers and leases. Active, ambiguous, malformed, unreadable, over-budget, symlinked, wrong-owner/type, or changed entries are retained and reported categorically. Age alone is not proof that a live profile is stale.

### Make findings append-immutable

Finding identity includes a safe logical identity and admitted content digest. Publication validates and serializes before filesystem mutation, acquires a root-scoped capacity/commit transaction, stages with `wx`, verifies and fsyncs bytes, commits without replacement, fsyncs the directory, and only then reports success. Existing different bytes never get overwritten; exact idempotent duplicates return a named result without rewriting history.

Capacity counts committed plus reserved slots under the same serialization boundary. Readers require committed regular owner-only files and reject staging/tombstone/unknown artifacts.

### Give audits a completeness state

The audit reports a stable inventory per root: requested, resolved/admitted, missing, inaccessible, changed, directories/files discovered, files inspected, oversized, unreadable, omitted-by-limit, remaining-unknown, and profile inventory status. It returns `CLEAN` only when every required root/profile base was safely resolved and completely inspected with zero violations.

Budget exhaustion, missing required root, traversal/read/stat error, identity change, unsafe root, or unknown remainder yields `INCOMPLETE` or `VIOLATION` and can never set `clean: true`. Bounds apply per declared root as well as globally to prevent one root hiding another.

## Risks / Trade-offs

- Existing path-only cleanup callers must carry capabilities; this is intentional for a recursive deletion API.
- No-replace portability varies; unsupported primitives fail closed.
- Complete audit can be unavailable on hostile/unreadable trees; truthfully reporting incomplete is preferable to false clean.

## Migration Plan

1. Add profile marker/lease/capability and audit-result schemas with strict parsers and injected filesystem seams.
2. Migrate profile creation/normal cleanup and implement classified stale sweeping.
3. Add immutable findings transaction, root-scoped capacity, and durability.
4. Replace boolean audit clean authority with complete status and update consumers/receipts.
5. Add process races, fault matrices, mutation tests, local gates, and durable documentation.

Historical roots are inspected read-only. Migration/deletion requires separate owner action and cannot be inferred from this proposal.

## Open Questions

None. A path prefix is not deletion authority, and an incomplete audit is not clean.
