# Audit — W11 autonomous yield proof

Audited at `158a97b8feceb6abf4ea4ccbacab1f20cc46bc35` against live code, live
sibling checkouts, live provider availability and the live Group 12 wording.

## Live programme state

`.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/STATE.md` records
W0-W10 COMPLETE with no active wave, W9 terminal at `bb28480c`, W10 terminal at
implementation `62d23e26` / documentation `ec3eacf6`, and three parent-level
blockers: DEV/NEXT unauthorized, strict EXACT unproven, previously-unknown
Alphaus defect unproven. Live main has advanced well past the W10 anchor, so
W11 opens from `158a97b8` and does not resume W10.

`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
section 12 is entirely unchecked, 12.1 through 12.12.

## Provider availability

`opencode --version` reports 1.18.31 at `/home/dalepalaca/.opencode/bin/opencode`.
`opencode models` lists 341 entries. The W9/W10 provider
`opencode-go/omen-alpha` does NOT appear among them. A historical provider is
therefore historical evidence only, and a current provider must be selected
without letting observed quality drive the choice.

The agent runtime reaches a provider through `bin/nightwatch-reasoner-print.mjs`
(`NIGHTWATCH_PRINT_CLI` plus a `NIGHTWATCH_PRINT_ARGS` JSON argv template with
`__PROMPT__` substitution), which extracts a
`nightwatch.reasoner-turn-response.v1` document from the CLI's stdout. A
structured probe through that exact production path with
`opencode-go/glm-5.3` returned exit 0 in 16,281 ms with 137 B of stdout, 0 B of
stderr and a valid response carrying a well-formed `TERMINATE` intent.

## Repository and capability census

`createApprovedRealSourceScanConfig` projects eight admitted repositories from
`src/core/source/universe.ts`, reconciled against the change-intelligence map.
All eight resolve to CURRENT sibling checkouts whose live `git rev-parse HEAD`
equals the configured `expectedSourceSha`.

`buildReproductionCapabilityCensus` over the 4,124 eligible files classified by
`discoverOwnerLocalTarget` yields 1,120 executable files and 152 distinct
executable targets, none truncated. Refusals: `NO_SUPPORTED_EXECUTOR` 1620,
`PACKAGE_TEST_FILES_ABSENT` 1327, `VENDOR_DIRECTORY_ABSENT` 57.

Per repository, executable files and distinct targets are 0 everywhere except
`mobingilabs/ouchan`, which holds all 1,120 and all 152. This reproduces the
W10 M0 measurement and shows no regression — and it fixes the wave's honest
limit: investigation can span eight repositories, execution cannot.

## Historical corpus

`benchmarkFixtureCorpus()` returns 9 frozen fabricated cases;
`bench-negative-quiet-000` is the negative control.

`mineLocalGitHistory` over all eight repositories returns 255 records
(`alphauslabs/blue-sdk-go` 8, `alphauslabs/blueapi` 19,
`alphauslabs/blueinternal` 13, `alphauslabs/grpc-chunk-parser` 14,
`mobingilabs/ouchan` 57, `mobingilabs/ripple-api` 64, `mobingilabs/ripple-ui`
51, `mobingilabs/wave-api` 29). 234 yield a defined case through
`tryDefineMinedBenchmarkCase`. Exactly 5 carry both a non-empty
`knownFailingTest` and a `minedReplay`, which strict EXACT requires: four in
`mobingilabs/ouchan` (Go) and one in `mobingilabs/ripple-ui` (JavaScript).

The owner-private Bug Atlas snapshot at
`$HOME/.nightwatch/bug-atlas/bug-atlas-snapshot.json` does not exist, so the
bounded read-only miner is the corpus source, as the existing proof already
anticipates.

## Scoring

`src/core/benchmark/score.ts` defines strict EXACT as `testMatch` on the hidden
`knownFailingTest` AND `fileRecall >= BENCHMARK_EXACT_MIN_FILE_RECALL` (0.5)
AND `keywordRecall >= BENCHMARK_EXACT_MIN_KEYWORD_RECALL` (0.5), with
`PARTIAL_REDISCOVERY` and `SAME_ROOT_CAUSE_ALTERNATE` below it. These constants
are not modified by this change.

## Harness

`createHistoricalLocalInvestigationContext` supplies the leak-isolated
historical providers, `buildReasonerVisibleContext` builds the reasoner-visible
view that excludes hidden truth, and `runLocalCliCampaign` drives the ordinary
campaign loop with a real CLI reasoner — the same composition the existing
`realHistoricalProductPathProof` opt-in test uses with a deterministic scripted
reasoner. W11 substitutes the real configured provider and scores afterwards.

`nightwatch-agent campaign run --reasoner=cli --duration=... [--repository=...]`
is the ordinary product path for the unknown arm; `campaign resume --id=...`
carries the stored budget policy and fails closed on a widened scope.

## Workspace

`npm run session:status` reports `verdict=PASS`,
`WORKSPACE_INTEGRITY_SATISFIED`, canonical clean and safe. Five worktrees are
registered against a bound of eight, four of them pre-existing STALE_SESSION
worktrees owned by other tasks; W11 neither adopts nor removes any of them.
