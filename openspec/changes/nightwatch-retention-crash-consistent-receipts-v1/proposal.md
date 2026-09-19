## Why

Evidence retention performs irreversible directory deletion between a
best-effort `STARTED` receipt write and a best-effort final overwrite. A crash
or final-write failure can therefore leave the only durable receipt claiming
an empty deleted set, while the command can even exit successfully with
`result: APPLIED` and `receiptFinalized: false`, contradicting the existing
requirement that every deletion be recorded.

## What Changes

- Introduce a versioned retention-operation journal that binds the reviewed
  plan, confirmation token, refusal-set digest, exact candidates and sizes,
  source SHA, operation identity, and per-target outcomes.
- Persist each journal record with crash-safe, durable, owner-only,
  symlink-refusing semantics; never overwrite a completed historical
  operation.
- Detect an incomplete prior operation before any new apply, block further
  deletion, and provide read-only inspection plus explicit owner
  reconciliation that reports proven outcomes separately from uncertain ones.
- Make any post-mutation recording failure a categorical non-success with a
  non-zero exit and an explicit recovery action; `APPLIED`/`PARTIAL` is legal
  only after the terminal journal is durably verified.
- Add deterministic fault-injection and process-interruption tests at every
  persistence/deletion boundary, plus concurrent-apply and journal-tampering
  coverage.
- Preserve the current refusal-first plan, owner confirmation token,
  non-interactive refusal, whole-directory-only removal, symlink refusal, and
  immutable evidence-store behavior.

## Capabilities

### New Capabilities

- `retention-transaction-auditability`: crash-consistent, integrity-linked,
  recoverable recording for every owner-approved evidence-retention mutation.

### Modified Capabilities

None. The existing residual/evidence-lifecycle requirements remain in force;
this capability supplies the missing transactional recording contract without
editing another active change's ownership surface.

## Impact

Affected surfaces are `bin/evidence-retention.mjs`, a small journal/recovery
core, retention receipt schemas and CLI result/exit semantics, focused unit and
process-interruption tests, operator documentation, and hardening/mutation
coverage. No new deletion class, automatic retention, product environment,
Alphaus, database, cloud, network, credential, or publication authority is
introduced.
