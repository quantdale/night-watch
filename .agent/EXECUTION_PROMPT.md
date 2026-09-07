# EXECUTION PROMPT — Owner-Local Deterministic Reproduction & Yield

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-autonomous-bug-hunting-programme-v1
OpenSpec: openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/
Planned-From: 8f385e5fd404bd694db516e0fe3be473f29380af
Target Branch: main
Predecessor Task ID: nightwatch-autonomous-efficacy-real-local-substrate-v1
Predecessor Status: COMPLETE

Child task: `nightwatch-owner-local-deterministic-reproduction-yield-v1`
Child task directory: `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

Continue the Nightwatch autonomous bug-hunting programme from LIVE repository truth. W0-W8 are already integrated and certified. Do not repeat them.

W8 closed the reasoning-efficacy gap: stateless turns receive bounded investigation memory, fresh investigations receive bounded campaign strategy memory, hypotheses can become mechanically verification-ready, and live historical cases can reach verified root-cause rediscovery without hidden-truth leakage.

The next gap is owner-local reproduction coverage and real yield. A grounded hypothesis against current owner-local source still cannot earn qualifying reproduction credit because the normal REAL_LOCAL context has no default executable deterministic reproduction provider. W8 live campaigns also hit cumulative `outputBytes` before HOUR_1 wall time; audit the accounting before changing any ceiling.

W9 must add a conservative host-derived current-source reproduction path, explicit current-source proof semantics, correct deterministic-vs-transient retry behavior, evidence-based byte-budget calibration, and a truthful live-provider yield proof — without weakening W7/W8 safety, leakage, historical replay, memory or mechanical admission.

A previously unknown Alphaus bug is NOT a W9 completion requirement and must never be fabricated. If no qualifying defect exists, complete W9 with an honest no-new-defect result once the capability and all terminal criteria are proven. The parent programme advances its unknown-bug claim only if such a defect is independently evidenced and mechanically admitted.

## Read first

Read in order:

1. `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/SPEC.md`
2. `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/PLAN.md`
3. `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/STATE.md`
4. `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/REPORT.md`
5. W8 `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/{STATE,REPORT}.md`
6. W7 `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md`
7. parent programme `PROGRAMME.json`, `STATE.md`, `REPORT.md`
8. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, applicable instruction files, `docs/CURRENT_STATE.md`, OpenSpec
9. live Git/workspace/session truth and relevant owner-local/reproduction/admission/runtime/budget source + tests.

## Start with diagnosis, not implementation

Before changing code, independently verify or disprove these starting hypotheses against live source and traces:

1. `createOwnerLocalInvestigationContext()` still injects an explicit reproduction provider only when configured and otherwise returns a fail-closed `NOT_CONFIGURED` reproduction provider.
2. Current owner-local defects cannot honestly use historical `PRE_FAIL_POST_PASS` semantics because no known post-fix revision exists.
3. W8's exhausted-action guard permanently exhausts an identical prior `TOOL_ERROR`; that may be too broad once executable providers can fail transiently.
4. W8 live campaigns hit cumulative `outputBytes` before HOUR_1. Determine whether provider bytes, parsed response bytes, tool/memory bytes, or repeated serialization are double-counted or amplified before raising policy limits.
5. A safe first provider class should be narrow and host-derived — prefer locally available offline/vendored packages if the live repo supports them — rather than an arbitrary multi-language command runner.

Record confirmed and disproved hypotheses in STATE/REPORT. Do not force the design to fit this prompt if live evidence differs.

## Primary objectives

### 1. Host-derived owner-local reproduction targets

Create a bounded deterministic target-discovery layer mapping an already-approved inspected source path to a supported executable package/test target.

The reasoner never supplies an arbitrary command, executable, package-manager script, environment, absolute write path or network destination. Nightwatch derives execution from approved source/package metadata.

Start with the smallest defensible executable class. Go packages that are fully offline-capable are preferred if live recon supports that choice.

Every unsupported or unsafe source must fail closed as unavailable/blocked rather than falling back to an invented executor.

### 2. Disposable offline execution

Run supported current-source reproduction only in Nightwatch-owned disposable state, never inside sibling repositories.

Requirements include:

- sibling checkout read-only;
- argv arrays / no `shell:true`;
- allowlisted host-derived toolchain;
- no dependency/network fetching;
- hard wall/output/process-tree bounds;
- cleanup in `finally`;
- faithful source materialization;
- explicit classification of test failure vs build/config failure vs timeout vs environment/toolchain block vs process failure;
- before/after sibling identity proof.

Generic nonzero exit is NEVER reproduction credit.

### 3. Explicit current-source proof semantics

Do not lie by pretending a current-source failure has a post-fix PASS.

Design an additive/versioned proof kind for current owner-local reproduction, preserving historical `PRE_FAIL_POST_PASS` byte-for-byte.

A qualifying current-source proof must be strongly mechanical. At minimum require real inspected-source grounding, a host-derived executable target, actual qualifying test/assertion/contract failure rather than build/environment failure, repeatability in fresh disposable executions, Nightwatch-minted evidence/provenance, and anti-inflation rules that prevent model prose or arbitrary failing commands from minting credit.

Prefer pre-existing repository tests/checks as the strongest initial proof class. If generated discriminators are explored, classify them separately and do not let model-authored expectations automatically become product truth.

If admission is extended, the dossier must explicitly preserve which proof kind justified it. Historical admission semantics must not regress.

### 4. Deterministic vs transient failure disposition

Audit the W8 exhausted-action guard.

Introduce host-owned failure disposition where necessary so Nightwatch distinguishes:

- deterministic terminal/refusal;
- environment blocked;
- retryable/transient execution/provider failure;
- successful/non-reproduced observations.

The model cannot self-label retryability.

Identical deterministic failures should not burn repeated calls. Transient failures may receive only a strict finite retry budget; never retry forever and never permanently suppress a call merely because one transient attempt failed.

### 5. Byte-accounting audit before budget changes

Instrument the budget path enough to explain W8's `outputBytes` exhaustion.

Measure at least:

- request bytes;
- provider stdout/stderr;
- canonical/parsed response bytes where intentionally separate;
- tool/evidence output bytes;
- reasoner-visible memory/prompt contribution.

Look specifically for double counting of the same provider response or repeated serialization amplification.

Fix accounting mistakes and avoidable duplication first.

Only after evidence may HOUR_1's output ceiling change. Any new ceiling needs measured legitimate traffic + bounded headroom and must still terminate runaway providers/output safely.

Do not equate "lasts longer" with "works better."

### 6. Owner-local reproduction readiness in W8 memory

Extend the existing bounded W8 memory/readiness surface rather than replacing it.

A stateless reasoner should be able to distinguish neutral states such as:

- grounded hypothesis but no supported executable target;
- target discovered but prerequisites blocked;
- ready for owner-local reproduction;
- deterministic refusal;
- transient failure with bounded retry remaining;
- current-source failure mechanically reproduced;
- execution completed without reproduction.

Do not expose commands, raw audit/stderr, hidden truth, secrets or absolute sensitive paths.

### 7. Deterministic provider/admission corpus

Build a fixed fabricated/disposable W9 corpus proving positive, negative, blocked, build-failure, timeout, environment-blocked, transient and adversarial cases.

Must prove:

- supported offline target executes;
- stable qualifying current-source failure can earn ONLY the explicit current-source proof kind;
- passing test earns no reproduction;
- build failure earns no reproduction;
- timeout earns no reproduction;
- missing dependency/toolchain is environment blocked;
- deterministic refusal is not repeatedly executed;
- transient failure has bounded retries and can recover if the provider legitimately succeeds within policy;
- forged receipt/proof/reproductionCount/evidence cannot pass admission;
- command/path/env injection is refused;
- sibling identity remains unchanged after success, failure and timeout;
- negative controls do not become admitted findings;
- W7/W8 historical reproduction and admission remain unchanged.

### 8. Real owner-local proof

After deterministic integration is green, prove the provider against at least one currently available supported REAL_LOCAL package using live source metadata.

Do not hand-code a one-off execution path for the chosen repository.

Prove target discovery, disposable execution, no network dependency fetching, honest classification, and byte/worktree/HEAD identity preservation.

### 9. Live subscribed-reasoner yield campaign

Run a live provider through the normal `nightwatch-agent campaign run` path with the owner-local reproduction capability.

Record exact provider/model provenance and:

- investigations;
- reasoner calls;
- tool actions;
- provider failures;
- wall time;
- byte-accounting breakdown;
- unique targets;
- grounded hypotheses;
- reproduction-ready hypotheses;
- reproduction attempts by outcome/disposition;
- candidates;
- admitted/refused findings;
- termination reason.

If there is no qualifying defect, report zero findings. If a candidate lacks qualifying reproduction, admission must still refuse it.

If a qualifying current-source failure is found, preserve human-review-only authority. Do not claim it was previously unknown unless that separate fact is actually established.

### 10. Endurance/budget proof

After accounting repairs/calibration, run a bounded campaign intended to exercise the HOUR_1 policy.

A legitimate earlier stop (no progress, reproduced finding, provider failure ceiling, etc.) is acceptable. The point is to prove that the previous unexplained byte ceiling is understood and that legitimate traffic does not prematurely exhaust a mis-accounted budget while runaway output remains bounded.

## Orchestration and delegation

You are the frontier orchestrator/reviewer. Own live truth, shared interfaces, task/programme state, integration, final live runs and certification.

Use subagents only after M1 freezes the shared W9 target/receipt/failure-disposition contracts.

Every writing executor:

- gets its own C-00 session worktree;
- owns explicit non-overlapping paths;
- is a leaf worker;
- must not integrate itself;
- must not modify global task/programme/current-state files unless explicitly assigned;
- must not force push, rebase shared history, reset unrelated work, or destructively clean another worktree.

Suggested post-freeze lanes:

1. target discovery + disposable provider;
2. current-source receipt/admission;
3. failure disposition + retry semantics;
4. byte accounting + budget calibration;
5. adversarial/fixed/live proof tests.

A worker report is not evidence. For every lane:

1. inspect actual diff and changed paths;
2. reject or repair scope creep;
3. verify tests were strengthened rather than weakened;
4. reconcile against current integration head;
5. rerun lane acceptance tests AFTER reconciliation;
6. only then integrate.

## Failure discipline

Never:

- mark a process/build/environment failure as a bug;
- accept a single flaky failure as reproduced;
- fabricate current-source post-fix evidence;
- allow model-authored proof metadata to mint credit;
- increase budget solely because a campaign hit a limit;
- convert provider blocks/timeouts into success;
- weaken admission, leakage or scoring to improve yield;
- delete/skip a failing test merely to regain green;
- accept worker completion without independent review;
- stop after one provider or one successful fixture;
- force/reset/rewrite history to resolve integration difficulty.

If provider quota blocks live proof, complete every deterministic/local task still executable and leave W9 truthfully IN_PROGRESS/BLOCKED if the live terminal criterion cannot be met.

## Hard safety boundaries

LOCAL only.

NOT AUTHORIZED:

- DEV/NEXT/production contact;
- C-07, C-08b, C-12/C-13/C-14 live execution;
- Slack, Leslie, Pondr, Notion or communication scraping;
- issue/PR/external filing;
- credentials/deployment/secrets changes;
- sibling writes/mutation;
- arbitrary reasoner shell/Git/network/filesystem authority;
- force push/history rewrite/destructive recovery.

Sibling repositories stay read-only. Reproduction writes go only to disposable Nightwatch-owned state. Do not fetch/install dependencies over the network merely to force a test to execute.

## Validation requirements

Before W9 may be COMPLETE, run and record at minimum:

- new W9 target/provider/proof/retry/budget/adversarial suites;
- W7 local provider/session/admission/historical product-path suites;
- W8 investigation-memory/campaign-strategy/efficacy/reasoner-print suites;
- historical benchmark + contained replay suites;
- opt-in real ouchan product-path proof when local prerequisites remain available;
- `npm run typecheck`;
- `npm run hardening:check`;
- `npm run agent:check`;
- `npm run handoff:check`;
- `npm run project:check`;
- `npm run workspace:check`;
- `npm run session:check` or authoritative equivalent;
- full `npm test`;
- `npm run gate:local` FULL PASS;
- `npm run gate:clean` on a fresh Node 20 clone with no reused `node_modules`;
- real owner-local supported-package proof;
- live subscribed-provider yield run;
- post-accounting bounded endurance proof.

Do not mark a milestone complete merely because code exists. Do not mark W9 complete until M0-M9 and the SPEC terminal criteria are actually satisfied.

## Final report

At W9 terminal state, report:

- starting SHA;
- final implementation SHA;
- documentation descendant SHA if any;
- origin/main SHA;
- architecture and supported executable classes;
- exact current-source proof semantics;
- deterministic/transient retry rules;
- byte-accounting baseline/final and any corrected double counting;
- any budget policy changes and justification;
- fabricated/adversarial corpus results;
- real owner-local proof result;
- live provider/model result and yield;
- candidate/admission/refusal counts;
- current-source/historical reproduction counts;
- false positives/leakage;
- regressions encountered and repairs;
- validation counts/receipts;
- repository/worktree/session/sibling integrity;
- remaining unproven claims;
- exact next parent-programme action.

Do not claim parent completion, strict EXACT, previously unknown Alphaus defect, DEV/NEXT/production proof or organizational approval unless each is independently and actually proven.

Begin now from live Git/workspace/session truth. Continue through the full W9 task rather than stopping after recon, planning, interface freeze, one lane, one reproduction, one live run, or an intermediate green test suite.
