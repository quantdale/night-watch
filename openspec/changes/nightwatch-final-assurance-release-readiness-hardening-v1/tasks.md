# Tasks — Final Assurance + Release-Readiness Hardening

## M0 — Takeover and state transition

- [x] Pull/reconcile current `origin/main` without force; record exact HEAD, branch, origin, Node and npm.
- [x] Read `AGENTS.md`, `.agent/PLANNER_HANDOFF.md`, `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, durable project docs and this OpenSpec.
- [x] Create `.agent/tasks/nightwatch-final-assurance-release-readiness-hardening-v1/{SPEC,PLAN,STATE,REPORT}.md` using continuity v2.
- [x] Transition the execution prompt to `IN_PROGRESS` and route `ACTIVE_TASK` to the new task only when work begins.
- [x] Run `npm run handoff:check`, `npm run agent:check`, `npm run project:check` and record baseline truth.

Exit: continuity/handoff/project state is coherent and the new task is the sole active route.

## M1 — Mandatory literal whole-repository audit

- [x] Use NUL-safe `git ls-files -z` and account for every tracked path.
- [x] Read/hash every regular tracked file; require reviewed count == tracked count; classify all files by role/subsystem.
- [x] Record safe aggregate count/bytes/lines/digests in task state/report.
- [x] Deep-read every live source/tool/config/workflow/gate file; role-review history/generated/fixture files.
- [x] Run the required marker/capability/skip/authority/privacy/path scans from `design.md` H0.
- [x] Diff the live structural census against the prior 1,359-file audit and explain every meaningful change.
- [x] Build a P0–P3 remediation matrix. Do not implement until M1 findings are recorded, except to stop a discovered active safety hazard.

Exit: 100% tracked-path accounting; no unexplained file; prioritized evidence-backed findings exist.

## M2 — Architecture and end-to-end authority audit

- [x] Trace environment/browser/proxy/evidence chain.
- [x] Trace source/proof/lifecycle/eligibility/campaign chain.
- [x] Trace candidate/replay/minimization/triage/dossier/finding chain.
- [x] Trace Control Center authority/adapters/coordinator/server/UI chain.
- [x] Trace planner/handoff/task/project-state/gate chain.
- [x] Trace package script/gate definition/inventory/runner/clean-runner chain.
- [x] Identify duplicate authorities, fallback selectors, stale caches, silent normalization, unchecked state, error swallowing and lifecycle leaks.
- [x] Reproduce every material suspected defect before repair where practical.

Exit: every core workflow has one documented authority path and all P0/P1 defects have executable reproductions or are marked false hypotheses.

## M3 — Repair P0/P1 defects

- [x] Fix all P0 findings immediately, preserving fail-closed boundaries.
- [ ] Fix all P1 findings before unrelated P2 work (the L6 residual remains
  deliberately open and fail-closed).
- [x] Add regression tests for every material defect.
- [x] Run focused and dependency-cone validation after each repair.
- [x] Never weaken assertions/proof thresholds/safety/privacy checks to recover green.

Exit: zero open P0/P1 findings; affected cones green.

## M3A — L6 process containment + safety-test authority

- [x] Re-derive the current browser/helper/OOPS child-process and network-egress topology from source.
- [x] Reproduce `inspectOopsSandbox()` locally and record Bubblewrap availability, namespace probe result and relay compatibility using synthetic loopback only.
- [x] Verify real/authenticated OOPS remains disabled and no alternate launcher bypasses that decision.
- [x] Build a minimal adversarial L6 matrix for direct DNS, TCP, UDP, HTTP and permitted synthetic proxy/relay flow.
- [x] Design the narrowest unprivileged/rootless L6 envelope; reject any design that needs root, privileged firewall/network administration, system-wide proxy/DNS/hosts changes, TLS MITM, or live external probes.
- [x] If safely implementable, add versioned L6 capability/runtime identity, startup/liveness/cleanup checks, process-launch binding and fail-closed readiness integration.
- [x] If not safely implementable, encode the unsupported/residual state mechanically and block any route or completion claim that would require complete process isolation.
- [x] Run the WebSocket containment smoke matrix with retries disabled; remove the stale retry workaround if the race is no longer reproducible, otherwise repair the underlying registration/lifecycle defect first.
- [x] Replace release-critical restricted-OOPS binary-absence skips with deterministic clean qualification where practical; otherwise classify the exact tests as `BLOCKING_VALIDATION_GAP`.
- [x] Add permanent regressions for every defect found in this workstream.

Exit: no silent L6 claim inflation; no unsafe authenticated OOPS route; no safety-critical retry masking; restricted subprocess behavior is deterministically qualified or terminal certification is blocked.

## M4 — Skipped-test and validation-gap hardening

- [x] Enumerate exact identities of all Playwright skips and nested-runner skips.
- [x] Classify each using the allowed dispositions in `design.md`.
- [x] Remove obsolete skips, run locally executable cases, or add deterministic substitutes when justified.
- [x] Prove environment guards are narrow and cannot accidentally hide ordinary local failures.
- [x] Record the terminal skip set and exact rationale.

Exit: zero unexplained skips and zero blocking validation gaps.

## M5 — Dependency/install/build/toolchain qualification

- [x] Verify root `package.json`/lockfile and nested Control Center package/lockfile consistency.
- [x] Perform fresh `npm ci` paths under supported Node 20 and prove lifecycle/global-state assumptions.
- [x] Audit direct dependencies by runtime/fixture/test/build role; investigate legacy packages rather than reflexively upgrading them.
- [x] Verify Control Center typecheck/test/build/browser qualification from clean state.
- [x] Verify generated/ignored outputs and no accidental committed build/cache/private artifacts.
- [x] Repair demonstrated dependency, install or reproducibility defects and requalify affected cones.

Exit: clean installation and build are reproducible without ambient credentials, sibling writes, cached modules or global tooling.

## M6 — Performance/resource and lifecycle hardening

- [x] Baseline wall time/peak RSS for the representative commands in `design.md` H5.
- [x] Profile only material hot paths; inspect repeated tree scans, repeated parsing/serialization, process spawning, large retained collections, timer/listener cleanup and refresh amplification.
- [x] Fix material regressions/unbounded behavior; avoid brittle microbenchmark work.
- [x] Add broad sanity ceilings/trend checks only when stable across repeated local runs.
- [x] Repeat benchmarks after repairs and record before/after evidence.

Exit: no known material resource leak/unbounded path/severe performance regression in intended workloads.

## M7 — Operator, documentation and truth synchronization

- [x] Cross-check README/AGENTS/CURRENT_STATE/ROADMAP/ARCHITECTURE/SAFETY_MODEL/DECISIONS against implementation and machine truth.
- [x] Verify authoritative documented commands exist and behave as stated.
- [x] Verify current vs historical status is obvious enough for a fresh autonomous agent.
- [x] Verify Control Center/status/intelligence CLI outputs do not overstate unavailable/stale/blocked/unknown evidence.
- [x] Update only genuinely stale current-facing documentation; preserve historical records.

Exit: no material current-state contradiction or misleading completion/authority claim remains.

## M8 — Full regression and release certification

- [x] `npm run typecheck`
- [x] `npm run control-center:ui:typecheck`
- [x] `npm run control-center:ui:test`
- [x] `npm run control-center:ui:build`
- [x] `npm run control-center:ui:browser`
- [x] `npm run hardening:check`
- [x] `npm run handoff:check`
- [x] `npm run project:check`
- [x] `npm run quality-gate:spec`
- [x] `npm run gate:inventory`
- [x] `npm run test:semantic-compat`
- [x] `npm run test:owner-provenance`
- [x] `npm run campaign:synthetic`
- [x] Run every new focused regression.
- [x] Run complete canonical Playwright serially; record pass/skip/fail and wall/RSS.
- [x] Run topology-correct isolated complete suite; require pass/fail and skip-identity parity.
- [x] `npm run gate:local` — PASS, receipt recorded in task STATE.
- [x] `npm run gate:clean` — PASS, fresh Node 20 install and receipt recorded in task STATE.
- [x] Verify `git diff --check`, secret/debug/generated-output hygiene, clean working tree.
- [x] Execute representative CLI/Control Center/local-fixture smoke journeys.
- [x] If Actions is available, observe one exact-head run and require real executed steps + PASS; the single run `33139304292` / job `98746329861` executed zero steps and is recorded as `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` external non-evidence without workflow churn or retries.

Exit: all required local/clean checks green, no unexplained skip or safety-critical retry masking, no open P0/P1, no blocking P2, no privacy/safety boundary regression, and L6/process-isolation truth matches the actual implemented boundary.

## M9 — Terminal project-completion certification

- [x] Update task `STATE.md`, `PLAN.md`, `REPORT.md`, this OpenSpec checklist and current project docs with exact earned evidence.
- [x] Choose exactly one terminal outcome from `proposal.md`.
- [x] Transition `.agent/EXECUTION_PROMPT.md` and `ACTIVE_TASK` to coherent terminal `COMPLETE` or `BLOCKED` state.
- [x] Commit only validated durable checkpoints; push without force; verify local HEAD == `origin/main` (the closure checkpoint was pushed and equality verified before the final exact-head CI observation; this terminal record is also validated for push).
- [x] If documentation-only closure follows the implementation anchor, preserve implementation-vs-documentation SHA roles.
- [x] Stop when remaining work is speculative, low-value, separately authorized, or externally blocked.

Exit: another agent can pull the repo and determine project truth without this conversation.
