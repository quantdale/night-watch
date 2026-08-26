# Report — Repository-Wide Systemic Optimization

Task ID: nightwatch-repository-wide-systemic-optimization-v1
Status: IN_PROGRESS

Final engineering handoff will be written at closure. This file exists because
the continuity protocol requires all four task files; it does not claim
completion.

## Baseline evidence captured so far (2026-08-26, live tree `58b8101`)

| Command | Wall | Peak RSS | Notes |
|---|---:|---:|---|
| npm run typecheck | 47.0s | ~760MB | tsc check time 26.9s of 33s compute |
| npm run hardening:check | 2.78s | ~98MB | |
| npm run project:check | 7.48s | ~123MB | spawns agent-state internally |
| npm run agent:check | 8.40s | ~65MB | 880 git spawns, 428 unique, 94% spawnSync CPU |
| npm run agent:audit | 5.80s | ~65MB | same pattern |
| npm run test:semantic-compat | 663.6s | ~1.25GB | 1884 tests / 1871 passed / 13 skipped / 0 failed, workers=1 serial per manifest contract |

Environment: Node v22.22.1 local (gates also pin Node 20 for ci/clean), 20
cores, 16GB RAM.
