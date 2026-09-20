## Context

The recorder writes a directory-shaped evidence bundle through several unrelated filesystem calls. The run ID has only a short random suffix and directory creation is not exclusive. `manifest.json` is overwritten at construction; JSONL files append; `addManifestEntry` resets unreadable content to `{}`; summary and repository/proxy materializations overwrite directly. The in-memory event array is a second authority that can diverge from durable JSONL after a mirror failure or process interruption.

## Goals / Non-Goals

**Goals:** immutable generation identity; exclusive writer ownership; one canonical ordered journal; atomic bounded materializations; truthful crash state; summary reconstruction; no silent observer evidence failure; private path safety and deterministic recovery.

**Non-Goals:** change finding semantics, create an external database, retain authenticated raw data, cover production evidence, or authorize runtime campaigns.

## Decisions

### Use an immutable generation directory with an exclusive claim

A run request creates an unpredictable generation under a verified owner-only root using exclusive no-follow primitives. The logical run label remains metadata, not filesystem authority. An existing generation, unsafe ancestor/leaf, wrong ownership/mode/type, or concurrent claim refuses before any evidence bytes or browser authority are created.

Tests that require deterministic bytes use separate fresh roots and normalize generation metadata; they do not reopen a live generation.

### Make one journal the canonical authority

An append-only, bounded, checksummed journal begins with an immutable identity header and records manifest amendments, events, proxy imports, repository facts, publication failures, and terminal intent. Every record has generation, monotonic sequence, kind, safe schema version, length, and integrity linkage. Append and required durability complete before a record is acknowledged.

`events.jsonl`, `network.jsonl`, `console.jsonl`, `manifest.json`, `proxy.jsonl`, `repositories.json`, and `summary.json` become derived, atomically replaced views. Failure to refresh a view does not erase the canonical record, but it latches the bundle non-clean until reconstruction and verification succeed.

### Derive terminal truth from durable evidence

Finalization seals the admitted journal prefix, reconstructs and validates all records, derives the summary, publishes views, and commits a terminal marker only after file and directory durability. A header without a verified terminal marker is `INCOMPLETE`; readers never infer PASS from a summary file alone. Conflicting, truncated, duplicated, reordered, or post-terminal records fail closed.

### Escalate observation/persistence failure

Observers may isolate themselves from browser callback exceptions, but they must notify a non-filesystem in-memory failure latch owned by the run coordinator. A recorder failure prevents a clean result, stops/revokes further runtime authority where evidence completeness matters, and is represented categorically without raw filesystem errors or private values. Swallowing the exception cannot preserve PASS.

### Bound and recover safely

The journal and each view have explicit record/count/byte limits checked before append. Recovery holds the exact generation claim, validates the complete prefix, never edits committed records, and either rebuilds derived views or leaves the bundle `INCOMPLETE`. Cleanup removes only current-invocation staging identities.

## Risks / Trade-offs

- Per-record durability costs I/O; bounded batching is permitted only with an exact acknowledged prefix and no false per-event durability claim.
- Readers need migration handling for historical bundles; old evidence stays read-only and cannot be relabeled current/complete.
- A journal does not make host storage infallible; it makes ambiguity visible and prevents false-clean interpretation.

## Migration Plan

1. Add bundle schema, strict reader, exclusive generation/claim, injected storage interface, and recovery model.
2. Migrate recorder writes to the canonical journal and generate each legacy view from it.
3. Update finalization/readers and observer failure escalation.
4. Add collision, concurrency, path, crash, corruption, mirror, recovery, bound, and mutation suites.
5. Update durable evidence documentation and required local gates.

Historical bundles remain readable only under their historical classification. No in-place upgrade or overwrite is permitted.

## Open Questions

None. The implementation may use one fsynced journal or an equivalently proven transactional store, but process memory and directly overwritten views cannot remain terminal authority.
