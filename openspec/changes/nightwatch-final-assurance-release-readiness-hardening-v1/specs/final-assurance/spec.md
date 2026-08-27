# Capability Specification — Final Whole-System Assurance

## Requirement: complete tracked-file accounting

The executor SHALL account for every tracked repository path at the execution baseline using a NUL-safe Git inventory. Every regular tracked file SHALL be read or hashed and role-classified. The task report SHALL record reviewed count, tracked count, total bytes and a safe aggregate digest. `reviewed != tracked` is a blocking failure.

### Scenario: tracked file cannot be reviewed

Given a tracked path is missing, nonregular, unreadable or otherwise cannot be accounted for, the campaign SHALL fail the H0 audit gate and SHALL NOT silently exclude the path.

## Requirement: evidence-ranked remediation

Every material finding SHALL be assigned P0, P1, P2 or P3 severity and SHALL record affected subsystem/files, observed behavior, root cause when determinable, impact, remediation, dependencies, reproduction/verification method and objective completion criteria.

P0/P1 defects SHALL be repaired before unrelated lower-severity work. Every repaired material defect SHALL receive a regression test or equivalent executable guard.

## Requirement: authority-chain integrity

For each core workflow, the campaign SHALL identify one authoritative producer/selector, its validators, consumers, persisted boundary and failure semantics. Duplicate/fallback authority that can disagree with the canonical chain SHALL be treated as a correctness defect unless it is explicitly a read-only projection with proven equivalence.

The audited chains SHALL include environment/browser/proxy/evidence, source/proof/lifecycle/eligibility/campaign, candidate/replay/minimization/triage/dossier/finding, Control Center authorities/adapters/coordinator/server/UI, planner/handoff/task/project-state, and quality-gate definition/inventory/runners.

## Requirement: skipped-test truth

Every skipped test in the terminal complete suite SHALL have an exact identity and one explicit disposition:

- `LEGITIMATE_ENVIRONMENT_GUARD`
- `DETERMINISTIC_SUBSTITUTE_PRESENT`
- `OBSOLETE_REMOVE`
- `CAN_RUN_IN_CERTIFICATION`
- `BLOCKING_VALIDATION_GAP`

No unexplained skip is permitted at project-completion certification. A `BLOCKING_VALIDATION_GAP` prevents a COMPLETE outcome.

## Requirement: clean reproducibility

A fresh disposable checkout on the supported Node 20 baseline SHALL be able to install dependencies and execute the authoritative clean gate without relying on ambient credentials, global npm packages, writable sibling repositories, pre-existing node_modules, private finding data, prior build output or undocumented host state.

The nested Control Center UI SHALL independently pass typecheck, tests and production build from clean package state.

## Requirement: fail-closed safety preservation

The campaign SHALL preserve permanent owner scope, loopback/egress containment, redaction/privacy, sibling read-only, no-publication, no-infrastructure/data-layer and no standing promotion authority boundaries.

No validation repair may weaken a safety check, proof threshold, privacy sentinel, authority/currentness check or failure-path assertion merely to produce green output.

## Requirement: resource sanity

Major deterministic commands SHALL be measured for wall time and, where practical, peak RSS on a fixed campaign baseline. Material algorithmic regressions, unbounded collections/queues, repeated whole-repository work without need, leaked timers/listeners/child processes, or Control Center refresh amplification SHALL be investigated and fixed when demonstrated.

Performance checks SHALL use generous, repeatable sanity bounds rather than brittle microbenchmark thresholds.

## Requirement: documentation truth

Current-facing README/AGENTS/CURRENT_STATE/ROADMAP/ARCHITECTURE/SAFETY_MODEL/DECISIONS statements and operator CLI/status projections SHALL be cross-checked against implementation and machine truth. Historical records MAY remain verbose but SHALL NOT masquerade as current authority.

At closure, the execution prompt, active task, task state/report, OpenSpec checklist and current project-state documentation SHALL agree on the terminal campaign state.

## Requirement: release certification

Project completion requires all applicable final checks to pass:

- clean install;
- root typecheck;
- Control Center UI typecheck/test/build/browser qualification;
- hardening, handoff and project-state checks;
- quality-gate spec and inventory;
- semantic compatibility;
- owner provenance;
- synthetic campaign;
- campaign-added regressions;
- complete canonical serial Playwright suite;
- topology-correct isolated complete suite with skip-identity parity;
- local unified gate;
- clean Node 20 unified gate;
- diff/secret/debug/generated-output hygiene;
- representative CLI, local-fixture and Control Center smoke journeys.

### Scenario: GitHub Actions executes zero steps

If an exact-head Actions job finishes with no executed steps, the result SHALL be classified as external non-evidence and SHALL NOT be reported as CI green or as a repository test failure. The campaign SHALL NOT churn workflow code or retry-loop solely to hide an external billing/platform condition.

### Scenario: GitHub Actions genuinely executes and passes

If the exact-head required workflow actually executes its required steps and passes, the task MAY report external CI certification in addition to local/clean certification.

## Requirement: truthful terminal state

The campaign SHALL terminate as exactly one of:

- `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`
- `PROJECT_COMPLETE_AND_CI_CERTIFIED`
- `PROJECT_NOT_COMPLETE_BLOCKED`

A COMPLETE outcome is forbidden while any P0/P1, blocking P2, unexplained skipped test, required local/clean gate failure, safety/privacy regression, or known release-blocking defect remains.

The executor SHALL stop rather than manufacture new features when further work is speculative, low-value, outside owner scope or requires separate authorization.
