# Tasks — residual closure and lane qualification

## M0 — establish execution truth
- [x] Owned session claimed, base current, workspace verdict PASS
- [x] Task SPEC/PLAN/STATE and OpenSpec route committed
- [x] Predecessor re-verified terminal COMPLETE and not reopened

## M0b — restore the planning-only handoff checkpoint (R-07)
- [x] `project:check` asserts the predecessor binding for a planning prompt
- [x] A protocol-valid planning prompt passes handoff and project truth together
- [x] Regression covering both the planning and the active prompt states

## M1 — qualify the browser workflow lane (R-01)
- [x] Host capability recorded from observed binaries, not assumed
- [x] Lane executed inside this owned session, receipt recorded
- [x] `docs/HOST-CAPABILITY-MATRIX.md` lane state updated to the proven class

## M2 — record the CI block as classified observation (R-02)
- [x] Observed run identity, annotation and block class recorded
- [x] `CI_STATUS` remains non-passing; no green run is modelled
- [x] Owner action to clear the block named with its revisit condition

## M3 — reconcile project state (R-03)
- [x] `docs/CURRENT_STATE.md` closure section for the predecessor campaign
- [x] Validated-SHA fields advanced, or refusal recorded mechanically
- [x] No historical section, receipt or SHA rewritten

## M4 — document the shipped surface (R-04)
- [x] `--enable-local-review` and the review store location documented
- [x] `bin/phase14-contract-health.mjs` reachable from a documented script
- [x] Definition-of-done item 13 re-checked against the command surface

## M5 — clear workspace and record residue (R-05)
- [x] Two stale session worktrees released through the session CLI
- [x] Merged session branches removed; live holders never touched
- [ ] ~~Legacy v1 records migrated or declared permanently historical~~ — STATE M5 closed R-05 with worktrees and branches only; disposition carried by nightwatch-production-completion-programme-v1 group 6.7.

## M6 — bound evidence retention (R-06)
- [x] Refusal-first retention status and owner-gated prune
- [x] Referenced artifacts provably refused; unprovable means refused
- [x] Regression coverage for the refusal set and the reclaim-nothing case

## M7 — certify one checkpoint
- [x] Full offline regression, `gate:local`, UI lanes, root typecheck
- [x] Every lane resolved to PROVEN / BLOCKED_EXTERNAL / UNAVAILABLE_CAPABILITY
- [x] Continuity, privacy review, integration by fast-forward, session released
