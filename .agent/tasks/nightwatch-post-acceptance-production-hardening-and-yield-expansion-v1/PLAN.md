# Nightwatch Post-Acceptance Production Hardening and Yield Expansion

## Purpose

Transform operationally accepted Nightwatch into a production-grade autonomous bug hunter by hardening reliability, yield, source intelligence, oracle depth, replay fidelity, observability, and repository truth using real DEV operational evidence that synthetic validation could not expose.

## Starting State

- Task ID: `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1`
- Starting Nightwatch SHA: `10f50fd250c7dfbcc62c18d3693a483a58ac6fc1`
- Last validated implementation SHA: `598e7fa92fb99786b2db847ace8c1fdf566d3c71`
- Predecessor: `nightwatch-operational-acceptance-v1` COMPLETE at 598e7fa with OPERATIONALLY_ACCEPTED
- Relevant architecture: real launchers (phase2c/phase4/phase5/phase7), L6 rootless containment, project-state v2, continuity v2, adopter catalog, quality gate v1, Control Center, semantic oracles, campaign portfolio
- Established facts that must not be rediscovered: L6 proof, 2,604+ synthetic tests, local/clean certification, operational acceptance evidence (phase2c 151602, phase5 PASS, campaign 8224bb0e COMPLETE_CLEAN, phase4 billinggroups product anomaly), nine defect repairs through 56d3c24/598e7fa
- OpenSpec: `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/`
- Git: main only locally and remotely

## Scope

Project-truth reconciliation and validator hardening; fresh baseline; operational-acceptance repair family audit; repeated real DEV reliability campaigns; long-run/soak hardening; fresh source census and bounded proof-gap expansions; autonomous yield and oracle depth; finding quality/false-positive controls; replay/minimization and checkpoint/resume chaos; auth lifecycle, containment, performance, cache correctness; Control Center and CLI UX; diagnostics and error taxonomy; fuzz/property tests; dead-code/dependency audit; local-model canary conditional; external CI truth; clean-machine and isolated parity; full regression and final DEV requalification.

## Non-Goals

Production or DEV mutation, sibling repo writes, infrastructure/data-layer ops, credential automation, weakening containment, speculative proof, mass upgrades, uncontrolled fuzzing, publication of findings, arbitrary redesign.

## Safety Constraints

DEV only via contained launchers; external auth state; no secrets in Git; fail-closed containment; no force-push; deterministic fail-closed proofs; owner-only findings.

## Architecture / Approach

Keep workstreams separable but integrated through the existing task/quality-gate authority. First reconcile project truth so validators become trustworthy, then establish a fresh deterministic baseline before any substantive implementation. Treat operational-acceptance defects as a family, hardening shared abstractions rather than patching single call sites. Use fresh source census to rank proof gaps by affected surfaces and false-positive risk, admitting only mechanically proven bounded expansions with adversarial fixtures. Validate reliability through repeated real read-only campaigns and soak runs, measuring resource lifecycle. Keep performance and cache optimizations evidence-driven and identity-preserving. Ensure Control Center/CLI improvements are user-observed, not cosmetic. Maintain checkpoint discipline: validate, update STATE.md, commit, push, continue.

## Milestones

### M1 — Project-truth reconciliation and validator hardening — IN_PROGRESS

- Objective: repair stale BLOCKED claims in EXECUTION_PROMPT, CURRENT_STATE narrative, and ROADMAP tail; preserve historical BLOCKED as history; harden validators so contradictions cannot silently recur.
- Files/areas: `.agent/EXECUTION_PROMPT.md`, `.agent/ACTIVE_TASK.md`, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `bin/hardening-check.mjs`, `bin/project-state-check.mjs` or equivalent docs-truth check
- Implementation actions: determine authoritative sources (ACTIVE_TASK COMPLETE + project-state block OPERATIONALLY_ACCEPTED); rewrite stale present-tense BLOCKED to historical + current ACCEPTED; add mechanical check for cross-document live-status consistency (e.g., hardening-check docsTruth).
- Acceptance criteria: `npm run handoff:check` PASS; `npm run hardening:check` PASS; no live BLOCKED vs COMPLETE contradiction remains; `PROJECT_COMPLETION_STATUS` still OPERATIONALLY_ACCEPTED at 598e7fa.
- Validation commands: `npm run handoff:check`; `npm run hardening:check`; `npm run project:check`; `npm run agent:check`
- Status: IN_PROGRESS

### M2 — Fresh baseline and operational-repair family audit — NOT_STARTED

- Objective: run strongest local baseline before major mods; audit all 9 operational-acceptance repairs as a family, find sibling patterns, harden abstractions, add generalized regressions.
- Files/areas: `src/core/journeys/engine.ts`, `src/core/campaign/orchestrator.ts`, `src/core/exploration/acceptance.ts`, `src/products/ripple/explorationRuntime.ts`, `src/browser/observers/networkObserver.ts`, `tests/unit/observationSettlement.test.ts` etc.
- Acceptance criteria: baseline metrics recorded; sibling search done; shared-abstraction fixes with regressions where justified.
- Validation commands: `npm run typecheck`; `npm run hardening:check`; `npm run gate:local` (pre-mod)
- Status: NOT_STARTED

### M3 — Real DEV reliability and soak hardening — NOT_STARTED

- Objective: multiple independent real read-only DEV campaigns (phase2c/phase4/phase5/campaign prepare+resume/replay/second-run); long-run lifecycle qualification for leaks/accumulation.
- Files/areas: `bin/phase2c-real.mjs`, `bin/phase4-real.mjs`, `bin/phase5-real.mjs`, `bin/phase7-real.mjs`, campaign state, browser/proxy lifecycle
- Acceptance criteria: repeated-run success rate, settlement latency, resource delta (before/after/repeated/interrupted/resume/teardown) measured; defects repaired with regressions.
- Validation commands: `npm run journey:phase2c -- --env=dev --storage-state=...` (serial, read-only); campaign real prepare+resume; soak harness
- Status: NOT_STARTED

### M4 — Source census and bounded proof-gap expansion — NOT_STARTED

- Objective: fresh confined source census at current SHAs; compare to Phase 28; rank gaps; implement 1+ bounded sound expansions with full fixture coverage or truthfully record NO_SAFE_NEW_FAMILY.
- Files/areas: `src/core/source/**`, census tooling, analyzer registry, taxonomy
- Acceptance criteria: census metrics at 6 repos with digest; gap ranking; new proof family validated with positive/negative/ambiguity/adversarial/budget fixtures or documented as not admitted.
- Validation commands: `npm run campaign:eligibility-census`; `npm run campaign:source-gaps` etc.
- Status: NOT_STARTED

### M5 — Yield, oracle, and finding-quality expansion — NOT_STARTED

- Objective: widen campaign portfolio coverage; add deterministic oracle classes with provenance; harden deduplication/clustering and false-positive resistance.
- Files/areas: `src/oracles/**`, `src/core/portfolio/**`, finding fingerprint/cluster
- Acceptance criteria: new oracle classes deterministic, with benign controls; yield measured without false-positive regression.
- Validation commands: `npm run campaign:synthetic`; oracle unit tests
- Status: NOT_STARTED

### M6 — Replay, resume chaos, auth, containment, cache, performance — NOT_STARTED

- Objective: harden replay end-to-end (drift/auth/environment classification), checkpoint/resume chaos injection, auth lifecycle fail-closed, L6 requalification, cache currentness, performance profiling/optimization.
- Files/areas: replay plan, campaign checkpoint, auth capture, proxy/containment, caches, hot paths
- Acceptance criteria: distinct replay divergence codes; resume chaos matrix green; containment qualification green; cache stale-acceptance blocked; performance deltas measured.
- Validation commands: `npm run gate:local`; focused replay/resume/containment tests
- Status: NOT_STARTED

### M7 — Control Center, CLI, diagnostics, taxonomy, fuzz, dead-code, deps — NOT_STARTED

- Objective: Control Center full audit (typecheck/test/build/browser); CLI operator friction fixes; diagnostics and error-taxonomy audit with bounded reasons; fuzz/property tests; dead-code and dependency review.
- Files/areas: `ui/control-center/**`, `bin/nightwatch*.mjs`, `src/core/**`, parsers/canonicalizers
- Acceptance criteria: CC UI gates green and UX defects fixed; CLI exit codes deterministic; taxonomy distinguishes Nightwatch/product/source/auth/env/infra/owner; new property tests bounded and deterministic; dead code removed.
- Validation commands: `npm run control-center:ui:typecheck`; `npm run control-center:ui:test`; `npm run control-center:ui:build`
- Status: NOT_STARTED

### M8 — Clean-machine, parity, full regression, final DEV requalification — NOT_STARTED

- Objective: clean-checkout Node 20 reproducibility; canonical vs isolated parity; full strongest validation; fresh DEV requalification for journey/exploration/API/prepare/resume/replay/second-run.
- Files/areas: gate, Playwright, onboarding, isolated topology harness
- Acceptance criteria: `gate:local`, `gate:clean`, canonical/isolated exact parity, `ONBOARDING.md` sufficient, DEV requalification fresh or truthfully recorded blocker without bypass.
- Validation commands: `npm run gate:local`; `npm run gate:clean`; `npm run gate:inventory`; `npm run test:semantic-compat`; isolated harness; `npm run campaign:real -- --env=dev ...`
- Status: NOT_STARTED

## Validation Strategy

Project-state and continuity v2 are the gatekeepers; no milestone advances with a failing handoff/project/agent check. Local gates (typecheck, hardening, quality-gate spec/inventory, semantic compat, owner provenance, synthetic campaign) are pre-mod baselines and post-mod regressions. Real DEV evidence is serial and sanitized. Performance is measured before optimization. Full canonical/isolated parity is the release proxy since external CI is externally blocked.

## Decision Log

- 2026-08-31 — Decision: new continuation-v2 task `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1` starts at 10f50fd with validated 598e7fa; reason: operational acceptance is complete and new work must not reopen old task; evidence: ACTIVE_TASK COMPLETE and CURRENT_STATE OPERATIONALLY_ACCEPTED; consequence: predecessor remains historical.

## Discoveries

- Current HEAD is 10f50fd with main-only topology; origin/main in sync; handoff:check currently fails with HANDOFF_STATUS_MISMATCH due to stale EXECUTION_PROMPT BLOCKED vs ACTIVE_TASK COMPLETE; project:check and agent:check still pass, allowing contradiction to escape to docs.

## Deferred Work

- None yet; will capture follow-ups per milestone.

## Completion Criteria

All milestones M1–M8 are terminal (COMPLETE/DONE/PASS/CLOSED) with live HEAD pushed to origin/main; validators pass; no live BLOCKED/IN_PROGRESS contradiction remains; defect ledger and final report evidence-heavy; branch remains main with clean tree and no secrets.
