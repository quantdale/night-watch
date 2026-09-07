# EXECUTION PROMPT — Reproduction Surface Coverage & Autonomous Yield

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-autonomous-bug-hunting-programme-v1
OpenSpec: openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/
Planned-From: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
Target Branch: main
Predecessor Task ID: nightwatch-owner-local-deterministic-reproduction-yield-v1
Predecessor Status: COMPLETE

Child task: `nightwatch-reproduction-surface-coverage-autonomous-yield-v1`
Child task directory: `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

Continue the Nightwatch autonomous bug-hunting programme from LIVE repository truth and execute W10 through its full terminal criteria.

W0-W9 are already integrated and certified. Do not repeat them.

W9 proved that Nightwatch can safely run host-derived deterministic current-source reproduction when an inspected source maps to `GO_VENDORED_PACKAGE_TEST`, can mint an explicit `CURRENT_SOURCE_REPEATED_TEST_FAILURE` only from two matching fresh assertion failures, can keep retries host-owned, and can sustain an HOUR_1 live campaign without premature byte exhaustion.

The remaining gap is reproduction-surface coverage and reproduction-aware yield.

The terminal W9 Omen campaign inspected 26 distinct real source targets and formed 28 grounded/verification-ready hypotheses, but all 7 reproduction attempts returned deterministic `NOT_AVAILABLE`. The reasoning loop reached verification; the selected surfaces were not mechanically executable under the one W9 target class.

W10 must measure that limitation across the entire owner-approved source universe, expose bounded executable-readiness before the reasoner wastes verification turns, safely increase reproduction coverage where local offline prerequisites prove it possible, and run substantial live campaigns to demonstrate a lower `NOT_AVAILABLE` rate or higher executable-reproduction selection without increasing false positives, leakage, authority or sibling mutation.

This is intended as a long unattended/overnight campaign. Do not stop after recon, one lane, one executor, one passing proof, one live run, or one intermediate milestone. Continue through the full W10 PLAN, long live campaign series, resilience work and final certification unless a genuine external/manual blocker prevents a required live criterion after all other authorized work is exhausted.

## Read first

Read in order:

1. `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/SPEC.md`
2. `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/PLAN.md`
3. `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/STATE.md`
4. `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/REPORT.md`
5. W9 `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/{STATE,REPORT}.md`
6. W8 `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/{STATE,REPORT}.md`
7. W7 `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md`
8. parent programme `PROGRAMME.json`, `STATE.md`, `REPORT.md`
9. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, applicable instructions, `docs/CURRENT_STATE.md`, OpenSpec
10. live Git/workspace/session truth and relevant source-universe, owner-local reproduction, local-investigation, runtime, memory, efficacy, budget and benchmark code/tests.

## Re-establish truth before implementation

Do not assume the prompt's diagnosis.

At M0 independently determine:

- live HEAD and `origin/main`;
- canonical checkout cleanliness;
- all worktrees/session claims and C-00 ownership;
- W9 implementation/documentation ancestry;
- W9 focused proof status;
- exact target-discovery requirements and refusal classes;
- exact reasons the final W9 live reproduction calls returned `NOT_AVAILABLE`;
- owner-approved repositories/languages/roots currently readable;
- local toolchains/module caches/dependency stores available without network;
- whether reproduction readiness is visible before a reproduction call;
- whether any non-Go direct runner can meet the W10 safety bar.

Record each initiating hypothesis as CONFIRMED / DISPROVED / PARTIAL with evidence in STATE/REPORT.

## M0 — Build the reproduction-capability baseline first

Before changing behavior, create a bounded diagnostic census using the current W9 rules over the full owner-approved current-source universe.

Measure at minimum:

- approved source files by repository/language;
- distinct packages/targets;
- executable targets;
- source paths mapping to executable targets;
- unsupported paths;
- refusal distribution (`NO_SUPPORTED_EXECUTOR`, no module, no vendor, no package tests, stale source, missing toolchain, etc.);
- deduplicated target coverage;
- W9-equivalent reasoner-visible executable readiness;
- expected live `NOT_AVAILABLE` exposure.

Do not dump whole repositories or persist sensitive machine-specific topology in Git. Commit bounded aggregate evidence and schemas; keep owner-private raw state outside Git if needed.

Do not start overlapping implementation lanes before this baseline and the shared W10 contracts are frozen.

## M1 — Freeze shared contracts

Freeze additive/versioned contracts for:

- reproduction capability/refusal taxonomy;
- bounded `ReproductionSurfaceMap` or equivalent;
- executable readiness in investigation memory/campaign strategy;
- optional new executor target class;
- sanitized current-source failure evidence;
- W10 coverage/yield metrics.

Reasoner-visible capability data must never contain:

- command strings or argv;
- absolute local paths;
- executable/cache filesystem paths;
- arbitrary environment values;
- hidden historical truth;
- replay audit stderr;
- credentials/secrets;
- new tool/intent/environment authority.

Use deterministic ordering, hard caps and schema versions.

After M1, run contract tests before dispatching workers.

## Parallel execution after M1

Use available executor concurrency where it creates real independent throughput. Every writing executor must have its own Nightwatch C-00 session worktree and explicit owned paths. Workers are leaf agents and do not integrate themselves.

Preferred non-overlapping lanes:

1. **Coverage census lane**
   - reusable census engine;
   - aggregate metrics and refusal taxonomy;
   - deterministic/adversarial tests.

2. **Surface map + memory lane**
   - bounded reasoner-visible executable readiness;
   - campaign strategy integration;
   - checkpoint/resume compatibility;
   - no authority expansion.

3. **Go offline-cache executor lane**
   - ONLY after orchestrator confirms live census value and writes GO decision;
   - host-derived package target with complete already-local dependency closure;
   - no-network/read-only-cache execution;
   - W9 proof/admission semantics unchanged.

4. **Current failure evidence lane**
   - bounded scrubbed test/assertion/package/fingerprint facts;
   - no proof authority from prose;
   - injection/secret tests.

5. **Coverage/yield benchmark lane**
   - fixed corpus;
   - W9-like baseline vs W10 capability-aware surface;
   - negative controls and cost metrics.

6. **Long-run resilience lane**
   - pause/resume;
   - transient retry continuity;
   - cancellation/timeouts;
   - cleanup/sibling integrity;
   - budget ledger across long runs.

7. **Optional non-Go executor lane**
   - do NOT dispatch unless live census identifies a high-value direct runner and orchestrator first records an explicit threat-model GO decision.

Global task/programme/current-state/OpenSpec files and shared interface decisions remain orchestrator-owned unless explicitly assigned.

For every worker:

- inspect the actual diff, not just its report;
- verify changed paths are owned;
- reject hidden scope expansion;
- ensure tests were not weakened/deleted;
- reconcile against current integration head;
- rerun acceptance tests AFTER reconciliation;
- only then integrate.

A worker's success message is not evidence. A pre-reconcile pass never certifies post-reconcile code.

## Reproduction surface map

Make executable capability visible before reproduction without hiding exploratory source.

A stateless reasoner should be able to know neutral facts such as:

- this inspected source maps to an executable target now;
- executor class, if safe to reveal;
- this source has no package tests;
- this source's dependencies are not fully local;
- this language has no safe W10 executor;
- this target was already attempted and its neutral outcome;
- a different grounded source in the same campaign is mechanically executable.

Do NOT simply filter all unsupported source out of the index. Unsupported source may still be useful for static/root-cause reasoning.

Capability-aware guidance should improve verification choices while preserving frontier reasoner autonomy.

Track and report:

- executable-target selection rate;
- `NOT_AVAILABLE` reproduction-attempt rate;
- repeated unsupported-target attempts;
- attempts/calls/actions to first executable reproduction;
- executable target diversity.

## Safe Go coverage expansion

W9's `GO_VENDORED_PACKAGE_TEST` is frozen and must remain green.

If the M0 census proves meaningful additional coverage is available with already-local Go module cache data, add a distinct host-derived class such as `GO_LOCAL_CACHE_PACKAGE_TEST`.

Requirements:

- source path already approved/current and bound to source evidence;
- package has pre-existing tests;
- all module dependencies mechanically proven local before target is marked executable;
- fixed allowlisted/cached Go toolchain;
- no ambient PATH/GOROOT authority;
- `bwrap --unshare-net` or equivalent no-network namespace;
- `GOPROXY=off`, `GOSUMDB=off`, `GOTOOLCHAIN=local` or stricter equivalent;
- module cache mounted/read-only where required;
- host-fixed argv only;
- no reasoner flags, commands or package scripts;
- disposable source/home/cache/work dirs;
- bounded materialization/files/bytes/execution/output/process tree;
- sibling identity before/after;
- cleanup in `finally`;
- missing dependency => environment block / NOT_AVAILABLE, never download;
- current-source proof remains two matching fresh pre-existing assertion failures.

Add adversarial tests for missing cache objects, symlinks, stale source, malicious metadata, network-required deps, build failure, timeout, inconsistent repeated failures and sibling identity drift.

If the live data shows this class provides negligible coverage or cannot meet safety constraints, record NO-GO and do not force it.

## Optional non-Go class

At most ONE new non-Go class may be added in W10, and only after a written threat-model decision from the orchestrator.

Do not execute arbitrary `npm test`, Composer scripts, Makefiles or repository-defined commands.

A valid class must use a direct fixed local runner, already-local dependencies, fixed argv/env, host-derived tests/targets, no network, sandboxed disposable state and mechanical repeated-failure semantics.

If no class meets that bar, keep those surfaces `NOT_EXECUTABLE` and report the coverage gap honestly.

## Current-source reproduced-failure evidence

A qualifying repeated current-source assertion failure should give the reasoner useful bounded evidence for root-cause triage without upgrading authority.

Where mechanically derivable, expose sanitized neutral fields such as:

- repository-relative test file;
- test name;
- package identity;
- normalized assertion/failure fingerprint;
- matching fresh execution count;
- grounded source paths/evidence refs;
- current-source proof kind/status.

Raw output remains untrusted, scrubbed and capped.

Do not count build failure, timeout, process failure, dependency block or arbitrary nonzero exit as a bug.

Do not declare a repeated test failure previously unknown merely because it reproduced.

## Fixed coverage/yield evaluation

Build a deterministic W10 evaluation and compare a W9-like capability-blind surface to the W10 capability-aware surface at one implementation/policy where possible.

Include cases for:

- W9 vendored Go target;
- new Go local-cache class if implemented;
- package with no tests;
- unsupported language;
- missing dependency;
- passing package;
- repeated assertion failure;
- build failure;
- timeout;
- transient retry;
- deterministic refusal;
- source/metadata injection;
- negative control;
- hidden historical leakage guard.

Measure baseline -> final:

- executable coverage;
- executable target selection rate;
- NOT_AVAILABLE attempt rate;
- grounded hypotheses;
- executable reproduction attempts;
- qualifying current-source reproductions;
- candidates proposed/admitted/refused;
- false positives;
- hidden-truth leakage;
- reasoner calls/tool actions/tool payload bytes;
- wall/calls/actions to first executable reproduction.

Do not claim improvement from activity volume alone.

## Real generality proof

After deterministic integration:

1. rerun the W9 real owner-local reproduction proof unchanged;
2. use the live census to select another supported real target;
3. prefer a different approved repository; if impossible, use a different package and prove why repository diversity is unavailable;
4. run through generic production provider architecture, not a custom one-off test command;
5. accept honest PASS/NOT_REPRODUCED, qualifying repeated failure or environment block;
6. verify sibling HEAD/status/worktree identity before and after;
7. prove disposable temp cleanup.

A real failure is evidence for triage, not automatic unknown-bug status.

## Long live campaign series — do not skip

This is a core reason the campaign is intentionally long.

After deterministic integration and focused validation are green, execute substantial subscribed-provider campaigns when quota/auth permits.

### Live Run A — reproduction-rich HOUR_1

Use a HOST-OWNED approved campaign scope/planning input derived from the census to emphasize surfaces that are currently executable while still letting the frontier reasoner choose among them.

Run up to HOUR_1.

Record full provider/model provenance and all W10 yield metrics.

### Live Run B — broad owner-local HOUR_1

Run ordinary broad owner-local exploration using capability-aware memory.

Compare explicitly against the W9 reference:

- W9 reproduction attempts: 7;
- W9 NOT_AVAILABLE: 7/7;
- W9 admitted findings: 0.

Do not cherry-pick a narrower success and call it broad improvement.

### Live Run C — robustness repeat

Use a fresh campaign id. If another subscribed provider/model is actually available, prefer a distinct provider/model; otherwise repeat the primary provider.

Preserve every run, including misses, provider failures and zero-findings runs.

Do not fabricate candidates/findings.

If provider quota/auth blocks a required run, finish all deterministic work and preserve exact rerun commands. W10 remains honestly PARTIAL/BLOCKED if a required live acceptance criterion cannot execute.

## Long-run resilience

Before closeout exercise:

- campaign pause/resume while capability map exists;
- checkpoint migration from W9;
- transient retry state across resume;
- deterministic refusal exhaustion across resume;
- cancellation during tool execution;
- timeout/process-tree kill;
- cleanup after cancellation/timeout;
- exact byte/call/action/wall accounting;
- campaign strategy retaining executable/unsupported target knowledge;
- no sibling mutation.

## Safety boundary

LOCAL only.

NOT AUTHORIZED:

- DEV/NEXT/production;
- C-07/C-08b/C-12/C-13/C-14 live execution;
- Slack/Leslie/Pondr/Notion;
- external filing/comments;
- credentials/deployment changes;
- sibling writes;
- force push/rebase/history rewrite/destructive Git recovery;
- arbitrary reasoner shell/Git/network/filesystem authority;
- arbitrary package-script execution;
- network dependency fetching.

Historical `PRE_FAIL_POST_PASS`, W9 current-source proof, W8 memory, W7 mechanical admission, zero-leakage rules and strict EXACT remain load-bearing.

## Failure discipline

Never:

- convert `NOT_AVAILABLE` into success;
- treat build/environment/process/timeout as defect proof;
- lower repeated-failure requirements;
- let model fields mint target/proof/retry/admission state;
- hide unsupported coverage;
- hide increased costs or false positives;
- delete/weaken tests to integrate;
- declare success from one repository/package;
- stop because one long live run finished.

When a regression appears:

1. record it;
2. reproduce it with a focused failing test when practical;
3. identify the actual cause;
4. repair without weakening the invariant;
5. rerun the affected suite after reconciliation;
6. carry the regression into final REPORT.

## Required certification

Before W10 COMPLETE run and record:

- all focused W10 suites;
- W7 provider/admission/historical suites;
- W8 memory/campaign/efficacy/leakage suites;
- W9 reproduction/current-proof/retry/byte-accounting/real-current suites;
- `npm run typecheck`;
- `npm run hardening:check`;
- `npm run agent:check`;
- `npm run handoff:check`;
- `npm run project:check`;
- `npm run workspace:check`;
- `npm run session:check`;
- full `npm test`;
- `npm run gate:local` FULL PASS;
- fresh Node 20 `npm run gate:clean` with no reused `node_modules`;
- real owner-local reproduction generality proof;
- W7 real historical ouchan product-path proof.

Do not mark COMPLETE from worker test summaries. The orchestrator must independently certify the integrated head.

## Terminal criteria

W10 may close only when the SPEC completion criteria and PLAN M0-M12 are truthfully satisfied.

In particular:

- capability census exists and is reproducible;
- reasoner sees bounded executable readiness before reproduction;
- NOT_AVAILABLE waste is materially reduced OR executable selection is materially improved in controlled/live evidence;
- W9 vendor execution remains intact;
- any new executor class is independently threat-tested;
- real reproduction generality is demonstrated where live universe permits;
- multiple substantial live campaigns have been attempted/executed when provider access permits;
- no false-positive/leakage/admission regression exists;
- full regression and clean-clone certification pass.

A previously unknown Alphaus bug is NOT required to complete W10.

Do NOT claim parent-programme completion, strict EXACT, DEV/NEXT/production proof, organizational approval or previously-unknown defect status unless separately and actually proven.

Begin now from live Git/workspace/session truth and continue through the full campaign rather than stopping at planning or early implementation.
