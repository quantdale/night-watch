# Final Completion and L6 Containment

## Purpose

Qualify current Nightwatch release truth and either close the L6 process/DNS
containment residual safely or document a technically unavoidable blocker.

## Starting State

- Task: `nightwatch-final-completion-and-l6-containment-v1`
- Starting SHA: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`
- Planned-from: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`
- Branch/remote: `main` / `origin`
- Predecessor: `nightwatch-final-assurance-release-readiness-hardening-v1`,
  terminal BLOCKED at the unproven L6 boundary
- Established facts: L5 browser/proxy containment is current; Bubblewrap can
  create a network namespace but the previous parent relay topology was
  incompatible; authenticated OOPS is fail-closed; no external systems are
  authorized.

## Scope

Fresh whole-repository audit; rootless L6 design, implementation and proof;
OOPS/browser/descendant lifecycle; release truth and CI SHA semantics;
skips/retries; dependencies, UI and Control Center; performance/resource
sanity; local/clean certification and final documentation.

## Non-Goals

Product feature expansion, real environment or data access, infrastructure,
privileged isolation, broad dependency migration, historical task rewriting,
external publication and any operation outside owner scope.

## Safety Constraints

Use only synthetic loopback targets and disposable local state. Never use
root/sudo, host firewall/DNS/hosts mutation, system proxy configuration, TLS
MITM, credentials, sibling writes or real product endpoints. Preserve every
existing fail-closed rule and assertion; an unsupported L6 host is a valid
blocked result.

## Architecture / Approach

1. Establish a NUL-safe all-tracked-path census, aggregate digest and P0–P3
   matrix before ordinary implementation.
2. Trace current L5/OOPS/browser/process authorities and reproduce the known
   L6 boundary. Evaluate a minimal rootless network namespace with no external
   interface, an inherited AF_UNIX relay capability, a namespace-local
   bounded proxy and a process-group supervisor. Do not add a fallback that
   weakens the current boundary.
3. Make capability readiness versioned and categorical. Bind OOPS and any
   browser/helper launch to readiness, revoking it on relay/process/cleanup
   failure. Keep policy and exact destination binding in the existing proxy.
4. Add deterministic direct-escape, browser speculative, descendant and
   lifecycle tests. Re-run the L5 matrix and all affected suites.
5. Reconcile M3/M8 blocker semantics and SHA-role/CI authority in machine
   state, then run full local and clean qualification before terminal closure.

## Milestones

### M0 — takeover and activation — IN_PROGRESS

- Create this v2 task and exact OpenSpec route; route ACTIVE_TASK and prompt.
- Run handoff/agent/project baseline checks after the planning checkpoint.

### M1 — current whole-repository audit — NOT_STARTED

- Census, read/hash, classify and reconcile every tracked file.
- Deep-review runtime, tests, gates, workflows, dependencies, UI, docs and
  all process/network/persistence/lifecycle authorities.
- Record exact skip/retry census and P0–P3 remediation matrix.

### M2 — L6 implementation and proof — NOT_STARTED

- Reproduce the old namespace/relay result.
- Implement or disprove the minimal rootless envelope and versioned capability.
- Add direct DNS/TCP/UDP/HTTP/HTTPS, browser speculative, descendant,
  inherited-descriptor, relay and cleanup adversarial coverage.

### M3 — OOPS/L5 and adjacent defect repair — NOT_STARTED

- Integrate readiness with OOPS/browser/helper launch only if proven.
- Repair material defects and revalidate L5, privacy, event-log and lifecycle
  semantics; keep unsupported paths fail closed.

### M4 — truth, dependencies, UI and resource qualification — NOT_STARTED

- Resolve current-facing M3/M8/CI SHA inconsistencies and validate checkers.
- Audit skips/retries/dependencies/Node/UI/Control Center and measure resource
  behavior; repair demonstrated issues.

### M5 — full certification and terminal closure — NOT_STARTED

- Run the complete local, clean, canonical, isolated, UI and campaign matrix.
- Observe at most one exact-head CI run if available and classify honestly.
- Synchronize state/docs, select the truthful outcome, commit/push and verify
  remote equality.

## Validation Strategy

Use focused tests after each change, then the affected dependency cone, then
the full mandatory matrix. All safety-critical Playwright executions use
workers=1 and retries=0. Record exact counts, skip identities, receipts,
elapsed time and peak RSS where practical. Clean qualification uses a fresh
Node 20 checkout, isolated HOME and no auth/findings/cache state.

## Decision Log

- 2026-08-28 — Started a successor campaign because the predecessor is
  terminally blocked and the user explicitly authorized a fresh L6 proof.
- 2026-08-28 — Preserve authenticated OOPS disablement until every L6 proof
  dimension is ready; namespace creation alone is not containment evidence.

## Discoveries

Initial discovery is intentionally limited to the predecessor's current
evidence until the fresh M1 audit and L6 reproduction are complete.

## Deferred Work

Only work proven outside owner scope, speculative product expansion, or a
separate authorization may be deferred. A required L6 proof cannot be hidden
in this section; it must determine the terminal outcome.

## Completion Criteria

Completion requires zero unresolved P0/P1 and blocking P2 defects, no
unexplained skips or safety-critical retry masking, green local/clean gates,
truthful SHA/CI state, exact documentation agreement, and a proven L6 boundary
when required by the product contract. Otherwise the task ends BLOCKED with a
specific reproduction and next action.
