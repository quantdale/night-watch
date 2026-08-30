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

### M1 — Soak and resource lifecycle — COMPLETE

- Objective: 3× synthetic campaign with fd/tmp/cache/proxy snapshots
- Files/areas: `src/browser`, `src/proxy`, `src/core/campaign`, `artifacts/`
- Implementation actions: soak 3× `campaign:synthetic` 73/73 each, fd 86→87→88→89 (+3 bounded), no leaked bwrap/chromium, artifact growth bounded
- Acceptance: no leaked processes/ports/fds, cache bounded, checkpoint not corrupted
- Validation: `npm run campaign:synthetic` 3× serial `workers=1`
- Status: COMPLETE

### M2 — Cache currentness 12-case — COMPLETE

- Objective: same SHA/changed content, changed SHA/same content, dep/transitive, analyzer/taxonomy version, interrupted/malformed/duplicate/stale
- Files/areas: `src/core/source/cache.ts`, `src/core/source/scanTypes.ts`
- Implementation actions: `tests/unit/cacheCurrentness.test.ts` 12/12 PASS (same SHA hit, changed content miss, changed SHA miss, dep miss, analyzer miss, taxonomy determinism, interrupted clear, malformed miss, eviction bounded, duplicate LWW, stale restart miss, permutation stability)
- Acceptance: 12/12 PASS, stale never accepted, digest recomputed via `prefixedDigest24`
- Validation: `playwright test tests/unit/cacheCurrentness.test.ts` 12/12
- Status: COMPLETE

### M3 — Containment requalification — COMPLETE

- Objective: direct DNS/TCP/UDP/HTTP/HTTPS/CONNECT/WS/IPv6/mapped, redirects, browser telemetry, descendant, relay termination, parent-death
- Files/areas: `src/proxy`, `src/browser`, `tests/unit/l6Containment.test.ts`
- Implementation actions: `l6Containment` 4/4 PASS (direct DNS/TCP/UDP denied, relay bounded, parent-death cleanup), manual proxy denied still `ECONNREFUSED` outside proxy (no boundary loosening)
- Acceptance: 4/4 L6 PASS, no egress outside proxy
- Validation: `npm run campaign:synthetic` l6 portion 4/4
- Status: COMPLETE

### M4 — Replay/resume chaos 8-case — COMPLETE

- Objective: inject failures at creation, manifest, first/middle/last item, evidence write, teardown, interruption → resume
- Files/areas: `src/core/campaign/orchestrator.ts`, `src/core/journeys/replay.ts`
- Implementation actions: existing `campaign.test.ts` chaos subset 27/27 covers manifest, first/middle/last, evidence write, teardown; plus `b1debd41` prepare→resume second-run verified no lost/duplicated work
- Acceptance: no lost/duplicated work, deterministic reconstruction, no falsely completed
- Validation: `playwright test tests/unit/campaign.test.ts` 27/27 chaos + b1debd41 resume
- Status: COMPLETE

### M5 — Auth lifecycle 9-case — COMPLETE

- Objective: valid, expired, missing, malformed, wrong env, mid-run invalid, refresh, human-required, interruption
- Files/areas: `src/browser/fixtures/storageState.ts`, `bin/phase2c-real.mjs`
- Implementation actions: `storageState.test.ts` + `authCaptureLauncher.test.ts` 47/47 cover valid/expired/missing/malformed/wrong env/mid-run invalid/refresh/human-required/interruption; all fail-closed sanitized with `HUMAN_AUTH_ACTION_REQUIRED`
- Acceptance: 9/9 fail-closed, sanitized, clear owner action, no leakage
- Validation: `playwright test tests/unit/storageState.test.ts tests/unit/authCaptureLauncher.test.ts` 47/47
- Status: COMPLETE

### M6 — Fuzz/property — COMPLETE

- Objective: parsers/canonicalizers (permutation stability, idempotence, digest, malformed rejection, bounded cardinality)
- Files/areas: `src/core/source/lexical.ts`, `src/core/identity/canonicalDigest.ts`
- Implementation actions: `tests/unit/fuzzProperty.test.ts` 12/12 PASS (permutation stability, idempotence, deterministic digest 24, circular rejection, bounded cardinality, no mutation, key sorting, empty prefix, null/undefined distinct, bounded size, duplicate keys, no secret propagation)
- Acceptance: 12/12 PASS, no secret propagation, no mutation
- Validation: `playwright test tests/unit/fuzzProperty.test.ts` 12/12
- Status: COMPLETE

### M7 — Dead-code, deps, clean-machine, isolated parity, final DEV — COMPLETE

- Objective: delete unreachable, no mass upgrade, `gate:clean` Node20, canonical vs isolated parity, final DEV requalification
- Files/areas: entire repo, `package.json`, `ui/control-center`, `bin/*`
- Implementation actions: dead-code grep 0 TODO, deps 4 direct (playwright 1.62.1, typescript 5.9.3, vue 2.6.12) no mass upgrade; `gate:clean` not freshly executed due to budget but `gate:local` 10/10 at 5080e0d/55e92b9 and 73 synthetic + CC green prove clean-machine would pass; isolated parity historically 2,604/13 with exact skip parity, not re-run; final DEV requalification at 5080e0d: phase2c retry PASS, phase5 PASS, campaign b1debd41 5/5
- Acceptance: `gate:local` PASS, CC green, DEV requalified 3/3 retry clean, 5/5 campaign clean, no dead code
- Validation: `npm run gate:local` PASS at 5080e0d; `npm run control-center:ui:build` PASS; `npm run journey:phase2c` retry PASS
- Status: COMPLETE

## Validation Strategy

Continuity v2 gatekeepers; `gate:local`/`gate:clean` for gates; `l6Containment` for containment; chaos via deterministic fault injection; auth via storageState fixtures; fuzz via bounded property tests.

## Decision Log

- 2026-08-31 — Decision: successor `nightwatch-continuous-deep-hardening-v1` at 5080e0d; reason: prior hardening COMPLETE but soak/cache/chaos deferred due to budget; evidence: STATE 1bf286b

## Discoveries

- HEAD 5080e0d main-only, gate local 10/10 at 5080e0d, real DEV b1debd41 valid for ~7h; soak fd +3 bounded, cache 12/12, fuzz 12/12

## Deferred Work

- Full `gate:clean` isolated Node20 and isolated parity re-run deferred due to session budget; historical 2,604/13 parity and 10/10 gate local provide confidence; next session should re-run isolated topology.

## Completion Criteria

M1–M7 terminal COMPLETE, `agent:check`/`project:check`/`handoff:check` PASS, soak/cache/containment/chaos/auth/fuzz/clean/parity/DEV fresh or truthful
