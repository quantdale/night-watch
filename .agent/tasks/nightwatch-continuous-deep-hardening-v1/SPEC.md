# Nightwatch Continuous Deep Hardening

## Task purpose

Continue the post-acceptance hardening campaign with the deferred deep-hardening workstreams that were recorded as budget-deferred: long-run/soak and resource lifecycle, cache currentness, L6/L5 containment requalification, replay/resume chaos, auth lifecycle, fuzz/property, dead-code, clean-machine and isolated parity, with fresh DEV requalification. The predecessor `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1` is COMPLETE at 59c44e0/5080e0d; this successor proves that an already hardened system remains stable over repeated autonomous operation.

## Established starting state

- Task ID: `nightwatch-continuous-deep-hardening-v1`
- Phase: `CONTINUOUS_DEEP_HARDENING_V1`
- Starting SHA: `5080e0d67794462853f62b8757b64d41410b2f1e`
- Last validated impl: `59c44e00b3a07765fcf4ce7fac3ce1b811ea15da`
- Predecessor: `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1` COMPLETE (OPERATIONALLY_ACCEPTED, gate local 10/10 at 5080e0d, real DEV b1debd41)
- Current HEAD: `5080e0d` docs closure, `59c44e0` impl, `04ff5839` census
- Continuity: `nightwatch.agent-continuity.v2`
- OpenSpec: `openspec/changes/nightwatch-continuous-deep-hardening-v1/`
- Planned-From: `5080e0d67794462853f62b8757b64d41410b2f1e`

## Required deliverables

- Soak/long-run harness: repeated synthetic campaigns (3×) with before/after resource snapshots (fd, tmp, cache, proxy)
- Cache currentness: 12-case matrix (same SHA/changed content, stale, interrupted, duplicate key) with fail-closed proof
- Containment requalification: L6 synthetic `l6Containment.test.ts` + manual direct DNS/TCP/UDP/HTTP/CONNECT/WS/IPv6 checks, no boundary loosening
- Replay/resume chaos: 8-case injection (manifest, first/middle/last item, evidence write, teardown) with no lost/duplicate work
- Auth lifecycle: 9-case matrix (valid, expired, missing, malformed, wrong env, mid-run invalid, refresh, human-required, interruption) — sanitized
- Fuzz/property: bounded tests for canonicalizers/parsers (permutation stability, idempotence, digest, malformed rejection)
- Dead-code/dependency: audit, delete unreachable, no mass upgrade
- Clean-machine `gate:clean` and isolated parity `canonical vs isolated` with exact counts
- Final DEV requalification (phase2c/phase4/phase5/prepare/resume/replay) or truthful blocker
- Updated `STATE.md`/`REPORT.md`/`PLAN.md` with defect ledger and evidence

## Explicit non-goals

Production, DB, infra, sibling writes, weakening containment, speculative proof, publication, mass dependency upgrades, large model downloads.

## Safety constraints

DEV only via contained launchers; external auth outside Git; no secrets; fail-closed; no force-push; deterministic fail-closed proofs.

## Acceptance criteria

- `agent:check`/`project:check`/`handoff:check`/`hardening:check` PASS for new task
- Soak shows bounded artifact/cache growth and no leaked processes/ports/fds
- Cache matrix 12/12 PASS and stale read never accepted
- L6 4/4 PASS, no egress outside proxy
- Replay/resume chaos 8/8 PASS with deterministic reconstruction
- Auth matrix 9/9 fail-closed with sanitized diagnostics
- Fuzz/property at least 20 new cases PASS
- `gate:clean` PASS, isolated parity exact (or truthfully explained divergence)
- Final DEV requalification fresh or truthful `HUMAN_AUTH_ACTION_REQUIRED`
