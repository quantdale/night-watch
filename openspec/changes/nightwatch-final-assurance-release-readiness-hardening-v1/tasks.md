# Tasks — Final Assurance + Release-Readiness Hardening

## M0 — Takeover and state transition

- [ ] Pull/reconcile current `origin/main` without force; record exact HEAD, branch, origin, Node and npm.
- [ ] Read `AGENTS.md`, `.agent/PLANNER_HANDOFF.md`, `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, durable project docs and this OpenSpec.
- [ ] Create `.agent/tasks/nightwatch-final-assurance-release-readiness-hardening-v1/{SPEC,PLAN,STATE,REPORT}.md` using continuity v2.
- [ ] Transition the execution prompt to `IN_PROGRESS` and route `ACTIVE_TASK` to the new task only when work begins.
- [ ] Run `npm run handoff:check`, `npm run agent:check`, `npm run project:check` and record baseline truth.

Exit: continuity/handoff/project state is coherent and the new task is the sole active route.

## M1 — Mandatory literal whole-repository audit

- [ ] Use NUL-safe `git ls-files -z` and account for every tracked path.
- [ ] Read/hash every regular tracked file; require reviewed count == tracked count; classify all files by role/subsystem.
- [ ] Record safe aggregate count/bytes/lines/digests in task state/report.
- [ ] Deep-read every live source/tool/config/workflow/gate file; role-review history/generated/fixture files.
- [ ] Run the required marker/capability/skip/authority/privacy/path scans from `design.md` H0.
- [ ] Diff the live structural census against the prior 1,359-file audit and explain every meaningful change.
- [ ] Build a P0–P3 remediation matrix. Do not implement until M1 findings are recorded, except to stop a discovered active safety hazard.

Exit: 100% tracked-path accounting; no unexplained file; prioritized evidence-backed findings exist.

## M2 — Architecture and end-to-end authority audit

- [ ] Trace environment/browser/proxy/evidence chain.
- [ ] Trace source/proof/lifecycle/eligibility/campaign chain.
- [ ] Trace candidate/replay/minimization/triage/dossier/finding chain.
- [ ] Trace Control Center authority/adapters/coordinator/server/UI chain.
- [ ] Trace planner/handoff/task/project-state/gate chain.
- [ ] Trace package script/gate definition/inventory/runner/clean-runner chain.
- [ ] Identify duplicate authorities, fallback selectors, stale caches, silent normalization, unchecked state, error swallowing and lifecycle leaks.
- [ ] Reproduce every material suspected defect before repair where practical.

Exit: every core workflow has one documented authority path and all P0/P1 defects have executable reproductions or are marked false hypotheses.

## M3 — Repair P0/P1 defects

- [ ] Fix all P0 findings immediately, preserving fail-closed boundaries.
- [ ] Fix all P1 findings before unrelated P2 work.
- [ ] Add regression tests for every material defect.
- [ ] Run focused and dependency-cone validation after each repair.
- [ ] Never weaken assertions/proof thresholds/safety/privacy checks to recover green.

Exit: zero open P0/P1 findings; affected cones green.

## M4 — Skipped-test and validation-gap hardening

- [ ] Enumerate exact identities of all Playwright skips and nested-runner skips.
- [ ] Classify each using the allowed dispositions in `design.md`.
- [ ] Remove obsolete skips, run locally executable cases, or add deterministic substitutes when justified.
- [ ] Prove environment guards are narrow and cannot accidentally hide ordinary local failures.
- [ ] Record the terminal skip set and exact rationale.

Exit: zero unexplained skips and zero blocking validation gaps.

## M5 — Dependency/install/build/toolchain qualification

- [ ] Verify root `package.json`/lockfile and nested Control Center package/lockfile consistency.
- [ ] Perform fresh `npm ci` paths under supported Node 20 and prove lifecycle/global-state assumptions.
- [ ] Audit direct dependencies by runtime/fixture/test/build role; investigate legacy packages rather than reflexively upgrading them.
- [ ] Verify Control Center typecheck/test/build/browser qualification from clean state.
- [ ] Verify generated/ignored outputs and no accidental committed build/cache/private artifacts.
- [ ] Repair demonstrated dependency, install or reproducibility defects and requalify affected cones.

Exit: clean installation and build are reproducible without ambient credentials, sibling writes, cached modules or global tooling.

## M6 — Performance/resource and lifecycle hardening

- [ ] Baseline wall time/peak RSS for the representative commands in `design.md` H5.
- [ ] Profile only material hot paths; inspect repeated tree scans, repeated parsing/serialization, process spawning, large retained collections, timer/listener cleanup and refresh amplification.
- [ ] Fix material regressions/unbounded behavior; avoid brittle microbenchmark work.
- [ ] Add broad sanity ceilings/trend checks only when stable across repeated local runs.
- [ ] Repeat benchmarks after repairs and record before/after evidence.

Exit: no known material resource leak/unbounded path/severe performance regression in intended workloads.

## M7 — Operator, documentation and truth synchronization

- [ ] Cross-check README/AGENTS/CURRENT_STATE/ROADMAP/ARCHITECTURE/SAFETY_MODEL/DECISIONS against implementation and machine truth.
- [ ] Verify authoritative documented commands exist and behave as stated.
- [ ] Verify current vs historical status is obvious enough for a fresh autonomous agent.
- [ ] Verify Control Center/status/intelligence CLI outputs do not overstate unavailable/stale/blocked/unknown evidence.
- [ ] Update only genuinely stale current-facing documentation; preserve historical records.

Exit: no material current-state contradiction or misleading completion/authority claim remains.

## M8 — Full regression and release certification

- [ ] `npm run typecheck`
- [ ] `npm run control-center:ui:typecheck`
- [ ] `npm run control-center:ui:test`
- [ ] `npm run control-center:ui:build`
- [ ] `npm run control-center:ui:browser`
- [ ] `npm run hardening:check`
- [ ] `npm run handoff:check`
- [ ] `npm run project:check`
- [ ] `npm run quality-gate:spec`
- [ ] `npm run gate:inventory`
- [ ] `npm run test:semantic-compat`
- [ ] `npm run test:owner-provenance`
- [ ] `npm run campaign:synthetic`
- [ ] Run every new focused regression.
- [ ] Run complete canonical Playwright serially; record pass/skip/fail and wall/RSS.
- [ ] Run topology-correct isolated complete suite; require pass/fail and skip-identity parity.
- [ ] `npm run gate:local`
- [ ] `npm run gate:clean`
- [ ] Verify `git diff --check`, secret/debug/generated-output hygiene, clean working tree.
- [ ] Execute representative CLI/Control Center/local-fixture smoke journeys.
- [ ] If Actions is available, observe one exact-head run and require real executed steps + PASS; otherwise record truthful external non-evidence without workflow churn/retry loops.

Exit: all required local/clean checks green, no unexplained skip, no open P0/P1, no blocking P2, no privacy/safety boundary regression.

## M9 — Terminal project-completion certification

- [ ] Update task `STATE.md`, `PLAN.md`, `REPORT.md`, this OpenSpec checklist and current project docs with exact earned evidence.
- [ ] Choose exactly one terminal outcome from `proposal.md`.
- [ ] Transition `.agent/EXECUTION_PROMPT.md` and `ACTIVE_TASK` to coherent terminal `COMPLETE` or `BLOCKED` state.
- [ ] Commit only validated durable checkpoints; push without force; verify local HEAD == `origin/main`.
- [ ] If documentation-only closure follows the implementation anchor, preserve implementation-vs-documentation SHA roles.
- [ ] Stop when remaining work is speculative, low-value, separately authorized, or externally blocked.

Exit: another agent can pull the repo and determine project truth without this conversation.
