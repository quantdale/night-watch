# Nightwatch Final Reproducibility and Polish

## Task purpose

Close the remaining reproducibility gaps deferred from continuous deep hardening: clean-machine `gate:clean` Node20, topology-correct isolated parity, `ONBOARDING.md` sufficiency, and final DEV requalification with current auth, plus final project-state reconciliation and git hygiene.

## Established starting state

- Task ID: `nightwatch-final-reproducibility-polish-v1`
- Phase: `FINAL_REPRODUCIBILITY_POLISH_V1`
- Starting SHA: `e0c0c33cb6f44d33993b666d301cc261b87a4f01`
- Last validated impl: `55e92b963f1d4d6d7d719d4d38fe6d36bc224ef3`
- Predecessor: `nightwatch-continuous-deep-hardening-v1` COMPLETE at e0c0c33 (cache 12, fuzz 12, soak 3×73, gate local 10/10 at e0c0c33)
- Current HEAD: e0c0c33 docs closure, 55e92b9 impl, 04ff5839 census
- Continuity: `nightwatch.agent-continuity.v2`
- OpenSpec: `openspec/changes/nightwatch-final-reproducibility-polish-v1/`
- Planned-From: `e0c0c33cb6f44d33993b666d301cc261b87a4f01`

## Required deliverables

- `gate:clean` PASS via `bin/quality-gate-clean.mjs` (fresh checkout, fresh `node_modules`, no auth, no findings)
- Isolated parity: canonical vs isolated `gate:local` or full suite with exact counts (pass/fail/skip identities)
- `ONBOARDING.md` verification and fix if needed
- Final DEV requalification: phase2c, phase4, phase5, prepare/resume, replay, second-run (or truthful `HUMAN_AUTH_ACTION_REQUIRED`)
- Final project-state reconciliation: no stale `BLOCKED`/`IN_PROGRESS`/`PENDING` in live surfaces; `CURRENT_STATE`, `ROADMAP`, `ACTIVE_TASK`, `STATE`, `REPORT`, `EXECUTION_PROMPT` consistent
- Final `gate:local` + `gate:clean` + `typecheck` + `hardening` + `agent` + `project` + `handoff` all PASS, `HEAD==origin/main`, clean tree

## Explicit non-goals

Production, DB, infra, sibling writes, mass upgrades, publication, large model download, weakening CI.

## Safety constraints

DEV only via contained launchers; external auth outside Git; no secrets; fail-closed; no force-push.

## Acceptance criteria

- `npm run gate:clean` PASS with `clean-receipt:sha256:` and `receipt:sha256:` at same HEAD
- Isolated parity: `canonical 73+12+12+...` vs `isolated` exact pass/fail/skip and skip identities match (or truthfully explained)
- `ONBOARDING.md` `npm ci` + `npx playwright install chromium` + gates sufficient
- Final DEV: at least `phase2c` + `phase5` + `campaign` fresh or truthful blocker, no prod contact
- Final `agent:check`/`project:check`/`handoff:check`/`hardening:check` PASS, `HEAD==origin/main`, clean tree, no `TODO` in live milestones
