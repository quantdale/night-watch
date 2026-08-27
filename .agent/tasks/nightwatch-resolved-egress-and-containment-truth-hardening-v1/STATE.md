# Task State

## Identity

Task ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Phase: RESOLVED-EGRESS-AND-CONTAINMENT-TRUTH-HARDENING-V1
Status: IN_PROGRESS
Starting SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
Last validated implementation SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
Last substantive checkpoint SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
Last documentation checkpoint SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
STARTING_SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
LAST_VALIDATED_IMPLEMENTATION_SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
LAST_DOCUMENTATION_CHECKPOINT_SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
LIVE_HEAD_AUTHORITY: GIT
CURRENT_LOCAL_HEAD: DISCOVER_FROM_GIT
CURRENT_REMOTE_HEAD: DISCOVER_FROM_GIT
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
PHASE_RESOLVED_EGRESS_AND_CONTAINMENT_TRUTH_HARDENING_V1_STATUS: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Branch: main

## Objective

Implement the selected OpenSpec resolved-egress containment hardening
campaign, preserving the hostname policy and all permanent read-only,
privacy, browser, semantic, source-proof, owner-freeze, and no-publication
boundaries.

## Current Milestone

M1 — mandatory pre-fix reproductions.

## Completed Milestones

- M0 takeover, H0, and baseline completed at the activation checkpoint.
- M1 resolver-boundary/exact-dial BEFORE reproductions were added in
  `tests/unit/resolvedEgressHardening.test.ts` before any production source
  edit. Policy-denied, telemetry, optional-support, and browser-background
  requests made zero resolver calls in the current implementation. The
  allowlisted synthetic hostname made zero injected resolver calls, while the
  current upstream primitive received the hostname and no family; the desired
  numeric-address/family assertions failed. The unsafe synthetic answer was
  not admitted and still reached the fixture under the current implementation
  (desired status `502`, observed `200` and upstream request count `2`).
- Task activation and required takeover reading completed.
- Requested `git pull --ff-only origin main` completed; live `main` and
  `origin/main` are `9a70e7f`.
- OpenSpec status is complete for planning artifacts; apply progress is
  `0/297` until evidence-backed implementation begins.
- H0 NUL-safe manifest reviewed all `1,339/1,339` tracked regular paths;
  non-regular paths `0`; bytes `14,678,946`; newline lines `293,399`;
  manifest `sha256:77ab538468b754f90ec0ff30c518d68244794d4c049218f35571c43de5dbb4e4`.
- H0 changed-since-planning review covered all six paths from
  `4981b212eed46ffde1edac2b175f1bd1b1f826d2` through starting `HEAD`; all
  are prompt/OpenSpec planning documentation.
- The post-activation H0 recheck covers `1,343/1,343` tracked regular paths;
  non-regular paths `0`; bytes `14,699,899`; newline lines `293,908`;
  ordered path/size/content manifest
  `sha256:cfae197f3f977cd2916e5b30c644550ee36610c02adf786641f8975e6d56979c`.
- The post-activation class counts are active-runtime `409`, tests `233`,
  config `6`, UI `14`, corpus-fixtures `112`, tooling-bin `51`, workflow `1`,
  docs/OpenSpec `50`, continuity/history `440`, generated/lock/metadata `19`,
  and other-explicit `8`; reviewed equals tracked.

## Work In Progress

The pre-fix red-team harness is being added. Production runtime behavior has
not been edited; the current proxy's hostname-to-implicit-Node-lookup gap is
being reproduced with synthetic loopback fixtures.

## Exact Next Action

Implement the pure numeric address parser/classifier and bounded resolver
admission seam, keeping the recorded BEFORE test failures as the regression
target.

## Blockers

None.

## Baseline / H0 Ledger

- Git: clean `main...origin/main`; origin is
  `https://github.com/quantdale/night-watch.git`; starting `HEAD` equals
  `origin/main` at `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`.
- Toolchain: Node `v22.22.1`, npm `10.9.4`, Git `2.43.0`, Linux WSL2;
  Chrome `151.0.7922.173`; Playwright `1.62.1`.
- H0 class counts after task activation: active-runtime `409`, tests `233`,
  config `6`, UI `14`, corpus-fixtures `112`, tooling/bin `51`, workflow `1`,
  docs/OpenSpec `50`, continuity/history `440`, generated/lock/metadata `19`,
  other-explicit `8`.
- Existing active proxy path: `src/proxy/server.ts` uses hostname-valued
  `http.request` and `net.connect` after hostname policy allow; `events.ts`
  counts allow before connection outcome; `runtime.ts` validates only
  `OUTBOUND_POLICY_VERSION` and health. Existing browser contract retains
  mandatory loopback proxy, bypass disable, QUIC/WebRTC/background/hints
  restrictions; process DNS remains unresolved.
- TODO/FIXME/HACK/XXX/DEPRECATED active-code hits are limited to existing
  documentation/compatibility notes and intentional hardening/self-scan
  vocabulary; none is an active containment defect. The exact skip inventory
  is: `tests/manual/phase2c-real-journeys.ts:368`,
  `tests/manual/phase4-real-exploration.ts:344`,
  `tests/manual/phase5-real-api.ts:210`,
  `tests/manual/phase7-real-campaign.ts:1095`,
  `tests/unit/agent-state.test.ts:24`,
  `tests/unit/changeIntelligenceBacktest.test.ts:111`,
  `tests/unit/phase14ContractReport.test.ts:391`,
  `tests/unit/phase14FreshSourceAdmission.test.ts:87`,
  `tests/unit/phase14FreshSourceAdmission.test.ts:196`,
  `tests/unit/phase5Api.test.ts:197`,
  `tests/unit/phase5Api.test.ts:246`,
  `tests/unit/phase5Api.test.ts:280`,
  `tests/unit/projectState.test.ts:38`,
  `tests/unit/selfDevSandboxConfinement.test.ts:147`,
  `tests/unit/selfDevSandboxConfinement.test.ts:160`, and
  `tests/unit/snapshotter.test.ts:29`. These are historical/manual
  capability or environment-availability guards, not new containment skips.
  Existing process/network primitive hits are confined to the reviewed proxy,
  browser fixtures, launchers, tests, and hardening scans; no active proxy
  path has a shell/eval/raw-diagnostic bypass.

## Validation Ledger

- `git diff --check 4981b212eed46ffde1edac2b175f1bd1b1f826d2..HEAD`: PASS.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS (`offline structural invariants hold`).
- `npx playwright test tests/unit/proxy.test.ts --project=nightwatch
  --workers=1`: `3 passed`, `0 failed`, `9.35s`.
- `npx playwright test tests/unit/safety.test.ts --project=nightwatch
  --workers=1`: `27 passed`, `0 failed`, `3.90s`.
- `npx playwright test tests/unit/realRunGate.test.ts --project=nightwatch
  --workers=1`: `10 passed`, `0 failed`, `3.45s`.
- `npx playwright test tests/unit/evidence.test.ts
  tests/unit/destinationManifest.test.ts tests/unit/containmentEffect.test.ts
  --project=nightwatch --workers=1`: `21 passed`, `0 failed`, `3.76s`.
- `npx playwright test tests/smoke/proxy.smoke.ts --project=nightwatch
  --workers=1`: `6 passed`, `0 failed`, `8.79s`.
- `npm run quality-gate:spec`: PASS; definition digest
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`,
  9 groups, compatibility `22 phases/141 files`.
- `npm run gate:inventory`: PASS; 9 authoritative logical groups and 152
  unique files.
- `npm run project:check`: PASS; adopted catalog count `1`, digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`,
  Phase 8 complete, promotion authority `NONE`, active continuity PASS.
- `npm run agent:audit`: PASS; `82` tasks, `58` strict v2, `24` legacy v1,
  `0` strict errors; the fresh task has `0` errors and `0` warnings.
- `npm run gate:local`: PASS in `283.64s`; gate head
  `372f51d12ebd7d5345c5444ff27602ba9508bf08`, package-lock digest
  `sha256:e87bf7337541d2ce03bb701deb09fc14853b5711c45688fcf8b647d04ebfe45c`,
  Node major `22`, all 9 groups PASS, semantic compatibility
  `1903 total/1890 passed/13 skipped/0 failed`, owner provenance `91 passed`,
  synthetic campaign `66 passed`, receipt
  `receipt:sha256:af4db19337c1ca46035bce61`.
- Current identities/shapes: `OUTBOUND_POLICY_VERSION` is
  `phase-2a-browser-background-policy-v1`; `ProxyRuntimeState` contains
  `address`, `host`, `port`, `environment`, `policyVersion`, and
  `eventLogPath`; `ProxyEvent` contains sequence/timestamp/run/protocol/
  host/port/classification/decision/rule/reason with optional semantic and
  containment labels; `ProxySummary` contains the seven legacy counters
  `allowed`, `telemetryBlocked`, `optionalSupportBlocked`,
  `browserBackgroundBlocked`, `denied`, `unknown`, and `violations`.
- Browser contract baseline retains `--proxy-bypass-list=<-loopback>`,
  `--disable-quic`, `--force-webrtc-ip-handling-policy=disable_non_proxied_udp`,
  SafeBrowsing/download controls, and the reviewed background-networking,
  sync, update, network-hint, and fetching-hint restrictions.
- Full baseline `npm run gate:local` has no pre-existing failures. The
  canonical semantic compatibility skips are inherited compatibility cases,
  not failures or new campaign skips.
- `npx playwright test tests/unit/resolvedEgressHardening.test.ts
  --project=nightwatch --workers=1`: BEFORE red-team result, `0 passed`,
  `2 failed`, `3.65s` wall. The policy-block zero-call assertions passed
  before the intentional soft failures. Failure evidence: injected resolver
  calls were `[]` instead of `['allowed.synthetic.test']`; the connector
  observed `{ hostname: 'allowed.synthetic.test', family: undefined }` rather
  than a numeric address/family; safe fixture requests were `0` and unsafe
  fixture requests were `1` after the first request and `2` after the unsafe
  answer; the unsafe-answer desired `502` was `200`.
- Before reproducers: recorded; no production source was edited before this
  red run.
- After focused/full/clean/serial gates: PENDING.

## Files Changed

Only the fresh task records, ACTIVE_TASK routing, and the synthetic red-team
test fixture have changed before the first production implementation slice;
runtime source and completed predecessor records remain untouched.

## Decisions Made During This Task

- Use the pulled OpenSpec campaign as a fresh successor task rather than
  resuming the completed durable-artifact predecessor.
- Treat local Git and the NUL-safe manifest as authoritative over the planner's
  remote inventory; keep all execution LOCAL / SOURCE / SYNTHETIC.
- Baseline acceptance is green at the activation checkpoint; the existing
  hostname-valued upstream calls are the intentional BEFORE defect under test.
- The red run confirms the defect without external DNS: the test-level
  connector spy rewrites only the current hostname-valued call to a local
  loopback fixture; injected resolver objects never receive socket authority.

## Safety Events

No safety event. No external environment, DNS, authenticated state, customer
data, cloud/infrastructure, sibling repository, publication, or privileged
networking action occurred.

## Discoveries

The current hostname-only proxy path is in `src/proxy/server.ts`; the runtime
state currently identifies only `OUTBOUND_POLICY_VERSION` and proxy health.
The browser contract and durable docs retain the unresolved process-DNS/L6
residual. The control-center evidence reader consumes the legacy seven-field
proxy summary and will require an explicit compatibility decision if the
durable summary shape changes.

## Deferred / Follow-Up

L6 container/network namespace/firewall/root isolation; real Alphaus DNS or
product contact; unproven private routing; and unrelated authority/schema
expansion remain deferred.

## Resume Recipe

Read this STATE, inspect `git status` and the diff, implement the M2 pure
address classifier/resolver seam, then rerun the M1 regression and M2 matrix.

## Completion Snapshot

Not terminal. M0 and the M1 BEFORE reproduction milestone are complete; M2 is
next and no final acceptance claim has been made.

## Safety Ledger

- DEV contacts: `0`
- NEXT contacts: `0`
- production contacts: `0`
- live Alphaus DNS reconnaissance: `0`
- authenticated storage-state loads: `0`
- customer/data/datastore operations: `0`
- cloud/infra operations: `0`
- sibling repository writes: `0`
- publication/external findings: `0`
- runtime external AI/model calls: `0`
- Docker/network namespace/firewall/root networking changes: `0`
- force pushes: `0`

## Decisions / Discoveries / Deferred

- The completed predecessor remains immutable and is not resumed.
- Planning inventory values are crosschecks only; local Git and the literal
  H0 manifest are authoritative.
- Browser speculative DNS is not claimed contained unless a local synthetic
  zero-contact experiment proves it; otherwise the exact L6 residual remains.
