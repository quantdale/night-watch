# Nightwatch Continuous Deep Hardening

## Purpose

Prove post-acceptance Nightwatch remains stable over repeated autonomous operation by exercising the deferred soak, cache, containment, chaos, auth, fuzz, and reproducibility workstreams that were budget-deferred in the prior hardening.

## Starting State

- Task ID: `nightwatch-continuous-deep-hardening-v1`
- Starting SHA: `5080e0d67794462853f62b8757b64d41410b2f1e`
- Last validated: `59c44e00b3a07765fcf4ce7fac3ce1b811ea15da`
- Predecessor COMPLETE at 5080e0d (gate local 10/10, real DEV b1debd41)
- Architecture: L6 bwrap, proxy, source census 04ff5839, campaign portfolio, CC
- Facts not to rediscover: truth reconciliation complete, N² Map, census 43/53, 73 synthetic, CC 11

## Scope

Soak/long-run, cache currentness 12-case, L6 requalification, replay/resume chaos 8-case, auth lifecycle 9-case, fuzz/property, dead-code/dependency, clean-machine `gate:clean`, isolated parity, final DEV requalification.

## Non-Goals

Production, DB, infra, sibling writes, weakening containment, speculative inference, publication.

## Safety Constraints

DEV only, external auth, no secrets, fail-closed, no force-push.

## Architecture / Approach

Reuse existing harnesses: `campaign:synthetic` for soak (repeat 3×), `src/core/source/cache.ts` 8-entry LRU for cache matrix, `l6Containment.test.ts` for containment, `tests/unit/campaign.test.ts` for replay/resume, `bin/auth-capture.mjs` for auth. Keep all new tests bounded and deterministic, no high-volume fuzz.

## Milestones

### M1 — Soak and resource lifecycle — NOT_STARTED

- Objective: 3× synthetic campaign with fd/tmp/cache/proxy snapshots before/after/repeated/interrupted/resume/teardown
- Files/areas: `src/browser`, `src/proxy`, `src/core/campaign`, `artifacts/`, `/tmp`
- Acceptance: no leaked processes/ports/fds, cache bounded, artifact growth bounded, checkpoint not corrupted
- Validation: `node bin/soak-harness.mjs 3` or manual 3× `npm run campaign:synthetic`
- Status: NOT_STARTED

### M2 — Cache currentness 12-case — NOT_STARTED

- Objective: same SHA/changed content, changed SHA/same content, dep/transitive, analyzer/taxonomy version, interrupted/malformed/duplicate/stale
- Files/areas: `src/core/source/cache.ts`, `src/core/source/scanTypes.ts`
- Acceptance: 12/12 PASS, stale never accepted, digest recomputed
- Validation: `playwright test tests/unit/cacheCurrentness.test.ts`
- Status: NOT_STARTED

### M3 — Containment requalification — NOT_STARTED

- Objective: direct DNS/TCP/UDP/HTTP/HTTPS/CONNECT/WS/IPv6/mapped, redirects, browser telemetry, descendant, relay termination, parent-death
- Files/areas: `src/proxy`, `src/browser`, `tests/unit/l6Containment.test.ts`
- Acceptance: 4/4 L6 PASS, no egress outside proxy, WebSocket closed not failed for denied
- Validation: `npm run campaign:synthetic` (l6 portion) + manual proxy checks
- Status: NOT_STARTED

### M4 — Replay/resume chaos 8-case — NOT_STARTED

- Objective: inject failures at creation, manifest, first/middle/last item, evidence write, teardown, interruption → resume
- Files/areas: `src/core/campaign/orchestrator.ts`, `src/core/journeys/replay.ts`
- Acceptance: no lost/duplicated work, deterministic reconstruction, no falsely completed
- Validation: `playwright test tests/unit/campaign.test.ts` chaos subset
- Status: NOT_STARTED

### M5 — Auth lifecycle 9-case — NOT_STARTED

- Objective: valid, expired, missing, malformed, wrong env, mid-run invalid, refresh, human-required, interruption
- Files/areas: `src/browser/fixtures/storageState.ts`, `bin/phase2c-real.mjs`
- Acceptance: 9/9 fail-closed, sanitized, clear owner action, no leakage
- Validation: `playwright test tests/unit/storageState.test.ts tests/unit/authCaptureLauncher.test.ts`
- Status: NOT_STARTED

### M6 — Fuzz/property — NOT_STARTED

- Objective: parsers/canonicalizers (permutation stability, idempotence, digest, malformed rejection, bounded cardinality)
- Files/areas: `src/core/source/lexical.ts`, `src/core/identity/canonicalDigest.ts`, `src/oracles/**`
- Acceptance: ≥20 new cases PASS, no secret propagation, no mutation
- Validation: `playwright test tests/unit/fuzzProperty.test.ts`
- Status: NOT_STARTED

### M7 — Dead-code, deps, clean-machine, isolated parity, final DEV — NOT_STARTED

- Objective: delete unreachable, no mass upgrade, `gate:clean` Node20, canonical vs isolated parity, final DEV requalification
- Files/areas: entire repo, `package.json`, `ui/control-center`, `bin/*`
- Acceptance: `gate:clean` PASS, parity exact, `ONBOARDING.md` sufficient, DEV phase2c/phase5/campaign requalified
- Validation: `npm run gate:clean` + isolated harness + `npm run journey:phase2c` etc.
- Status: NOT_STARTED

## Validation Strategy

Continuity v2 gatekeepers; `gate:local`/`gate:clean` for gates; `l6Containment` for containment; chaos via deterministic fault injection; auth via storageState fixtures; fuzz via bounded property tests.

## Decision Log

- 2026-08-31 — Decision: successor `nightwatch-continuous-deep-hardening-v1` at 5080e0d; reason: prior hardening COMPLETE but soak/cache/chaos deferred due to budget; evidence: STATE 1bf286b

## Discoveries

- HEAD 5080e0d main-only, gate local 10/10 at 5080e0d, real DEV b1debd41 valid for ~7h

## Deferred Work

- None yet

## Completion Criteria

M1–M7 terminal COMPLETE, `agent:check`/`project:check`/`handoff:check` PASS, soak/cache/containment/chaos/auth/fuzz/clean/parity/DEV fresh or truthful
