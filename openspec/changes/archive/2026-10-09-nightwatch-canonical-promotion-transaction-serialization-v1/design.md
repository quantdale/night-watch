## Context

The retained Phase 8B.1 machinery is the only runtime allowed to change `src/core/selfDev/adoptedCaseCatalog.generated.ts`. Apply validates a clean checkout and exact preimage, consumes one approval through an immutable file keyed by that approval ID, atomically renames a rendered postimage, checks the one-file dirty set, and writes a receipt.

The one-shot guarantee is local to one approval. Distinct approvals have distinct consumption files, so two processes prepared from the same head/preimage can both complete all checks before either rename and both write. The later write wins; the earlier process may observe the other postimage and report a post-write failure, but two canonical source writes already occurred. Separately, a crash can occur after consumption or rename but before terminal receipt, and directory fsync failure is caught and ignored while the implementation describes the rename as durable.

There is no standing promotion authority. This design hardens retained machinery for any future separately authorized concrete promotion; it grants none.

## Goals / Non-Goals

**Goals:**

- Serialize all canonical applies for one repository/checkpoint/target, including distinct approvals.
- Bind approval consumption, the one allowed source write, observed target state, durability, receipt, and terminal result into durable transaction truth.
- Revalidate every mutable precondition while holding exclusive authority.
- Make interruption inspectable and reconcilable without automatic rewrite, retry, rollback, or fabricated success.
- Require proven file and directory durability for `APPLIED`.
- Prove distinct-approval concurrency and every persistence/write boundary.

**Non-Goals:**

- Granting promotion authority, adopting another case, changing the catalog schema/renderer, or widening the fixed target.
- Runtime Git add/commit/push, automatic rollback, automatic re-approval, or external publication.
- Hostile same-account isolation from a process able to rewrite repository/private-store bytes.
- Replacing C-00; canonical apply must additionally occur from the authorized owned checkout.

## Decisions

### Use a repository-scoped exclusive transaction, not approval-scoped locking

Derive an apply authority key from the canonical repository identity, exact prepared head, fixed target path, and target preimage digest. Before approval consumption, exclusively create a private transaction operation and acquire one repository/target lease. A second apply—regardless of promotion or approval ID—returns `CANONICAL_APPLY_BUSY` or `CANONICAL_APPLY_RECONCILIATION_REQUIRED` before consumption or source write.

The lease and journal are under the owner-private promotion namespace, not the repository, and are symlink-safe, private, bounded, exclusive, and durably verified. Process liveness does not silently clear an abandoned operation.

Alternative considered: rely on the clean-tree check and target preimage. Those are read-then-act checks and both processes can pass before either writes.

### Journal immutable transaction stages around the single write

The operation directory contains immutable digest-chained records:

- `prepared` binds repository identity, head, source/contract/preimage/postimage digests, target path, promotion, approval, and renderer identity;
- `approval-consumed` binds the existing one-shot consumption record;
- `write-attempted` states that the one write boundary is reachable;
- `target-observed` records exact preimage, exact postimage, or divergent digest after the attempt;
- `durability` records file and parent-directory synchronization outcome;
- `receipt-committed` binds the immutable canonical apply receipt; and
- `terminal` records `APPLIED`, `NOT_APPLIED`, or `OUTCOME_UNCERTAIN`.

Records contain no candidate prose, source bytes, paths outside the fixed relative target, credentials, raw errors, or arbitrary environment data. They grant no retry: a transaction that reached `write-attempted` has spent its maximum source-write budget permanently.

### Revalidate under authority immediately before commit

After acquiring the lease and before consuming approval, repeat owner-policy/C-00 authority, exact repository/head/source/contract, clean status, fixed target, parent/leaf type and identity, preimage, plan, and postimage verification. After consumption and immediately before rename, recheck repository HEAD, parent identity, target identity/preimage, and absence of any additional dirty entry. Any disagreement terminates without source write; the approval remains truthfully consumed only if consumption already committed.

Alternative considered: move only the existing preflight under a lock. The second target/identity check is still required because private-store persistence and renderer load occur between validation and rename.

### Treat durability failure after rename as uncertain, never success

Write to an exclusive same-directory `0600` temporary file, flush/close/reopen/verify it, revalidate target identities, rename atomically, then sync and verify the parent directory and re-read the exact postimage. A platform lacking required primitives is refused before approval consumption. An actual failure after rename records `OUTCOME_UNCERTAIN` where possible, throws with `canonicalSourceWrites: 1`, and never emits an `APPLIED` receipt. Directory sync is not best-effort.

### Reconcile by observation without another write

A read-only inspection validates the journal/lease and compares the fixed target with prepared preimage/postimage digests plus Git status. Exact postimage with a complete durability/receipt chain can terminalize as applied only through an explicit owner reconciliation record; exact preimage proves no surviving write but does not restore the spent approval; any other state is uncertain. Recovery never calls the renderer write, renames the target, deletes another operation, or consumes a new approval.

New apply remains blocked while an incomplete/uncertain operation exists. Any future waiver to abandon uncertainty is a separate owner decision and still cannot reuse the spent transaction.

### Prove concurrency and crash boundaries in real processes

Create two distinct valid promotions and approvals at one synthetic clean preimage and release child processes together after preflight. Exactly one process may consume/write; the other must fail before consumption, and the final target/receipt/journal cardinality must match the winner. Repeat with the winner killed after prepared, consumption, write-attempted, rename, directory sync, target observation, and receipt commit.

Fault injection covers every filesystem and store boundary. Mutation probes remove global serialization, key the lease by approval, skip under-lease revalidation, permit a second write after interruption, swallow directory sync, infer success from target bytes alone, or make reconciliation write.

## Risks / Trade-offs

- **An interrupted transaction can block future promotion** -> provide bounded read-only inspection and explicit owner reconciliation; safety outranks availability for canonical source mutation.
- **A crash after rename can remain uncertain** -> record the maximum-write budget and observed digests; never retry or claim atomicity across source and private store.
- **Private-store and repository filesystems may have different durability** -> order and verify each independently, preserving uncertainty at the cross-filesystem boundary.
- **No standing authority makes the path difficult to exercise live** -> use synthetic repositories and private roots; no real promotion is needed to prove mechanics.
- **Global serialization reduces concurrency** -> canonical apply is intentionally one bounded owner action, so serialization is the correct authority model.

## Migration Plan

1. Add transaction schemas, safe storage, read-only inspection, and failing concurrency/fault tests.
2. Add the repository/target lease and acquire it before approval consumption.
3. Move and repeat all mutable preconditions under the lease; bind the operation to exact identities.
4. Replace best-effort atomic write with qualified file/directory durability and immutable stage records.
5. Couple receipt and terminal success to verified durability; implement non-writing explicit reconciliation.
6. Add real-process distinct-approval races, killed-child boundaries, path replacement, privacy, and mutations.
7. Run focused self-development, policy, provenance, project-state, hardening, gate, clean, and full offline validation; update durable truth without granting authority.

Rollback may disable canonical apply while retaining transaction records. It must not restore approval-scoped-only serialization or best-effort durability.

## Open Questions

- Whether reconciliation should ever close exact-postimage uncertainty as `APPLIED_RECOVERED` when parent-directory durability was not proven. Default to `OUTCOME_UNCERTAIN` unless platform-specific evidence proves the required durability.
