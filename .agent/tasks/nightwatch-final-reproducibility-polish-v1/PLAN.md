# Nightwatch Final Reproducibility and Polish

## Purpose

Prove post-acceptance Nightwatch reproduces on a clean machine and in isolated topology, and requalify real DEV after all hardening.

## Starting State

- Task ID: `nightwatch-final-reproducibility-polish-v1`
- Starting SHA: `e0c0c33cb6f44d33993b666d301cc261b87a4f01`
- Last validated: `55e92b963f1d4d6d7d719d4d38fe6d36bc224ef3`
- Predecessor COMPLETE at e0c0c33
- Architecture: L6 bwrap, cache 12, fuzz 12, census 04ff5839
- Facts not to rediscover: soak 3×73, cache 12, fuzz 12, CC 11, gate local 10/10

## Scope

`gate:clean` Node20, isolated parity (canonical versus topology-correct detached-source full suite), `ONBOARDING.md` sufficiency, final DEV requalification (phase2c/phase4/phase5/prepare/resume/replay/second-run), final reconciliation, final hygiene.

## Non-Goals

Production, DB, infra, sibling writes, mass upgrades, publication.

## Safety Constraints

DEV only, external auth, no secrets, fail-closed, no force-push.

## Architecture / Approach

Reuse `bin/quality-gate-clean.mjs` for clean checkout (fresh `mktemp`, `npm ci --ignore-scripts`, `npm run gate:ci` via clean env), a fresh no-hardlink Nightwatch checkout plus detached no-hardlink clones for isolated topology, and existing real launchers for DEV. Keep `ONBOARDING.md` as source of truth.

## Milestones

### M1 — Clean-machine `gate:clean` — COMPLETE

- Objective: fresh Node20 checkout, `npm ci`, no `node_modules` reuse, no auth state, no findings, `gate:clean` PASS
- Files/areas: `bin/quality-gate-clean.mjs`, `ONBOARDING.md`, `package-lock.json`
- Acceptance: `clean-receipt:sha256:` + `receipt:sha256:` at same HEAD, `HEAD` unchanged, `ONBOARDING.md` steps sufficient
- Validation: `npm run gate:clean` (via `bin/quality-gate-clean.mjs` with `NIGHTWATCH_PROXY_PORT` etc.)
- Status: COMPLETE — `npm run gate:clean` PASS at `d12b1d75886987356f3ab6d80ca5b25f0723c471`; Node 20, fresh `npm ci`, `cleanBefore=true`, `cleanAfter=true`, `nodeModulesReused=false`, `authStateProvided=false`, `ownerFindingStateProvided=false`, `siblingWrites=0`, `gateResult=PASS`, `clean-receipt:sha256:e8ca0d67dd02cf559e8e58b9`, nested `receipt:sha256:de32d1f7bf365176c246fe27`, semantic compatibility `1919 passed / 13 skipped / 0 failed`, synthetic campaign `73 passed`.

### M2 — Isolated parity — COMPLETE

- Objective: canonical versus topology-correct isolated full-suite parity with an isolated proxy port and read-only source inputs
- Files/areas: `bin/quality-gate.mjs`, `src/core/source/siblingSource.ts`, detached disposable source topology
- Acceptance: enumeration, pass/fail/skip counts, skip identities exact (or truthfully explained)
- Validation: canonical and detached-source `npx playwright test --project=nightwatch --workers=1 --reporter=json`
- Status: COMPLETE — both runs enumerated `2661`, with `2648` expected passes, `13` identical skips, `0` unexpected failures, and `0` flaky tests. Aggregate sibling symlinks were rejected by the existing no-follow source-reader guard; detached no-hardlink clones of the six approved source repositories reproduced the canonical result.

### M3 — Final DEV requalification — IN_PROGRESS

- Objective: real journey, exploration, API, prepare/resume, replay, second-run (read-only, serial)
- Files/areas: `bin/phase2c-real.mjs`, `bin/phase4-real.mjs`, `bin/phase5-real.mjs`, `bin/phase7-real.mjs`
- Acceptance: at least `phase2c` + `phase5` + `campaign` fresh or truthful `HUMAN_AUTH_ACTION_REQUIRED`, no prod contact, no secret leakage
- Validation: `NIGHTWATCH_HEADED=0 npm run journey:phase2c` etc. serial
- Status: IN_PROGRESS

### M4 — Final reconciliation and hygiene — NOT_STARTED

- Objective: reconcile `ACTIVE_TASK`, `STATE`, `REPORT`, `EXECUTION_PROMPT`, `CURRENT_STATE`, `ROADMAP`, `OpenSpec`; check no stale `BLOCKED`/`IN_PROGRESS`/`PENDING`; `HEAD==origin/main` clean
- Files/areas: all durable docs
- Acceptance: `agent:check`/`project:check`/`handoff:check`/`hardening:check` PASS, `HEAD==origin/main`, clean tree, no `TODO` in live milestones
- Validation: `npm run agent:check && npm run project:check && npm run handoff:check && npm run hardening:check && git status --porcelain --branch`
- Status: NOT_STARTED

## Validation Strategy

Continuity v2 gatekeepers; `gate:clean` via `quality-gate-clean.mjs` + `ONBOARDING.md`; isolated via a fresh no-hardlink Nightwatch checkout plus detached clones of each approved source repository (aggregate symlinks are intentionally rejected by the source reader); DEV via serial real launchers with external auth.

## Decision Log

- 2026-08-31 — Decision: successor `nightwatch-final-reproducibility-polish-v1` at e0c0c33; reason: prior deep hardening deferred `gate:clean` and isolated parity due to budget; evidence: STATE e0c0c33.
- 2026-08-31 — Decision: detached no-hardlink source clones are the valid isolated topology; aggregate sibling symlinks fail closed under the no-follow source reader, so the parity result uses six clean detached clones and an isolated proxy port.

## Discoveries

- HEAD e0c0c33 main-only, gate local 10/10, real DEV b1debd41 valid, `ONBOARDING.md` `npm ci` steps known.
- `gate:clean` passed on Node 20 at d12b1d7 with a fresh install and no sibling writes.
- Canonical and detached-source full suites matched exactly at 2661 enumerated / 2648 pass / 13 skip / 0 fail; skips were identical.

## Deferred Work

- Final DEV requalification and final documentation/checkpoint reconciliation remain.

## Completion Criteria

M1–M4 terminal COMPLETE, `gate:clean` PASS, isolated parity exact or truthfully explained, final DEV fresh or truthful blocker, `HEAD==origin/main` clean, no stale live terms
