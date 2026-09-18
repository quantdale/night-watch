# W11 — Autonomous yield proof (strict rediscovery + previously-unknown owner-local yield)

## Task purpose

Use the mature W7-W10 Nightwatch stack to answer two questions with evidence,
and to close Production Completion Group 12:

1. Can Nightwatch achieve strict historical `EXACT_REDISCOVERY` under
   leak-free conditions?
2. Can Nightwatch discover and mechanically admit a previously unknown defect
   from the current owner-local source universe without fabrication?

This is an EXECUTION + MEASUREMENT campaign. It exercises the existing system;
it does not rewrite it. A zero-yield answer is acceptable. A fabricated defect
is not.

## Established starting state

- Task ID: `nightwatch-autonomous-yield-proof-w11-v1`
- Parent programme: `nightwatch-autonomous-bug-hunting-programme-v1` (W0-W10
  COMPLETE, no wave active)
- Starting SHA: `158a97b8feceb6abf4ea4ccbacab1f20cc46bc35`
- Session worktree: `session/nightwatch-autonomous-yield-proo-72d452ea`
- Production-completion target: Group 12 — Autonomous yield proof (12.1-12.12)
- Owner authorization: the W11 execution prompt, satisfying 12.3 once this
  wave exists and is routed truthfully.

Accepted W7-W10 architecture is preserved and NOT rediscovered: real
owner-local sensing, bounded investigation memory, `GO_VENDORED_PACKAGE_TEST`,
disposable `bwrap --unshare-net` materialization,
`CURRENT_SOURCE_REPEATED_TEST_FAILURE`, mechanical admission, separated
transport/tool-payload byte accounting, capability projection, host-owned
`--repository` scope.

### M0 measured preflight (recorded before any evaluation result)

Toolchain: Node v22.22.1, Go 1.25.3, Git 2.43.0, bubblewrap 0.9.0,
opencode CLI 1.18.31 at `/home/dalepalaca/.opencode/bin/opencode`.

Repository census — all 8 admitted repositories CURRENT, every live checkout
SHA equal to its `expectedSourceSha`:

| Repository | Live SHA | Eligible files | Executable files | Distinct targets |
|---|---|---:|---:|---:|
| `alphauslabs/blue-sdk-go` | `8883ee3d` | 57 | 0 | 0 |
| `alphauslabs/blueapi` | CURRENT | 16 | 0 | 0 |
| `alphauslabs/blueinternal` | CURRENT | 1 | 0 | 0 |
| `alphauslabs/grpc-chunk-parser` | CURRENT | 1 | 0 | 0 |
| `mobingilabs/ouchan` | CURRENT | 2638 | 1120 | 152 |
| `mobingilabs/ripple-api` | CURRENT | 110 | 0 | 0 |
| `mobingilabs/ripple-ui` | CURRENT | 1245 | 0 | 0 |
| `mobingilabs/wave-api` | CURRENT | 56 | 0 | 0 |

Totals: 4,124 eligible source files, 1,120 executable, 152 distinct executable
targets, census not truncated. Refusal distribution:
`NO_SUPPORTED_EXECUTOR` 1620, `PACKAGE_TEST_FILES_ABSENT` 1327,
`VENDOR_DIRECTORY_ABSENT` 57.

This reproduces the W10 M0 figure (1,120 executable / 152 targets) and proves
no regression. It also fixes the structural limit W11 must state honestly:
**deterministic reproduction capability exists in exactly ONE of the eight
admitted repositories.** Investigation breadth is 8 repositories; execution
breadth is 1.

Provider preflight. The historical W9/W10 provider `opencode-go/omen-alpha` is
CONFIRMED ABSENT from the current 341-entry model list. The selection rule was
declared BEFORE any probe was run: the primary provider is the FIRST model in a
fixed a-priori preference list that passes one minimal structured probe through
the production print adapter; first pass wins; no score comparison. List:
`opencode-go/omen-alpha`, `opencode-go/glm-5.3`, `opencode-go/kimi-k3`,
`opencode-go/qwen3.8-max`, `opencode-go/minimax-m3`.

Result: #1 absent; #2 `opencode-go/glm-5.3` PASSED — exit 0, 16,281 ms, 137 B
stdout, 0 B stderr, valid `nightwatch.reasoner-turn-response.v1` with a
well-formed `TERMINATE` intent. Preferences #3-#5 were NOT probed and NOT
evaluated, so no provider comparison could contaminate the measurement.

**Primary provider frozen: `opencode-go/glm-5.3`.**

Historical corpus census:

- Frozen fabricated fixture corpus `benchmarkFixtureCorpus()`: 9 cases, of
  which `bench-negative-quiet-000` is a negative control (8 substantive).
- Real mined corpus from `mineLocalGitHistory` over all 8 repositories: 255
  records, 234 definable cases, of which exactly **5** carry both a non-empty
  `knownFailingTest` and a `minedReplay` and are therefore eligible for strict
  `EXACT_REDISCOVERY` (4 `mobingilabs/ouchan` Go, 1 `mobingilabs/ripple-ui` JS).

Strict EXACT is unchanged and NOT weakened: `scoreBenchmarkCandidate` requires
`testMatch` on the hidden `knownFailingTest` AND `fileRecall >= 0.5` AND
`keywordRecall >= 0.5`. A near match records its distance and never promotes.

## Required deliverables

- A frozen, committed evaluation definition (provider, corpus membership,
  negative controls, budgets, scoring, leakage and admission rules) recorded at
  a committed SHA BEFORE the first provider evaluation.
- A strict historical `EXACT_REDISCOVERY` run with per-case disposition and
  reason, negative controls included, `ENVIRONMENT_BLOCKED` excluded from both
  numerator and denominator and reported separately.
- A frozen previously-unknown-defect campaign definition (repository set,
  SHAs, budget, stopping condition) committed before execution, whose widened
  resume fails closed.
- Live owner-local campaign execution across a materially wider slice of the
  admitted repositories under host-owned `--repository` scope.
- Mechanically derived yield accounting with every denominator stated.
- A leakage and anti-cheating audit with live canaries, gating publication.
- Adversarial/resilience proofs of the W7-W10 invariants.
- Group 12 tasks 12.1-12.12 truthfully closed, governed surfaces updated, full
  validation, integration and release.

## Explicit non-goals

- Rewriting reasoning memory, provider wrappers, UI, or W7-W10 architecture.
- Infrastructure hardening for its own sake.
- Any DEV / NEXT / production contact, authenticated runtime use, or
  data-plane access.
- Producing a non-zero yield. Zero is an acceptable, complete result.

## Safety constraints

- LOCAL / OWNER-LOCAL only. No Alphaus DEV, NEXT or production contact; no
  database or data-plane access; no browser journeys against real environments.
- Sibling repositories are READ ONLY. No writes, no checkout, no fetch, no
  dependency installation, no execution outside the admitted contained
  reproduction path. Sibling identity is checked before and after.
- Provider network egress ONLY through the existing configured reasoner CLI.
  That is not authorization for Nightwatch or product traffic to Alphaus.
- No Slack / Leslie / Pondr / Notion writes, no issue or PR creation, no
  external publication.
- No force push, no history rewrite, no weakening of admission criteria, no
  growing an exemption list to pass.
- Hidden historical ground truth must never reach the reasoner. Leakage aborts
  yield publication.
- C-00: one writing agent == one worktree == one session identity.

## Declared Deletions

None.

## Acceptance criteria

- Provider and repository preflight frozen and passed against a non-vacuous
  threshold recorded before execution.
- Evaluation definition committed before the first evaluation; a widened
  resume fails closed.
- Strict historical EXACT run complete with per-case disposition; EXACT
  definition unweakened; near matches never promoted.
- `ENVIRONMENT_BLOCKED` excluded from both numerator and denominator and
  reported separately.
- Leakage = 0, proven by live canaries; false positives explicit.
- Unknown-yield campaign definition frozen before execution; broad owner-local
  execution performed; admission only through the existing mechanical path;
  `MISSING_REPRODUCTION` preserved.
- Yield metrics derived mechanically, every denominator stated.
- Any "previously unknown" claim is evidence-bounded
  (`NEW_TO_NIGHTWATCH` / `ALREADY_IN_HISTORICAL_CORPUS` / `CANNOT_DETERMINE`);
  `PREVIOUSLY_UNKNOWN_ALPHAUS_BUG` is not claimed without supporting evidence.
- Group 12 12.1-12.12 truthfully closed; `gate:local` PASS; `npm test` PASS;
  OpenSpec strict validation PASS; `gate:clean` PASS or honestly recorded as
  unavailable; integrated with `HEAD == origin/main`; session released.
