# Final Assurance + Release-Readiness Hardening

## Purpose

Qualify the whole live repository and leave a truthful, reproducible release
readiness record for a fresh autonomous agent.

## Starting State

- Task: `nightwatch-final-assurance-release-readiness-hardening-v1`
- Starting SHA: `e26b649c7eded8a50ab9c4c3d8a2197f9c409052`
- Planned-From: `9ecd09c0d33d05d665721080627e5d63b376c16d`
- Branch/remote: `main` / `origin`
- Predecessor: `nightwatch-campaign-handoff-and-project-truth-hardening-v1`,
  terminal COMPLETE
- Baseline handoff, continuity and project-state checks pass before
  activation; the prior implementation anchor is `e4ac7076600f9a347d230445aa312e321f635624`.

## Scope

Whole-repository audit, authority tracing, L6/safety-validation truth,
skipped-test qualification, dependency/install/build reproducibility,
performance/resource sanity, documentation truth, release gates, and
evidence-backed P0/P1/P2 repairs.

## Non-Goals

No product feature expansion, source-proof expansion, real environment,
database/cloud/infrastructure operation, publication, sibling mutation,
runtime AI, canonical promotion, privileged process isolation, or historical
task migration.

## Safety Constraints

Keep all external contact and data-plane activity at zero. Use synthetic
loopback fixtures and disposable local repositories only. Do not weaken any
assertion, validator, proof threshold, privacy sentinel, owner gate,
containment rule, or failure-path check to obtain green output.

## Architecture / Approach

Run dependency-ordered M0–M9. Record H0 aggregate evidence before ordinary
implementation. Use read-only audit tracks for inventory and authority maps,
then repair only reproduced material defects with focused regressions. Keep
L0–L5 and any L6 capability as distinct authorities; if safe rootless L6
closure cannot be proven, preserve fail-closed behavior and select the blocked
terminal result. Finish with clean Node 20, complete canonical/isolated,
local/clean gate, documentation, and Git synchronization evidence.

## Milestones

### M0 — Takeover and state transition — COMPLETE

- Objective: activate this task from the READY handoff and establish baseline
  truth.
- Areas: `.agent/`, Git route, baseline checkers.
- Acceptance: fresh continuity-v2 task is the sole active route; prompt is
  IN_PROGRESS; handoff, agent, and project checks are recorded.
- Validation: `npm run handoff:check`, `npm run agent:check`,
  `npm run project:check`.

### M1 — Literal whole-repository audit — COMPLETE

- Objective: account for and role-review every tracked path and record the
  remediation matrix before ordinary implementation. The NUL-safe census and
  baseline receipts are recorded; deep-read and disposition work remains.
- Validation: NUL-safe inventory, content/metadata digests, Playwright
  enumeration, baseline gate and marker/capability/privacy/path scans.

### M2 — Authority and release-critical behavior audit — IN_PROGRESS

- Objective: trace every required end-to-end authority chain and reproduce
  material suspected defects.
- Validation: focused synthetic journeys and authority regression evidence.

### M3 — P0/P1 repair — IN_PROGRESS

- Objective: close all evidence-backed P0/P1 defects with regressions.
- Validation: affected dependency cones after every repair.

### M3A — L6 containment and safety-test authority — IN_PROGRESS

- Objective: prove or truthfully bound process containment, WebSocket retry
  behavior, and restricted-OOPS qualification without privileged operations.
- Validation: synthetic direct-escape/proxy matrix and deterministic safety
  regressions.

### M4 — Skip and validation-gap hardening — NOT_STARTED

- Objective: classify every terminal skip and eliminate unexplained or
  blocking validation gaps.
- Validation: exact skip identity/guard inventory and complete-suite parity.

### M5 — Dependency/install/build qualification — NOT_STARTED

- Objective: prove clean supported-Node installation and nested UI
  reproducibility without ambient state.
- Validation: disposable Node 20 install, UI typecheck/test/build/browser.

### M6 — Performance/resource and lifecycle hardening — NOT_STARTED

- Objective: measure representative commands and repair demonstrated
  material regressions or leaks.
- Validation: repeated wall/RSS evidence and lifecycle checks.

### M7 — Documentation/operator truth synchronization — NOT_STARTED

- Objective: align current-facing docs, CLI projections and machine truth
  while preserving historical records.
- Validation: command and status smoke journeys plus cross-document review.

### M8 — Full regression and release certification — NOT_STARTED

- Objective: execute the complete OpenSpec validation matrix locally and in a
  disposable Node 20 clean checkout.
- Validation: all required package, campaign, semantic, provenance,
  Playwright, isolated, local and clean gates; diff/privacy hygiene.

### M9 — Terminal project-completion certification — NOT_STARTED

- Objective: record exact evidence, select one truthful terminal outcome,
  commit/push validated checkpoints, and stop.
- Validation: coherent task/prompt/OpenSpec/docs, clean tree, local HEAD equal
  to `origin/main`.

## Validation Strategy

Use the narrowest decisive check after each change, then the affected cone;
finish with every command named by the execution prompt and OpenSpec. Record
exact exit/results, pass/fail/skip identities, wall time and peak RSS where
practical, and preserve exact skip parity between canonical and isolated
complete suites.

## Decision Log

- 2026-08-28 — Pulled `origin/main` fast-forward to `e26b649`; the live
  execution prompt is a new READY final-assurance campaign, so the completed
  predecessor remains immutable and a fresh task is required.
- 2026-08-28 — Activated this task only after READY handoff, agent and
  project-state checks passed; implementation remains gated on H0.

## Discoveries

Initial audit is pending. Existing planner evidence is treated as a lead,
not as current execution proof.

## Deferred Work

None yet. Unrelated or speculative findings will be recorded here with
severity and disposition after H0/H1.

## Completion Criteria

No open P0/P1, no blocking P2, no unexplained skip or safety-critical retry
masking, no false L6/process-isolation claim, all required local/clean checks
green, docs and machine state coherent, and the validated final checkpoint is
pushed without force to `origin/main`.
