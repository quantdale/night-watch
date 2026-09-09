# Tasks — residual closure and lane qualification

## M0 — establish execution truth
- [ ] Owned session claimed, base current, workspace verdict PASS
- [ ] Task SPEC/PLAN/STATE and OpenSpec route committed
- [ ] Predecessor re-verified terminal COMPLETE and not reopened

## M0b — restore the planning-only handoff checkpoint (R-07)
- [ ] `project:check` asserts the predecessor binding for a planning prompt
- [ ] A protocol-valid planning prompt passes handoff and project truth together
- [ ] Regression covering both the planning and the active prompt states

## M1 — qualify the browser workflow lane (R-01)
- [ ] Host capability recorded from observed binaries, not assumed
- [ ] Lane executed inside this owned session, receipt recorded
- [ ] `docs/HOST-CAPABILITY-MATRIX.md` lane state updated to the proven class

## M2 — record the CI block as classified observation (R-02)
- [ ] Observed run identity, annotation and block class recorded
- [ ] `CI_STATUS` remains non-passing; no green run is modelled
- [ ] Owner action to clear the block named with its revisit condition

## M3 — reconcile project state (R-03)
- [ ] `docs/CURRENT_STATE.md` closure section for the predecessor campaign
- [ ] Validated-SHA fields advanced, or refusal recorded mechanically
- [ ] No historical section, receipt or SHA rewritten

## M4 — document the shipped surface (R-04)
- [ ] `--enable-local-review` and the review store location documented
- [ ] `bin/phase14-contract-health.mjs` reachable from a documented script
- [ ] Definition-of-done item 13 re-checked against the command surface

## M5 — clear workspace and record residue (R-05)
- [ ] Two stale session worktrees released through the session CLI
- [ ] Merged session branches removed; live holders never touched
- [ ] Legacy v1 records migrated or declared permanently historical

## M6 — bound evidence retention (R-06)
- [ ] Refusal-first retention status and owner-gated prune
- [ ] Referenced artifacts provably refused; unprovable means refused
- [ ] Regression coverage for the refusal set and the reclaim-nothing case

## M7 — certify one checkpoint
- [ ] Full offline regression, `gate:local`, UI lanes, root typecheck
- [ ] Every lane resolved to PROVEN / BLOCKED_EXTERNAL / UNAVAILABLE_CAPABILITY
- [ ] Continuity, privacy review, integration by fast-forward, session released
