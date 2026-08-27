# Task State

## Identity

Task ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Phase: RESOLVED-EGRESS-AND-CONTAINMENT-TRUTH-HARDENING-V1
Status: COMPLETE
Starting SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
Last validated implementation SHA: 3db48ed7d35a0a816ef1a801c86a1d14ddf60b27
Last substantive checkpoint SHA: 3db48ed7d35a0a816ef1a801c86a1d14ddf60b27
Last documentation checkpoint SHA: 41cf3ac986515faaf15a6610bc588ec2d57fb0bd
STARTING_SHA: 9a70e7f3e81255d56352b9efb291f0fb4f4f03de
LAST_VALIDATED_IMPLEMENTATION_SHA: 3db48ed7d35a0a816ef1a801c86a1d14ddf60b27
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3db48ed7d35a0a816ef1a801c86a1d14ddf60b27
LAST_DOCUMENTATION_CHECKPOINT_SHA: d2d9b51546195f1cbf8969327e8f3bcadca0e8c4
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
CURRENT_LOCAL_HEAD: DISCOVER_FROM_GIT
CURRENT_REMOTE_HEAD: DISCOVER_FROM_GIT
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
PHASE_RESOLVED_EGRESS_AND_CONTAINMENT_TRUTH_HARDENING_V1_STATUS: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Branch: main

## Objective

Implement the selected OpenSpec resolved-egress containment hardening
campaign, preserving the hostname policy and all permanent read-only,
privacy, browser, semantic, source-proof, owner-freeze, and no-publication
boundaries.

## Current Milestone

COMPLETE — M6 full acceptance, documentation, and Git closure.

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
- M2 address classifier/resolver admission is implemented in the pure
  `src/proxy/addressPolicy.ts` and bounded `src/proxy/resolver.ts` seams.
  Local admission is exact `127.0.0.1`/`::1`; external admission is global
  unicast only; malformed, mixed, oversized, duplicate-pathological, mapped,
  empty, and family-mismatched answers fail closed. Resolver timeouts are
  bounded and late results cannot create a socket.
- M3 exact-address protocol binding is implemented for HTTP, CONNECT, and
  WebSocket Upgrade through the shared resolver/admission path. HTTP keeps the
  original Host header; CONNECT/Upgrade keep original authority semantics;
  upstream connectors receive only the selected numeric address/family and a
  bounded exact lookup callback.
- M4 lifecycle evidence and runtime identity are implemented. Proxy summary
  v2 separates hostname authorization, resolution, and connection outcomes;
  resolved-address and exact-binding failures become hard containment
  failures; runtime state, direct runner, global setup, reader, and real-run
  gate require all three current identities. Legacy Control Center summaries
  migrate as `legacy-unknown` without claiming outcome coverage.
- The event-log failure path is fail-closed: an unwritable event log marks the
  proxy unhealthy, blocks later requests, and tears down any connected
  upstream after an attempted lifecycle write. The synthetic regression proves
  the first blocked request creates zero upstream connections.
- M5 browser/adversarial closure is complete in the worktree. Existing browser
  launch and context controls remain unchanged; the residual remains
  `BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL`. The resolver/address/protocol,
  evidence, identity, privacy, and safety matrices are green, including the
  event-write failure disposition.

## Work In Progress

None — the implementation slice, full acceptance cone, durable docs, OpenSpec
tasks, terminal continuity fields, exact-head verification, and clean-tree
handoff are complete. All fixtures remained synthetic loopback-only.

## Exact Next Action

STOP — campaign complete; future work requires a fresh authorized task.

## Blockers

None.

## Baseline / H0 Ledger

- Git: activation started from clean `main...origin/main`; origin is
  `https://github.com/quantdale/night-watch.git`; starting `HEAD` equals
  `origin/main` at `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`. The current
  worktree contains only this campaign's implementation/test changes pending
  checkpoint; live heads remain discovered from Git.
- Toolchain: Node `v22.22.1`, npm `10.9.4`, Git `2.43.0`, Linux WSL2;
  Chrome `151.0.7922.173`; Playwright `1.62.1`.
- H0 class counts after task activation: active-runtime `409`, tests `233`,
  config `6`, UI `14`, corpus-fixtures `112`, tooling/bin `51`, workflow `1`,
  docs/OpenSpec `50`, continuity/history `440`, generated/lock/metadata `19`,
  other-explicit `8`.
- Baseline active proxy path used hostname-valued `http.request` and
  `net.connect` after hostname policy allow; the implementation now routes
  allowed targets through owned resolution, whole-set admission, and exact
  numeric binding. Existing browser contract retains mandatory loopback proxy,
  bypass disable, QUIC/WebRTC/background/hints restrictions; process DNS
  remains unresolved at the browser boundary.
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
  --workers=1`: `4 passed`, `0 failed`, `2.2s`, including the unwritable
  event-log fail-closed regression.
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
- Current identities/shapes: `OUTBOUND_POLICY_VERSION` remains
  `phase-2a-browser-background-policy-v1`; runtime state additionally requires
  `nightwatch.proxy-containment.v2`,
  `phase-1.2-resolved-address-policy-v1`, and
  `phase-1.2-exact-address-binding-v1`; `ProxyEvent` carries bounded
  resolution/connection lifecycle categories; `ProxySummary` is
  `nightwatch.proxy-summary.v2` with explicit policy authorization,
  resolution, connection, coverage, and violation fields.
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
- Post-fix focused implementation cone before the final parser additions:
  `npm run typecheck` PASS; `npm run hardening:check` PASS; combined address,
  resolver, proxy, protocol, evidence, destination, real-run-gate, and
  Control Center reader tests `64 passed / 0 failed / 4.1s`.
- Browser smoke and safety regression:
  `tests/smoke/proxy.smoke.ts` `6 passed / 0 failed / 7.3s`; combined
  `tests/smoke/negative.smoke.ts`, `passive-run.smoke.ts`, and
  `safety.smoke.ts` `25 passed / 0 failed / 21.7s`.
- Post-hardening focused cone:
  `npx playwright test` over address policy, resolver, proxy, exact protocol,
  resolved-egress, evidence, destination manifest, containment, real-run-gate,
  Control Center, redaction, storage-state, and safety suites: `157 passed /
  0 failed / 5.5s`; the final event-log regression rerun is `4 passed / 0
  failed / 2.2s`.
- Browser/contract/privacy cone after the event-write hardening:
  proxy, negative, passive-run, and safety smoke plus context URL and
  real-run-gate tests: `44 passed / 0 failed / 23.2s`.
- Final post-hardening focused cone including the event-log regression:
  `158 passed / 0 failed / 5.2s`.
- `npm run test:semantic-compat`: PASS; `22` phases, `141` files,
  `1,903` total, `1,890` passed, `13` inherited skips, `0` failed.
- `npm run campaign:synthetic`: PASS; `66 passed / 0 failed / 15.5s`.
- `npm run test:owner-provenance`: PASS; `91 passed / 0 failed / 9.7s`.
- Final pre-closure recheck: origin main at `41cf3ac`; GitHub open issues and
  pull requests both `0`; no competing blocker.
- Full local gate: PASS on `d2d9b515`, all nine groups, receipt
  `receipt:sha256:b026f83f2ac58f755df3040f`.
- Clean Node20 gate: PASS on `d2d9b515`, all nine groups, clean receipt
  `clean-receipt:sha256:5cb6b793a968504bf936f4f9`; the first clean attempt's
  transient single Phase24 failure was followed by five passing direct
  repeats and a passing complete rerun.
- Canonical serial regression: `2,573 passed / 16 skipped / 0 failed` out of
  `2,589` in `4.8m`.
- Control Center UI typecheck/tests/build/browser: PASS; UI tests `11 passed`,
  build `259,566` bytes with no external references, built browser `1 passed`.
- Dev-server visual verification: content present, no overlay, zero console
  errors; browser and server closed cleanly.
- Exact-head Actions observation: run `33055137454` / job `98459927981`
  matched live head `41cf3ac986515faaf15a6610bc588ec2d57fb0bd`, completed with
  `failure`, and had `steps=[]`; classified as
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence, not CI green.

## Files Changed

Implementation/test changes are confined to the proxy resolver, address
classifier, exact HTTP/CONNECT/Upgrade binding, lifecycle events and summary,
run evidence/destination manifest, runtime identity/real-run gate, direct and
browser setup producers, affected manual safety consumers, Control Center
reader/adapter DTOs, synthetic unit/regression tests, durable docs, and the
OpenSpec task ledger. All 297 OpenSpec task checkboxes are now complete. The
completed predecessor and all Alphaus sibling repositories remain untouched.

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
- The resolver seam is data-only and internal to the proxy; all answers are
  admitted as a complete bounded set before deterministic first selection.
  IPv4-mapped IPv6 answers are classified for evidence but are conservatively
  unsupported as transport authority in this contract.
- `ProxySummary.allowed` remains the historical hostname-policy authorization
  count. `policyAuthorized` is its explicit alias; resolution and connection
  counts are additive v2 fields, and legacy summaries are exposed with
  `outcomeCoverage: legacy-unknown`.
- No browser resolver flag was added: the existing proxy/QUIC/WebRTC/
  background/hint controls remain unchanged, and speculative browser DNS
  retains the exact L6 residual until a zero-external-contact proof exists.
- Event persistence is a containment prerequisite: runtime write failure
  disables health and future allows, while current upstream sockets are
  destroyed rather than surviving an evidence failure.
- Final pre-closure recheck: `git ls-remote origin refs/heads/main` points to
  the pushed continuity checkpoint `41cf3ac`; GitHub reports zero open issues
  and zero open pull requests for `quantdale/night-watch`; durable docs now
  describe the resolved-egress invariant and preserve the exact browser DNS
  residual. No competing blocker was found.

## Safety Events

No safety event. No external environment, DNS, authenticated state, customer
data, cloud/infrastructure, sibling repository, publication, or privileged
networking action occurred.

## Discoveries

The current implementation owns the transition from hostname authorization to
resolved-address admission and exact numeric binding in `src/proxy/`. The
proxy runtime state now requires hostname-policy, containment, resolved-address
policy, and exact-binding identities. The browser contract and durable docs
retain the unresolved process-DNS/L6 residual. Control Center consumes the
versioned proxy summary and conservatively migrates the legacy seven-field
shape without inventing connection outcomes.

## Deferred / Follow-Up

L6 container/network namespace/firewall/root isolation; real Alphaus DNS or
product contact; unproven private routing; and unrelated authority/schema
expansion remain deferred.

## Resume Recipe

STOP — campaign complete. Do not resume this task or select another campaign.

## Completion Snapshot

COMPLETE. M0–M6 are complete with focused, browser, privacy, full local,
clean Node20, canonical serial, UI, visual, documentation, OpenSpec, and
exact-head evidence. The final local/remote equality and clean tree are live
Git facts, not persisted predictions.

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
