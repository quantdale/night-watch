# Duplicate-work map (F-PERF-2)

Universe: 379 files (sha256:41d15edde716e0d34a80bb24)
Synthetic manifest: 105 files; semantic manifest: 149 files; owner provenance: 3 files.
Files executed twice when npm test and gate:local both run: 257.

## Lane overlaps

| Lane A | Lane B | Shared files |
|---|---|---:|
| npm-test | gate-local | 257 |
| npm-test | gate-clean | 257 |
| npm-test | campaign-synthetic | 105 |
| npm-test | semantic-compat | 149 |
| npm-test | owner-provenance | 3 |
| gate-local | gate-clean | 257 |
| gate-local | campaign-synthetic | 105 |
| gate-local | semantic-compat | 149 |
| gate-local | owner-provenance | 3 |
| gate-clean | campaign-synthetic | 105 |
| gate-clean | semantic-compat | 149 |
| gate-clean | owner-provenance | 3 |

## Classifications

- **REQUIRED_INDEPENDENT_REEXECUTION** — gate:clean vs gate:local/local validation
  - a clean checkout must prove a fresh environment from a disposable clone with npm ci; reusing local state would destroy the property the lane exists to prove
- **REQUIRED_INDEPENDENT_REEXECUTION** — campaign:synthetic vs npm test (same lifecycle)
  - the required SYNTHETIC_CAMPAIGN gate group must stand alone in its receipt, and the full regression must be independently complete; within a certification lifecycle the repetition is by design, not accidental
  - SAFE_TO_SKIP_IN_FAST_DEV_LANE: the fast lane may select the affected subset instead
- **REQUIRED_INDEPENDENT_REEXECUTION** — semantic-compatibility vs npm test (same lifecycle)
  - the compatibility cone has its own skip policy and receipt; the full regression covers the same files independently
  - SAFE_TO_SKIP_IN_FAST_DEV_LANE: the fast lane may select the affected subset instead
- **REQUIRED_INDEPENDENT_REEXECUTION** — owner-provenance vs npm test (same lifecycle)
  - owner provenance is a required gate group with its own receipt and zero-skip contract
  - SAFE_TO_SKIP_IN_FAST_DEV_LANE: the fast lane may select the affected subset instead
- **REQUIRED_INDEPENDENT_REEXECUTION** — Playwright globalSetup proxy per invocation
  - each invocation owns its lease and runtime state suffix; sharing a proxy across processes would break containment and port-lease ownership
- **SAFE_TO_SHARE_WITHIN_ONE_RUN** — agent:check and agent:audit inside AGENT_CONTINUITY
  - both scan the same task inventory in the same group; a single pass emitting both judgements would be equivalent, pending a semantics-preserving tool change
- **SAFE_TO_CACHE_BY_CONTENT_DIGEST** — loadTypeScriptModules compilation across lanes
  - deterministic source-to-module compilation keyed by source SHA and loader version is immutable; a cross-process cache is only safe with those identity keys
- **REQUIRED_INDEPENDENT_REEXECUTION** — full regression re-running gate-lane files in the same certification run
  - deduplicating it would change the meaning of either the gate or the full regression; the campaign removes none of it

## Expensive setup by lane

- `npm-test` (379 files): Playwright globalSetup loopback proxy; TypeScript in-process transpile; fresh worker process per file batch
- `gate-local` (257 files): 12 serial group dispatches; nested npm process per group; three Playwright invocations (semantic, owner, synthetic)
- `gate-clean` (257 files): disposable clone; npm ci --ignore-scripts; the whole gate again inside the clone
- `campaign-synthetic` (105 files): manifest load; deep containment lane classification; serial Playwright invocation
- `semantic-compat` (149 files): JSON report file under tmpdir; serial Playwright invocation
- `owner-provenance` (3 files): serial Playwright invocation
- `hardening-rules` (0 files): one fresh Node process per rule probe (94 probes); real guard-file mutation and restore

