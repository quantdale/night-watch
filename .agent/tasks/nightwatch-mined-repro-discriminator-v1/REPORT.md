# REPORT — nightwatch-mined-repro-discriminator-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: COMPLETE
Next: terminal — await orchestrator review and integration. Do NOT push to
`main`; do NOT run `nightwatch-session integrate`.

## What was implemented

Mined historical benchmark cases now get a REAL, mechanically-proven
reproduction through `RERUN_SAFE_REPRODUCTION` (previously permanent
`NOT_AVAILABLE` → `reproductionCount = 0` for all mined cases).

- `src/core/benchmark/containedTestReplay.ts` (new): contained replay
  engine. Materializes two temp trees under `os.tmpdir()` with read-only
  git plumbing only (`rev-parse`, `ls-tree`, `show`, one batched
  `cat-file` process per tree; `shell: false`, bounded timeouts), overlays
  the fix-added test file onto the pre-fix tree, runs one Go package per
  tree offline (`GOFLAGS=-mod=vendor`, `GOPROXY=off`, `GOSUMDB=off`,
  `GOTOOLCHAIN=local`, `GOCACHE`/`HOME` inside the temp dir,
  `GOMODCACHE` read-mostly), hard timeout with process-group kill, capped
  output, temp trees removed in `finally`. Verdicts: `REPRODUCED` (pre
  FAIL + post PASS — the only reproduction), `NOT_REPRODUCED` (pre
  passes), `INCONCLUSIVE` (both fail / post blocked / timeout),
  `ENVIRONMENT_BLOCKED` (pre could not execute). A zero-exit run that
  executed no tests is `BLOCKED`, never a pass.
- Toolchain selection (same file): explicit `goBinary` wins; else the
  system toolchain when it satisfies the tree's `go.mod`, else the lowest
  satisfying cached `golang.org/toolchain` (offline directory scan, never
  a download); unsatisfiable requirements fail honestly inside the run.
- `case.ts`: `DefinedBenchmarkCase`/`BenchmarkCaseInput` carry hidden-only
  `minedReplay` (validated, frozen; malformed → throw; its secrets are
  re-proven absent from visible blobs at definition time).
- `minedCases.ts`: builds the descriptor from the isolated
  `knownFailingTest` (null when no added test survived isolation).
- `hunt.ts`: `RERUN_SAFE_REPRODUCTION` runs the replay when no visible
  discriminator exists (visible discriminators keep strict precedence);
  verdict mapping `REPRODUCED→REPRODUCED`,
  `NOT_REPRODUCED/INCONCLUSIVE→NOT_REPRODUCED`,
  `ENVIRONMENT_BLOCKED→NOT_AVAILABLE`; harness-side `MinedReplayAudit`
  on the result; `ports.minedReplay` seam (tests/harness) for
  `runReplay`/`repositoriesRoot` overrides.
- `huntDossier.ts`: neutral mined-replay dossier (case id + fixed-template
  observation only). `index.ts`: barrel exports.

## Leak rule

The reasoner-visible tool result carries ONLY the fixed-template neutral
observation `{"harness":"nightwatch.mined-test-replay.v1","replay":…}`
plus the frozen verdict token. Test file name, test source, fix diff, fix
commit message, and assertion text can NEVER reach reasoner context,
`untrusted[]`, evidence refs, candidate text, or prompts — structurally
(the template has no secret slots), not by convention. The truncated
stderr head is harness-side audit material only (`MinedReplayAudit`,
never forwarded). New test proves it: a hunt with canaries in BOTH the
fixture test file and the injected replay stderr still shows zero canary/
test-path/SHA bytes in any recorded reasoner request, while the audit
retains them. All pre-existing leak assertions pass unchanged.

## Anti-inflation rule

A replay executes ONLY for a candidate/hypothesis that already names at
least one real pre-fix snapshot file: the hunt's grounding gate scores
live hypotheses + candidate ids with `scoreBenchmarkCandidate` (same
`fileHits` semantics as the scorer) against the visible snapshot files
and returns `NOT_AVAILABLE` — without running anything — when
`fileHits == 0`. Ungrounded `RERUN` mints no credit (`reproductionCount`
unchanged, audit `GATE_REFUSED_NO_FILE_GROUNDING`, covered by test).

## Real verdict (mobingilabs/ouchan @ 5985281b43cd)

- Command: `npx playwright test tests/unit/zzOuchanRealReplay.scratch.test.ts
  --project=nightwatch --workers=1` (temporary scratch spec driving
  `runContainedTestReplay`
  with the real repo path / fix SHA / added test path / package dir;
  deleted after the run, never committed).
- First run: `INCONCLUSIVE` — exposed that `git archive` silently drops
  `go.mod`/`go.sum`/`pkg/`/`services/` via in-tree `export-ignore`
  (verified against `.gitattributes`). Mechanism switched to faithful
  blob-by-blob `show` materialization (regression test added).
- Second run: `ENVIRONMENT_BLOCKED/PRE_BUILD_OR_VENDOR_ERROR` —
  `go.mod requires go >= 1.25.8 (running go 1.25.3; GOTOOLCHAIN=local)`.
  Added offline cached-toolchain selection (direct execution of the
  machine's cached `go1.25.8`; `GOTOOLCHAIN=local`, `GOPROXY=off`:
  no network possible).
- Final run: **`REPRODUCED` / `PRE_FAIL_POST_PASS`, wall 73 s**
  (`durationMs` 71768): pre-fix tree `FAIL/TESTS_FAILED` exit 1,
  post-fix tree `PASS/TESTS_PASSED` exit 0, no timeouts, no skipped
  submodules. Go routed the failure marker to stdout, so the retained
  stderr head is empty; the verdict rests on exit codes plus the
  `--- FAIL:` test-failure marker (build/vendor markers absent).
- Sibling proven unmutated: pre/post snapshots of `git status
  --porcelain` (72 pre-existing user lines), `git worktree list`
  (1 entry), and `git rev-parse HEAD` (`565f00a87f…`) all diff
  IDENTICAL. The engine never writes inside the sibling (only
  `rev-parse`/`ls-tree`/`show`/`cat-file` reads; all writes under
  `os.tmpdir()`, removed in `finally`).

## Validation (exact commands, all in the worktree)

- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS (`offline structural invariants hold`).
- `npx playwright test tests/unit/containedTestReplay.test.ts
  tests/unit/benchmark.test.ts tests/unit/minedCases.test.ts
  tests/unit/historicalRediscovery.test.ts --project=nightwatch --workers=1`
  — 53/53 PASS (21 new: verdict branches, batch materialization incl.
  export-ignore regression, toolchain selection, timeout kill via
  fake-`go`, cleanup, sibling-identity, classification, parser incl.
  absolute-path rejection, scrubbing, executor mapping, hunt-level leak +
  grounding-gate tests — all offline on fabricated fixtures; 32
  pre-existing, none deleted or weakened).
- Toolchain note: the worktree's `node_modules/` was an empty dir with
  only a `.cache` stub (offline env), so the exact acceptance commands
  could not resolve until it was symlinked to the canonical checkout's
  `node_modules` (gitignored, read-only use). Restored as-found before
  commit. Side effect: the canonical checkout's gitignored
  `node_modules/.cache/nightwatch-typecheck.tsbuildinfo` was refreshed by
  those typecheck runs (regenerable build cache; canonical `git status`
  verified clean).

## What could not be done / dependencies

- None outstanding in-lane. `Pondr` TS replay stays offline-blocked by
  design (no `node_modules`, no install offline) — untouched as tasked.
- Out-of-scope observation (not acted on): ouchan go.mod declares
  `go 1.25.8` while the box toolchain is go1.25.3; replay depends on the
  machine's cached toolchain for such repos (documented, honest
  `ENVIRONMENT_BLOCKED` otherwise).

## Blockers

None.
