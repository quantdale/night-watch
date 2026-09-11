# Proposal — R-11 Proxy/Gate Reliability Closure

## Why

C-11 `PROD_OBSERVE` is a safety-kernel campaign whose entire value is the
credibility of its evidence. Two pre-existing reliability defects would corrupt
that evidence at the root:

1. **A non-deterministic member of a required gate group.** OBS-C105-1 is
   reproduced in `audit.md`: `tests/unit/phase24ProxyLifecycle.test.ts` selects
   its port by a PID lottery and then asserts it obtained that exact port, so
   any unrelated listener on the host fails a required group. C-11 will add
   containment and proxy-adjacent suites to the same group; a gate that can go
   red for reasons unrelated to repository content cannot certify a safety
   kernel, and worse, it trains the reader to re-run rather than to read.

2. **Receipts that a filter can destroy.** The authoritative gate emits its
   receipt to stdout only, and the clean-gate wrapper recovers the inner
   receipt by scraping stdout for a schema token. C-10.5 lost the original
   failing-group detail exactly this way. C-11's one-fault denial matrix and PQ
   receipt are worth nothing if the gate that certifies them cannot say which
   group failed.

R-11 is deliberately bounded: it is the prerequisite, not part of C-11, and it
carries its own task, OpenSpec change, checkpoints and evidence.

## What changes

1. **The port-lease contract becomes explicit and testable.** A pure
   candidate-selection component and a named allocation outcome
   (`PREFERRED_REUSED` / `PREFERRED_UNAVAILABLE_ADVANCED`) make the allocator's
   real promise expressible in an assertion. Production behavior is unchanged.

2. **Availability becomes injectable for unit tests only.** A bounded
   test-only seam allows deterministic simulation of availability decisions.
   The production entry point binds the real OS probe with no substitutable
   parameter, and hardening enforces both halves mechanically. At least one
   test continues to exercise the real OS TCP stack.

3. **The over-strong assertion is replaced by the allocator's actual
   contract**, and the PID-derived port lottery is removed — not replaced with
   another probabilistic guess. Occupied-port advancement and orphan reclaim
   become explicit, deterministic, adversarial test cases.

4. **Gate receipts become durable.** The authoritative gate writes its
   canonical receipt bytes atomically to a confined safe path in addition to
   stdout, digest-identical, for failures as well as passes. The clean-gate
   wrapper consumes that structured file instead of scraping stdout, and
   requires the two to agree.

5. **Stage-A documentation truth is reconciled** against the real head
   `c423e33` and its green run `33637832941`, with the authority model made
   explicit so a docs commit does not require another docs commit forever.

## What does not change

- No production, DEV or NEXT contact; no authenticated browsing; no credential
  or auth-state inspection; no sibling-repository write.
- No allocator safety property is weakened: real TCP probing, exclusive lease
  create, process and token ownership, malformed and symlink fail-closed
  handling, system-temp coordination and the bounded candidate count all stand.
- No test is deleted, skipped, retried or given an inflated timeout.
- No hardening rule, privacy rule, C-06 proof or C-10/C-10.5 provenance
  binding is weakened.
- C-11 is NOT started here.
