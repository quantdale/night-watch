## Context

Prior hardening left soak/cache/chaos/auth/fuzz as deferred due to session budget, with explicit `Deferred` entries. Gate local at 5080e0d was 10/10 but `gate:clean` and isolated parity not freshly executed at that HEAD.

## Goals / Non-Goals

**Goals:** Prove no leaked processes/ports/fds, no stale cache acceptance, no containment egress, deterministic replay/resume after faults, sanitized auth failures, bounded fuzz.

**Non-Goals:** New proof families, mass upgrades, large model downloads, production.

## Decisions

- Soak via 3× `campaign:synthetic` with `workers=1` serial, measuring `lsof` fd count, `/tmp` artifact growth, proxy lease count via `bin/quality-gate` probe.
- Cache matrix in new `tests/unit/cacheCurrentness.test.ts` using `RealSourceSurfaceCache` 8-entry LRU with `prefixedDigest24` keys, interrupt via injected `fs.writeFileSync` failure.
- Containment requal uses existing `l6Containment.test.ts` 4 cases plus manual `fetch` to denied host expecting `ECONNREFUSED` via proxy.
- Chaos via `orchestrator` fault injection at `manifest creation`, `first/middle/last`, `evidence write`, `teardown`, `SIGTERM`.
- Auth via `storageState.test.ts` fixtures: valid, expired (exp in past), missing, malformed JSON, wrong env, mid-run invalid via token expiry, refresh attempt, human-required.
- Fuzz via `tests/unit/fuzzProperty.test.ts` 20 cases: canonicalizer permutation stability, duplicate idempotence, digest determinism, malformed rejection, bounded cardinality.

## Risks / Trade-offs

- Soak 3× may be ~70s; acceptable for local gate.
- Cache interrupt tests must not leave corrupt cache on disk; use temp dir.
