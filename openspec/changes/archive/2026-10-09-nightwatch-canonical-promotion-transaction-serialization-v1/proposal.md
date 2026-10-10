## Why

Canonical self-development apply consumes approvals atomically only by approval ID, not by repository/checkpoint/target transaction. Two distinct approvals prepared from the same clean preimage can therefore both pass preflight, both consume, and both write the one canonical catalog; interruption can also leave a consumed approval and changed target without a terminal receipt, while directory-sync failure is silently treated as durable success.

## What Changes

- Serialize canonical promotion apply per canonical repository/checkpoint/target through a durable exclusive transaction identity, before any approval is consumed or source is written.
- Revalidate clean checkout, exact head/source/contract/preimage, target/parent identity, and competing transaction state after acquiring authority and immediately before commit.
- Journal prepared, approval-consumed, write-attempted, target-observed, durability, receipt, and terminal outcomes without granting retry or extra write authority.
- Classify interrupted states from immutable intent plus exact preimage/postimage observation; never infer success, silently retry a write, or consume an unrelated approval.
- Require file and directory durability for successful canonical apply; unsupported or failed durability becomes non-success/uncertainty rather than best-effort success.
- Add distinct-approval concurrent process tests, killed-process fault boundaries, path-identity races, recovery inspection, and non-vacuous mutation enforcement.
- Preserve the fixed one-file renderer, maximum one source write per authorized transaction, zero runtime Git writes/publication, and the permanent absence of standing promotion authority.

## Capabilities

### New Capabilities

- `canonical-promotion-transaction-integrity`: Defines global apply serialization, durable transaction truth, exact target commit, interruption reconciliation, and concurrency/fault proof for the retained owner-gated canonical promotion machinery.

### Modified Capabilities

None.

## Impact

- Affects `src/core/selfDevPromotion/apply.ts`, promotion storage/types/validation, `bin/selfdev-promote-canonical.mjs`, private artifact transaction records, and canonical-promotion tests/hardening.
- Does not authorize a promotion, adopt the remaining candidate, change the deterministic renderer/catalog schema, commit or push Git, or weaken owner/C-00/project-scope gates.
- Existing historical approvals/receipts remain historical; any future apply requires fresh concrete owner authorization under the hardened transaction protocol.
