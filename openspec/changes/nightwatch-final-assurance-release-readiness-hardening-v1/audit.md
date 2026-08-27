# Planner Audit — Final Assurance + Release-Readiness Hardening

## Baseline and audit method

Planning baseline: `main` at `9ecd09c0d33d05d665721080627e5d63b376c16d`.

This successor is evidence-driven. It does not reopen completed feature families merely to create work.

The immediately preceding campaign performed a literal local tracked-file sweep and recorded `1359/1359` tracked files reviewed, `14,898,287` bytes and `297,923` lines, with no unexplained nonregular tracked paths. It enumerated 2,606 Playwright tests in 215 files, executed the canonical serial suite with 2,590 passed / 16 skipped / 0 failed, and completed local and disposable Node 20 quality gates. It also repaired the planner/executor handoff and strict project-state truth chain.

This planner re-inspected the live repository structure and authority-bearing artifacts after that closure, including package/gate wiring, the OpenSpec portfolio, README/AGENTS safety boundaries, current execution prompt and active task, recent implementation/closure history, current roadmap tail, the GitHub Actions workflow, Control Center package boundary, and the prior campaign audit/report. The connected GitHub interface can inventory and read repository content but cannot execute the repository locally. Therefore this planning checkpoint does **not** pretend to have rerun the full suite or byte-read every tracked file itself. H0 below makes a fresh literal local sweep mandatory before implementation.

## Current repository truth

Nightwatch is a mature private/local autonomous bug-hunting and evidence-triage framework with unusually strong fail-closed boundaries. Major implementation programs through the source-intelligence, replay/triage, Control Center, artifact-truth, egress, and planner/project-truth campaigns are already implemented and locally certified. Existing roadmap evidence repeatedly shows source/proof families being rejected rather than loosened when current source cannot mechanically justify expansion.

The current active task is terminal `COMPLETE` for `nightwatch-campaign-handoff-and-project-truth-hardening-v1`. The canonical execution prompt is also terminal `COMPLETE` for that same campaign. The previous campaign's validated implementation anchor is `e4ac7076600f9a347d230445aa312e321f635624`, with later clean/local certification descendants and final documentation closure.

The repository's unified gate remains the authoritative acceptance path. `package.json` exposes typecheck, hardening, handoff, project truth, semantic compatibility, owner provenance, synthetic campaign, local gate, clean gate, Control Center UI build/test/typecheck/browser qualification, and targeted runtime/source commands. The GitHub workflow is intentionally thin: checkout, Node 20, `npm ci --ignore-scripts`, then `npm run gate:ci`.

## What is already strong and should not be reopened without new evidence

- fail-closed outbound request and loopback-proxy containment model;
- owner-only private findings storage and no publication authority;
- frozen cloud/infrastructure/data-layer scope;
- source proof currentness/cache binding and conservative ambiguity rejection;
- Phase-24 eligibility/portfolio authority;
- semantic projection/privacy boundaries;
- replay/minimization/triage proof chain;
- Control Center loopback/read-only authority model;
- durable artifact/finding truth reducers;
- agent continuity v2, planner handoff v1, and project-state v2;
- canonical/clean local quality-gate architecture.

No fresh evidence currently justifies another product-feature or source-proof expansion campaign.

## Fresh findings and residual risks

### P1 — release certification is locally strong but externally incomplete

The current head has no successful attached commit status, and the recent exact-head Actions observation executed zero steps under the standing billing/platform condition. This is not a repository defect, but it means Nightwatch cannot truthfully claim independently reproduced CI-green release certification.

Impact: release-readiness claims must remain `LOCAL/CLEAN CERTIFIED, EXTERNAL CI NOT PROVEN` until a real workflow run executes the gate.

Required disposition: preserve truthful classification. Do not churn workflow code to fix an external zero-step condition. If CI becomes runnable during execution, observe at most one exact-head run and require actual executed steps; otherwise record the external blocker and keep local/clean authority explicit.

### P1 — final assurance has not yet been performed against the post-handoff live head as one dedicated release-certification campaign

The prior campaign certified its own change set thoroughly, but the project-level objective now is different: prove that the **entire intended product** is coherent, usable, maintainable, and releasable rather than merely that one hardening change is correct.

Impact: a large, mature repository can accumulate cross-subsystem drift that focused campaign closure does not expose: duplicate authorities, stale docs, dead compatibility branches, skipped-test assumptions, resource regressions, package drift, CLI/help inconsistencies, startup/shutdown faults, or Control Center/operator mismatches.

Required disposition: execute a dedicated whole-repository final assurance pass with explicit subsystem ownership, end-to-end workflow tracing, negative-path testing, dependency/packaging review, performance/resource sanity, and release certification.

### P2 — the 16 environment-conditional skipped tests require final explicit disposition

The latest canonical suite records 16 skipped tests with zero failures. The prior report states the skip set was unchanged/understood, but final release certification must not inherit that statement blindly.

Impact: a legitimate environment guard is acceptable; an obsolete or accidentally broadened skip can hide a release defect.

Required disposition: enumerate all 16 by exact test identity and condition, classify each as `LEGITIMATE_ENVIRONMENT_GUARD`, `OBSOLETE`, `CAN_RUN_LOCALLY`, or `BLOCKING_VALIDATION_GAP`; remove/repair any unjustified skip and add deterministic substitutes where practical.

### P2 — dependency and toolchain disposition is not a first-class release gate

The root package and Control Center have explicit Node and package dependencies, but current acceptance evidence is primarily behavior/gate driven. Final assurance should prove lockfile integrity, lifecycle-script assumptions, nested UI install/build behavior, supported Node version semantics, and whether legacy dependencies are fixtures/compatibility-only or part of runtime trust.

Impact: stale/unnecessary dependencies, lifecycle assumptions, or nested-package drift can undermine reproducible installation even when a warm checkout is green.

Required disposition: perform a dependency-role census; keep required historical fixtures isolated, remove only demonstrably dead packages, and ensure clean install/build/test paths do not depend on ambient/global state.

### P2 — performance/resource ceilings are observed but not uniformly treated as regression contracts

Recent acceptance records wall time and peak RSS for major commands, including semantic compatibility and local/clean gates. That is good evidence, but final assurance should identify the genuinely performance-sensitive paths and set generous non-flaky sanity ceilings or trend checks where stable enough.

Impact: an algorithmic regression can remain functionally green while making autonomous long sessions impractical.

Required disposition: benchmark bounded representative commands on a clean baseline; investigate material regressions, excessive repeated scans, avoidable serialization/parsing, duplicate gate execution, unbounded collections, and Control Center refresh/read amplification. Do not add brittle microbenchmarks.

### P2 — historical documentation volume creates stale-truth risk

`docs/CURRENT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`, `ARCHITECTURE.md`, and long-lived `.agent` history intentionally preserve substantial chronology. Machine-owned truth is now stricter, but human-facing current-state sections can still become difficult to distinguish from history.

Impact: autonomous agents can spend context on obsolete phase claims or choose the wrong next direction even when machine checks are green.

Required disposition: do not mass-delete history. Instead verify current-summary sections, labels, anchors and navigation; ensure historical claims are explicitly historical; add/strengthen compact current-truth entry points only if the fresh audit finds real ambiguity.


### P1 — process-level L6 containment remains unimplemented and blocks a complete network-isolation claim

Fresh targeted review of the current safety/runtime path found a concrete implementation seam rather than a speculative feature request:

- `docs/SAFETY_MODEL.md` explicitly retains `BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL`: speculative Chromium DNS/resolver activity is outside the L5 HTTP/CONNECT proxy's observation boundary.
- `docs/ROADMAP.md` and `docs/ARCHITECTURE.md` still describe a future restricted container/network namespace as the L6 boundary and prerequisite for broader non-browser subprocess containment.
- `playwright.config.ts` launches Chrome directly on the host with the mandatory Nightwatch proxy and conservative transport flags; it does not launch the browser inside a network namespace.
- `src/browser/context.ts` requires and health-checks L5 before browser-context creation, but has no L6 runtime identity or process-isolation gate.
- `src/core/oops/sandbox.ts` already probes Bubblewrap and records that an isolated network namespace is not compatible with the parent-namespace relay (`relayCompatible: false`); authenticated OOPS execution is therefore disabled.
- `src/core/oops/process.ts` still spawns the restricted OOPS binary directly in the host network namespace for the local loopback-fixture path.
- `bin/phase5-real.mjs` explicitly sets `NIGHTWATCH_PHASE_5_OOPS_REAL=0` and uses the native Nightwatch relay fallback for real API acceptance, so the current code does **not** expose an authenticated OOPS escape path. That safety fact must be preserved.

Impact: Nightwatch can truthfully claim strong L0-L5 containment, but it cannot claim complete process/network isolation, and broader non-browser subprocess execution is not release-ready. DNS metadata leakage from browser speculation remains a named residual.

Required disposition: treat this as a bounded implementation + hardening workstream. Prefer an unprivileged/rootless containment design. Do **not** use root-required firewall rules, system-wide proxy mutation, privileged network administration, TLS MITM, cloud infrastructure, or live product/DNS probes. The executor must either:

1. implement and mechanically verify a rootless L6 execution envelope that preserves the allowed synthetic proxy/relay path while denying direct DNS/TCP/UDP escape; or
2. if a safe rootless design cannot be completed within the authorized scope, keep every affected real/subprocess route fail-closed, add machine-readable L6 capability/readiness truth, and terminate full project certification as blocked rather than silently downgrading the residual.

A release-complete result must not relabel the existing L6 residual as solved without process-boundary evidence.

### P1 — safety-critical retry and conditional-skip behavior needs explicit release qualification

The current containment smoke suite still configures retries for the WebSocket gate and carries a rationale saying the harness registers `routeWebSocket` without awaiting it. Current `src/browser/observers/networkObserver.ts` explicitly awaits both `context.route()` and `context.routeWebSocket()` before navigation. The retry rationale is stale relative to current implementation and can mask a regression if retained without revalidation.

Separately, `tests/unit/phase5Api.test.ts` conditionally skips restricted-OOPS execution tests when the source-built OOPS binary is absent. Those tests cover executable provenance, relay-only behavior, secret non-inheritance, and oracle parity—release-relevant properties that should not disappear silently from a clean certification run.

Required disposition:

- reproduce the WebSocket containment tests with retries disabled; if the race is gone, remove the retry workaround and stale comments; if it still exists, fix the underlying registration/lifecycle defect rather than depending on retries;
- enumerate the exact OOPS skip identities and provide a deterministic clean-checkout qualification path for the restricted subprocess boundary;
- treat any unresolved safety-critical retry/skip as a blocking validation gap.

## Campaign decision

**Decision: Combined Implementation + Hardening Campaign, tightly bounded to release-critical evidence.**

A broad product-feature campaign is not justified: intended core functionality is mature and recent evidence shows multiple candidate feature/proof expansions correctly rejected for lack of mechanical proof. However, fresh review reproduced two implementation/validation seams that final assurance must own: the unresolved L6 process/DNS boundary and safety-critical retry/conditional-skip qualification. The campaign therefore combines narrow implementation where evidence requires it with whole-system hardening, release reproducibility, performance/resource sanity, dependency/toolchain hygiene, documentation truth, and independent certification.

If H0/H1 discovers a P0/P1 implementation defect, repair it immediately and continue the campaign. If no such defect exists, do not manufacture features; complete the assurance/certification work and stop.

## Completion definition

Nightwatch may be called project-complete for the present owner-authorized scope only when:

1. every tracked file is freshly inventoried and role-reviewed at the execution head;
2. all P0/P1 defects found by the campaign are fixed with regressions;
3. all material P2 findings are fixed or explicitly justified as non-blocking;
4. core CLI, campaign, source-intelligence, evidence, triage, Control Center, safety, continuity, and project-truth journeys are traced end-to-end;
5. the full validation matrix passes from a clean checkout on the supported Node baseline;
6. all skipped tests have explicit defensible dispositions;
7. install/build/package/runtime paths are independent of accidental ambient state;
8. privacy, containment, owner-scope, no-publication and sibling-read-only boundaries remain intact;
9. docs and machine truth agree on current status;
10. external CI is either genuinely executed and green or explicitly recorded as unavailable external non-evidence;
11. no known release-blocking defect, placeholder, disabled critical validation, materially stale current-state claim, unexplained safety retry, or unresolved L6 claim mismatch remains;
12. complete process/network isolation is claimed only if L6 is mechanically proven; otherwise full-completion certification terminates blocked.
