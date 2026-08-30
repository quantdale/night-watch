# Nightwatch Post-Acceptance Production Hardening and Yield Expansion

## Task purpose

Strengthen the already operationally accepted Nightwatch (OPERATIONALLY_ACCEPTED at 598e7fa) into a more reliable, higher-yield, better-observed, more reproducible autonomous bug-hunting system. Use real DEV operational evidence to expose and eliminate weaknesses previously hidden behind synthetic validation, expanding source intelligence, oracle depth, replay fidelity, campaign reliability, observability, and repository truth.

## Established starting state

- Task ID: `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1`
- Phase: `POST_ACCEPTANCE_PRODUCTION_HARDENING_AND_YIELD_EXPANSION_V1`
- Authorization class: `NIGHTWATCH_POST_ACCEPTANCE_PRODUCTION_HARDENING_AND_YIELD_EXPANSION_V1`
- Starting SHA: `10f50fd250c7dfbcc62c18d3693a483a58ac6fc1` (documentation descendant after operational acceptance)
- Last validated implementation SHA at task start: `598e7fa92fb99786b2db847ace8c1fdf566d3c71`
- Predecessor: `nightwatch-operational-acceptance-v1` (`COMPLETE`, `OPERATIONALLY_ACCEPTED`)
- Continuity protocol: `nightwatch.agent-continuity.v2`
- Project state: `OPERATIONALLY_ACCEPTED` (machine-checked truth block at 598e7fa; CURRENT_STATE narrative and ROADMAP tail previously stale BLOCKED — reconciled as first milestone)
- Known predecessor repairs (9 fixes through 598e7fa): QSelect semantics, active detection, exact option matching, anchor-decision visibility, pending-only oracle settlement, child stdio forwarding, failed checkpoint truth, exploration failure attribution, replay divergence
- OpenSpec route: `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/`
- Planned-From: `10f50fd250c7dfbcc62c18d3693a483a58ac6fc1`
- Git topology: `main` only locally and remotely

## Required deliverables

- A continuity-v2 successor task bound as the active campaign with IN_PROGRESS status and correct anchor SHAs.
- Project-truth reconciliation: stale EXECUTION_PROMPT BLOCKED and CURRENT_STATE/ROADMAP present-tense BLOCKED corrected to historical + current OPERATIONALLY_ACCEPTED, with mechanical validator hardening so the same class of contradiction cannot silently recur.
- Fresh baseline establishment: typecheck, hardening:check, quality-gate:spec, gate:inventory, test:semantic-compat, agent:check, agent:audit, project:check, campaign:synthetic, test:owner-provenance, gate:local, Control Center UI typecheck/test/build, browser tests.
- Audit of operational-acceptance repairs as a family: root-cause, sibling-pattern search, shared-abstraction hardening, generalized regressions.
- Repeated real read-only DEV campaigns (phase2c, phase4, phase5, campaign prepare/resume/replay/second-run) with reliability metrics.
- Long-run/soak hardening: lifecycle, leak, and cumulative-failure qualification.
- Fresh approved-source census at current SHAs with comparison to Phase 28, plus bounded source-analysis expansions that fail closed.
- Autonomous bug-yield and semantic-oracle depth expansion with deterministic evidence and false-positive controls.
- Finding-quality, replay/minimization, checkpoint/resume chaos, auth lifecycle, containment, performance, and cache-correctness hardening with permanent regressions.
- Control Center and CLI/operator UX audit with material improvements.
- Diagnostics/observability and error-taxonomy audit with bounded categorical reasons.
- Fuzz/property/metamorphic hardening for pure deterministic cores.
- Dead-code/stale-architecture audit, dependency/supply-chain review, and local-model canary conditional.
- Clean-machine reproducibility and canonical/isolated parity verification.
- Full regression (typecheck, hardening, quality-gate, semantic compat, owner provenance, synthetic, agent/project, gate:local, gate:clean, Playwright, Control Center, isolated) without retries where required, plus final real DEV requalification.

## Explicit non-goals

Production contact, DEV mutation, database/infrastructure modification, sibling repository writes, bypassing auth, weakening L6/L5 egress containment, credential persistence in Git, publication of findings, external issue creation, customer messaging, arbitrary canonical self-promotion, speculative inference without fail-closed proof, mass dependency upgrades, uncontrolled high-volume fuzzing, arbitrary visual redesign without usability defect.

## Safety constraints

- DEV only (`appdev.alphaus.cloud` / `apidev.alphaus.cloud`) via existing contained launchers.
- External storage-state remains outside repository; no secrets in Git/task files.
- No mutation, no infrastructure/data-layer operations excluded by owner policy (FROZEN_BY_OWNER).
- L0–L6 containment remains fail-closed; no weakening of boundaries to make tests pass.
- No force-push; topology remains main-only.
- All new proofs/oracles are deterministic, bounded, and fail closed; AI remains advisory.
- Sanitized evidence only; raw customer values never cross projection boundary.

## Acceptance criteria

- `npm run agent:check`, `npm run agent:audit`, `npm run project:check`, `npm run handoff:check`, `npm run hardening:check`, `npm run typecheck`, `npm run gate:local` pass on the new task without weakening thresholds.
- Stale present-tense BLOCKED claims in EXECUTION_PROMPT, CURRENT_STATE, and ROADMAP are corrected and mechanically prevented from recurring via hardened validators.
- Multiple independent real read-only DEV campaigns have fresh evidence (phase2c/phase4/phase5/campaign prepare/resume/replay) or truthfully recorded blockers; no false success/failure.
- Fresh source census is recorded at current SHAs and compared to Phase 28; at least one bounded source-analysis expansion is proven with positive/negative/ambiguity fixtures or truthfully recorded as NO_SAFE_NEW_FAMILY.
- Hardened subsystems have permanent regressions; quality gate and full canonical/isolated parity are green with deterministic counts.
- Final project-state reconciliation leaves no contradictory live BLOCKED/IN_PROGRESS/PENDING claims across ACTIVE_TASK, STATE, REPORT, EXECUTION_PROMPT, CURRENT_STATE, and ROADMAP.
