## 1. Truth reconciliation and hardening

- [x] 1.1 Repair EXECUTION_PROMPT, CURRENT_STATE, ROADMAP stale BLOCKED to historical + ACCEPTED.
- [x] 1.2 Add docs-truth validator so contradiction cannot recur; verify handoff:check green.
- [x] 1.3 Establish fresh baseline: typecheck, hardening, handoff, project, agent, synthetic, owner-provenance, gate:local, Control Center.

## 2. Operational-repair family and real reliability

- [x] 2.1 Audit nine repairs, find siblings, harden shared abstractions, add regressions.
- [x] 2.2 Repeated real read-only DEV campaigns (phase2c/phase4/phase5/prepare/resume/replay/second-run) with metrics.
- [ ] ~~2.3 Soak/long-run lifecycle qualification (leaks, ports, timers, artifacts).~~ — deferred: task record defers soak/leak profiling due to session budget (STATE Deferred / PLAN M3).

## 3. Source intelligence and yield

- [x] 3.1 Fresh approved-source census at current SHAs, compare to Phase 28, rank gaps.
- [ ] ~~3.2 Bounded proof-gap expansions with full fixture coverage (positive/negative/ambiguity/adversarial).~~ — not done: task record records NO_SAFE_NEW_FAMILY, so no proof-gap expansion was admitted without weakening (STATE M4).
- [ ] ~~3.3 Campaign portfolio, oracle depth, and finding-quality expansion with false-positive controls.~~ — deferred: task record defers additional oracle classes because no mechanically derived expectations exist without weakening (STATE Deferred / PLAN M5).

## 4. Resilience and operator

- [x] 4.1 Replay/minimization, checkpoint/resume chaos, auth lifecycle hardening.
- [x] 4.2 Containment requalification, performance profiling, cache correctness.
- [x] 4.3 Control Center full audit, CLI/operator UX, diagnostics, error taxonomy, fuzz/property tests.

## 5. Cleanup and requalification

- [ ] ~~5.1 Dead-code/stale-audit, dependency/supply-chain review, local-model canary conditional.~~ — dead-code/dependency review done per task M7; the local-model canary conditional was not addressed and is carried to nightwatch-production-completion-programme-v1 §Carried forward.
- [ ] ~~5.2 Clean-machine Node 20 and canonical/isolated parity.~~ — deferred: task record defers canonical/isolated parity re-run due to session budget (STATE Deferred / PLAN M8).
- [x] 5.3 Full regression and final real DEV requalification; reconcile project-state, commit/push main-only.
