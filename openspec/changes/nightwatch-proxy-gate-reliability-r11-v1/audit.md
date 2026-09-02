# R-11 Audit — OBS-C105-1, reproduced before repair

## Starting truth, verified rather than assumed

| Expected | Verified |
| --- | --- |
| repository `quantdale/night-watch` | `origin` = `https://github.com/quantdale/night-watch.git` |
| `origin/main` = `c423e33e3384dd3ec34bfd4e9d57d863f58bc190` | confirmed; canonical checkout clean and synchronized |
| active task `nightwatch-c10-provenance-truth-closure-v1`, `COMPLETE` | confirmed in `.agent/ACTIVE_TASK.md` |
| Stage-A substantive implementation `c763c056…` | present in history |
| latest exact-head run `33637832941` / job `100273053129` | `conclusion: success`, `headSha: c423e33e…`, workflow `Nightwatch hardening` |

No ACTIVE execution prompt remained: `.agent/EXECUTION_PROMPT.md` was
`Status: COMPLETE`. R-11 therefore opens as a new separately auditable task
rather than resuming a partial one.

## R1. The port-lease observation, reproduced deterministically

The C-10.5 report recorded OBS-C105-1 as an inference from an unrelated
failure, explicitly "not proof". R-11 converts it to proof. No repository file
was edited before the reproduction ran.

### The allocator's actual behavior

`reserveProxyPortLease()` (`src/proxy/portLease.ts`) walks a bounded
32-candidate search space. For each candidate it claims a lease file with an
exclusive create, then probes REAL TCP availability, and if the endpoint is
occupied it deletes the lease it just created and advances:

```ts
if (!portAvailable(port)) {
  try { fs.unlinkSync(file); } catch { /* bounded scratch cleanup */ }
  continue;
}
```

So the preferred port is a PREFERENCE. The allocator promises an owned lease
for an admissible candidate, not the preferred number.

### The four brief-specified cases, observed

A scratchpad harness exercised the UNMODIFIED allocator directly through the
repository's TypeScript runtime loader:

| Case | Condition | Observed | Verdict |
| --- | --- | --- | --- |
| A | preferred lease stale (reaped pid), TCP free | `lease.port = 41000` = preferred; port available | stale lease reclaimed, preferred reused, ownership safe |
| B | preferred lease stale, TCP occupied by an unrelated real listener | `lease.port = 41011` ≠ preferred `41010`; stale lease file reclaimed | allocator correctly refused the occupied endpoint and advanced |
| C | preferred lease owned by a LIVE process | `lease.port = 41021`; live lease byte-identical afterwards | live lease untouched, allocator advanced |
| D1 | malformed lease (`{ not json`) | `lease.port = 41031`; malformed bytes preserved | suspicious state not deleted, allocator advanced |
| D2 | symlink lease pointing at a sentinel file | `lease.port = 41041`; still a symlink, target still `sentinel` | symlink not deleted, target not written, allocator advanced |

**Every allocator behavior is correct.** Nothing in `src/proxy/portLease.ts`
misbehaves in any of the four cases.

### The test asserts a stronger property than the allocator promises

In Case B the current assertion at
`tests/unit/phase24ProxyLifecycle.test.ts:128` was evaluated against the same
lease:

```
assertion FAILS (lease.port=41011, preferred=41010)
```

### End-to-end reproduction of the exact CI failure

To remove any doubt that this is the CI failure rather than a lookalike, the
real suite was run while the exact PID-derived preferred ports it would choose
were occupied by real loopback listeners. The test computes

```ts
const preferred = 21000 + (process.pid % 500) * 2 + index;
```

so a watcher discovered the Playwright worker pid, computed the same two ports,
and bound them before the case executed:

```
[occupied] worker pid=883319 index=0 port=21638
[occupied] worker pid=883319 index=1 port=21639

  ✘ 5 tests/unit/phase24ProxyLifecycle.test.ts:105:7 › SIGTERM and SIGINT during a child setup leave reclaimable orphan state only

    Error: expect(received).toBe(expected)
    Expected: 21638
    Received: 21640
      > 128 |           expect(lease.port).toBe(preferred);
```

The failing location is `tests/unit/phase24ProxyLifecycle.test.ts:105` — byte
for byte the `failedLocations` value the exact-head CI receipt recorded. The
same suite is 5/5 green on the same commit with the ports free.

The allocator advanced by two (`21638 → 21640`) because `21639` was occupied
too. That is the bounded search working, not a second defect.

## Root cause

**A correct allocator, an over-strong test.** OBS-C105-1 is a TEST defect, not
a proxy defect. Two compounding faults:

1. **Wrong invariant.** `expect(lease.port).toBe(preferred)` asserts that a
   preference is a guarantee. It is falsified by any unrelated process holding
   that endpoint — a function of host state, never of repository content.
2. **Probabilistic port selection.** `21000 + (process.pid % 500) * 2 + index`
   makes the test's own input a 1,000-wide lottery over host state. The test
   was not deterministic, so its result carried no information about the code.

The brief's proposed explanation is therefore **CONFIRMED, not disproven**.

## R2. The receipt-durability failure mode

OBS-C105-1 needed an unrelated CI failure to explain it because the local
`gate:clean` failure's per-group detail was destroyed: the invocation piped the
receipt through a filter printing only `finalResult`. The gate emits its
receipt to stdout ONLY (`bin/quality-gate.mjs:192`), so the single copy of the
evidence was consumed by the filter and could not be recovered.

`bin/quality-gate-clean.mjs:104` compounds this by recovering the inner gate's
receipt through stdout scraping — `output.split(...).reverse().find((line) =>
line.includes('nightwatch.quality-gate-receipt.v1'))` — so any child that
prints a line containing that schema token can shadow the real receipt.

## R3. Stage-A documentation truth drift

`c423e33` is now the head of `main` and its own exact-head run
`33637832941` / job `100273053129` is green, so three live statements are now
false or stale:

| Location | Statement | Status |
| --- | --- | --- |
| `docs/CURRENT_STATE.md` "Exact-head CI is green" | "it is the EXACT head of `main`" about `29b9212` | FALSE — `29b9212` is two commits behind `c423e33` |
| `docs/CURRENT_STATE.md` header banner | "GREEN at the exact head: run `33635296271` at `29b9212`" | STALE — a newer exact-head run exists |
| `docs/CURRENT_STATE.md` project-state v2 table | `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` "Current value `23523cc`" | STALE — the machine-checked block says `c763c05` |

`29b9212` remains a true historical certification and is preserved as such.
