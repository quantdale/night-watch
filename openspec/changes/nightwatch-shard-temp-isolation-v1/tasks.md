## 1. Reproduction and contract

- [x] 1.1 Preserve the exact `gate:dev` shard-2 `reviewStore.test.ts` shared-temp failure and isolated-pass control.
- [x] 1.2 Define the closed shard identity, run-root, and temp-path invariants.

- [ ] 2.1 Add a typed shard-child environment module that preserves the allowlist and rejects malformed identities.
- [ ] 2.2 Create one run-unique scratch root and a private directory per shard in serial and concurrent modes.
- [ ] 2.3 Clean only the invocation-owned scratch root after execution settles.

## 3. Adversarial protection

- [ ] 3.1 Prove fresh Node processes observe distinct `os.tmpdir()` values for two shard environments.
- [ ] 3.2 Prove inherited temp/proxy variables cannot survive and malformed shard identities fail closed.
- [ ] 3.3 Replay focused shard tests and the previously failing parallel review-store scenario.

## 4. Validation and handoff

- [ ] 4.1 Run typecheck, bin typecheck, hardening, strict OpenSpec, and focused validation.
- [ ] 4.2 Run `gate:dev` and `gate:milestone`; classify the twelve independent live-source drift failures separately.
- [ ] 4.3 Reconcile child/umbrella truth, commit the checkpoint, and reassess remaining source-drift and popup residuals.
