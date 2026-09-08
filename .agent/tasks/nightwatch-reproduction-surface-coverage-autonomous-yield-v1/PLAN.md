# PLAN — nightwatch-reproduction-surface-coverage-autonomous-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
PROJECT_VERDICT_EFFECT: PRESERVE
Task: nightwatch-reproduction-surface-coverage-autonomous-yield-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W10 — REPRODUCTION SURFACE COVERAGE & AUTONOMOUS YIELD
Planned-From: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
Live HEAD authority: GIT

## Purpose

Turn W9's proven-but-narrow current-source reproduction path into a measurable reproduction-surface capability that the autonomous reasoner can use intelligently, then exercise it in long live campaigns without weakening the evidence model.

W9 reference to preserve:

- final provider: `opencode-go/omen-alpha`;
- 3,673,995 ms wall time;
- 7 investigations;
- 79 reasoner calls;
- 56 tool actions;
- 26 unique source targets;
- 28 grounded/verification-ready hypotheses;
- 7 reproduction attempts;
- 7 `NOT_AVAILABLE`;
- 1 candidate;
- 0 admissions / 1 `MISSING_REPRODUCTION` refusal;
- byte ceilings retained large headroom;
- outer stop: HOUR_1 wall-time budget.

The W10 goal is not to spend more time. It is to increase the fraction of useful verification work that reaches an executable deterministic reproduction target while preserving zero fabricated credit.

## Execution model

The top-level frontier session is the orchestrator/reviewer.

After M1 freezes shared contracts, delegate independent lanes into separate C-00 session worktrees. Keep leaf workers non-overlapping and do not allow them to integrate themselves.

The orchestrator owns:

- live truth/recon;
- shared interface decisions;
- go/no-go on executor expansion;
- parent/task continuity;
- lane reconciliation/integration;
- final live campaigns;
- certification and final claims.

## Milestones

### M0 — Live truth, W9 replay, reproduction-capability baseline

Objectives:

1. Discover current HEAD/origin/main, worktrees, session claims and cleanliness.
2. Read W9 terminal STATE/REPORT and the live provider/contracts/session/runtime/memory code.
3. Re-run or independently inspect W9 focused proofs before modifying implementation.
4. Build a one-off bounded diagnostic census of the current owner-approved universe using existing target discovery, recording aggregate refusal classes.
5. Confirm exactly why the W9 Omen campaign's 7 reproduction attempts returned `NOT_AVAILABLE`.
6. Confirm whether a reasoner can know target executability before issuing reproduction.
7. Inventory local toolchains/caches/dependency state needed for a safe second Go class.
8. Investigate whether any non-Go approved repo has a direct local test runner that could satisfy the W10 safety bar; do not implement yet.

Acceptance:

- baseline aggregate census captured;
- W9 compatibility suites still green;
- H1-H5 in SPEC recorded as CONFIRMED / DISPROVED / PARTIAL with evidence;
- no implementation lane started before this closes.

Status: COMPLETE — bounded census and initiating-hypothesis verdicts are recorded in `M0-CENSUS.md`; W9's 7/7 refusal cause was mechanically isolated to the repository-major 32-entry prefix.

### M1 — Freeze shared reproduction-surface contracts

Freeze additive/versioned contracts before parallel writes.

Expected concepts:

- reproduction capability/refusal taxonomy;
- `ReproductionSurfaceMap` or equivalent bounded reasoner-visible model;
- target capability metrics;
- optional new Go executor class contract;
- sanitized current-failure evidence contract;
- before/after W10 yield metrics.

Requirements:

- schema versions explicit;
- no command/argv/absolute path fields reasoner-visible;
- deterministic ordering/caps;
- W9 target/proof/retry/byte contracts remain backwards compatible;
- malicious/oversize inputs fail closed;
- contract tests pass before worker dispatch.

Orchestrator decision gate at end of M1:

- GO for local-cache Go class only if live census proves meaningful reachable coverage and threat model is acceptable;
- GO for one non-Go class only if its direct runner satisfies the SPEC; otherwise record NO-GO and do not delegate it.

Status: COMPLETE — additive surface, census, yield and current-failure evidence contracts were frozen and contract-tested before independent lanes started.

### M2 — Reproduction capability census lane

Implement deterministic reusable census logic over approved current source.

Deliver:

- host-side per-source/per-target classification;
- target deduplication;
- bounded aggregate report;
- per-repository/language refusal distribution;
- executable target counts;
- tests for stale source, missing repo, missing tests, vendor absence, unsupported language, toolchain absence, malformed input, duplicate packages;
- no sibling writes/network.

Keep raw machine-specific detail owner-private when needed.

Status: COMPLETE — deterministic reusable aggregate classification, refusal taxonomy and target deduplication are implemented with seven adversarial tests.

### M3 — Reproduction surface map + memory/campaign integration

Integrate bounded neutral capability facts into stateless reasoner turns and cross-investigation strategy.

Deliver:

- target/source readiness available before reproduction;
- neutral refusal reason available for unsupported target;
- prior unsupported/executable attempts remembered;
- campaign-level capability-aware target diversity;
- deliberate exploration of unsupported sources remains possible;
- duplicate deterministic unsupported reproduction attempts avoided;
- no authority added.

Tests:

- memory caps/truncation;
- injection inertia;
- hidden historical leakage exclusion;
- campaign resume retains capability knowledge;
- unsupported target cannot self-upgrade;
- executable target cannot be minted from model fields.

Status: COMPLETE — capability is visible before reproduction, carried in memory and campaign strategy v2, bounded and fail-closed; the live-discovered cross-investigation carry defect is repaired and regression-covered.

### M4 — Safe Go coverage expansion

Execute only if M1 go/no-go permits.

Primary candidate: host-derived Go package test using complete already-local module cache rather than requiring `vendor/`.

Deliver:

- target discovery class distinct from W9 vendor class;
- preflight proving dependency closure is local before advertising `EXECUTABLE_NOW`;
- read-only module cache inside no-network sandbox;
- fixed allowlisted Go toolchain;
- fixed `go test` argv;
- disposable source/cache/home;
- two fresh executions for current-source proof;
- output/materialization/process ceilings;
- identity before/after;
- explicit environment-block if any dependency is missing;
- same repeated assertion proof semantics as W9.

Adversarial coverage:

- missing module cache object;
- poisoned/symlinked cache path;
- repo metadata trying to select flags/command;
- network-required dependency;
- build failure;
- timeout;
- test failure mismatch across repeats;
- stale source after target discovery;
- sibling identity drift.

If live data disproves the value/safety of this class, leave M4 as documented NO-GO and pursue equivalent coverage improvements through capability-aware targeting; do not force implementation.

Status: COMPLETE / NO-GO — the live census proved a local-cache Go class would unlock zero approved targets, so no authority-expanding executor was added.

### M5 — Optional non-Go execution-class decision/implementation

Only after M2 census.

The orchestrator must write a short threat-model decision in STATE before dispatch.

A class may be implemented only if:

- a direct fixed runner exists locally;
- dependencies are already local and can be mounted/read-only;
- package scripts are not executed;
- argv/env are host-fixed;
- no network namespace is available;
- source/test selection is host-derived;
- current-source proof can be mechanical and repeatable;
- negative malicious-package tests prove no authority expansion.

At most one non-Go class in W10.

NO-GO is a valid outcome.

Status: COMPLETE / NO-GO — no approved non-Go repository has an already-local direct runner; network installation and package-script execution remain prohibited.

### M6 — Sanitized reproduced-failure evidence + triage

When a qualifying current-source repeated assertion failure occurs, expose bounded current evidence useful for root-cause reasoning without granting proof authority.

Deliver:

- mechanically parsed test identity when possible;
- repository-relative test locator;
- normalized fingerprint;
- package/source grounding;
- repeat count;
- neutral proof kind/status;
- bounded scrubbed failure summary.

Keep raw output untrusted and capped.

Tests:

- secret scrubbing;
- prompt injection in assertion output;
- malformed test names;
- build/process/timeout cannot appear as assertion proof;
- model prose cannot mint evidence.

Status: COMPLETE — `nightwatch.current-failure-evidence.v1` exposes only bounded scrubbed mechanically repeated assertion evidence; ten tests cover secrets, injection and non-qualifying failures.

### M7 — W10 fixed coverage/yield benchmark

Build a frozen evaluation that compares a W9-like capability-blind reasoner surface with the W10 capability-aware surface at one commit/policy where possible.

Minimum corpus includes:

- W9 vendor target;
- additional Go class target if implemented;
- unsupported source;
- package without tests;
- missing dependency;
- passing tests;
- repeated assertion failure;
- build failure;
- transient failure;
- deterministic no-target refusal;
- negative controls;
- injection/adversarial cases.

Measure:

- executable target coverage;
- executable selection rate;
- `NOT_AVAILABLE` attempt rate;
- reproduction attempt/result distribution;
- grounded hypotheses;
- candidates/admissions/refusals;
- false positives/leaks;
- calls/actions/payload/wall to first executable reproduction.

Do not tune only on one real repository.

Status: COMPLETE — the fixed 59-case benchmark improves executable selection from 0.0000 to 0.2857 and lowers identical-budget `NOT_AVAILABLE` rate from 1.0000 to 0.7143 with zero false-positive or hidden-truth authority.

### M8 — Real reproduction generality proof

Run real current-source generic provider proofs.

Required:

1. W9 real proof remains PASS.
2. Census selects another supported package.
3. Prefer a different approved repository; if impossible, use a distinct package and document why repository diversity is blocked.
4. Execute at least two fresh runs in disposable state.
5. Accept truthful PASS/NOT_REPRODUCED, qualifying repeated failure, or environment block.
6. Prove no sibling/temp residue.

Any repeated current failure is triage evidence, not automatically unknown-bug proof.

Status: COMPLETE — the unchanged W9 real package and one distinct second package execute through the generic provider in disposable state; repository diversity is unavailable because only `mobingilabs/ouchan` has approved executable targets.

### M9 — Long live-provider campaign series

Run only after deterministic integration is green.

This milestone is intentionally long and should continue unattended while useful work remains.

#### M9.1 Reproduction-rich HOUR_1 campaign

Use a host-owned approved campaign scope or planning input derived from the census to emphasize executable reproduction surfaces while preserving reasoner autonomy.

Run up to HOUR_1.

Record:

- provider/model;
- wall time;
- investigations/calls/actions;
- unique targets;
- executable target selections;
- grounded hypotheses;
- reproduction attempts;
- NOT_AVAILABLE rate;
- PASS/NOT_REPRODUCED/repeated-failure outcomes;
- candidate/admission/refusal counts;
- budgets/bytes/retries.

#### M9.2 Broad owner-local HOUR_1 campaign

Run ordinary broad owner-local exploration with W10 capability-aware memory.

Compare to W9 reference 7/7 NOT_AVAILABLE.

#### M9.3 Robustness repeat

Run a fresh campaign id. If another subscribed provider/model is available without changing authority, prefer a distinct provider/model; otherwise repeat the primary provider.

Do not cherry-pick only successful runs.

If a provider becomes quota/auth blocked, continue all deterministic work and preserve exact rerun commands.

Status: IN_PROGRESS — broad full-stack and robustness-repeat HOUR_1 campaigns are preserved; the required census-scoped reproduction-rich HOUR_1 campaign is running.

### M10 — Long-run resilience / pause-resume / failure recovery

Exercise:

- pause/resume during a reproduction-capable campaign;
- checkpoint strategy/capability map continuity;
- transient retry not reset by resume;
- deterministic refusal remains exhausted;
- cancellation cleanup;
- tool timeout cleanup;
- byte budgets and payload ledger exactness across long runs;
- no sibling/temp residue.

Status: COMPLETE — ten resilience proofs cover pause/resume, checkpoint generations, retry/refusal continuity, cancellation/timeout cleanup, exact accounting and sibling identity.

### M11 — Full regression and certification

Run:

- all focused W10 suites;
- relevant W7/W8/W9 regression suites;
- `npm run typecheck`;
- `npm run hardening:check`;
- `npm run agent:check`;
- `npm run handoff:check`;
- `npm run project:check`;
- `npm run workspace:check`;
- `npm run session:check`;
- full `npm test`;
- `npm run gate:local`;
- fresh Node 20 `npm run gate:clean`;
- real owner-local generic reproduction proofs;
- historical ouchan product-path proof.

Integration head and documentation descendants must be recorded separately if final docs land after certification. Re-run `gate:local` on the documentation descendant when project truth requires it.

### M12 — Terminal closeout

Update W10 STATE/PLAN/REPORT, parent PROGRAMME/STATE/REPORT as appropriate, `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md` and project truth.

Report all improvements and regressions.

Do not declare parent programme COMPLETE unless its separate criteria are truly met.

## Required safety checks throughout

- canonical checkout is not an implementation worktree;
- sibling repos read-only;
- every worker has separate C-00 session/worktree;
- no worker self-integration;
- no force push/rebase/history rewrite;
- no network dependency fetching to make an executor work;
- no arbitrary package scripts;
- no hidden benchmark truth in capability ranking;
- no admission without mechanical proof;
- no unknown-bug claim from a failing test alone.

## Completion definition

M0-M12 must close truthfully.

W10 may complete with zero newly admitted findings if capability coverage, selection quality, live execution and safety/certification criteria are genuinely met.

Do not stop early simply because a provider finds nothing; the campaign is also responsible for coverage census, executor hardening, benchmark evidence, multiple live runs, long-run resilience and final certification.
