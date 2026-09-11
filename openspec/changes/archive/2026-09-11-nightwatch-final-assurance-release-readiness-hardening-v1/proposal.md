# Proposal — Final Assurance + Release-Readiness Hardening

## Objective

Drive Nightwatch from mature, locally certified implementation to the strongest truthful project-completion state available within the permanent owner boundaries.

This is a combined implementation + hardening + certification campaign, but implementation is restricted to release-critical gaps established by current evidence. In particular, it must explicitly disposition the documented L6 process/DNS containment residual and safety-critical retry/conditional-skip gaps. It must not invent new product scope or loosen fail-closed proof rules to create apparent progress.

## Why now

The previous campaign closed the planner/executor route and project-state truth defects and completed full local/clean acceptance. The repository therefore does not currently need another speculative feature phase. The remaining high-value work is whole-system assurance: verify cross-subsystem coherence, skipped-test legitimacy, clean reproducibility, dependency/toolchain roles, resource behavior, operator usability, documentation truth, and final release gates.

## Scope

In scope:

- all tracked repository files and directories, including `.agent`, `.agents`, `.claude`, `.kimi-code`, `.opencode`, `.github`, root configuration, `bin`, `config`, `corpus`, `docs`, `openspec`, scenarios, `src`, tests, UI packages, generated registries and fixtures;
- architecture/module boundaries and authority duplication;
- CLI entry points and status/intelligence/operator commands;
- local/clean quality gates and gate inventory;
- browser/proxy/environment safety boundaries, including the documented L6 DNS/process residual and rootless containment feasibility;
- source intelligence and Phase-24 campaign selection chain;
- evidence recording, triage, dossiers and owner-local findings;
- Control Center server/adapters/authorities/UI lifecycle;
- agent continuity, planner handoff and project truth;
- dependency/lockfile/install/build reproducibility;
- test coverage, skipped-test disposition, safety-test retry disposition, deterministic restricted-OOPS subprocess qualification and failure paths;
- performance/resource sanity for major deterministic commands;
- current-state/roadmap/architecture/safety/documentation synchronization;
- final release certification.

Out of scope unless separately authorized:

- DEV/NEXT/production product contact;
- fresh authentication capture or credential use;
- databases, cloud, infrastructure or deployment archaeology;
- writes to sibling Alphaus repositories;
- publication, issue creation, messaging, uploads or shared findings;
- AI runtime authority;
- self-development canonical promotion;
- new proof families, new portfolio authority or expanded target scope without fresh mechanical evidence and explicit authorization;
- root-required firewall changes, system-wide proxy/DNS/hosts mutation, privileged network administration, TLS MITM or live external DNS/egress experiments.

## Required outcome

The executor must choose one truthful terminal outcome:

1. `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` — no material unresolved defect remains for the current scope; external CI may remain separately unavailable/non-evidence.
2. `PROJECT_COMPLETE_AND_CI_CERTIFIED` — same, plus an exact-head workflow actually executed required steps and passed.
3. `PROJECT_NOT_COMPLETE_BLOCKED` — a concrete P0/P1 or required validation remains unresolved; this includes an L6/process-isolation blocker when full-completion certification cannot be proven safely; report exact blocker and reproducible evidence.

“Tests passed” alone is not sufficient. Completion requires representative tests, full-suite validation, clean-checkout qualification, workflow tracing, boundary review, skipped-test disposition, documentation truth and release gate evidence.

## Constraints

- Preserve the existing fail-closed safety model.
- Never weaken assertions, validators, proof thresholds, privacy sentinels, containment rules or owner-scope checks merely to get green.
- Reproduce material defects before repair where practical.
- Every material defect gets a regression test.
- Avoid large refactors driven only by file size or aesthetics.
- Do not treat external zero-step GitHub Actions failures as repository failures or successes.
- Do not alter historical records merely to make current-state prose shorter; distinguish current truth from history instead.
- Stop when further work is speculative, low-value or outside owner scope.
