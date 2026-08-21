# INTEGRATION LEDGER — Phase 15P

Canonical integration truth: one row per accepted patch and per wave
checkpoint, recorded only after the parent actually cherry-picked, validated,
committed, and pushed. Never pre-filled.

## Accepted patches

| Order | Agent | Upstream SHA (swarm branch) | Cherry-pick commit on main | Conflicts | Wave validation |
|---|---|---|---|---|---|
| 1 | A01 | a2a841e (swarm/a01-contract-registry) | 79fdfdf74c704cab9cb450b85e04a720a1bdd374 | none | wave 1 green |
| 2 | A02 | f7039ec24b75aa3934e9ba5dab37136ef30f8a1f (swarm/a02-semantic-vocabulary) | 487f1b6f71bd9ada09aff2adf9bcae7946e6cfaa | none | wave 1 green |
| 3 | A03 | 211b9d7 (swarm/a03-currentness-drift) | 45e66a9e6bc8c983d0668b767c8f2df6cbc3b88a | none | wave 1 green |
| 4 | A04 | bcdfb0414c39b707342e133624f1f05037114e4b (swarm/a04-schema-coherence) | 417d187cb13de98db611c4f2412f94fe62a9daab | none | wave 1 green |

## Rejected patches

| Agent | Upstream SHA | Reason |
|---|---|---|
| — | — | — |

## Wave checkpoints

| Wave | Agents | Canonical checkpoint SHA | Validation summary | Pushed | HEAD == origin/main |
|---|---|---|---|---|---|
| 1 | A01 A02 A03 A04 | 417d187cb13de98db611c4f2412f94fe62a9daab (+ docs commit after) | typecheck PASS; git diff --check PASS; focused foundation suites (4 new + 5 compat) 190 passed / 0 failed; privacy/authority diff sweep clean | yes | yes |
| 2 | A05 A06 A07 A09 | not yet integrated | — | no | — |
| 3 | A08 A10 A11 A12 | not yet integrated | — | no | — |
| 4 | A13 A14 A15 A16 | not yet started | — | no | — |
