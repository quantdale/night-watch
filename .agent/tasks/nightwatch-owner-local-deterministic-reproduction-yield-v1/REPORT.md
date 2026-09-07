# REPORT — nightwatch-owner-local-deterministic-reproduction-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W9 — OWNER-LOCAL DETERMINISTIC REPRODUCTION & YIELD

## Starting truth

W9 task creation started from `origin/main` at `8f385e5fd404bd694db516e0fe3be473f29380af`, a W8 documentation/state descendant. W8's validated implementation checkpoint remains `3d624fbcc42da808ce1c7e9cbc6b780b82d90820` until W9 earns a new implementation checkpoint. Live HEAD/workspace/session truth must always be rediscovered from Git and Nightwatch session tooling.

## Mission

Give supported current owner-local source a safe executable deterministic reproduction path, add explicit current-source proof semantics without weakening historical evidence, make failure retry/exhaustion semantics correct for executable providers, repair/calibrate byte accounting before changing HOUR_1 budgets, and run a truthful live-provider yield proof through the ordinary Nightwatch campaign path.

## Baseline accepted from W8

W8 is terminal and must not be reopened absent a concrete regression:

- bounded per-turn investigation memory through `reasoner-turn-request.v2`;
- bounded cross-investigation campaign strategy state;
- executor-confirmed source-target grounding;
- mechanical hypothesis lifecycle and reproduction readiness;
- fixed efficacy corpus with zero added false positives/leakage;
- live historical verified-root-cause rediscovery;
- mechanical finding admission;
- strict `EXACT_REDISCOVERY` unchanged at 0.

The accepted open gap is current owner-local reproduction: a grounded live hypothesis can become verification-ready, but the default real owner-local context has no executable reproduction provider, so the host correctly refuses reproduction/admission.

## Evidence ledger

### M0 diagnosis

- Live Git/session: canonical main was clean and 22 commits behind live `origin/main`; it was fast-forwarded to `2886a85e3b3ceeabd05f4e291dc9cbc47b0d0bd9`. Dedicated C-00 worktree `session/nightwatch-owner-local-determini-47add5e3` was created/claimed at that base.
- REAL_LOCAL reproduction gap: CONFIRMED. The ordinary CLI passes zero options to `createOwnerLocalInvestigationContext()`, which installs `unavailable-local-reproduction`; its `run()` returns `BLOCKED / NOT_CONFIGURED`, the tool session returns `ADAPTER_UNAVAILABLE`, no reproduction receipt exists, and `admitLocalFinding` returns `MISSING_REPRODUCTION`.
- Byte audit: CONFIRMED double counting. `AgentRuntime.runTurn` charged transport `stdoutBytes + stderrBytes`, then charged the validated `call.response` serialized from that same stdout. Tool output was also charged before the 16 KiB untrusted-envelope cap. HOUR_1 stayed at 2,000,000 output bytes pending repair/calibration.
- Exhaustion audit: CONFIRMED over-broad. Every executor `ok:false` collapsed to `TOOL_ERROR`, while `detectExhaustedAction` marked any matching `TOOL_ERROR` permanently exhausted. Transient file races, stale-HEAD reads and provider throws therefore became terminal. The validator also accepted model-supplied regex-shaped argument digests without recomputation.
- Offline class recon: Go 1.25.3 host + cached Go 1.25.8 toolchain; `mobingilabs/ouchan` vendors 418 modules. A 63 MiB disposable dependency/test closure ran with `GOPROXY=off`, `GOTOOLCHAIN=local`, `-mod=vendor`. `pkg/gcsv`'s pre-existing `TestGolangCsv` failed twice at the same `info_test.go:557` assertion (cold 53.3s, warm 2.2s). This is a candidate qualifying current-source failure, not a claim of previously unknown defect.

### M1 frozen contracts

- `nightwatch.owner-local-reproduction-target.v1`: only `GO_VENDORED_PACKAGE_TEST`; host-derived structured module/package/source identity; no command/env/executable input; hard materialization, execution, output, file, byte and repeat ceilings.
- `nightwatch.owner-local-current-source-proof.v1`: explicit `CURRENT_SOURCE_REPEATED_TEST_FAILURE`; only `PRE_EXISTING_REPOSITORY_TEST + TEST_ASSERTION_FAILURE + >=2 fresh identical fingerprints + siblingIdentityStable + networkDisabled` can qualify. Historical PRE_FAIL_POST_PASS remains distinct.
- Host-owned action disposition: `DETERMINISTIC_TERMINAL | ENVIRONMENT_BLOCKED | TRANSIENT_RETRYABLE`; transient budget fixed at 2.
- `nightwatch.agent-byte-ledger.v1`: request, memory, untrusted prompt, stdout, stderr, parsed response, tool result and tool envelope buckets; parsed response measured but not charged twice.
- Additive reasoner-visible readiness: no target, target blocked, ready, deterministic refusal, transient retry remaining, current failure reproduced, ran without reproduction.
- Validation after pinned local dependency install: W9 contract suite 6/6 PASS; `npm run typecheck` PASS.

### Intermediate failure

The first M1 checks ran before `node_modules` existed in the new worktree. `npx` used external/global tools: Playwright could not resolve `@playwright/test`; global TypeScript rejected the repository's legacy `moduleResolution=node10`. This was an environment/setup failure, not hidden. `npm ci --ignore-scripts` installed the lockfile-pinned dependencies; unchanged checks then passed.

## Truth constraints

Do not claim any of the following without direct evidence:

- a generic process failure is a bug;
- current-source reproduction is equivalent to historical PRE_FAIL_POST_PASS;
- a model-generated test proves an existing product contract by itself;
- a single flaky failure is a reproduced defect;
- previously unknown Alphaus bug discovery;
- strict EXACT rediscovery;
- DEV/NEXT/production proof;
- organizational approval;
- parent programme completion.

## Known design risks to investigate

1. Current `TOOL_ERROR` exhaustion may be too coarse once a provider has transient failures.
2. Current owner-local context may need a carefully bounded source-to-package target derivation rather than a broad executor.
3. Existing admission semantics are historically oriented; current-source proof must be additive and explicit.
4. W8 output-byte exhaustion may reflect legitimate traffic, double counting, prompt/memory amplification, or a combination. Measure before changing policy.
5. Supporting too many languages/package managers in one wave would increase unsafe command/dependency surface; prefer a conservative first class.

## Safety ledger

W9 starts with the same hard boundaries as W7/W8:

- LOCAL only;
- sibling repositories read-only;
- no arbitrary shell/Git/network/filesystem authority for the reasoner;
- no DEV/NEXT/production;
- no Slack/Leslie/Pondr/Notion/external filing;
- no credential/deployment changes;
- no force push/history rewrite/destructive recovery;
- all reproduction writes in disposable Nightwatch-owned state;
- no network dependency fetching to force tests to run.

Safety events: NONE at task creation.

## Programme verdict

`IN_PROGRESS` — W9 has been opened but implementation has not started. Parent programme remains independently IN_PROGRESS.
