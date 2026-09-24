## Context

`bin/run-shards.mjs` launches each Playwright shard in a separate process with an explicit environment allowlist, but all processes inherit the same ambient `TMPDIR`/`TEMP`/`TMP`. Tests that create private temporary stores therefore share one parent namespace. The current `gate:dev` run reproduced a cross-shard false failure in `reviewStore.test.ts`: an unrelated process changed the global temp directory between the test's before/after snapshots.

The change is local validation infrastructure. It must preserve shard receipt authority, the explicit child-process environment, proxy lease isolation, serial/exclusive execution, and ignored scratch cleanup.

## Goals / Non-Goals

**Goals:**
- Give every shard a distinct absolute OS temp directory.
- Make the mapping from run scratch root plus shard identity deterministic and traversal-safe.
- Prove actual Node `os.tmpdir()` behavior in child processes.
- Remove only the run-specific scratch root after execution.

**Non-Goals:**
- Change product runtime, source-intelligence, browser, proxy, or network authority.
- Repair the twelve independent live-source drift failures.
- Add a general global temp-store service or cleanup unrelated `/tmp` content.
- Change shard membership, weights, exclusivity, or execution receipts.

## Decisions

1. **Use the existing child-environment boundary, then overwrite platform temp keys with computed values.** `buildChildEnvironment` remains the parent allowlist; trusted `TMPDIR`, `TEMP`, and `TMP` are assigned only after that boundary. Inheriting ambient temp values would preserve the race.

2. **Create one run-unique scratch root under the repository's ignored `.tmp-nightwatch` area.** A `mkdtemp` root prevents concurrent validation-lane invocations from sharing shard directories. Each shard receives `<runRoot>/<validated-shard-id>`.

3. **Validate shard identity before path joining.** Only the runner's closed `shard-[1-8]`, `exclusive`, and `serial` identities are accepted. A malformed identity fails before a child process is launched.

4. **Test through Node process observation.** The regression spawns fresh Node processes with the generated environments and compares their actual `os.tmpdir()` values, rather than merely inspecting environment keys or source text.

5. **Clean only the run-specific root.** Cleanup is bounded to the `mkdtemp` directory created by the invocation. No broad temp cleanup is permitted.

## Risks / Trade-offs

- Per-shard temp directories can increase disk use because tests that already leak temporary data now remain isolated. This is preferable to cross-shard interference; the run-specific cleanup removes ordinary completion, while OS/provider scratch cleanup remains unchanged.
- Windows and Unix resolve temporary directories differently. Setting all three standard keys covers the supported local platforms and the process-level test runs on the current host.
- A hard process kill can leave an ignored run-specific scratch directory. The next invocation uses a new `mkdtemp` root and never adopts or deletes stale state.
