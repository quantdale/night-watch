# Task State

## Identity

Task ID: nightwatch-control-center-readonly-v1
Phase: CONTROL-CENTER-READONLY-V1
Status: IN_PROGRESS
Starting SHA: 8feea0092f361e80bfaf23f29a7d45df05c7fada
Last validated implementation SHA: b573884b078e822387869ebf20a5db4464804587
Last substantive checkpoint SHA: b573884b078e822387869ebf20a5db4464804587
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: campaign/nightwatch-control-center
Last checkpoint: M3 — hardened loopback server, launcher, and 22 focused tests passed at b573884.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 8feea0092f361e80bfaf23f29a7d45df05c7fada
LAST_VALIDATED_IMPLEMENTATION_SHA: b573884b078e822387869ebf20a5db4464804587
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b573884b078e822387869ebf20a5db4464804587
LIVE_HEAD_AUTHORITY: GIT
PHASE_CONTROL_CENTER_READONLY_V1_STATUS: IN_PROGRESS

## Objective

Implement the local read-only Nightwatch Control Center successor through
versioned whitelist DTOs, authoritative adapters, a hardened loopback server,
an isolated accessible React frontend, bounded graphs/SSE, and complete local
validation without adding execution, mutation, raw-source, or external-network
authority.

## Current Milestone

Milestone ID: M4
Milestone status: IN_PROGRESS
What is being attempted: Create the isolated React/Vite UI shell, bounded API
client, accessible navigation, and build-time no-external-request checks.

## Completed Milestones

- M0 — COMPLETE: current `main` was reconciled against the planning baseline;
  the new branch/task was created without checking out the planning ref;
  project truth, typecheck, hardening, quality-gate definition, inventory,
  local gate, and clean Node 20 gate all passed.
- M1 — COMPLETE: versioned whitelist contracts cover the planned public
  snapshot families; safe IDs, display labels, route templates, timestamps,
  digests, collection limits, fixed error envelopes, and hostile-input
  sanitizers are implemented and tested.
- M2 — COMPLETE: pure adapters project existing readiness, safety, evidence,
  campaign, source, graph, and triage authorities into bounded DTOs; synthetic
  fixtures prove deterministic ordering, explicit failure states, source
  proof/currentness, graph limits, and owner-local finding rejection.
- M3 — COMPLETE: the injected collector and strict loopback server expose
  bounded health/meta/readiness/safety/list routes, exact Host/Origin/method/
  path/query controls, confined static assets, notification-only SSE, and a
  fail-closed local launcher; server and preceding contract/adapter tests pass
  22/22.

## Work In Progress

M4 frontend implementation is beginning on `campaign/nightwatch-control-center`.
The contract, adapter, and loopback server layers are complete; the isolated
frontend runtime is not yet built.

## Exact Next Action

Create `ui/control-center/**` and the root delegation scripts, then run the
nested package typecheck, test, build, and no-external-request checks.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | Route the fresh Control Center task | pending |
| `.agent/tasks/nightwatch-control-center-readonly-v1/SPEC.md` | Freeze scope and safety | added |
| `.agent/tasks/nightwatch-control-center-readonly-v1/PLAN.md` | Living M0–M12 execution plan | added |
| `.agent/tasks/nightwatch-control-center-readonly-v1/STATE.md` | Continuity waypoint | added |
| `.agent/tasks/nightwatch-control-center-readonly-v1/REPORT.md` | Final handoff record | added |
| `src/controlCenter/contracts/**` | Versioned public DTOs and safe boundary helpers | added |
| `tests/unit/controlCenterContracts.test.ts` | M1 contract, bounds, and privacy tests | added |
| `src/controlCenter/adapters/**` | Pure authoritative DTO projections | added |
| `src/controlCenter/index.ts` | Control Center public module exports | added |
| `tests/unit/controlCenterAdapters.test.ts` | M2 synthetic authority and privacy tests | added |
| `src/controlCenter/server/**` | Hardened loopback API, static assets, SSE, and default collector | added |
| `bin/nightwatch-control-center.mjs` | Fail-closed local launcher | added |
| `package.json` | Local Control Center start script | modified |
| `tests/unit/controlCenterServer.test.ts` | M3 loopback security/integration tests | added |

## Validation Ledger

- `git fetch --prune origin` — PASS: current `main` and `origin/main` were
  equal at `8feea00` before the local task activation branch.
- `npm run agent:check` — PASS with 2 expected warnings: checkpoint advance
  for approved task docs and 24 historical legacy-v1 warnings.
- `npm run project:check` — PASS: active-task continuity PASS, catalog
  round-trip PASS, promotion authority NONE, clean checkout.
- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS: offline structural invariants hold.
- `npm run quality-gate:spec` — PASS: definition digest
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`,
  22 compatibility phases, 141 files.
- `npm run gate:inventory` — PASS: 9 authoritative groups, 152 unique test
  files, 0 duplicate executions.
- `npm run gate:local` at `83248c5` — PASS: all 9 groups; semantic 1,883
  total / 1,870 passed / 13 skipped / 0 failed; owner 91 passed; synthetic
  61 passed; receipt `receipt:sha256:4bd1c4342e1727e40b8e4370`.
- `npm run gate:clean` at `83248c5` — PASS: Node 20, fresh install, clean
  before/after, zero sibling writes; receipt
  `clean-receipt:sha256:b8fac902a7d63d0ab45ce010` and gate receipt
  `receipt:sha256:e27632bd3cbbc5ac52bbb02c`.
- `git diff --check` — PASS before the M0 checkpoint.
- `npm run typecheck` at `4424ef9` — PASS.
- `npm run hardening:check` at `4424ef9` — PASS: offline structural invariants hold.
- `npx playwright test tests/unit/controlCenterContracts.test.ts --project=nightwatch --workers=1` at `4424ef9` — PASS: 9 passed, 0 failed.
- `npm run typecheck` at `cc4c400` — PASS.
- `npm run hardening:check` at `cc4c400` — PASS: offline structural invariants hold.
- `npx playwright test tests/unit/controlCenterAdapters.test.ts tests/unit/controlCenterContracts.test.ts --project=nightwatch --workers=1` at `cc4c400` — PASS: 16 passed, 0 failed.
- `git diff --check` at M3 — PASS.
- `npm run typecheck` at `b573884` — PASS.
- `npm run hardening:check` at `b573884` — PASS: offline structural invariants hold.
- `npx playwright test tests/unit/controlCenterContracts.test.ts tests/unit/controlCenterAdapters.test.ts tests/unit/controlCenterServer.test.ts --project=nightwatch --workers=1` at `b573884` — PASS: 22 passed, 0 failed.
- `node bin/nightwatch-control-center.mjs --env=dev` — PASS fail-closed validation: exit 2, fixed `CONTROL_CENTER_START_FAILED`, empty stdout.
- `timeout 3s node bin/nightwatch-control-center.mjs --port=0` — PASS startup validation: loopback-ready URL announced, no stderr; timeout stopped the bounded diagnostic process.

## Decisions Made During This Task

- The implementation starts from current live `main` on a new local campaign
  branch; the remote planning branch is documentation-only and untouched.
- The root domain remains authoritative; adapters and versioned DTOs are the
  only browser-facing boundary.

## Discoveries

- Planning research matches current root shape: no general HTTP server or
  application UI exists, and root Vue 2 is not an application foundation.
- Clean qualification resolves Node major 20 through `npm exec` when the
  development host is Node 22.
- The Control Center public boundary uses categorical metadata and safe
  display labels; raw event messages, bodies, paths, credentials, and
  arbitrary internal fields are intentionally not contract fields.
- Adapters hash only the identity needed to keep a public graph reference
  stable; source paths, handler symbols, and join identities are not emitted.

## Blockers

None.

## Safety Events

NONE — local Git/planning inspection only; no product, auth, data, cloud,
infrastructure, sibling-repository, or external publication operation.

## Deferred / Follow-Up

- Future execution controls, remote hosting, database, multi-user auth, raw
  evidence/source views, and graph-engine migration remain out of scope.

## Resume Recipe

Read `.agent/ACTIVE_TASK.md`, then this task's SPEC, PLAN, and STATE. Inspect
live Git status and continue the exact M4 action above. Preserve loopback-only,
read-only, whitelist, source-authority, and owner-scope constraints.

## Completion Snapshot

Not complete. M0–M3 are recorded; M4 frontend implementation and later
validation remain.
