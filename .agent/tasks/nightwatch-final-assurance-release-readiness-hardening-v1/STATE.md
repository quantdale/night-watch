# Task State

## Identity

Task ID: nightwatch-final-assurance-release-readiness-hardening-v1
Phase: FINAL-ASSURANCE-RELEASE-READINESS-HARDENING-V1
Status: BLOCKED
Starting SHA: e26b649c7eded8a50ab9c4c3d8a2197f9c409052
Last validated implementation SHA: 72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b
Last substantive checkpoint SHA: 72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e26b649c7eded8a50ab9c4c3d8a2197f9c409052
LAST_VALIDATED_IMPLEMENTATION_SHA: 72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 72af3a8fa69d9b0c03d5d2a9254f6e28f9f1c08b
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_FINAL_ASSURANCE_RELEASE_READINESS_HARDENING_V1_STATUS: BLOCKED

## Objective

Perform the final whole-system assurance and release-readiness campaign from
the current live `main`, repairing evidence-backed defects while preserving
Nightwatch's local-only fail-closed safety boundary.

## Current Milestone

M9 — terminal assurance certification is BLOCKED by the unproven L6
process/DNS boundary. H0, the six authority chains, the release-critical
repairs, skip census, dependency/UI, performance, canonical/isolated and
local synthetic evidence are recorded; no COMPLETE claim is permitted.

## Completed Milestones

- M0 takeover and state transition — COMPLETE; READY handoff route and
  predecessor relationship verified at live HEAD.
- M1 H0 literal whole-repository audit — COMPLETE; all tracked paths were
  accounted for, read/hashed, role-classified and reviewed.
- `npm run handoff:check` — PASS for `READY_FOR_EXECUTION` before activation.
- `npm run agent:check` — PASS with expected checkpoint/legacy warnings.
- `npm run project:check` — PASS with catalog count 2 and EXHAUSTED portfolio.

## Work In Progress

No work remains authorized in this task while L6 is unproven. The local
fail-closed boundary and all available synthetic release checks are complete;
the remaining work requires a separately authorized, safe rootless L6 proof.

## Exact Next Action

STOP. Obtain fresh owner authorization and prove direct DNS/TCP/UDP denial,
complete child-process lifecycle isolation and browser speculative-DNS closure
with an allowed rootless design before retrying certification. Do not contact
real environments or claim complete process isolation.

## Files Changed

Fresh task continuity files, active-task route and execution-prompt status,
the safety-smoke retry authority, versioned unsupported-L6 capability record
and fail-closed authenticated-OOPS guard, deterministic local OOPS fixture,
and Phase 5 provenance/privacy/template regressions.

## Validation Ledger

- Live repository: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Branch: `main`; execution began at `HEAD == origin/main ==
  e26b649c7eded8a50ab9c4c3d8a2197f9c409052`; live HEAD is always discovered
  from Git rather than copied into this record.
- Remote: `https://github.com/quantdale/night-watch.git`.
- Toolchain: Node `v22.22.1`; npm `10.9.4`.
- Planned-From `9ecd09c0d33d05d665721080627e5d63b376c16d` is an ancestor of
  live HEAD; intervening commits are planning-only OpenSpec/prompt commits.
- Pre-activation `handoff:check`: PASS.
- Pre-activation `agent:check`: PASS with 2 expected warnings.
- Pre-activation `project:check`: PASS.
- Post-activation `handoff:check`: PASS for `IN_PROGRESS`; terminal route is
  now bound to `BLOCKED`.
- Post-activation `agent:check`: PASS with the expected legacy-v1 warnings;
  `agent:audit`: 85 tasks, 61 strict v2, 24 legacy v1, 0 strict errors, 34
  legacy warnings.
- Post-activation `project:check`: expected FAIL
  `PROJECT_STATE_CHECKOUT_DIRTY` while continuity files were uncommitted.
- H0 NUL-safe census: tracked `1372`, reviewed `1372`, regular `1372`,
  nonregular `0`, missing `0`, bytes `15037644`, LF lines `300348`.
- H0 path manifest SHA256:
  `480a3d8ad6589c2b6b7b53d7669c7152d5717e34fbb8c9770c443a0850379109`.
- H0 content manifest SHA256:
  `8bd2299cd605fbee06162bc1caf03b2b6f01cf8c301d90689eb4e373f5e342f2`.
- H0 role counts: agent-continuity `452`, config `24`, corpus-fixture
  `120`, durable-doc-history `60`, gate-tooling `54`, root-metadata `5`,
  runtime-source `409`, test `234`, UI `14`.
- H0 required scans: markers `79`/`32` files; skip/only/fixme/slow
  patterns `57`/`35`; suppressions `4`/`4`; dynamic/process patterns
  `5`/`3`; checker capability patterns `1472`/`209`; prompt consumers
  `115`/`53`; OpenSpec routing `321`/`57`; secret sentinels `1881`/`449`;
  path-safety terms `1081`/`296`; authority terms `11524`/`986`.
- Complete Playwright enumeration: PASS, `2606 tests in 215 files`.
- Baseline `npm run hardening:check`: PASS.
- Baseline `npm run quality-gate:spec`: PASS, definition digest
  `sha256:4c5a9d19416fd2e0c24f01a2fd6a518b8faf47f866665ae37af21abbf8921044`,
  10 required groups, compatibility phases `22`, files `142`.
- Baseline `npm run gate:inventory`: PASS, 10 logical groups, 153 unique
  test files, 0 duplicate executions, one workflow command.
- Representative dirty `npm run gate:local`: expected FAIL at
  `PROJECT_TRUTH`; groups through `HANDOFF_TRUTH` passed exactly once and
  downstream groups were not run; receipt
  `receipt:sha256:1588e29ff204c804985c3c65`.
- Dirty `npm run project:check`: expected FAIL `PROJECT_STATE_CHECKOUT_DIRTY`.
- Agent timing: cold `2.68s`/`66604 KiB`, warm `2.20s`/`66148 KiB`.
- Project timing: cold `4.13s`/`127988 KiB`, warm `3.74s`/`126068 KiB`; both
  were expected dirty-tree failures.
- H0 delta from the prior 1,359-file audit: 13 tracked additions — four
  predecessor continuity documents, three handoff checker/protocol files,
  one handoff test, and five final-assurance OpenSpec files; no deletion or
  unexplained path.
- Rootless L6 reproduction: `/usr/bin/bwrap` `0.9.0`, direct
  `--unshare-net` `/usr/bin/true` probe exit `0`; `inspectOopsSandbox()` still
  reports `relayCompatible: false` and
  `DISABLED_RELAY_NAMESPACE_INCOMPATIBLE` for authenticated OOPS.
- Safety retry repair: `tests/smoke/safety.smoke.ts` with
  `--retries=0` passed `23/23` in `36.6s`; the stale retry and registration
  polling/reload workaround were removed, and the current awaited
  `routeWebSocket` registration is now the only authority.
- Complete canonical serial regression at `4b892fd599cefac6d624ed0de849744ab7a85d83`:
  `2607` discovered, `2593` passed, `13` skipped, `1` failed, in `22.3m`.
  The sole failure was the allowed loopback HTTP safety case: after the
  expected response, the local outer proxy classified a browser-originated
  `https-connect://www.gstatic.com:443/` as `external-default-deny`, making
  `monitor.failed` true. This was an actual hard-failure event, not a retry
  artifact; the recorded run is `artifacts/safety-http-echo-1787868202283`.
- The exact allowed-HTTP case rerun in isolation passed `1/1` in `8.7s`, and
  the complete retry-free safety smoke rerun passed `23/23` in `31.8s`.
  The discrepancy is therefore a cross-suite Chrome background-traffic seam,
  not evidence for weakening the safety assertion.
- Narrow repair: `config/environments/local.json` now classifies the exact
  observed `www.gstatic.com` host as local telemetry, never as an allowlisted
  destination; synthetic local smoke environments use the same non-fatal
  block. The safety policy regression is `28/28`, the full retry-free safety
  smoke is `23/23`, `npm run typecheck` is PASS, `npm run hardening:check` is
  PASS, and `git diff --check` is PASS.
- Restricted-OOPS deterministic qualification: the full
  `tests/unit/phase5Api.test.ts` passed `14/14`, skipped `0`, failed `0` in
  `10.4s`. The prior three binary-absence skips now use the tracked local
  `.mjs` substitute when no source-built binary is configured; the tests keep
  source/digest binding, loopback relay, oracle parity, privacy and cleanup
  assertions.
- Repair cone: `npm run typecheck`, `npm run hardening:check`,
  `npm run handoff:check`, `git diff --check`, Phase 5 (14/14), and the
  retry-free safety smoke (23/23) all pass. `inspectOopsSandbox()` remains an
  observation-only probe; no external or product network was contacted.
- Complete canonical serial suite at implementation checkpoint `72af3a8`:
  exact command `npx playwright test --project=nightwatch --workers=1
  --retries=0`; `2608` discovered, `2595` passed, `13` skipped, `0` failed,
  exit `0`, elapsed about `19.0m`.
- Topology-correct isolated suite: fresh clone, fresh `npm ci
  --ignore-scripts --no-audit --no-fund`, private HOME outside the workspace,
  no CI/storage/auth/proxy variables, `NIGHTWATCH_ENV=local`, headed mode off,
  trace off, and the same serial command; `2608` discovered, `2595` passed,
  `13` skipped, `0` failed, exit `0`, elapsed `971.29s`, peak RSS
  `1539524 KiB`. The clone was removed after validation.
- Canonical/isolated skip identity parity: PASS; both have exactly `13`
  skips. The identities are one Phase 14A C5 snapshot guard, eleven Phase 14A
  C3 fresh-source/snapshot guards, and one Phase 8B.0.1 ownership/chown guard.
  Manual real-environment guards are authorization guards and were not
  invoked; former Phase 5 binary skips use the deterministic tracked
  substitute. No blocking validation gap remains in the default release gate.
- Current semantic compatibility: PASS, `1920` total / `1907` passed /
  `13` skipped / `0` failed, elapsed `874.84s`, peak RSS `1290916 KiB`.
- Current owner-provenance and synthetic campaign checks: PASS, `91/91` in
  `48.1s` and `66/66` in `1.0m`; timed wrapper elapsed `56.87s` and `69.34s`.
- Closure local quality gate at documentation checkpoint
  `0d759f6279c754622bcaf52f50b879efe7ed4e76`: PASS, all 10 required groups;
  semantic `1920/1907/13/0`, owner `91`, synthetic `66`, patch integrity
  PASS; receipt `receipt:sha256:9be40f964db15574714632d0`.
- Closure clean gate: fresh disposable Node 20 checkout and install, all 10
  required groups PASS with semantic `1920/1907/13/0`, owner `91`, synthetic
  `66`; no module reuse, auth state, owner finding state or sibling writes;
  gate receipt `receipt:sha256:5a7f5dcf518189c23f315253`, clean receipt
  `clean-receipt:sha256:cdd966a52941eb94363ca082`.
- Exact-head GitHub Actions observation: run `33139304292`, job
  `98746329861`, head `9f0f2d7c267d12a2ddd14c50eb5b916f0e9fc0d9`, completed
  `failure` with `steps=[]`. This is
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence; no retry or
  workflow change was made.
- Control Center UI: typecheck PASS; test PASS (`2` files, `11` tests);
  build PASS (`31` modules, `3` files); browser qualification PASS (one
  qualification test, `10.3s`).
- Representative performance: agent checks cold/warm `2.68s`/`2.20s` with
  peak RSS `66604`/`66148 KiB`; project checks cold/warm `4.13s`/`3.74s`
  with peak RSS `127988`/`126068 KiB` during expected dirty-tree checks.
- Correct isolated setup required a private HOME outside the repository;
  earlier clones with HOME inside the fixture workspace or missing sibling
  topology were discarded as setup-invalid and supplied no release evidence.

## Authority Chain Review

The current source audit found one authoritative path per required chain:

1. Environment -> browser -> proxy -> safety -> evidence: environment
   selection is `src/core/environment/index.ts`; the real-run gate owns
   environment/target/auth/containment admission. `src/browser/context.ts`
   requires the proxy, installs `src/browser/observers/networkObserver.ts`
   before navigation, and blocks service/shared workers. The observer owns
   L1/L2 routing while CDP Fetch, worker stubs and the L5 proxy cover their
   respective lower/outer surfaces. `src/proxy/policyAdapter.ts`,
   `resolver.ts` and `server.ts` own deny/resolve/numeric-binding semantics;
   `src/core/evidence/runRecorder.ts` persists only sanitized evidence. Gate
   failure occurs before product contact; unknown destinations and missing
   proxy/runtime identities fail closed.
2. Source -> proof -> lifecycle -> eligibility -> campaign: the fixed
   sibling-source/approved-scan path feeds source snapshots and bounded
   extractors; recipe/provenance validators and the lifecycle registries own
   proof admission. `src/core/source/semanticCampaignBundle.ts`,
   `src/core/phase22/eligibility.ts`, `src/core/campaign/selection.ts` and
   `src/core/campaign/orchestrator.ts` consume those validated records. Stale,
   unavailable, ambiguous or out-of-scope source evidence cannot become an
   eligible campaign item; source text and customer values do not cross the
   projection boundary.
3. Observation -> oracle -> candidate -> replay/minimization -> triage ->
   dossier -> private finding: protocol/semantic oracle modules produce
   bounded identity/fingerprint results; candidate validation and lifecycle
   own admission; `src/core/triage/replayBinding.ts`, `minimizer.ts`,
   `pipeline.ts`, dossier validation and promotion/readiness models own the
   downstream chain. `src/controlCenter/authorities/findingsAuthority.ts`
   reads only owner-local sanitized finding records through currentness and
   artifact validation. Raw bodies, credentials and customer values are not
   persisted or used as finding identity.
4. Artifacts/findings/source/campaign -> Control Center adapters -> snapshot
   coordinator -> server/UI: the four authorities under
   `src/controlCenter/authorities/` own their source domains; adapters under
   `src/controlCenter/adapters/` are read-only projections into versioned
   contracts. `ControlCenterSnapshotCoordinator` owns bounded refresh/cache
   state and rejects stale current snapshots on failed refresh. The server
   router is loopback/GET/HEAD/path/query guarded and the UI fetches with
   credentials omitted and no-store. Unavailable, stale and malformed state
   is projected as explicit status rather than a product-success fallback.
5. Prompt -> handoff -> active task -> continuity -> project state -> gate:
   `planner-handoff-protocol` and `planner-handoff-check` own prompt route and
   identity binding; `.agent/ACTIVE_TASK.md` selects the task, task STATE owns
   milestone continuity, `agent-state` validates v2 coherence, and
   `project-state-check` owns the strict project snapshot. The quality gate
   invokes handoff exactly once before project/agent continuity and records
   bounded receipts. Wrong route, stale baseline, duplicate/unknown fields,
   dirty checkout and malformed state fail closed.
6. Package scripts -> gate definition -> inventory -> runners: `package.json`
   exposes the fixed scripts; `config/quality-gate.v1.json` is the only group
   and dependency definition; `quality-gate-spec` validates it and
   `quality-gate-inventory` proves unique authoritative files. The shared
   `quality-gate.mjs` owns fixed command dispatch and dependency stop
   semantics, while `quality-gate-clean.mjs` creates a disposable local
   checkout, installs with Node 20 and runs the clean runner. No shell-string
   command authority or ambient credential propagation was found.

No duplicate selector, silent stale-cache acceptance, unchecked current-looking
field or lifecycle leak was found in these chains. The two material seams were
reproduced and repaired/blocked as recorded below.

## Release-Critical Behavior Matrix

- Local fixture success and expected oracle failure: PASS through the
  deterministic Phase 5 relay and restricted OOPS subprocess; the child sees
  no body or parent secret, and the assertion failure remains an oracle
  result.
- Outbound deny, resolved-address/CONNECT/Upgrade boundaries and redaction:
  PASS in the retry-free safety matrix, including HTTP, redirects, workers,
  SSE, WebSocket, popup/download and fake credential redaction cases.
- Source currentness/proof-gap/eligibility/campaign, artifact corruption,
  private-finding stale/malformed/unknown state, Control Center refresh/SSE/
  selected-run stability and graceful shutdown: covered by existing focused
  synthetic suites; no new failure was reproduced during the authority pass.
- Planner transition, project-state malformed/duplicate/competing authority,
  and gate dependency/failure propagation: existing handoff/project/gate
  checkers and focused matrices remain green; dirty project truth stops before
  downstream groups.
- L6 direct DNS/TCP/UDP denial and complete process/network lifecycle: NOT
  PROVEN. Bubblewrap namespace creation succeeds locally, but parent-relay
  reachability is incompatible and browser speculative DNS remains outside
  L5. The versioned capability record is `UNPROVEN/BLOCKED` and authenticated
  OOPS fails before workspace creation or child spawn.

## Skip Census and Dispositions

The terminal default-suite skip set is exactly 13 identities in both the
canonical and isolated suites, with parity PASS:

- one Phase 14A C5 `--snapshot` test requiring a disposable source snapshot —
  `LEGITIMATE_ENVIRONMENT_GUARD`;
- eleven Phase 14A C3 fresh-source/currentness tests requiring a disposable
  source snapshot — `LEGITIMATE_ENVIRONMENT_GUARD`;
- one Phase 8B.0.1 ownership/chown test requiring uid semantics and chown —
  `LEGITIMATE_ENVIRONMENT_GUARD`.

The former Phase 5 absent-binary identities are no longer skipped:
`DETERMINISTIC_SUBSTITUTE_PRESENT` supplies the tracked local relay and the
full Phase 5 file passes `14/14`. Manual real-environment guards in
`tests/manual/phase{2c,4,5,7}-real-*` are narrow
`LEGITIMATE_ENVIRONMENT_GUARD` cases and were not invoked. Git-backed cases
were executable in the canonical and isolated topology; no unexplained or
blocking skip remains.

## Decisions Made During This Task

- 2026-08-28 — A new READY prompt replaced the completed predecessor prompt
  on pull; it is activated as a fresh task rather than reopening history.
- 2026-08-28 — The prior validated implementation anchor is retained until
  this campaign lands a substantive implementation checkpoint.
- 2026-08-28 — The optional read-only audit worker was not invoked because
  its required ACP health check failed on the local Kimi version probe;
  direct repository evidence remains authoritative.
- 2026-08-28 — H0 is closed at the pulled execution head before ordinary
  implementation: the live delta from the prior census is 13 tracked
  planning/handoff paths, all regular and accounted for.
- 2026-08-28 — Repeated canonical-local evidence identified
  `www.gstatic.com` as a Chrome-generated local background CONNECT that was
  being denied as unexpected external traffic after an otherwise successful
  probe. Classify that one exact host as local telemetry only, preserving
  deny-before-network behavior and leaving every DEV/NEXT/production policy
  unchanged; require a full canonical rerun before treating the repair as
  validated.
- 2026-08-28 — The repair was validated by the exact retry-free canonical
  suite and a topology-correct isolated suite. The observed gstatic CONNECT is
  local telemetry only; it is not an allowlist or browser-background escape.
- 2026-08-28 — The isolated run is authoritative only when its clone has the
  repository's sibling topology and its private HOME is outside the fixture
  workspace. Runs with missing siblings or HOME/workspace overlap were
  classified as setup-invalid and not used as evidence.
- 2026-08-28 — M4–M8 qualification is locally complete enough to select the
  blocked terminal route: all required available synthetic, UI, canonical,
  isolated, semantic, provenance and campaign checks passed, while L6 remains
  unproven under the permanent safety scope.

## Discoveries

- The planning sequence after `Planned-From` is documentation-only and
  includes the complete final-assurance OpenSpec plus prompt route.

## Deferred / Follow-Up

H0 and M2–M8 qualification are closed for this campaign. Remaining findings
are:

- P1 L6 process/DNS containment remains open by design: Bubblewrap namespace
  creation is observed, but direct DNS/TCP/UDP denial, complete lifecycle
  isolation, parent-relay reachability and browser speculative-DNS closure
  are not proven. Authenticated/non-browser OOPS therefore remains blocked.
- P1 external CI is not repository evidence when the exact-head job executes
  zero steps; run `33139304292` / job `98746329861` is classified as
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, not a workflow repair target. No
  retry was made.
- P2 Vue 2 legacy/deprecation and one low-severity `npm audit` finding remain
  documented non-blocking dependency hygiene; no demonstrated runtime defect
  justifies version churn in this campaign.

## Blockers

- `PROJECT_NOT_COMPLETE_BLOCKED`: L6 process/DNS containment is not proven.
  Bubblewrap namespace creation works locally, but the parent relay is
  incompatible and browser speculative DNS remains outside L5; direct
  DNS/TCP/UDP denial and complete child-process lifecycle isolation therefore
  cannot be certified. Authenticated OOPS remains disabled before workspace
  creation or child spawn. Unblocking requires fresh owner authorization and
  a safe rootless proof that does not use privileged networking, system-wide
  mutation, TLS MITM, or live external probes.

## Safety Events

- The pre-repair canonical suite caught one real retry-free browser background
  classification failure; it was repaired narrowly by classifying the exact
  `www.gstatic.com` CONNECT as local telemetry. Safety assertions and the
  retry-free matrix remain green (`23/23`, policy `28/28`).
- L6 remained fail-closed throughout. No real environment, product endpoint,
  database, cloud/infrastructure system, sibling repository or credential was
  contacted.

## Resume Recipe

STOP. Do not resume implementation or retry certification. Only a separately
authorized safe rootless L6 design with mechanically proven DNS/TCP/UDP and
browser speculative-DNS containment may reopen this task; then re-read the
prompt, SPEC, PLAN and this state and revalidate from the new evidence.

## Completion Snapshot

Terminal outcome: `PROJECT_NOT_COMPLETE_BLOCKED`.

The source repair checkpoint `72af3a8` is validated. The canonical and
topology-correct isolated suites are both `2608` discovered / `2595` passed /
`13` skipped / `0` failed with exact skip identity parity. Semantic
compatibility is `1920/1907/13/0`; owner provenance is `91/91`; synthetic
campaign is `66/66`; UI typecheck, tests, build and browser qualification are
green; safety is retry-free and restricted OOPS is deterministic. The closure
local and fresh Node 20 clean gates are green with the receipts recorded
above. The single post-push CI observation was a zero-step external
non-evidence result (`33139304292` / `98746329861`); even executed green
receipts could not override the unproven L6 boundary. No COMPLETE outcome is
permitted.
