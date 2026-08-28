# Final Assurance + Release-Readiness Hardening — Execution Report

Status: BLOCKED
Task ID: nightwatch-final-assurance-release-readiness-hardening-v1
Phase: FINAL-ASSURANCE-RELEASE-READINESS-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Takeover

The planning handoff was pulled and reconciled at live `main` HEAD
`e26b649c7eded8a50ab9c4c3d8a2197f9c409052`. The prompt was
`READY_FOR_EXECUTION`, the named predecessor was terminal COMPLETE, and the
pre-activation handoff, continuity and project-state checks passed. A fresh
continuity-v2 task was created and activated; the predecessor remains
immutable history.

The implementation checkpoint `72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b`
contains only evidence-backed local repairs. No real environment, product
endpoint, database, cloud/infrastructure system, sibling repository,
credential or external publication path was contacted.

## H0 census and initial findings

- Live baseline: `e26b649c7eded8a50ab9c4c3d8a2197f9c409052`, `main`, equal to
  `origin/main`; Node `v22.22.1`; npm `10.9.4`.
- NUL-safe tracked inventory: `1372` tracked / `1372` reviewed / `1372`
  regular / `0` nonregular / `0` missing; `15037644` bytes and `300348` LF
  lines. Path digest:
  `480a3d8ad6589c2b6b7b53d7669c7152d5717e34fbb8c9770c443a0850379109`.
  Content digest:
  `8bd2299cd605fbee06162bc1caf03b2b6f01cf8c301d90689eb4e373f5e342f2`.
- Role census: agent-continuity `452`, config `24`, corpus-fixture `120`,
  durable-doc-history `60`, gate-tooling `54`, root-metadata `5`,
  runtime-source `409`, test `234`, UI `14`.
- The prior 1,359-file census differs by 13 tracked additions: four
  continuity documents, three handoff checker/protocol files, one handoff
  test, and five final-assurance OpenSpec files. No tracked deletion or
  unexplained path was found.
- Complete Playwright enumeration passed with `2606 tests in 215 files`.
  Required marker/capability/privacy/path/authority scans were run over every
  regular tracked file; aggregate scan counts are preserved in `STATE.md`.
- Baseline hardening and quality-gate specification/inventory passed. The
  dirty local gate correctly stopped at `PROJECT_TRUTH` with receipt
  `receipt:sha256:1588e29ff204c804985c3c65`; no downstream group ran.
- Safety reproduction with retries forced to zero passed all `23/23` tests in
  `47.9s`, proving the current two-retry WebSocket rationale is stale.
  Bubblewrap `0.9.0` and its unprivileged network-namespace `/usr/bin/true`
  probe passed, but the relay remains incompatible and authenticated OOPS is
  disabled. Three restricted-OOPS release tests remain skipped when the
  source-built binary is absent (`10 passed / 3 skipped / 0 failed`).

Initial remediation matrix: P1 L6/process-DNS containment truth required a
truthful blocking disposition; P1 safety-retry authority was repaired and
validated; P2 restricted-OOPS binary-absence coverage was replaced by a
deterministic tracked substitute. Dependency/toolchain, resource/lifecycle,
documentation and release-matrix qualification are recorded below.

## Terminal outcome

`PROJECT_NOT_COMPLETE_BLOCKED`

## M2/M3A authority and safety repairs

- The six required authority chains were traced and no duplicate selector,
  stale-currentness acceptance, silent cache fallback or lifecycle leak was
  found in the audited paths.
- `tests/smoke/safety.smoke.ts` now has retry-free WebSocket authority. The
  complete safety matrix passed `23/23`; the focused safety policy matrix
  passed `28/28`.
- The exact Chrome background CONNECT observed in the first canonical run,
  `www.gstatic.com`, is classified as local telemetry only. It is not an
  allowlisted destination and does not make browser background traffic
  successful.
- Restricted OOPS is deterministically qualified through the tracked local
  substitute: `tests/unit/phase5Api.test.ts` passed `14/14` with zero skips.
  Authenticated OOPS still fails closed before workspace creation or child
  spawn because L6 is not proven.

## M4–M8 release evidence

- Canonical serial command `npx playwright test --project=nightwatch
  --workers=1 --retries=0`: `2608` discovered, `2595` passed, `13` skipped,
  `0` failed, exit `0`, about `19.0m`.
- Topology-correct isolated serial suite from a fresh clone and fresh install:
  `2608` discovered, `2595` passed, `13` skipped, `0` failed, exit `0`,
  `971.29s`, peak RSS `1539524 KiB`. Private HOME was outside the fixture
  workspace; the disposable clone was removed after validation.
- Canonical and isolated skip identity parity is PASS. The 13 identities are
  one Phase 14A C5 disposable-snapshot guard, eleven Phase 14A C3
  fresh-source/currentness snapshot guards, and one Phase 8B.0.1 ownership/
  chown guard. Each is `LEGITIMATE_ENVIRONMENT_GUARD`. Former Phase 5
  binary-absence skips are `DETERMINISTIC_SUBSTITUTE_PRESENT`; manual real
  environment guards were not invoked and are not default-suite evidence.
- Semantic compatibility: `1920` total / `1907` passed / `13` skipped /
  `0` failed, exit `0`, `874.84s`, peak RSS `1290916 KiB`.
- Owner provenance: `91/91` passed, exit `0`, wrapper elapsed `56.87s`.
  Synthetic campaign: `66/66` passed, exit `0`, wrapper elapsed `69.34s`.
- Closure local quality gate at `0d759f6279c754622bcaf52f50b879efe7ed4e76`:
  all 10 required groups PASS; receipt
  `receipt:sha256:9be40f964db15574714632d0`.
- Closure clean Node 20 gate: fresh install, all 10 required groups PASS,
  no module reuse/auth/finding state/sibling writes; gate receipt
  `receipt:sha256:5a7f5dcf518189c23f315253`, clean receipt
  `clean-receipt:sha256:cdd966a52941eb94363ca082`.
- Exact-head GitHub Actions observation for pushed head
  `9f0f2d7c267d12a2ddd14c50eb5b916f0e9fc0d9`: run `33139304292`, job
  `98746329861`, completed `failure` with `steps=[]`. It is classified
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence; no retry or
  workflow churn was performed.
- Control Center UI typecheck, tests (`11`), build and browser qualification
  all passed. The build produced `31` modules and `3` files; the browser
  qualification had one passing test and no console errors or error overlay.
- Fresh isolated `npm ci --ignore-scripts --no-audit --no-fund` succeeded in
  `11s` under the campaign's Node 22 host; clean-gate qualification remains
  the supported Node 20 path. Vue 2 deprecation and one low-severity audit
  finding are non-blocking legacy dependency hygiene.
- Representative agent/project checks were stable across cold/warm samples;
  no material resource or lifecycle regression was reproduced.

## Terminal disposition

L6 process/DNS containment remains unproven. Bubblewrap `0.9.0` can create an
unprivileged namespace (`--unshare-net` `/usr/bin/true` probe exit `0`), but
the parent relay is incompatible and browser speculative DNS remains outside
L5. Direct DNS/TCP/UDP denial and complete child-process lifecycle isolation
were therefore not certified. Closing this requires fresh owner
authorization and a safe rootless proof; privileged firewall/network
administration, system-wide DNS/hosts/proxy mutation, TLS MITM and live
external probes remain prohibited.

The exact-head GitHub Actions result above is external non-evidence because no
required step executed; it is not grounds to weaken this boundary or claim
project completion.
