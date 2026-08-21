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
| 9 | A08 | dfdfd24d0f8e9b60c1a5f7ec2f3f9c1e21a44ba2 (swarm/a08-triage-dossier) | 2b5f79d4a31e59369cdae6497e9e249d0a0f8d5c | none | wave 3 green |
| 10 | A10 | 08785dc8065013e2042a22e36461d285911c82a2 (swarm/a10-local-readiness) | 763226d5b7ac289bc8ed7b3e597ff46c5049657f | none | wave 3 green |
| 11 | A11 | 37d7a85f083e1779b9a722a0718be52055c28fd4 (swarm/a11-artifact-validation) | fe8025f6da9a3dae6fb018b581818bc7571c297d | none (node:crypto createHash reviewed — same established pattern as src/core/identity/canonicalDigest.ts, deterministic hashing only) | wave 3 green |
| 12 | A12 | e519881fb28aed8f0ef46f8ac5a3ef28a0725045 (swarm/a12-project-snapshot) | 7abcf5f8e65fb0ca5fcbbba7c40e941554fa9797 | none | wave 3 green |
| 13 | A13 | 5c498e0cf259638f641397215c8a7f77510c14ac (swarm/a13-privacy-authority) | 6d5599235d5ad655505b9306886f1aa1a9eecb76 | none | wave 4 green |
| 14 | A14 | 3213a642c6c73f94f5f92f0725c134262b3f5faf (swarm/a14-adversarial-corpus) | 9afe7e93f05f2606ae0c1f9de3dd7a07cd1ac604 | none (predecessor agent timed out; suite completed by a fresh delegated agent against the delivered fixtures; two fixture data-value repairs documented in handoff) | wave 4 green |
| 15 | A15 | 0a8f22a02e4f38252a92d1c2a3b710bc1873d3f0 (swarm/a15-compat-cleanup) | 68f14b268a6834aa1881b1d50ae7a5fc56b2943a | none | wave 4 green |
| 16 | A16 | 219118ba5e501597216640ab3c1a93be97c11b2f (swarm/a16-release-rehearsal) | 42c5a7e1ab3f438a9c82688f2eee645d3c548d64 | none | final pack green; rehearsal 3x standalone 4/4 each |

## Rejected patches

| Agent | Upstream SHA | Reason |
|---|---|---|
| — | — | — |

## Wave checkpoints

| Wave | Agents | Canonical checkpoint SHA | Validation summary | Pushed | HEAD == origin/main |
|---|---|---|---|---|---|
| 1 | A01 A02 A03 A04 | 417d187cb13de98db611c4f2412f94fe62a9daab (+ docs commit after) | typecheck PASS; git diff --check PASS; focused foundation suites (4 new + 5 compat) 190 passed / 0 failed; privacy/authority diff sweep clean | yes | yes |
| 2 | A05 A06 A07 A09 | dbd2397d52b12d51c8fdf478c1d299cca5f9be2f (+ docs commit after) | typecheck PASS; git diff --check PASS; focused suites (4 new + 8 compat) 212 passed / 0 failed; campaign:synthetic 27 passed / 0 failed; one semantic conflict (A05×A09 orchestrator.ts) resolved keeping both behaviors | yes | yes |
| 3 | A08 A10 A11 A12 | 7abcf5f8e65fb0ca5fcbbba7c40e941554fa9797 (+ docs commit after) | typecheck PASS; git diff --check PASS; focused suites (4 new + 8 compat) 221 passed / 0 failed; conflict-free; privacy/authority sweep clean (one node:crypto use verified against canonicalDigest precedent) | yes | yes |
| 4 | A13 A14 A15 | 68f14b268a6834aa1881b1d50ae7a5fc56b2943a | typecheck PASS; hardening:check PASS; git diff --check PASS; all 15 phase15p suites 337 passed / 0 failed; campaign:synthetic 27 passed / 0 failed; conflict-free | yes | yes |
| final | A16 | 42c5a7e1ab3f438a9c82688f2eee645d3c548d64 | full M6 pack green (see STATE.md Validation Ledger); rehearsal 3x standalone 4/4 each; 16 phase15p suites 341/0; Phase 9-14 sweep 385/0 | yes | yes |
