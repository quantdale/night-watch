# Nightwatch Final Reproducibility and Polish — Report

- Starting SHA: `e0c0c33cb6f44d33993b666d301cc261b87a4f01`
- Resulting SHA: `DISCOVER_FROM_GIT`
- Task objective: Clean-machine and isolated reproducibility plus final DEV requalification
- Changes: durable task/OpenSpec/project documentation only; no Nightwatch implementation change was required
- Tests/validation: Node 20 clean gate PASS at `6769bb4` (`clean-receipt:sha256:7a00dd503f78cfb0f308d653`, nested `receipt:sha256:1d402605037d763913e301ae`); local gate PASS (`receipt:sha256:b6d2e61df1c7c5969fb895a7`); typecheck, hardening, agent, project, handoff, history audit, and Git hygiene PASS
- Decisions: use detached no-hardlink source clones for isolated parity because aggregate sibling symlinks fail closed under the no-follow source reader; retain the Phase 4 malformed-JSON result as a DEV product anomaly; preserve the existing `OPERATIONALLY_ACCEPTED` project verdict
- Verdict basis: COMPLETE local/clean reproducibility and required bounded DEV evidence; canonical and isolated full suites exactly matched at `2661` enumerated / `2648` passed / `13` skipped / `0` failed; Phase 2C retry passed, Phase 5 passed `1/1`, and fresh Phase 7 prepare/resume completed `5/5 COMPLETE_CLEAN`
- Safety events: NONE
- Deferred items: the known DEV `GET /m/blue/billing/v1/billinggroups` malformed-JSON product behavior remains an owner-facing follow-up; external CI was not run and is not claimed green
- Remaining blockers: NONE
- Recommended next task: NONE — any follow-up requires a new authorized task

Status: COMPLETE
