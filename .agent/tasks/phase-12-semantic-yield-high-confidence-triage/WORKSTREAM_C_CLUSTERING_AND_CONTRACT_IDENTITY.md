# Workstream C — Semantic Clustering, Deduplication & Contract Identity

Parent task: `phase-12-semantic-yield-high-confidence-triage`
Authority: LOCAL/SOURCE-ONLY only.

## C1. Objective

Ensure semantically identical product defects collapse into one stable candidate while semantically different contracts remain distinguishable. The cluster key must represent deterministic source-backed contract identity, not incidental row position or runtime values.

## C2. Current compatibility boundary

Preserve historical protocol-only anomaly clustering and existing `nightwatch.anomaly-cluster.private.v1` semantics unless explicit versioning is required.

Do not silently reinterpret historical cluster IDs.

## C3. Semantic contract identity

For semantic findings, derive a safe semantic-contract identity from repository-known data such as:

- expectation ID;
- target ID;
- invariant kind;
- canonical source-known relative field/path or relation ID;
- expected categorical type/class/allowed-type set where relevant;
- derivation version;
- source evidence digest.

Do not use raw runtime value, account/customer identity, cost, timestamp, filesystem path, browser context ID, or response index.

## C4. Source SHA vs evidence digest

Do not fragment a bug merely because source SHA advanced for an unrelated file while the normalized evidence digest and derivation semantics are identical.

Conversely, changed source evidence digest or changed derivation semantics must not be silently merged into the same contract identity without an explicit compatibility rule.

Source SHA remains provenance even if not a primary cluster-key component.

## C5. Collection-wide dedup

Multiple rows violating the same collection invariant definition must produce one semantic bug cluster.

Do not include:

- firstViolationOrdinal;
- violatingItemCount;
- inspectedItemCount;
- array length;
- row identity;

in the stable semantic cluster identity.

These may remain safe evidence metadata when already allowed.

## C6. Distinct contracts stay distinct

Examples that must not collapse together:

- FIELD_PRESENT `month` vs FIELD_PRESENT `exchange_rate`;
- TYPE_MATCH `exchange_rate OBJECT` vs FIELD_PRESENT `exchange_rate`;
- payer TYPE_IN_SET vs common TYPE_MATCH;
- different target IDs;
- changed source evidence/derivation where semantics materially differ.

## C7. Run/observation dedup

Cluster occurrence count may increase across fresh replays/runs, but the primary semantic cluster identity remains stable when the same semantic contract and fingerprint recur.

Keep occurrence/reproduction metadata out of identity.

## C8. Replay integration

A replay that reproduces the exact semantic anomaly should attach to the same semantic cluster.

A different fingerprint or different semantic contract identity must not be counted as a reproduction of the original cluster.

## C9. Source change correlation

Source-change candidates remain localization evidence. They do not define whether two runtime anomalies are the same semantic defect unless a source-contract identity change is mechanically proven.

No deployment/root-cause inference.

## C10. False-positive suppression

Known Nightwatch false-positive IDs remain explicit suppression metadata and must not contaminate cluster identity with raw diagnostic values.

A known false-positive cluster and a product anomaly with the same superficial route must remain distinguishable by oracle/contract evidence.

## C11. Determinism

Canonicalize arrays/sets before hashing or stable serialization.

Equivalent semantic contracts with different safe metadata ordering must derive the same identity.

Repeated derivation >=3 must have zero mismatches.

## C12. Required tests

- same invariant, row 1 vs row 57 => same cluster;
- same invariant, one vs many violating rows => same cluster;
- different field contracts => different clusters;
- different invariant kind => different clusters;
- different target => different cluster;
- unrelated SHA advance + same evidence digest => compatibility behavior explicitly proven;
- changed evidence digest => no silent merge;
- changed derivation version => no silent merge unless explicit backward-compatible rule;
- protocol-only old cluster tests remain green;
- duplicate input ordering deterministic;
- reproduced exact fingerprint increments reproduction evidence without cluster fragmentation;
- different replay fingerprint does not count as original reproduction;
- sentinel values absent from keys/fingerprints/errors.

## C13. Acceptance

The Phase 12 backtest must show stable unique-cluster counts under repeated/multi-row variants and zero incorrect merges between distinct semantic contracts.
