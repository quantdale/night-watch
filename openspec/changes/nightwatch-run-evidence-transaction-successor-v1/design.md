## Context

`publishJson` atomically replaces individual JSON files, but the run directory
has no exclusive generation. Event/view/memory writes are separate, and
`finalize()` derives counts from memory without reading the durable stream.

## Goals / Non-Goals

**Goals:** exclusive run identity, durable append acknowledgement, durable
reconciliation, and categorical non-clean failure.

**Non-Goals:** full journal/recovery migration, observer-wide redesign, or
external evidence systems.

## Decisions

### Exclusive directory admission

Create the artifacts root if needed, then create the run directory with
non-recursive exclusive semantics. Existing identities fail before a second
recorder can write.

### Latch failures and validate before terminal publication

Wrap primary/view/in-memory event publication in a failure latch. Before proxy
sync or summary publication, parse bounded complete JSONL lines and compare
sequence/count with memory. Any mismatch, duplicate, malformed, or torn tail
throws a categorical error and prevents PASS.

### Preserve existing hardening-compatible append primitive

Keep `fs.appendFileSync` (the hardening rule pins it), then fsync the descriptor
before acknowledging the event. This is a bounded successor slice, not a claim
that arbitrary SIGKILL recovery is complete.

## Risks / Trade-offs

Exclusive IDs may expose callers that reused labels; that is intentional
safety behavior and requires a fresh run ID. Fsync adds bounded I/O cost.

## Migration Plan

1. Add focused failing tests.
2. Implement exclusive directory, latch, fsync, and durable validation.
3. Add mutation/crash tests and update residual documentation.
4. Run focused/static/milestone gates and reassess.

## Open Questions

None.
