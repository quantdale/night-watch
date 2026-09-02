# R-11 Proxy/Gate Reliability Closure

## Task purpose

Eliminate the two pre-existing reliability defects recorded as `OBS-C105-1`, so
that the C-11 `PROD_OBSERVE` safety kernel can be certified by a gate whose
red/green result carries information about repository content and whose
receipts survive being read.

Observable outcome: the previously non-deterministic proxy-lifecycle suite is
deterministic and asserts the allocator's real contract; occupied-port
advancement and orphan reclaim are explicit adversarial cases; the
authoritative gate persists a confined, atomic, digest-identical receipt for
passes and failures alike; and the clean-checkout wrapper consumes that
structured receipt instead of scraping standard output.

## Established starting state

- Task ID: `nightwatch-proxy-gate-reliability-r11-v1`
- Starting SHA: `c423e33e3384dd3ec34bfd4e9d57d863f58bc190`
- Predecessor: `nightwatch-c10-provenance-truth-closure-v1`, `COMPLETE`
- `origin/main` verified at the starting SHA; canonical checkout clean.
- Exact-head run `33637832941` / job `100273053129` at `c423e33` is `success`.
- OBS-C105-1 is REPRODUCED, not inferred. Root cause established: the allocator
  is correct in all four brief-specified cases; the test asserted that a
  preferred port is a guarantee, and derived that port from `process.pid`.
  Recorded in the OpenSpec `audit.md`; do not rediscover it.
- The receipt failure mode is structural: the gate emits its receipt to stdout
  only, and the clean wrapper recovers it by stdout scraping.
- `checkPhase23QualityGate` forbids `upload-artifact`, restricts the workflow to
  two run commands and admits only `actions/checkout@v4` and
  `actions/setup-node@v4`. An Actions artifact is therefore justified away
  rather than added; weakening those rules is forbidden.

## Required deliverables

- Pure bounded candidate selection; explicit availability predicate in the
  allocator core; production entry bound to the real OS probe.
- `PREFERRED_REUSED` / `PREFERRED_UNAVAILABLE_ADVANCED` allocation diagnostics.
- A `TEST ONLY` availability seam, reachable from `tests/**` only, enforced by
  hardening and negative-probed.
- A deterministic adversarial proxy-lease suite covering all sixteen
  brief-specified conditions.
- A corrected `phase24ProxyLifecycle` SIGTERM/SIGINT case with no probabilistic
  port selection, plus a real-OS-TCP occupied-port integration test.
- A bounded stress campaign with exact iteration counts.
- Confined, validated, atomic gate-receipt persistence with digest identity and
  failure coverage; a clean-gate wrapper that consumes the file.
- An adversarial receipt suite covering brief §11 in full.
- Reconciled Stage-A documentation truth and an explicit four-role
  certification authority model.
- Gate registration proof for every new suite.

## Explicit non-goals

- C-11 `PROD_OBSERVE` is NOT started in this task.
- No change to product routes, outbound policy or containment layers.
- No attempt to increase `READ_ONLY_PROVEN`; C-06 is untouched.
- No change to the C-10 privacy algebra or the C-10.5 provenance binding.
- No Actions artifact upload, and no weakening of the rules that forbid it.

## Safety constraints

- No production, DEV or NEXT contact. No authenticated browsing, auth capture,
  credential or auth-state inspection, datastore, cloud, IAM or Kubernetes
  access, external publication, or sibling-repository write. Siblings are read
  only.
- All sockets are loopback-only and belong to the port-availability probe or to
  deliberately planted test listeners.
- No force push, history rewrite, destructive reset, `skip-worktree`,
  `assume-unchanged`, hidden Git configuration, or repository-local hook.
- No test deletion, `test.skip`, runner retry, or timeout inflation. Every
  repeated run is an independent invocation.
- No hardening, privacy, C-06, C-10 or C-10.5 rule is weakened, and no failing
  quality-gate group is suppressed.
- Implementation happens only in the owned session worktree
  `session/nightwatch-proxy-gate-reliabilit-6e648bc4`.

## Acceptance criteria

- OBS-C105-1 reproduced with evidence and root cause established.
- The test invariant matches the allocator contract; no probabilistic
  port-selection assumption remains anywhere in the proxy tests.
- Occupied-port advancement and orphan reclaim are explicitly tested.
- Every listed allocator safety property is preserved and regression-tested.
- Deterministic adversarial port tests green; stress evidence green with exact
  counts recorded.
- Gate receipts durable and privacy-safe; a failing group cannot be destroyed
  by output filtering; malformed or missing receipts fail closed.
- Full canonical regression with zero failures and no new skips.
- `gate:local` PASS; clean Node 20 `gate:clean` PASS; exact-head GitHub Actions
  PASS with all eleven required groups.
- Canonical checkout clean, `origin/main` synchronized, `siblingWrites = 0`.

## Declared Deletions

None. This task deletes no tracked file.
