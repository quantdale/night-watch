# Nightwatch Phase 6 data corpus

This directory contains Nightwatch-owned, reviewable Phase 6 catalog artifacts.
They contain source provenance, semantic roles, key grammars, and privacy
policies only. Runtime scope values, raw rows, customer identifiers, financial
values, credentials, and query output do not belong here.

Versions:

- `nightwatch.readonly-query-plan.phase6.v1`
- `nightwatch.data-oracle-catalog.phase6.v1`
- `nightwatch.data-evidence.phase6.v1`
- `nightwatch.cross-layer-lineage.phase6.v1`

The initial real frontier is D1/D2/D3 only. The current environment map is
source-derived rather than confirmed, so the durable catalog marks those
oracles `ENVIRONMENT_BLOCKED`; no live datastore query is implied.
