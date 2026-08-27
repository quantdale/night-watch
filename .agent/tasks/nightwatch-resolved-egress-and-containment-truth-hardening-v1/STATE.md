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

M0 — takeover, activation, H0 audit, and baseline.

## Completed Milestones

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

## Work In Progress

Task records are activated. Baseline focused validation and remaining H0
consumer/marker inventory are next; no runtime source has been edited.

## Exact Next Action

Run the remaining H0 active-path searches and baseline commands; record exact
results here before adding any production proxy behavior.

## Blockers

None.

## Baseline / H0 Ledger

- Git: clean `main...origin/main`; origin is
  `https://github.com/quantdale/night-watch.git`; starting `HEAD` equals
  `origin/main` at `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`.
- Toolchain: Node `v22.22.1`, npm `10.9.4`, Git `2.43.0`, Linux WSL2;
  Chrome `151.0.7922.173`; Playwright `1.62.1`.
- H0 class counts: active-runtime `409`, tests `233`, config `6`, UI `14`,
  corpus-fixtures `112`, tooling-bin `51`, workflow `1`, docs/OpenSpec `50`,
  continuity/history `436`, generated/lock/metadata `19`, other-explicit `8`.
- Existing active proxy path: `src/proxy/server.ts` uses hostname-valued
  `http.request` and `net.connect` after hostname policy allow; `events.ts`
  counts allow before connection outcome; `runtime.ts` validates only
  `OUTBOUND_POLICY_VERSION` and health. Existing browser contract retains
  mandatory loopback proxy, bypass disable, QUIC/WebRTC/background/hints
  restrictions; process DNS remains unresolved.
- Marker/skip/suppression and complete network primitive dispositions are
  being finalized in this milestone. Historical/manual capability guards and
  hardening-check self-scans are not active containment defects.

## Validation Ledger

- `git diff --check 4981b212eed46ffde1edac2b175f1bd1b1f826d2..HEAD`: PASS.
- Baseline behavior gates: PENDING — run before source edit.
- Before reproducers: PENDING.
- After focused/full/clean/serial gates: PENDING.

## Files Changed

Only the fresh task records and ACTIVE_TASK routing have changed so far;
runtime source and completed predecessor records remain untouched.

## Decisions Made During This Task

- Use the pulled OpenSpec campaign as a fresh successor task rather than
  resuming the completed durable-artifact predecessor.
- Treat local Git and the NUL-safe manifest as authoritative over the planner's
  remote inventory; keep all execution LOCAL / SOURCE / SYNTHETIC.

## Safety Events

No safety event. No external environment, DNS, authenticated state, customer
data, cloud/infrastructure, sibling repository, publication, or privileged
networking action occurred.

## Discoveries

The current hostname-only proxy path is in `src/proxy/server.ts`; the runtime
state currently identifies only `OUTBOUND_POLICY_VERSION` and proxy health.
The browser contract and durable docs retain the unresolved process-DNS/L6
residual.

## Deferred / Follow-Up

L6 container/network namespace/firewall/root isolation; real Alphaus DNS or
product contact; unproven private routing; and unrelated authority/schema
expansion remain deferred.

## Resume Recipe

Read this STATE, inspect `git status` and the diff, run the remaining H0
searches and baseline focused commands, then continue at M1 only after the
baseline is recorded and checkpointed.

## Completion Snapshot

Not terminal. M0 is active; no implementation or acceptance claim has been
made.

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
