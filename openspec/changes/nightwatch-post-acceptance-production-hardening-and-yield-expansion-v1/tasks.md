## 1. Truth reconciliation and hardening

- [ ] 1.1 Repair EXECUTION_PROMPT, CURRENT_STATE, ROADMAP stale BLOCKED to historical + ACCEPTED.
- [ ] 1.2 Add docs-truth validator so contradiction cannot recur; verify handoff:check green.
- [ ] 1.3 Establish fresh baseline: typecheck, hardening, handoff, project, agent, synthetic, owner-provenance, gate:local, Control Center.

## 2. Operational-repair family and real reliability

- [ ] 2.1 Audit nine repairs, find siblings, harden shared abstractions, add regressions.
- [ ] 2.2 Repeated real read-only DEV campaigns (phase2c/phase4/phase5/prepare/resume/replay/second-run) with metrics.
- [ ] 2.3 Soak/long-run lifecycle qualification (leaks, ports, timers, artifacts).

## 3. Source intelligence and yield

- [ ] 3.1 Fresh approved-source census at current SHAs, compare to Phase 28, rank gaps.
- [ ] 3.2 Bounded proof-gap expansions with full fixture coverage (positive/negative/ambiguity/adversarial).
- [ ] 3.3 Campaign portfolio, oracle depth, and finding-quality expansion with false-positive controls.

## 4. Resilience and operator

- [ ] 4.1 Replay/minimization, checkpoint/resume chaos, auth lifecycle hardening.
- [ ] 4.2 Containment requalification, performance profiling, cache correctness.
- [ ] 4.3 Control Center full audit, CLI/operator UX, diagnostics, error taxonomy, fuzz/property tests.

## 5. Cleanup and requalification

- [ ] 5.1 Dead-code/stale-audit, dependency/supply-chain review, local-model canary conditional.
- [ ] 5.2 Clean-machine Node 20 and canonical/isolated parity.
- [ ] 5.3 Full regression and final real DEV requalification; reconcile project-state, commit/push main-only.
