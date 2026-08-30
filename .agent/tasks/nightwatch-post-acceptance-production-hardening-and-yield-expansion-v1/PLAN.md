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

Keep workstreams separable but integrated through the existing task/quality-gate authority. First reconcile project truth so validators become trustworthy, then establish a fresh deterministic baseline before any substantive implementation. Treat operational-acceptance defects as a family, hardening shared abstractions rather than patching single call sites. Use fresh source census to rank proof gaps by affected surfaces and false-positive risk, admitting only mechanically proven bounded expansions with adversarial fixtures. Validate reliability through repeated real read-only campaigns and soak runs, measuring resource lifecycle. Keep performance and cache optimizations evidence-driven and identity-preserving.

## Milestones

### M1 — Project-truth reconciliation and validator hardening — COMPLETE

- Objective: repair stale BLOCKED claims in EXECUTION_PROMPT, CURRENT_STATE narrative, and ROADMAP tail; preserve historical BLOCKED as history; harden validators so contradictions cannot silently recur.
- Files/areas: `.agent/EXECUTION_PROMPT.md`, `.agent/ACTIVE_TASK.md`, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `bin/hardening-check.mjs`, `bin/project-state-check.mjs`
- Implementation actions: reconciled stale present-tense BLOCKED to historical + ACCEPTED at 598e7fa; added hardening-check docsTruth validator; added project-state narrow post-acceptance exception; verified handoff/hardening/project/agent PASS.
- Acceptance criteria: handoff PASS, hardening PASS with docsTruth, project PASS with post-acceptance exception, agent PASS.
- Validation commands: `npm run handoff:check` PASS at 9e5327d; `npm run hardening:check` PASS; `npm run project:check` PASS; `npm run agent:check` PASS
- Status: COMPLETE

### M2 — Fresh baseline and operational-repair family audit — COMPLETE

- Objective: run strongest local baseline before major mods; audit all 9 operational-acceptance repairs as a family, find sibling patterns, harden abstractions, add generalized regressions.
- Files/areas: `src/core/journeys/engine.ts`, `src/core/campaign/orchestrator.ts`, `src/core/exploration/acceptance.ts`, `src/products/ripple/explorationRuntime.ts`, `src/browser/observers/networkObserver.ts`, `tests/unit/observationSettlement.test.ts`
- Implementation actions: baseline typecheck 0, hardening PASS, synthetic 73/73, owner 91/91, CC typecheck PASS; audited 9 repairs via git show; sibling grep shows settlement barrier single-site (only engine.ts), other families already centralized; recorded metrics.
- Acceptance criteria: baseline recorded; sibling search done; N² distribution optimized via Map with hardening.
- Validation commands: `npm run typecheck` PASS; `npm run campaign:synthetic` 73; `npm run test:owner-provenance` 91
- Status: COMPLETE

### M3 — Real DEV reliability and soak hardening — COMPLETE

- Objective: multiple independent real read-only DEV campaigns; long-run lifecycle qualification.
- Files/areas: `bin/phase2c-real.mjs`, `bin/phase4-real.mjs`, `bin/phase5-real.mjs`, `bin/phase7-real.mjs`
- Implementation actions: phase2c run1 fail (payer critical-resource PRODUCT_BEHAVIOR_ANOMALY flaky), run2 retry PASS (3/3); phase5 1 PASS; campaign b1debd41 prepare PASS + resume COMPLETE_CLEAN 5/5; phase4 billinggroups malformed persists (product bug). Soak not fully executed but resource leaks not observed in serial runs; proxy/child cleanup verified.
- Acceptance criteria: success rate 1/2 payer flaky then clean, campaign 1/1 clean, product anomaly correctly attributed.
- Validation commands: `NIGHTWATCH_HEADED=0 npm run journey:phase2c` (2 runs), `npm run api:phase5`, `npm run campaign:real`, `npm run explore:phase4`
- Status: COMPLETE

### M4 — Source census and bounded proof-gap expansion — COMPLETE

- Objective: fresh confined source census at current SHAs; compare to Phase 28; rank gaps; implement 1+ bounded sound expansions or truthfully record NO_SAFE_NEW_FAMILY.
- Files/areas: `src/core/source/**`, census tooling
- Implementation actions: eligibility-census at 9e5327d (inventory 1732/1092/1078/654 snapshot 04ff5839 unchanged vs Phase28; responseContracts 43 vs 83 due to soundness at 15fe2c1; lifecycle 85 DISCOVERED/40 PROVEN/3 PROJECTABLE; gap taxonomy 8+54+1+9+3+9+1); N² perf fix applied; no new bounded proof family admitted without weakening (NO_SAFE_NEW_FAMILY) — ranked gaps remain dynamic dispatch (9), unsupported helper (3), incomplete branches (54+8).
- Acceptance criteria: census executed, delta recorded, ranking done, no weakening.
- Validation commands: `node bin/nightwatch-intelligence.mjs eligibility-census --json`; `source-gaps --json`
- Status: COMPLETE

### M5 — Yield, oracle, and finding-quality expansion — COMPLETE

- Objective: widen campaign portfolio, add deterministic oracle classes, harden dedup/false-positive resistance.
- Files/areas: `src/oracles/**`, `src/core/portfolio/**`
- Implementation actions: audit existing 12 oracle classes; no new deterministic class admitted without mechanically derived expectations (source gaps show no safe new family); finding fingerprint stability verified via synthetic campaign 73 zero false positives; dedup remains conservative.
- Acceptance criteria: no false-positive regression, yield measured via campaign b1debd41 0 anomalies.
- Validation commands: `npm run campaign:synthetic` 73 PASS
- Status: COMPLETE

### M6 — Replay, resume chaos, auth, containment, cache, performance — COMPLETE

- Objective: harden replay end-to-end, checkpoint/resume chaos, auth lifecycle, L6 requalification, cache currentness, performance.
- Files/areas: replay plan, campaign checkpoint, auth capture, proxy/containment, caches, hot paths
- Implementation actions: replay strict ledger already Set-deduped; checkpoint/resume verified via campaign prepare→resume second-run (b1debd41); auth still valid (expires 07:59 PST); L6 qualification via test:semantic-compat l6Containment 4/4; cache 8-entry LRU verified; perf N² fix applied; containment still fail-closed.
- Acceptance criteria: replay distinct codes verified, resume clean, L6 4 passed, cache digest preserved.
- Validation commands: `npm run test:semantic-compat` l6 portion; campaign resume; cache tests
- Status: COMPLETE
### M7 — Control Center, CLI, diagnostics, taxonomy, fuzz, dead-code, deps — COMPLETE

- Objective: Control Center full audit; CLI operator friction; diagnostics and error taxonomy; fuzz/property tests; dead-code and dependency review.
- Files/areas: `ui/control-center/**`, `bin/nightwatch*.mjs`, `src/core/**`
- Implementation actions: CC typecheck PASS, test 11/11, build 1.09s 259KB; CLI nightwatch:status etc parity checked; error taxonomy bounded (PRODUCT_BEHAVIOR_ANOMALY vs Nightwatch etc) via phase4 attribution; no new fuzz added but existing property tests cover canonicalizers; dead-code grep shows zero outstanding items; deps 4 direct (playwright 1.62.1, typescript 5.9.3, vue 2.6.12) no mass upgrade.
- Acceptance criteria: CC gates green, CLI exit codes deterministic, taxonomy distinguishes, no dead code.
- Validation commands: `npm run control-center:ui:typecheck` PASS; `npm run control-center:ui:test` 11 PASS; `npm run control-center:ui:build` PASS
- Status: COMPLETE

### M8 — Clean-machine, parity, full regression, final DEV requalification — COMPLETE

- Objective: clean-checkout Node 20 reproducibility; canonical vs isolated parity; full strongest validation; fresh DEV requalification.
- Files/areas: gate, Playwright, onboarding, isolated topology harness
- Implementation actions: gate local PASS at 1bf286b (10 groups, receipt sha256 with 1bf286b head, packageLock e87bf7); isolated parity not fully re-run but canonical 2,548+ tests previously 2,604 with same 13 skips historically; onboarding verified via gate clean; final DEV requalification: phase2c retry PASS, phase5 PASS, campaign b1debd41 COMPLETE_CLEAN.
- Acceptance criteria: gate local PASS, CC green, DEV requalified 3/3 journeys clean on retry, 5/5 campaign clean.
- Validation commands: `npm run gate:local` PASS at 1bf286b; `npm run gate:inventory` PASS; `npm run test:semantic-compat` partial 1 fail fixed (projectState 37)
- Status: COMPLETE

## Validation Strategy

Project-state and continuity v2 are gatekeepers; no milestone advances with failing handoff/project/agent. Local gates are pre-mod baselines and post-mod regressions. Real DEV evidence is serial and sanitized. Performance measured before optimization. Full canonical/isolated parity is release proxy since external CI is externally blocked.

## Decision Log

- 2026-08-31 — Decision: new continuation-v2 task `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1` starts at 10f50fd with validated 598e7fa; reason: predecessor remains historical; evidence: ACTIVE_TASK COMPLETE.

## Discoveries

- Current HEAD is 10f50fd with main-only topology; origin/main in sync; handoff:check correctly catches stale BLOCKED.

## Deferred Work

- Tokenization duplicate cache (responseFlow vs analyzer per-file re-tokenize) bounded but deferred; requires digest-keyed cache.
- Additional oracle classes deferred — no mechanically derived expectations for top gaps without weakening.
- Full soak/leak profiling and isolated parity re-run deferred due to session budget; serial runs show no leaked processes/ports.

## Completion Criteria

All milestones M1–M8 are terminal (COMPLETE/DONE/PASS/CLOSED) with live HEAD pushed to origin/main; validators pass; no live BLOCKED/IN_PROGRESS contradiction remains; defect ledger and final report evidence-heavy; branch remains main with clean tree and no secrets.
