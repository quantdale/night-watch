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

- [x] Extract pure `proxyPortCandidates(preferred)`.
- [x] Factor the allocator core to take an explicit availability predicate.
- [x] `reserveProxyPortLease` binds the real probe with no substitutable parameter.
- [x] Add `candidateOffset` and `preferredOutcome` diagnostics.
- [x] Add the `TEST ONLY` availability seam.
- [x] Preserve every existing allocator safety property.

## R3 — Deterministic proxy-lease tests

- [x] New deterministic suite covering: candidate 0 available; candidate 0
      occupied; candidates 0..N occupied; lease collision; live lease; orphan
      lease; malformed lease; symlink; bounded exhaustion; wraparound; parallel
      allocators; release; inherited ownership; child death; SIGTERM; SIGINT.
- [x] Replace the over-strong `phase24ProxyLifecycle` assertion with the
      allocator's real contract; remove the PID-derived port.
- [x] Retain at least one real-OS-TCP integration test for occupied-port
      advancement.
- [x] Bounded stress campaign with exact iteration counts.

## R4 — Durable gate receipts

- [x] Confined, validated receipt path with a safe automatic default.
- [x] Atomic write, digest-identical to stdout, failure receipts included.
- [x] Clean-gate wrapper consumes the receipt FILE and requires digest equality.
- [x] Adversarial receipt suite per brief §11.
- [x] Hardening rules for the receipt mechanism, negative-probed.
- [x] Justify the absence of an Actions artifact.

## R5 — Stage-A truth reconciliation

- [x] Correct the false "EXACT head of `main`" claim about `29b9212`.
- [x] Record run `33637832941` / job `100273053129` at `c423e33` truthfully.
- [x] Repair the stale project-state table row.
- [x] Preserve `29b9212` as historical certification.
- [x] State the certification authority model, naming all six checkpoint roles.
- [x] Reconcile the production threat model to D-113: T-30's per-campaign salt
      and inverted test, T-41's digest-of-a-dynamic-key, and T-42's second
      "salted value digest" family, each preserved as explicitly SUPERSEDED.

## R6 — Registration and validation

- [x] Register every new suite in the semantic-compatibility manifest and, where
      applicable, the synthetic-campaign manifest; prove gate membership.
- [x] Full validation sequence, repeated runs of the previously flaky suite in
      both local and clean Node 20 topologies, no runner retries.
- [x] Integrate through C-00; obtain exact-head GitHub Actions with all eleven
      required groups PASS.
