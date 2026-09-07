# PLAN — nightwatch-owner-local-deterministic-reproduction-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-owner-local-deterministic-reproduction-yield-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W9 — OWNER-LOCAL DETERMINISTIC REPRODUCTION & YIELD
Planned-From: 8f385e5fd404bd694db516e0fe3be473f29380af
Live HEAD authority: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Purpose

Close the next LOCAL-only gap after W8: a grounded hypothesis against current owner-local source can become verification-ready, but the default real owner-local context still has no executable reproduction provider. Add a conservative deterministic current-source reproduction capability, distinguish deterministic from transient failures, audit/fix byte accounting before changing budgets, then measure real live yield without fabricating a defect.

## Sequencing rule

Do not parallelize implementation until M1 freezes the shared W9 target/receipt/failure-disposition contracts. Global task/programme/current-state/OpenSpec files stay orchestrator-owned. Every writing worker uses its own C-00 session worktree and is a leaf executor.

## Milestones

### M0 — Live truth, reproduction-gap proof, byte baseline

Objective:

- rediscover live HEAD/origin/main, canonical/session/worktree truth and current provider routing;
- verify W8 is terminal and no W9 implementation already exists;
- reproduce the owner-local `NOT_CONFIGURED` reproduction behavior through the normal path;
- capture live `outputBytes` accounting and determine where W8's 1.8-2.9 MB came from;
- verify/disprove suspected response-byte double counting and exhausted-action overbreadth.

Required evidence:

- exact Git/workspace/session state;
- focused reproduction of blocked REAL_LOCAL replay;
- byte ledger from a bounded deterministic/live campaign;
- source references showing current failure semantics.

Status: COMPLETE — live Git/session/provider truth re-established; zero-argument REAL_LOCAL campaign wiring was traced to the `NOT_CONFIGURED` reproduction provider; successful reasoner responses were proved double-charged (raw stdout plus parsed-response serialization); untruncated tool payloads were proved charged beyond the capped reasoner envelope; generic `TOOL_ERROR` exhaustion was proved to collapse transient provider/filesystem failures; and an offline vendored Go class was proved viable on `mobingilabs/ouchan` using the cached Go 1.25.8 toolchain.

### M1 — Freeze W9 shared contracts

Objective:

Freeze additive/versioned contracts before worker lanes write implementation.

At minimum decide and test the shapes/semantics for:

- owner-local executable reproduction target descriptor;
- current-source reproduction receipt/proof kind distinct from historical `PRE_FAIL_POST_PASS`;
- reproduction outcome/failure classes;
- deterministic / environment-blocked / transient retry disposition;
- any byte-accounting ledger fields;
- neutral reasoner-visible owner-local reproduction readiness.

Acceptance:

- contract tests PASS;
- no authority broadening;
- historical W7/W8 receipt/admission behavior remains compatible.

Status: COMPLETE — `nightwatch.owner-local-reproduction-target.v1`, `nightwatch.owner-local-current-source-proof.v1`, explicit execution/failure classes, host-owned failure dispositions with a two-attempt transient budget, `nightwatch.agent-byte-ledger.v1`, and additive owner-local readiness states frozen. Six pure contract tests and TypeScript typecheck pass.

### M2 — Owner-local target discovery + disposable execution

Objective:

Implement the first conservative real owner-local executable class, preferring offline Go packages when live recon supports that choice.

Requirements:

- host-derived target; no arbitrary model command;
- read-only sibling source;
- disposable execution tree;
- no dependency/network fetches;
- toolchain allowlist/prerequisite validation;
- hard timeout/output/process-tree bounds;
- explicit test/build/environment/process classifications;
- cleanup in `finally`;
- sibling identity assertions.

Suggested worker lane after M1: target discovery/provider.

Status: NOT_STARTED

### M3 — Current-source proof semantics + admission

Objective:

Add an explicit qualifying proof path for current owner-local failures without pretending a post-fix revision exists.

Requirements:

- current-source proof kind distinct from historical replay;
- strong anti-inflation and repeatability requirements;
- generic nonzero/build/environment failures never qualify;
- evidence/source/provenance linked mechanically;
- forged model counts/receipts/proof kinds refused;
- historical admission behavior preserved.

Suggested worker lane after M1: receipt/admission.

Status: NOT_STARTED

### M4 — Failure disposition + bounded retry semantics

Objective:

Make exhausted-action behavior correct for executable providers.

Required distinctions:

- deterministic terminal/refusal;
- environment blocked;
- transient/retryable;
- success/non-reproduction.

Requirements:

- reasoner cannot self-label disposition;
- deterministic failure identical fingerprint does not execute repeatedly;
- transient failure gets a strict finite retry budget and cannot retry forever;
- context/argument changes create a new admissible fingerprint as justified.

Suggested worker lane after M1: failure/retry.

Status: NOT_STARTED

### M5 — Byte accounting and evidence-based budget calibration

Objective:

Explain and repair W8's premature `outputBytes` exhaustion before changing the ceiling.

Work:

- add component byte accounting;
- identify double counting or serialization amplification;
- add regression tests for accounting invariants;
- reduce avoidable request/prompt/memory/tool duplication where safe;
- only then adjust HOUR_1 output budget if measured legitimate traffic requires it;
- prove runaway output remains bounded.

Suggested worker lane after M1: budget accounting.

Status: NOT_STARTED

### M6 — Owner-local readiness/memory integration

Objective:

Expose neutral current-source reproduction readiness through existing W8 bounded memory without reopening the memory architecture.

Reasoner-visible states should distinguish no target, target blocked, ready, deterministic refusal, transient failure with retry remaining, reproduced current failure, and not reproduced.

No commands, absolute paths, secrets, raw audit, or hidden historical truth become reasoner-visible.

Status: NOT_STARTED

### M7 — Fixed provider/retry/admission corpus + integration review

Objective:

Prove the W9 architecture on fabricated/disposable positive, negative, blocked, timeout, build-failure, transient and adversarial cases.

Required:

- supported offline target executes;
- stable qualifying current-source failure can earn only the explicit proof kind;
- passing/build/timeout/environment outcomes mint no credit;
- deterministic/transient retry behavior correct;
- command/path/env injection refused;
- sibling integrity preserved;
- negative controls safe;
- historical W7/W8 suites remain green.

Orchestrator must inspect every delegated diff and rerun acceptance suites after reconciliation before integration.

Status: NOT_STARTED

### M8 — Real owner-local + live-provider yield proof

Objective:

Exercise the real provider through the same normal campaign path used by operators.

Required runs:

1. deterministic real owner-local provider proof on at least one supported package already available locally;
2. live subscribed CLI reasoner campaign using the owner-local reproduction provider;
3. post-accounting bounded endurance run demonstrating that legitimate traffic no longer hits an unexplained artificial byte ceiling prematurely.

Record:

- provider/model;
- package/target class (without leaking secrets);
- wall time;
- byte breakdown;
- reasoner calls/tool actions/provider failures;
- unique targets/grounded hypotheses/reproduction attempts;
- candidates/admissions;
- exact termination reason;
- sibling identity before/after.

A no-new-defect result is valid. A candidate without qualifying reproduction must still be refused.

Status: NOT_STARTED

### M9 — Full certification and truthful closeout

Required before W9 COMPLETE:

- all focused W9 suites PASS;
- W7/W8 provider/reproduction/admission/memory/efficacy suites PASS;
- opt-in real historical ouchan proof PASS when prerequisites remain available;
- `npm run typecheck` PASS;
- `npm run hardening:check` PASS;
- `npm run agent:check` PASS;
- `npm run handoff:check` PASS;
- `npm run project:check` PASS;
- `npm run workspace:check` PASS;
- `npm run session:check` PASS or current authoritative equivalent;
- full `npm test` PASS without unexplained regression;
- `npm run gate:local` FULL PASS;
- `npm run gate:clean` PASS on a fresh Node 20 clone with no reused node_modules;
- task/parent state updated from observed evidence only.

Status: NOT_STARTED

## Suggested post-freeze lane ownership

### Lane A — Target discovery/provider

Own only the new owner-local reproduction target/provider implementation plus its focused tests. Do not modify admission/failure/budget semantics unless reassigned.

### Lane B — Receipt/admission

Own current-source proof receipt/admission changes and focused tests. Preserve historical semantics.

### Lane C — Failure/retry

Own failure-disposition/exhausted-action/retry changes and tests.

### Lane D — Budget accounting

Own byte-accounting instrumentation/policy calibration and focused tests.

### Lane E — Adversarial/live proof

Own fabricated corpus/opt-in real proof tests where paths do not overlap implementation lanes.

The orchestrator owns shared interfaces, runtime integration seams, programme/task docs, integration, final live runs, and certification.

## Measurement discipline

Do not call W9 successful because runs last longer or use more calls. Measure:

- executable target discovery coverage;
- reproduction readiness rate;
- qualifying vs refused reproduction attempts;
- deterministic repeat suppression;
- transient retry counts;
- current-source reproduced failures;
- admitted vs refused candidates;
- false positives;
- byte cost per reasoner turn/tool action/candidate;
- termination reason distribution;
- sibling mutation count;
- leakage count.

Report metrics that worsen.

## Completion rule

Do not stop at planning, interface freeze, one provider, one fixture, one successful reproduction, or one live run. Continue through M9 unless a genuine external/manual blocker prevents further authorized work. Provider quota is not permission to skip deterministic/local work.
