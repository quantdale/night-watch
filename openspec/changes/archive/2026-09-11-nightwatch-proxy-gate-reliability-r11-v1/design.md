# Design — R-11 Proxy/Gate Reliability Closure

## §1. The authoritative port-lease invariant

> A preferred port is a preference, not a guarantee. Allocation must return an
> owned lease for a currently admissible candidate within the bounded search
> space, without colliding with a live lease or an occupied TCP endpoint.

Admissibility of a candidate, unchanged from the shipped allocator:

1. no lease file exists, or the existing lease's owner pid is dead and the
   lease record is well-formed (reclaimable);
2. lease state that is malformed or a symlink is NOT reclaimable and NOT
   deleted;
3. the lease file can be created with an exclusive create (`wx`, `0600`);
4. the TCP endpoint is available under a real bind probe.

The search space is `CANDIDATE_COUNT = 32` consecutive candidates from the
preferred port, wrapping into `[1024, 65535]`. Exhaustion throws
`PROXY_PORT_LEASE_EXHAUSTED`.

### Named outcome

`ProxyPortLease` gains two diagnostic fields, both derived, neither
load-bearing for safety:

```ts
readonly candidateOffset: number;   // 0 == the preferred candidate
readonly preferredOutcome: 'PREFERRED_REUSED' | 'PREFERRED_UNAVAILABLE_ADVANCED';
```

This is what makes the corrected assertion informative rather than merely
weaker: a test can require `PREFERRED_REUSED` when it has established that the
preferred endpoint is free, and require `PREFERRED_UNAVAILABLE_ADVANCED` when
it has deliberately occupied it. Neither case is "any port will do".

## §2. Pure candidate selection

`proxyPortCandidates(preferred): readonly number[]` is extracted as a pure
function of the preferred port alone — no clock, no pid, no randomness, no I/O.
It returns exactly the bounded ordered candidate list the allocator walks, so
wraparound and boundedness are directly testable without touching the
filesystem or a socket.

## §3. The availability seam, and why it cannot weaken production

The allocator core is factored into one module-private function that takes the
availability predicate explicitly:

```ts
function reserveWithAvailability(root, preferredPort, available: (port: number) => boolean): ProxyPortLease
```

Two entry points, and only two:

| Entry point | Availability predicate | Who may call it |
| --- | --- | --- |
| `reserveProxyPortLease(options)` | `portAvailable` — the real short-lived TCP bind | anyone |
| `reserveProxyPortLeaseWithAvailabilityForTest(options)` | caller-supplied | `tests/**` only |

`reserveProxyPortLease` takes NO availability parameter, so there is no value a
caller can pass to make the production path skip the real probe. The seam is a
distinct exported name, which makes the restriction mechanically checkable by
name rather than by data-flow analysis.

Four hardening rules, each negative-probed:

1. `reserveProxyPortLease` must bind the real probe — the production entry's
   body must pass `portAvailable` to the core.
2. `portAvailable` must retain a real TCP bind probe (`net.createServer` /
   `listen`), so the "real OS probe" cannot become a stub.
3. No file outside `tests/**`, other than the defining module itself, may
   reference `reserveProxyPortLeaseWithAvailabilityForTest`.
4. The seam export must carry the explicit `TEST ONLY` brand, following the
   C-10.5 `testOnlySeam` precedent.

Rule 3 is why the seam lives in `src/proxy/portLease.ts` beside the core rather
than in a separate module that would have to duplicate allocator logic: a
duplicated allocator would mean the deterministic tests no longer test the real
allocator, which defeats the purpose.

The real OS TCP stack keeps at least one integration test: the Case-B
integration test binds a real loopback listener and requires the real
`reserveProxyPortLease` to advance past it.

## §4. Why not another free-port guess

Rejected, with reasons:

| Rejected fix | Why |
| --- | --- |
| random port | still a lottery; flake rate falls but never reaches zero, and failures stop being reproducible |
| `Date.now()`-derived port | a lottery with worse locality |
| another PID formula | the defect verbatim |
| "find a free port, close the socket, assume still free" | textbook time-of-check/time-of-use race; the OS may hand the port to anyone between `close()` and the allocator's own bind |
| relax to `expect(lease.port).toBeGreaterThanOrEqual(preferred)` | hides the real property; a lease at the wrong offset for the wrong reason would pass |

The chosen fix removes the lottery from the test's INPUT (deterministic
simulated availability) and states the allocator's real contract in its
OUTPUT (named outcome plus candidate-set membership).

## §5. Durable gate receipts

### Path resolution and confinement

```
NIGHTWATCH_GATE_RECEIPT_PATH   explicit override
default                        <os.tmpdir()>/nightwatch-gate-receipts/<mode>-<head12>.json
```

The default means durability is automatic: the failure mode being eliminated is
an operator losing the only copy, and a mechanism that must be remembered would
not have prevented OBS-C105-1.

An explicit path is validated BEFORE the gate runs, so a bad path costs no test
time, and it fails closed with `CONFIG_INVALID` and exit 2:

| Rejection | Code |
| --- | --- |
| not absolute, or contains `..` | `GATE_RECEIPT_PATH_NOT_ABSOLUTE` / `GATE_RECEIPT_PATH_TRAVERSAL` |
| inside the repository root (tracked-tree write) | `GATE_RECEIPT_PATH_INSIDE_REPOSITORY` |
| not under `os.tmpdir()` or `RUNNER_TEMP` | `GATE_RECEIPT_PATH_UNCONFINED` |
| parent directory missing, not a directory, or a symlink | `GATE_RECEIPT_PATH_PARENT_INVALID` |
| destination exists and is not a regular file (symlink included) | `GATE_RECEIPT_PATH_DESTINATION_INVALID` |

Confinement to a temporary root, plus explicit exclusion of the repository
root, is what makes "never silently write into tracked repository paths" and
"does not dirty a clean checkout" mechanical rather than aspirational.
`PATCH_INTEGRITY` continues to require a clean checkout and is unaffected.

### Atomicity and identity

The canonical receipt bytes are the SAME string that goes to stdout. The write
is `open(wx)` on a sibling temp name in the destination directory, `write`,
`fsync`, `close`, `rename`. `rename` within one directory is atomic, so a
reader never sees a partial receipt and a crash leaves either the old file or
the new one.

The digest is computed over the receipt body BEFORE persistence, so the file
and stdout carry byte-identical content and an identical `receiptDigest`. The
receipt body therefore cannot contain a "was it written" field without
self-reference; instead the body carries the deterministic
`receiptPersistenceRequested: true` and the outcome is reported categorically
on stderr, never on stdout, which stays receipt-only.

Failure receipts are written wherever a receipt can be constructed at all —
including `ENVIRONMENT_MISMATCH`, `TEST_FAILURE`, `TIMEOUT`, `INTERRUPTED` and
`NOT_RUN` cascades — because those are precisely the cases worth keeping. A
persistence failure after a run is itself a failure: exit code 3 with a
categorical stderr code, never a silent pass.

### The clean-gate wrapper stops scraping stdout

`bin/quality-gate-clean.mjs` allocates a receipt path in its own disposable
temp directory OUTSIDE the clone, passes it to the inner gate, and reads the
FILE. Because the gate itself wrote those bytes, no amount of child stdout
noise, prefix, suffix or schema-token spoofing can alter what the wrapper
parses. The stdout receipt is still parsed, and the two `receiptDigest` values
must be equal:

- file missing or unparseable → `CLEAN_GATE_RECEIPT_UNAVAILABLE`, fail closed;
- file and stdout digests disagree → `CLEAN_GATE_RECEIPT_DIGEST_MISMATCH`,
  fail closed.

A stale receipt cannot be mistaken for the current gate because the file
carries `gitHead` and `environmentClass`, and the wrapper requires the file's
`gitHead` to equal the head it asked the gate to run at.

### Why no Actions artifact

The brief permits justifying the artifact away. `checkPhase23QualityGate`
currently enforces that the workflow contains exactly two run commands
(`npm ci --ignore-scripts`, `npm run gate:ci`), forbids `upload-artifact`
outright, and admits only `actions/checkout@v4` and `actions/setup-node@v4`.
Adding an artifact upload requires WEAKENING those three rules, which this
campaign is forbidden to do and which would trade a real supply-chain
restriction for a convenience.

The attributability requirement is met without it: the complete receipt —
per-group status, counts, `didNotRun`, `failedLocations`, containment lane — is
printed in full to the Actions job log, which GitHub retains durably and which
is not "terminal output" that an operator can lose. OBS-C105-1 was destroyed by
a LOCAL summarizing filter, and the durable local receipt file is the direct
remedy for that. The `gh run view --log` route reaches the same bytes.

## §6. Certification authority model

To stop the "a docs commit needs another docs commit" regress, four distinct
roles are named explicitly rather than collapsed into "the certified SHA":

| Role | Meaning | Advances when |
| --- | --- | --- |
| substantive checkpoint | last commit that changed implementation AND was validated | implementation changes and passes |
| certification checkpoint | the commit an exact-head CI run actually executed the gate at | a run completes at that exact commit |
| docs-only descendant | a commit that changes only documentation, recording the above | records are written |
| latest observed exact-head run | the newest run whose `headSha` equals the then-current head | any push to `main` completes CI |

A docs-only descendant does NOT invalidate a certification: it changes no
input the gate consumes for behavior. The regress is closed by recording the
certification of the substantive checkpoint plus the latest observed exact-head
run, and by never claiming that the commit containing a run's identifiers is
itself the commit that run certified.
