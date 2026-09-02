# Tasks — R-11 Proxy/Gate Reliability Closure

## R1 — Reproduce OBS-C105-1 before any repair

- [x] Verify starting truth: repository, `origin/main`, active task/status,
      Stage-A substantive SHA, exact-head run `33637832941`.
- [x] Reproduce Case A (stale lease, TCP free) against the unmodified allocator.
- [x] Reproduce Case B (stale lease, TCP occupied by an unrelated listener).
- [x] Reproduce Case C (lease owned by a live process).
- [x] Reproduce Case D (malformed lease; symlink lease).
- [x] Prove the current assertion fails in Case B while the allocator is right.
- [x] Reproduce the exact CI failure end-to-end through the real suite, with the
      exact `failedLocations` value the CI receipt recorded.
- [x] Record root cause: correct allocator, over-strong test, probabilistic
      port input. Brief's explanation CONFIRMED.

## R2 — Port-lease contract

- [ ] Extract pure `proxyPortCandidates(preferred)`.
- [ ] Factor the allocator core to take an explicit availability predicate.
- [ ] `reserveProxyPortLease` binds the real probe with no substitutable parameter.
- [ ] Add `candidateOffset` and `preferredOutcome` diagnostics.
- [ ] Add the `TEST ONLY` availability seam.
- [ ] Preserve every existing allocator safety property.

## R3 — Deterministic proxy-lease tests

- [ ] New deterministic suite covering: candidate 0 available; candidate 0
      occupied; candidates 0..N occupied; lease collision; live lease; orphan
      lease; malformed lease; symlink; bounded exhaustion; wraparound; parallel
      allocators; release; inherited ownership; child death; SIGTERM; SIGINT.
- [ ] Replace the over-strong `phase24ProxyLifecycle` assertion with the
      allocator's real contract; remove the PID-derived port.
- [ ] Retain at least one real-OS-TCP integration test for occupied-port
      advancement.
- [ ] Bounded stress campaign with exact iteration counts.

## R4 — Durable gate receipts

- [ ] Confined, validated receipt path with a safe automatic default.
- [ ] Atomic write, digest-identical to stdout, failure receipts included.
- [ ] Clean-gate wrapper consumes the receipt FILE and requires digest equality.
- [ ] Adversarial receipt suite per brief §11.
- [ ] Hardening rules for the receipt mechanism, negative-probed.
- [ ] Justify the absence of an Actions artifact.

## R5 — Stage-A truth reconciliation

- [ ] Correct the false "EXACT head of `main`" claim about `29b9212`.
- [ ] Record run `33637832941` / job `100273053129` at `c423e33` truthfully.
- [ ] Repair the stale project-state table row.
- [ ] Preserve `29b9212` as historical certification.
- [ ] State the four-role certification authority model.

## R6 — Registration and validation

- [ ] Register every new suite in the semantic-compatibility manifest and, where
      applicable, the synthetic-campaign manifest; prove gate membership.
- [ ] Full validation sequence, repeated runs of the previously flaky suite in
      both local and clean Node 20 topologies, no runner retries.
- [ ] Integrate through C-00; obtain exact-head GitHub Actions with all eleven
      required groups PASS.
