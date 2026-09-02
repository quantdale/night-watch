# R-11 Proxy/Gate Reliability Closure — Report

- Starting SHA: `c423e33e3384dd3ec34bfd4e9d57d863f58bc190`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Task objective: close the two pre-existing reliability defects recorded as
  `OBS-C105-1`, so the C-11 `PROD_OBSERVE` safety kernel can be certified by a
  gate whose red/green result carries information and whose failures stay
  attributable.
- Safety events: NONE
- Remaining blockers: none.
- Recommended next phase/task: C-11 `PROD_OBSERVE` safety kernel.

Status: IN_PROGRESS

---

## 1. Starting SHA and verified starting truth

Nothing in the brief's expected-state section was assumed. Each value was
checked:

| Expected | Verified |
| --- | --- |
| repository `quantdale/night-watch` | `origin` = `https://github.com/quantdale/night-watch.git` |
| `origin/main` = `c423e33e…` | confirmed; canonical checkout clean and synchronized |
| active task `nightwatch-c10-provenance-truth-closure-v1` / `COMPLETE` | confirmed |
| C-10.5 substantive implementation `c763c056…` | present in history |
| exact-head run `33637832941` / job `100273053129` | `conclusion: success`, `headSha: c423e33e…`, Node 20 |
| canonical regression 2,975 / 2,962 / 13 / 0 | matched by the pre-change baseline |

`.agent/EXECUTION_PROMPT.md` was `Status: COMPLETE`, so no ACTIVE prompt
remained and R-11 opened as a new separately auditable task rather than
resuming a partial one.

## 2. OBS-C105-1 reproduction — proof, not inference

C-10.5 recorded OBS-C105-1 as an inference from an unrelated failure and said
so explicitly. R-11 converted it to proof BEFORE editing any repository file.

**Unit level, against the unmodified allocator.** All four brief-specified
cases were driven through the real `reserveProxyPortLease`:

| Case | Condition | Observed | Verdict |
| --- | --- | --- | --- |
| A | stale lease, TCP endpoint free | `lease.port = 41000` = preferred | stale lease reclaimed, preferred reused, ownership safe |
| B | stale lease, endpoint occupied by an unrelated real listener | `lease.port = 41011` vs preferred `41010` | occupied endpoint refused, bounded search advanced |
| C | lease owned by a LIVE process | `lease.port = 41021`; lease byte-identical afterwards | live lease untouched, advanced |
| D1 | malformed lease (`{ not json`) | `lease.port = 41031`; bytes preserved | suspicious state not deleted, advanced |
| D2 | symlink lease onto a sentinel file | `lease.port = 41041`; still a symlink, target still `sentinel` | not deleted, not written through, advanced |

**Every allocator behavior is correct.** The old assertion was then evaluated
against the Case-B lease and failed.

**End-to-end, through the real suite.** To remove any doubt this was the CI
failure rather than a lookalike, the real suite ran while the exact PID-derived
ports it would choose were held by real loopback listeners:

```
[occupied] worker pid=883319 index=0 port=21638
[occupied] worker pid=883319 index=1 port=21639

  ✘ 5 tests/unit/phase24ProxyLifecycle.test.ts:105:7 › SIGTERM and SIGINT during a child setup leave reclaimable orphan state only
    Error: expect(received).toBe(expected)
    Expected: 21638   Received: 21640
      > 128 |           expect(lease.port).toBe(preferred);
```

`tests/unit/phase24ProxyLifecycle.test.ts:105` is byte for byte the
`failedLocations` value the exact-head CI receipt recorded. The same suite is
5/5 green at the same commit with the ports free.

## 3. Exact root cause

**A correct allocator and an over-strong test.** OBS-C105-1 is a TEST defect.
Two compounding faults:

1. **Wrong invariant.** `expect(lease.port).toBe(preferred)` asserts that a
   preference is a guarantee. `reserveProxyPortLease` promises an owned lease
   for an admissible candidate in a bounded space; it explicitly refuses an
   occupied TCP endpoint and advances.
2. **Probabilistic input.** `21000 + (process.pid % 500) * 2 + index` made the
   test's own input a 1,000-wide lottery over host state, so its result carried
   no information about repository content.

## 4. Why the previous test invariant was wrong

The brief's proposed explanation is **CONFIRMED, not disproven**. The allocator
deletes the lease it created for a candidate whose endpoint is occupied and
moves on:

```ts
if (!available(port)) {
  try { fs.unlinkSync(file); } catch { /* bounded scratch cleanup */ }
  continue;
}
```

Any unrelated process holding that endpoint therefore falsifies
`lease.port === preferred` while the allocator is behaving exactly as designed.
The port space being PID-derived meant collision probability was a function of
host state, never of the repository.

## 5. Allocator behavior before and after

**Unchanged.** `candidatePort` semantics are identical, the loop body is
identical apart from calling an injected predicate instead of `portAvailable`
directly, and every safety property is preserved:

| Property | Status |
| --- | --- |
| real TCP bind/probe | preserved; hardening requires `net.createServer` + `listen` |
| exclusive lease create (`wx`, `0600`) | preserved and hardening-enforced |
| process ownership | preserved; live-owner leases never deleted |
| token ownership on release | preserved and hardening-enforced |
| malformed state fail-closed | preserved; never deleted |
| symlink state not deleted | preserved; `lstat`-based, never followed |
| system-temp coordination across clones/worktrees | preserved |
| bounded candidate count | preserved (`CANDIDATE_COUNT = 32`) |
| no deletion of a non-owned live lease | preserved |

Added, purely diagnostic: `candidateOffset` and `preferredOutcome`
(`PREFERRED_REUSED` / `PREFERRED_UNAVAILABLE_ADVANCED` /
`INHERITED_LEASE_ADOPTED`), plus the pure `proxyPortCandidates(preferred)`.

## 6. Test behavior before and after

| | Before | After |
| --- | --- | --- |
| port selection | `21000 + (process.pid % 500) * 2 + index` | fixed candidates; nothing probabilistic replaces the formula |
| assertion | `lease.port === preferred` | orphan re-owned with a fresh token, endpoint really available under the OS, reported outcome matches the candidate taken |
| occupied-endpoint case | treated as a FAILURE | asserted as CORRECT, both simulated and against real OS TCP |
| real-OS coverage | incidental | explicit: binds port 0 and HOLDS the socket, so the precondition exists by construction with no close-then-assume-free window |
| child readiness | poll the filesystem against a 1s deadline | explicit readiness event from the child |

**Decisive check:** 26 tests pass with 18 endpoints deliberately occupied,
including both the legacy PID-derived ports and the new fixed candidates — the
exact condition that previously failed a required gate group.

## 7. Deterministic collision cases

`tests/unit/proxyPortLeaseDeterminism.test.ts`, 20 cases, covering every
brief-specified condition:

candidate 0 available; candidate 0 occupied (advance exactly one, rejected
candidate keeps no lease file); candidates 0..N occupied; bounded exhaustion
with `PROXY_PORT_LEASE_EXHAUSTED` and no lease left behind; wraparound inside
`[1024, 65535]` with the wrap actually exercised; invalid preferred port
fail-closed; purity of candidate selection; live foreign lease preserved
byte-identical; orphan reclaimed AND re-owned; malformed state preserved;
bad schema/port/token treated as suspicious rather than reclaimable; symlink
neither deleted nor written through; held-lease collision; idempotent release
that spares a foreign lease; token-mismatch release refusal; repeated
allocate/release cycles; six genuinely parallel cross-process allocators on one
preferred port; SIGKILL, SIGTERM and SIGINT orphan reclaim — each signal case
asserting BOTH that the orphan is reused when the endpoint is free and that
advancing is correct when it is occupied.

Determinism comes from a TEST-ONLY injectable availability predicate that
reaches the SAME allocator core as production, so these cases prove the real
lease and fail-closed logic rather than a copy. Four hardening rules keep the
seam out of production, all negative-probed.

## 8. Stress totals

`tests/unit/proxyPortLeaseStress.test.ts`, supporting evidence only — the
deterministic cases are primary, because "ran many times and happened not to
fail" is a sample, not a proof about a race. Exact asserted counts:

| Campaign | Iterations | Result |
| --- | --- | --- |
| real allocate/release cycles | 200 | no leaked lease, no port reused while held |
| parallel cross-process allocators | 4 rounds x 6 workers = 24 real leases | no double assignment in any round |
| allocations against a REAL listener held on the preferred endpoint | 120 | all 120 advanced; rejected candidate never kept a lease file |
| child crashes between lease creation and release | 60 | all 60 reclaimed and re-owned with a fresh token |
| rapid reclaim cycles | 1,000 | port set a singleton, i.e. fully deterministic |

Total runtime 19.6s. The occupied-endpoint campaign holds ONE socket bound to
an OS-chosen port for its whole duration, so every iteration genuinely faces an
occupied preferred endpoint rather than hoping to.

## 9. Receipt-persistence architecture

See the OpenSpec `design.md` §5. In summary:

- **Confinement.** An explicit `NIGHTWATCH_GATE_RECEIPT_PATH` is honoured only
  if absolute, traversal-free, outside the repository, inside a permitted
  temporary root (`os.tmpdir()` or `RUNNER_TEMP`), with a real non-symlink
  parent directory, and pointing at either nothing or a regular file. Each
  refusal is a distinct categorical code and is decided BEFORE any group runs.
- **Automatic default.** With no explicit path a per-mode, per-head destination
  is derived under a permitted root. Durability is not something an operator
  must remember, because the failure being eliminated was an operator losing
  the only copy.
- **Atomicity.** Exclusive create, `fsync`, atomic `rename` within one
  directory, mode `0600`. A reader sees the previous receipt or the complete new
  one, never a truncated prefix that happens to parse.
- **Identity by construction.** One `JSON.stringify` result is sent to both
  stdout and the file, so byte identity and equal `receiptDigest` values are
  structural rather than two code paths agreeing.
- **Failures persist.** `TEST_FAILURE`, `ENVIRONMENT_MISMATCH`, `TIMEOUT`,
  `INTERRUPTED` and `NOT_RUN` cascades are all written. A receipt that cannot be
  persisted exits 3 rather than passing quietly.
- **No child inheritance.** The receipt path joins
  `FORBIDDEN_ENVIRONMENT_KEYS`, so a child cannot overwrite the run's receipt.
- **The clean wrapper stops scraping stdout.** It reads the structured FILE,
  keeps stdout only as a cross-check, and fails closed when the two digests
  disagree or the file is missing, stale or malformed. Its destination lives
  outside the disposable clone, so writing it cannot dirty the checkout the
  clean gate measures.

**On the Actions artifact.** Deliberately NOT added, which the brief permits
with justification. `checkPhase23QualityGate` forbids `upload-artifact`, caps
the workflow at exactly two run commands, and admits only
`actions/checkout@v4` and `actions/setup-node@v4`. Adding an upload requires
weakening three hardening rules, which this campaign may not do. The
requirement is met without it: the complete receipt — per-group status, counts,
`didNotRun`, `failedLocations`, containment lane — is printed to the Actions job
log, which GitHub retains durably and which is not terminal output an operator
can lose. This was verified in practice, twice: both failed exact-head runs
were diagnosed to a single group with one `gh run view --log` command.

## 10. Failed-receipt proof

Not simulated. Four real failing gate runs produced complete, persisted,
correctly attributed receipts:

| Run | Failing group | Retained detail |
| --- | --- | --- |
| `gate:local` at `4649a29` | `PATCH_INTEGRITY` | the group named, `WORKSPACE_INTEGRITY` `NOT_RUN`, receipt `receipt:sha256:b69dd51584531f67484224f7` persisted at mode 0600 |
| `gate:local` at `bd6776f` | `HANDOFF_TRUTH` | the group named plus the seven-group `NOT_RUN` cascade |
| `gate:clean` x2 at `5a4da2f` | `SEMANTIC_COMPATIBILITY` | counts 2,031/2,014/14/3 and 2,031/2,015/14/2, with `failedLocations` naming all three failing tests exactly |
| exact-head CI `33649946137`, `33653818653` | `PROJECT_TRUTH` | the group named, seven groups `NOT_RUN`, recovered from the retained job log |

Plus 31 adversarial cases in `tests/unit/gateReceiptPersistence.test.ts`: every
confinement refusal; symlink parent and destination with the sentinel target
verified untouched; atomic write with no debris; unwritable destination; a
`TEST_FAILURE` round-trip preserving `failedLocations`, `didNotRun`, the
containment lane and the `NOT_RUN` cascade; seven malformed-file refusals
including truncation; stale head and stale mode; and two real gate spawns
proving pre-group refusal and byte identity. One case reproduces the OBS-C105-1
channel failure directly: stdout is polluted with noise and a forged PASS
receipt, scraping yields the forgery, and reading the file the gate wrote still
yields the truth.

## 12. Regression totals

| Measure | Before (C-10.5) | After (R-11) |
| --- | --- | --- |
| canonical regression | 2,975 / 2,962 / 13 / 0 | 3,031 / 3,018 / 13 / 0 |
| new tests | — | +56 |
| new skips | — | 0 (13 before, 13 after) |
| `SEMANTIC_COMPATIBILITY` | 1,975 / 1,962 / 13 / 0 | 2,031 / 2,018 / 13 / 0 |
| `SYNTHETIC_CAMPAIGN` | 256 / 256 | 256 / 256, `deepContainmentLane: PROVEN` locally |

No test was deleted, skipped, retried or given a longer correctness deadline.
No runner retry is configured anywhere in the repository.

## Defects found and disposition

| ID | Defect | Disposition |
| --- | --- | --- |
| **OBS-C105-1** (pre-existing) | `phase24ProxyLifecycle` derived its port from `process.pid` and asserted it obtained that exact port, so any unrelated listener failed a required gate group | CLOSED — reproduced deterministically and end-to-end, then repaired in the test with a named allocation outcome; allocator unchanged |
| **Receipt fragility** (pre-existing) | the gate emitted its receipt to stdout only, and the clean wrapper recovered it by scraping stdout for a schema token | CLOSED — confined atomic persistence, single canonical emit path, wrapper consumes the file and requires digest agreement |
| **Stage-A doc drift** (pre-existing) | `docs/CURRENT_STATE.md` claimed `29b9212` "is the EXACT head of `main`", which had become false | CLOSED — corrected, latest observed exact-head run recorded, `29b9212` preserved as C-10.5's certification, six checkpoint roles named |
| **Project-state prose drift** (pre-existing) | the prose table named `23523cc` as the current substantive anchor while the machine-checked block said `c763c05`; `project:check` does not read the prose | CLOSED — reconciled |
| **Threat-model drift** (pre-existing) | T-30 prescribed a per-campaign salt with a test inverted relative to D-113; T-41 said dynamic keys project to a digest of the key; T-42 specified a second "salted value digest" family | CLOSED — reconciled to D-113 after verifying `durableValueDigest: 'ABSENT'` and no salt in the production cone; each keeps its historical text under an explicit SUPERSEDED heading |
| **DEF-R11-1** (introduced) | the live-owner hardening rule matched `processAlive(existing.pid)`, which also occurs in the inherited-lease branch, so deleting the reclaim guard — permitting deletion of a LIVE process's lease — left hardening green | CLOSED — anchored to the call site; mutation now detected |
| **DEF-R11-2** (introduced) | the child-environment rule matched `GATE_RECEIPT_PATH_ENV,`, which also matches the import, so removing the forbidden-key entry left hardening green | CLOSED — anchored inside the frozen list; mutation now detected |
| **DEF-R11-3** (introduced) | a receipt test asserted the repository is never inside a permitted temporary root — false in the clean topology, which clones into `os.tmpdir()` | CLOSED — replaced with the real invariant: the inside-repository refusal is decided BEFORE confinement, and a sibling directory in the same root is still accepted |
| **DEF-R11-4** (introduced) | the byte-identity case keyed off "Node major is not 20" and SKIPPED in the clean and CI topologies, taking skipped from 13 to 14 | CLOSED — a minimal gate root with no `package-lock.json` reaches `ENVIRONMENT_MISMATCH` on any Node major; skipped back to 13 |
| **DEF-R11-5** (introduced) | two cases spawned the gate with `{ ...process.env }` and asserted stderr was one JSON document; Playwright's worker exports `FORCE_COLOR` while the launcher sets `NO_COLOR=1`, so Node 20 wrote a warning to stderr — the same uncontrolled-ambient-input class as OBS-C105-1 | CLOSED — minimal explicit child environment; root cause captured verbatim, not inferred |
| **Latent typing gap** (pre-existing, surfaced) | `tests/unit/syntheticCampaignDiagnostics.test.ts` imported the receipt boundary with `@ts-expect-error` and ignored that `parseSafeDetails` returns `null` | CLOSED — the new `.d.mts` typed it and the test now asserts presence explicitly |

DEF-R11-1 through DEF-R11-5 were introduced by this campaign and are reported
rather than quietly fixed. Two were found only by negative probing and three
only by the clean Node 20 gate — none by review.

## Negative hardening probes

29 probes, each mutating exactly one invariant on a disposable clone and
requiring `hardening:check` to fail. First pass: 27 detected, 2 vacuous
(DEF-R11-1, DEF-R11-2). After repair: **29/29 detected, 0 vacuous.**
