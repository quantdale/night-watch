# REPORT — nightwatch-owner-local-deterministic-reproduction-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: COMPLETE
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

## Delivered

### Diagnosis and frozen contracts

- Confirmed the ordinary REAL_LOCAL path installed `unavailable-local-reproduction`, returned `BLOCKED / NOT_CONFIGURED`, minted no receipt and forced admission to `MISSING_REPRODUCTION`.
- Confirmed two accounting defects: successful provider response bytes were charged once as raw transport and again as parsed JSON; uncapped source/tool objects shared that same ceiling even though the prompt saw capped envelopes.
- Confirmed transient executor failures were collapsed to generic `TOOL_ERROR` and permanently exhausted; model-supplied argument digests could evade host retry accounting.
- Proved one narrow offline class viable: host-derived Go packages in approved repositories with already-local vendored/cached dependencies.
- Froze `nightwatch.owner-local-reproduction-target.v1`, `nightwatch.owner-local-current-source-proof.v1`, host-owned execution/disposition vocabulary, finite two-attempt transient policy, `nightwatch.agent-byte-ledger.v1`, and neutral owner-local readiness.

### Owner-local executable provider

One production path, no reasoner-selected command surface:

- target class: `GO_VENDORED_PACKAGE_TEST`;
- repository/module/package/source/toolchain facts derived by the host from approved current sibling source;
- fixed allowlisted cached Go toolchain; no ambient executable lookup;
- bounded `go list -deps -test` closure; byte/file/tree caps;
- materialization only into disposable Nightwatch-owned state;
- `spawn` argv arrays with `shell:false`;
- `GOPROXY=off`, `GOTOOLCHAIN=local`, `-mod=vendor`;
- `bwrap --unshare-net` process/network containment;
- hard action timeout, output cap and process-group termination;
- explicit PASS / TEST_FAILURE / BUILD_FAILURE / TIMEOUT / ENVIRONMENT_BLOCKED / PROCESS_FAILURE;
- sibling identity verified before and after every run;
- cleanup in `finally`.

Command, path, executable, environment, Git, network and sibling-write injection are rejected. Build/process/timeout/environment failures never mint defect credit.

### Current-source proof and admission

`CURRENT_SOURCE_REPEATED_TEST_FAILURE` is distinct from historical `PRE_FAIL_POST_PASS`. It requires a pre-existing repository test, `TEST_ASSERTION_FAILURE`, two fresh executions with the same normalized fingerprint, stable source/provenance/sibling identity, disabled network, and provider-bound Nightwatch minting. Model prose/counts, one flaky failure, generic nonzero exit, generated assertion, forged receipt/proof and unsupported target never qualify.

Historical W7/W8 behavior is unchanged. A qualifying current-source finding still has `humanReviewRequired=true` and external publication prohibited.

### Failure disposition and retry

The host alone assigns `DETERMINISTIC_TERMINAL`, `ENVIRONMENT_BLOCKED`, or `TRANSIENT_RETRYABLE`. Exact host-recomputed action digests receive at most two transient attempts. Deterministic refusals and environment blocks do not spin; independent digests retain independent budgets; resume cannot reset an exhausted digest. Reasoner-supplied retry labels and digests are inert.

### Byte accounting and calibration

Budget schema v2 separates provider transport from executor payload:

- charged input = legacy input + rendered request;
- charged transport = legacy output + provider stdout + provider stderr;
- charged payload = legacy payload + pre-envelope tool result;
- parsed response, memory/untrusted subsets, capped tool envelope and checkpoint document remain measured but are not charged twice.

A v1 mixed output total migrates once into v2 payload carry, with zero bytes dropped or duplicated. This slightly over-attributes historical transport but keeps valid tool-heavy pre-v2 checkpoints resumable; a permanent 3,000,000-byte legacy regression proves the case that would otherwise exceed the 160,000-byte transport ceiling before one new turn.

Calibrated HOUR_1 ceilings: 3,600,000 ms, 200 reasoner calls, 5,000,000 input B, 160,000 transport B, 64,000,000 tool-payload B, 400 tool actions. HOUR_4/HOUR_8/OVERNIGHT scale proportionally. Independent transport and payload runaway tests remain fail-closed.

## Real proof and measured yield

### Generic real owner-local execution

The generic provider discovered `mobingilabs/ouchan:pkg/almcreds/creds.go` at sibling HEAD `565f00a87fb7616cc23c45d4ffeabee38a41c65f`. Cached Go 1.25.8 ran the package twice in fresh disposable `bwrap --unshare-net` executions (11.1 s / 9.8 s). Both passed. Truthful receipt: `NOT_REPRODUCED`, `preFix=PASS`, `postFix=NOT_RUN`, `currentSourceProof=null`, `networkDisabled=true`, `siblingIdentityStable=true`; no temp residue and no sibling mutation.

The opt-in historical product-path proof also remained green: the known ouchan `5985281b43cd` case reproduced `PRE_FAIL_POST_PASS` and admitted through the ordinary campaign path. This does not change strict EXACT.

### Live subscribed reasoner

Initial pre-owner-switch campaign `w9-live-1` used `opencode-go/deepseek-v4-flash` and exposed the accounting category error: 2 investigations, 19 calls, 14 targets, 0 provider failures/candidates, 284.5 s, then old mixed `outputBytes` exhaustion while model transport was only 7,169 B and tool payload was 2,950,229 B. It is historical diagnostic evidence only.

When the owner replaced that model, the in-flight post-repair attempt was canceled immediately and produced no claimed result. The terminal endurance campaign used `opencode-go/omen-alpha`:

| Metric | Observed |
|---|---:|
| investigations started/completed | 7 / 7 |
| reasoner calls | 79 |
| tool actions | 56 |
| provider failures | 3 (2 timeout, 1 nonzero) |
| bounded provider retries | 3 |
| wall time | 3,673,995 ms |
| unique current-source targets | 26 |
| evidence refs | 27 |
| grounded / verification-ready hypotheses | 28 / 28 |
| reproduction attempts | 7 |
| reproduction outcomes | 7 `NOT_AVAILABLE`; 0 qualifying |
| deterministic no-target refusals | 7 |
| reproduction transient retries | 0 |
| candidates | 1 |
| findings admitted / refused | 0 / 1 (`MISSING_REPRODUCTION`) |
| inner terminations | 2 `COMPLETE_NO_FINDING`; 5 `NO_PROGRESS` |
| outer termination | `BUDGET_EXHAUSTED` on HOUR_1 wall time |

Byte ledger:

| Component | Bytes |
|---|---:|
| rendered input | 1,112,083 |
| memory contribution | 435,205 |
| untrusted contribution | 573,362 |
| provider response | 51,720 |
| provider stderr | 113 |
| parsed reasoner output | 54,724 |
| tool result | 10,661,051 |
| capped tool envelope | 608,658 |
| checkpoint document | 40,584 |

Charged terminal usage: input 1,112,083 / 5,000,000; transport 51,833 / 160,000; payload 10,661,051 / 64,000,000; calls 79 / 200; actions 56 / 400. Only wall time bound the run (3,673,995 / 3,600,000 ms; the bounded in-flight call completed before termination). The former unexplained early byte termination is repaired.

No qualifying defect was found. Zero admissions is legitimate; the candidate without reproduction was refused. No claim is made that any hypothesis is a previously unknown Alphaus defect.

## Validation

Validated implementation and substantive checkpoint: `bb28480c6a6969a06744c75c4c947851d5bece7c`, integrated to `origin/main`.

- post-reconcile full unit suite: 4531 passed / 16 skipped / 0 failed;
- focused W9 + W7/W8 regression matrix: 295 passed / 3 skipped / 0 failed;
- full `npm test`: 4565 passed / 16 skipped / 0 failed;
- `npm run typecheck`: PASS;
- hardening, agent continuity/audit, planner handoff, project truth, workspace and session checks: PASS (expected advisory warnings only);
- `gate:local`: all 11 groups PASS, `receipt:sha256:6fb76272f121ec1bed5b74bf`;
- fresh Node 20 `gate:clean`: install PASS, no reused `node_modules`, source clean before/after, `siblingWrites=0`, all groups PASS, `clean-receipt:sha256:d914db277a583699a1ff68c3`;
- opt-in real current owner-local proof: PASS;
- opt-in real historical ouchan product-path proof: PASS.

Intermediate failures were retained in STATE: missing local dependencies before `npm ci`; lane reconciliation defects; old mixed-byte campaign exhaustion; two self-caught Lane-D edit drops; incorrect first-pass v1 migration that would strand tool-heavy old checkpoints; owner-directed cancellation of the superseded model run.

## Safety and non-claims

- LOCAL only; production/DEV/NEXT contact: 0.
- External filing/Slack/Leslie/Pondr/Notion: 0.
- Credential/deployment changes: 0.
- Sibling writes: 0.
- Force push/history rewrite/destructive recovery: 0.
- Arbitrary reasoner shell/Git/network/filesystem authority: 0.
- Historical `PRE_FAIL_POST_PASS`, leakage controls, scoring and strict EXACT thresholds were not weakened.
- Strict `EXACT_REDISCOVERY`: still 0 / unproven.
- Previously unknown Alphaus defect: not proven.
- Organizational approval: not claimed.
- Parent programme: remains `IN_PROGRESS` / PARTIAL.

## Programme verdict

`W9_COMPLETE_LOCAL_NOT_CI_VERIFIED`.

The bounded owner-local reproduction capability and live yield path are proven and certified locally. W9 is terminal. Parent completion and any successor live/DEV wave require separate criteria and authorization.
