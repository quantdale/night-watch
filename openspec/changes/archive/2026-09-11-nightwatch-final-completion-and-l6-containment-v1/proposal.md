## Why

Nightwatch's local/browser/proxy safety boundary is validated, but the project
still reports `PROJECT_NOT_COMPLETE_BLOCKED` because process-level DNS and
network escape denial (L6) has not been proven. A fresh, evidence-driven
campaign is needed to determine whether an unprivileged L6 envelope can be
implemented and certified, while also reconciling release truth and closing
any defects found at the current repository head.

## What Changes

- Perform a current-head, NUL-safe audit of every tracked repository path and
  produce a bounded P0–P3 remediation and release-evidence record.
- Add a versioned, mechanically inspectable process/network containment
  capability with fail-closed readiness and lifecycle state if a safe rootless
  design is feasible.
- Add deterministic synthetic adversarial coverage for direct DNS, TCP, UDP,
  HTTP/HTTPS, browser speculative traffic, descendants, relay failure and
  teardown; otherwise preserve and strengthen the unsupported L6 boundary.
- Keep authenticated OOPS disabled unless the new capability proves the
  required envelope; enable it only with complete descendant cleanup and
  privacy regressions.
- Reconcile M3/M8 blocker semantics, SHA-role/CI authority semantics,
  project-state output, current-facing documentation and continuity records.
- Requalify dependencies, Control Center, lifecycle/resource behavior, skips,
  retries, local/clean gates and exact-head CI evidence without weakening
  safety assertions or using real product systems.

## Capabilities

### New Capabilities

- `process-network-containment`: Versioned rootless process/network capability
  state, readiness, relay topology and adversarial proof surface.
- `final-release-certification`: Whole-repository audit, release-gate truth,
  SHA-role accounting and terminal certification evidence.

### Modified Capabilities

<!-- No existing main specs are present; the new capability specs define this
     campaign's contract without mutating historical change records. -->

## Impact

Expected impact is limited to Nightwatch runtime containment and OOPS launch
guards, synthetic tests and fixtures, quality-gate/checker output, continuity
and project-state documents, OpenSpec artifacts, and the nested Control Center
qualification surface. No Alphaus repository, product endpoint, credential,
database, cloud system, host firewall/DNS configuration or external finding
store is in scope.
