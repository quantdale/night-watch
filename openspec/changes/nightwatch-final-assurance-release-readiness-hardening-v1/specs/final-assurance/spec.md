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

## Requirement: process-level containment truth

The release-certification campaign SHALL treat the existing L0-L5 browser/proxy stack and the future L6 process boundary as distinct authorities.

- The system SHALL NOT claim complete process/network isolation while `BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL` is unresolved.
- Any real/authenticated non-browser subprocess path that requires L6 SHALL fail closed unless a versioned, mechanically verified L6 runtime capability is present.
- The existing authenticated OOPS disablement caused by relay/network-namespace incompatibility SHALL NOT be bypassed to obtain coverage.
- Any new L6 implementation SHALL be unprivileged/rootless within this campaign and SHALL NOT require root, privileged firewall/network administration, system-wide proxy/DNS/hosts mutation, TLS MITM, cloud infrastructure, or live external probes.
- A claimed L6 PASS SHALL separately prove direct DNS/TCP/UDP escape denial and permitted synthetic proxy/relay flow, plus startup/liveness/cleanup behavior.
- If safe L6 closure cannot be implemented within scope, the terminal result SHALL be `PROJECT_NOT_COMPLETE_BLOCKED` for the full-completion objective rather than falsely declaring process isolation complete.

## Requirement: safety-test retry authority

Safety-critical containment tests SHALL NOT rely on retry behavior to convert a first-attempt containment failure into a release PASS.

The current WebSocket gate retry configuration SHALL be revalidated against the current awaited `routeWebSocket` registration. If the underlying race no longer reproduces, the retry workaround and stale rationale SHALL be removed. If it still reproduces, the implementation/lifecycle defect SHALL be repaired and covered by a deterministic regression before release certification.

Restricted-OOPS executable provenance, relay-only behavior, secret non-inheritance and oracle-parity checks SHALL have deterministic certification coverage. Binary absence MAY be represented as an environment capability fact, but it SHALL NOT silently erase release-critical subprocess validation; missing required coverage is a `BLOCKING_VALIDATION_GAP`.

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

A COMPLETE outcome is forbidden while any P0/P1, blocking P2, unexplained skipped test, safety-critical retry masking, required local/clean gate failure, safety/privacy regression, false L6/process-isolation claim, or known release-blocking defect remains.

The executor SHALL stop rather than manufacture new features when further work is speculative, low-value, outside owner scope or requires separate authorization.
