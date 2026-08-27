# Task State

## Identity

Task ID: nightwatch-final-assurance-release-readiness-hardening-v1
Phase: FINAL-ASSURANCE-RELEASE-READINESS-HARDENING-V1
Status: IN_PROGRESS
Starting SHA: e26b649c7eded8a50ab9c4c3d8a2197f9c409052
Last validated implementation SHA: e4ac7076600f9a347d230445aa312e321f635624
Last substantive checkpoint SHA: e4ac7076600f9a347d230445aa312e321f635624
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e26b649c7eded8a50ab9c4c3d8a2197f9c409052
LAST_VALIDATED_IMPLEMENTATION_SHA: e4ac7076600f9a347d230445aa312e321f635624
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e4ac7076600f9a347d230445aa312e321f635624
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_FINAL_ASSURANCE_RELEASE_READINESS_HARDENING_V1_STATUS: IN_PROGRESS

## Objective

Perform the final whole-system assurance and release-readiness campaign from
the current live `main`, repairing evidence-backed defects while preserving
Nightwatch's local-only fail-closed safety boundary.

## Current Milestone

M2/M3A — architecture and authority audit plus release-critical containment
repair; H0 is complete, the six authority chains are traced, and the first
repair cone is green. Full reproducibility and release certification remain.

## Completed Milestones

- M0 takeover and state transition — COMPLETE; READY handoff route and
  predecessor relationship verified at live HEAD.
- M1 H0 literal whole-repository audit — COMPLETE; all tracked paths were
  accounted for, read/hashed, role-classified and reviewed.
- `npm run handoff:check` — PASS for `READY_FOR_EXECUTION` before activation.
- `npm run agent:check` — PASS with expected checkpoint/legacy warnings.
- `npm run project:check` — PASS with catalog count 2 and EXHAUSTED portfolio.

## Work In Progress

M4–M8 qualification: finish the exact skip census, clean Node 20 dependency
and UI qualification, performance/resource checks, current-facing truth
updates, and the complete canonical/isolated/local/clean release matrix.
The L6 residual remains a deliberate terminal-completion blocker.

## Exact Next Action

Run the dependency-ordered M4–M8 validation matrix from the clean substantive
checkpoint, record exact pass/fail/skip receipts, then select the truthful
terminal outcome. Do not claim complete process isolation.

## Files Changed

Fresh task continuity files, active-task route and execution-prompt status,
the safety-smoke retry authority, versioned unsupported-L6 capability record
and fail-closed authenticated-OOPS guard, deterministic local OOPS fixture,
and Phase 5 provenance/privacy/template regressions.

## Validation Ledger

- Live repository: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Branch: `main`; `HEAD == origin/main == e26b649c7eded8a50ab9c4c3d8a2197f9c409052`.
- Remote: `https://github.com/quantdale/night-watch.git`.
- Toolchain: Node `v22.22.1`; npm `10.9.4`.
- Planned-From `9ecd09c0d33d05d665721080627e5d63b376c16d` is an ancestor of
  live HEAD; intervening commits are planning-only OpenSpec/prompt commits.
- Pre-activation `handoff:check`: PASS.
- Pre-activation `agent:check`: PASS with 2 expected warnings.
- Pre-activation `project:check`: PASS.
- Post-activation `handoff:check`: PASS for `IN_PROGRESS`.
- Post-activation `agent:check`: PASS with the expected checkpoint and legacy
  warnings; `agent:audit`: 85 tasks, 61 strict v2, 24 legacy v1, 0 strict
  errors, 34 legacy warnings.
- Post-activation `project:check`: expected FAIL `PROJECT_STATE_CHECKOUT_DIRTY`
  while continuity files are uncommitted.
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

The release-critical Phase 5 identities that previously skipped on absent
`NIGHTWATCH_OOPS_BINARY` are now `DETERMINISTIC_SUBSTITUTE_PRESENT`: local
relay success, assertion failure, and all six generated KNOWN_READ templates
run through the tracked substitute and have zero skips. The remaining manual,
source-snapshot, git-availability and self-development guards are environment
or authorization guards outside the synthetic release gate; their exact
identity census and canonical/isolated parity are still part of M4/M8.

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

## Discoveries

- The planning sequence after `Planned-From` is documentation-only and
  includes the complete final-assurance OpenSpec plus prompt route.

## Deferred / Follow-Up

H0 is complete and M2/M3A authority work is materially closed. Remaining
qualification and terminal findings are:

- P1 L6 process/DNS containment remains open by design: Bubblewrap namespace
  creation is observed, but direct DNS/TCP/UDP denial, complete lifecycle
  isolation, parent-relay reachability and browser speculative-DNS closure
  are not proven. Authenticated/non-browser OOPS therefore remains blocked.
- P1 external CI is not repository evidence when the exact-head job executes
  zero steps; this is an external non-evidence classification, not a workflow
  repair target.
- P2 dependency/toolchain, performance/resource, documentation truth and the
  full canonical/isolated/clean release matrix remain under qualification.

## Blockers

None.

## Safety Events

None.

## Resume Recipe

Read this state, continue M4–M8 qualification from the next exact action,
record every release receipt, and preserve the L6 blocked boundary. Do not
contact external environments or edit sibling repositories.

## Completion Snapshot

Not complete; M0/M1 and the authority/repair cone are recorded, while full
release certification remains open and the L6 residual prevents a COMPLETE
terminal outcome unless separately and safely proven.
