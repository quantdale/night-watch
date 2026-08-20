# PROPOSAL — Nightwatch Phase 14A — Mechanical Real-Source Contract Expansion

Task ID: `phase-14-mechanical-source-contract-expansion`
Phase: `14A-MECHANICAL-SOURCE-CONTRACT-EXPANSION`
Starting source anchor at publication: `22106ad6b1745b6486d649b37513210eb74a20d8`
Required owner authorization: `PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY`

## Problem

Phase 12 established a fresh-source coverage inventory for six already-approved read-only targets. Four targets have mechanically derived real-source expectations; the remaining depth/coverage opportunities fail closed under explicit blockers:

- `ripple.account-inventory.read` — `TYPE_FLOW_AMBIGUOUS`;
- `ripple.billing-group-exchange.read` — `TYPE_FLOW_AMBIGUOUS`;
- `ripple.billing-groups-legacy.read` — `AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`;
- `ripple.billing-groups.read` — `GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT`.

The correct next investment is not to invent semantics or add targets. It is to strengthen Nightwatch's bounded source-analysis machinery so it can prove more when current source actually permits it, while retaining precise blockers when it does not.

## Proposed result

Build a versioned, deterministic mechanical-contract extraction layer that can reason about bounded source flows beyond the current Phase-10 PHP item-field patterns, re-evaluate the existing approved targets against a freshly resolved source snapshot, and admit stronger/additional expectations only when the evidence is mechanically proven.

A zero real-source uplift remains a valid outcome if the new analyzer proves that the remaining contracts are genuinely runtime/transport ambiguous. Synthetic capability improvement still counts as useful implementation, but the final report must distinguish analyzer capability from actual product-contract uplift.

## Hard boundary

No DEV, no real campaign, no NEXT/production, no product mutation, no database/data-plane work, no infrastructure/Phase 6, no Alphaus sibling writes, no AI/model authority, no selfDev/promotion/catalog mutation, and no expansion of endpoint/target authority.

Phase 11B and Phase 13B remain separately authorized future work.
