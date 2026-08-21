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
| 5 | A05 | e4b4f5d80a5cd12ee3e7bab57f2b9edc20ddb8d6 (swarm/a05-candidate-lifecycle) | 92bfbb9 | none | wave 2 green |
| 6 | A06 | a0bf5f1d6b7b1227437696e68c74d9ec60bdb190 (swarm/a06-replay-binding) | 9cafd18 | none | wave 2 green |
| 7 | A07 | 52870ba (swarm/a07-minimality-truth) | 714dee9 | none | wave 2 green |
| 8 | A09 | aadfe9b596f0356e1a277cf51f3fa0588f9f1bc9 (swarm/a09-checkpoint-resume) | dbd2397d52b12d51c8fdf478c1d299cca5f9be2f | orchestrator.ts: one hunk — kept A05 closeOnGateFailure AND A09 set-idempotent unresolved append (semantically complementary) | wave 2 green |

## Rejected patches

| Agent | Upstream SHA | Reason |
|---|---|---|
| — | — | — |

## Wave checkpoints

| Wave | Agents | Canonical checkpoint SHA | Validation summary | Pushed | HEAD == origin/main |
|---|---|---|---|---|---|
| 1 | A01 A02 A03 A04 | 417d187cb13de98db611c4f2412f94fe62a9daab (+ docs commit after) | typecheck PASS; git diff --check PASS; focused foundation suites (4 new + 5 compat) 190 passed / 0 failed; privacy/authority diff sweep clean | yes | yes |
| 2 | A05 A06 A07 A09 | dbd2397d52b12d51c8fdf478c1d299cca5f9be2f (+ docs commit after) | typecheck PASS; git diff --check PASS; focused suites (4 new + 8 compat) 212 passed / 0 failed; campaign:synthetic 27 passed / 0 failed; one semantic conflict (A05×A09 orchestrator.ts) resolved keeping both behaviors | yes | yes |
| 3 | A08 A10 A11 A12 | not yet integrated | — | no | — |
| 4 | A13 A14 A15 A16 | not yet started | — | no | — |
