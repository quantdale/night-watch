# Task State

## Identity

Task ID: phase-2a-controlled-observation
Phase: 2A
Status: IN_PROGRESS
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: a9f56a2019929511918fff731c2b5ee1bf08b611
Last validated implementation SHA: a9f56a2019929511918fff731c2b5ee1bf08b611
Branch: main
Last checkpoint: 2026-08-09 — M6 unauthenticated canary and manifest implementation validated locally; implementation checkpoint a9f56a2

## Objective

Safely observe one explicitly selected authenticated Ripple `dev` or `next`
session using passive actions, mandatory proxy/browser containment, minimized
evidence, and a single fresh-context replay.

## Current Milestone

Milestone ID: M6 — Run the unauthenticated real connectivity canary
Status: IN_PROGRESS
What is being attempted: Implement the bounded no-auth canary and sanitized
destination manifest. It must run only after the M5 gate and must stop on any
production, unknown, or unclassified required host.

## Completed Milestones

- M0 — COMPLETE. Reconciled HEAD `3a2712185250cd4e3591ee4037b28e06e8a0417e`
  as a clean approved continuity-only descendant of Phase 1.3 implementation
  SHA `1994eaca9f8b67cf7d31cdffd66ebdc600379c90`; created this task's
  SPEC/PLAN/STATE/REPORT and routed ACTIVE_TASK before implementation.
  Validation: `git status --short --branch` was clean on `main`; no Alphaus
  repository or external environment was contacted.
- M1 — COMPLETE. Updated `bin/agent-state.mjs` to record and classify the
  `Last validated implementation SHA` as `SYNCED`, approved continuity-only
  `CHECKPOINT_ADVANCE`, or `STALE`; added a narrow approved-path allowlist and
  synthetic tests for committed/uncommitted implementation drift and
  non-ancestor SHA values. Updated `.agent` docs/templates for the semantics.
  Validation: `npx playwright test tests/unit/agent-state.test.ts` => **12
  passed, 0 failed**; `npx tsc --noEmit` => PASS; `npm run agent:check` => PASS
  with the expected visible `STALE` warning for uncommitted implementation
  changes; `git diff --check` => PASS.
- M2 — COMPLETE. Added explicit `apiHosts`/`authHosts` to the verified `dev`,
  `next`, and local environment configs plus `observe:preflight`. The command
  requires exactly one supported real environment, uses the configured URL or
  a same-host explicit URL, rejects query/fragments/credentials and production
  hosts, and verifies API/auth hosts are allowlisted. Validation: `npx
  playwright test tests/unit/target-preflight.test.ts tests/unit/safety.test.ts`
  => **24 passed, 0 failed**; `npm run observe:preflight -- --env=dev` => PASS;
  `npx tsc --noEmit` => PASS. No DNS/TCP/browser/auth activity occurred.
- M3 — COMPLETE. Added recorder-level irreversible authenticated metadata-first
  mode, authenticated URL path placeholdering/query removal, screenshot
  suppression, category-only console/page/network failures, and synthetic
  privacy tests. Context enables the mode after external storage-state
  validation and before browser activity; trace suppression remains enforced.
  Validation: `npx playwright test tests/unit/evidence.test.ts
  tests/unit/redaction.test.ts tests/smoke/authenticated.smoke.ts` => **22
  passed, 0 failed**; `npx tsc --noEmit` => PASS. The synthetic storage state
  and fixture were local-only; no real auth state or Alphaus environment was
  used.
- M4 — COMPLETE. Added `auth:capture` plus guarded manual Playwright helper,
  external output-path validation, interactive-terminal check, verified UI
  host check, and structural post-write validation. The capture recorder starts
  in authenticated metadata mode and trace-off, while the existing global
  setup starts the mandatory proxy and browser guards. Validation: `npx
  playwright test tests/unit/storageState.test.ts tests/unit/target-preflight.test.ts`
  => **15 passed, 0 failed**; `npx tsc --noEmit` => PASS; `npm run
  auth:capture -- --help` => PASS; unsafe relative output rejected before any
  browser launch. No real browser or auth state was used.
- M5 — COMPLETE. Added a reusable fail-closed pre-real-run gate, explicit
  browser containment contract, dedicated gate CLI/config, and focused tests.
  The gate checks exactly one real environment, UI/API/auth agreement, the
  canonical policy canary and production denial, loopback proxy binding/health
  and policy version, external structurally valid storage state, all browser
  containment flags, authenticated metadata-first evidence, passive/action
  registry state, and read-only repository freshness. It never creates an
  authenticated context. Validation: `npx playwright test
  tests/unit/realRunGate.test.ts --project=nightwatch` => **6 passed, 0
  failed**; `npx tsc --noEmit` => PASS; `git diff --check` => PASS; dev
  preflight => PASS with no DNS/TCP/browser activity. The gate CLI rejection
  smoke showed precise failures for a missing external state and undocumented
  task changes while the loopback proxy was healthy; no target was contacted.

## Work In Progress

Continuity, target preflight, evidence minimization, manual capture, and the
pre-real-run safety gate are complete. No real environment contact has
occurred. M6 is now the next bounded change.

## Exact Next Action

Implement the bounded unauthenticated real connectivity canary and sanitized
destination manifest. Keep the run to the explicit selected UI URL, do not
load storage state, do not follow links, and stop on production/unknown/
UNCLASSIFIED_REQUIRED_HOST traffic.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | Route fresh session to Phase 2A | Added/updated |
| `.agent/tasks/phase-2a-controlled-observation/SPEC.md` | Frozen task intent | Added |
| `.agent/tasks/phase-2a-controlled-observation/PLAN.md` | Living milestones and validation | Added |
| `.agent/tasks/phase-2a-controlled-observation/STATE.md` | M0 checkpoint and next action | Added |
| `.agent/tasks/phase-2a-controlled-observation/REPORT.md` | Final handoff placeholder | Added |
| `bin/agent-state.mjs` | SHA baseline classification and approved checkpoint paths | Modified |
| `tests/unit/agent-state.test.ts` | Synthetic SHA semantic coverage | Modified |
| `.agent/README.md`, `.agent/PLANS.md`, `.agent/templates/STATE.template.md` | Document SHA semantics | Modified |
| `src/core/environment/types.ts`, `src/core/environment/index.ts` | Explicit API/auth config fields | Modified |
| `config/environments/*.json` | Verified real-target/API/auth host contract | Modified |
| `bin/observe-preflight.mjs`, `package.json` | No-network real-target preflight command | Added/modified |
| `tests/unit/target-preflight.test.ts` | Preflight fail-closed coverage | Added |
| `src/core/safety/redaction.ts`, `src/core/evidence/runRecorder.ts` | Authenticated metadata-only persistence | Modified |
| `src/browser/context.ts`, observers, Ripple journey/fetch guard | Apply minimized URL/text/error evidence | Modified |
| `tests/unit/evidence.test.ts`, `tests/unit/redaction.test.ts` | Synthetic privacy coverage | Modified |
| `tests/smoke/authenticated.smoke.ts` | Assert header/body-free authenticated evidence | Modified |
| `src/browser/fixtures/storageState.ts`, `tests/unit/storageState.test.ts` | External capture output validation | Modified |
| `bin/auth-capture.mjs`, `tests/manual/auth-capture.ts`, `package.json`, `playwright.config.ts` | Human-only guarded capture workflow | Added/modified |
| `src/browser/contract.ts`, `playwright.config.ts`, `playwright.gate.config.ts` | Shared authenticated browser containment contract and isolated gate harness | Added/modified |
| `src/core/safety/realRunGate.ts`, `bin/observe-gate.mjs`, `tests/manual/observe-gate.ts`, `tests/unit/realRunGate.test.ts`, `package.json` | Fail-closed local pre-real-run gate and CLI | Added/modified |
| `tsconfig.json` | Typecheck dedicated gate config | Modified |

## Validation Ledger

Command: `git status --short --branch` and `git rev-parse HEAD`
Result: PASS; clean `main` at the reconciled starting SHA before task-state
files were created.
When: 2026-08-09
Relevant failure/output summary: HEAD is the expected Phase 1.3 handoff; the
only prior descendant changes are approved continuity/documentation state files.

Command: Phase 1.3 handoff inspection
Result: PASS; `git diff 1994eaca..3a271218 --name-status` shows only
`.agent/ACTIVE_TASK.md`, Phase 1.3 `STATE.md`, and Phase 1.3 `REPORT.md`.
When: 2026-08-09
Relevant failure/output summary: no implementation/source/test/config drift.

Command: `npm run agent:check` after M1 implementation
Result: PASS with one expected `STALE` warning; the validator detects the
uncommitted implementation/test changes after the recorded baseline without
rewriting state.
When: 2026-08-09
Relevant failure/output summary: warning is intentional until this milestone's
implementation is committed/checkpointed; no invariant error occurred.

Command: `git diff --check`
Result: PASS; no whitespace errors.
When: 2026-08-09
Relevant failure/output summary: task-state setup is cleanly formatted.

Command: `npx playwright test tests/unit/target-preflight.test.ts tests/unit/safety.test.ts`
Result: PASS; 24 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: configured dev/next targets pass; production,
duplicate selection, unknown/mismatched hosts, and sensitive URL forms fail closed.

Command: `npm run observe:preflight -- --env=dev`
Result: PASS; output is sanitized metadata only and explicitly states no
DNS/TCP/browser activity and that authentication is not required.
When: 2026-08-09
Relevant failure/output summary: target `appdev.alphaus.cloud` and explicit
API/auth host sets validated from local config; no network was attempted.

Command: `npx tsc --noEmit`
Result: PASS; no TypeScript errors after environment contract changes.
When: 2026-08-09
Relevant failure/output summary: none.

Command: `npx playwright test tests/unit/storageState.test.ts tests/unit/target-preflight.test.ts`
Result: PASS; 15 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: external non-existing JSON output accepted;
relative, in-workspace, and overwrite paths rejected; target preflight remains
no-network.

Command: `npm run auth:capture -- --help`
Result: PASS; printed only safe usage/manual-auth instructions.
When: 2026-08-09
Relevant failure/output summary: no browser or target contact.

Command: `npm run auth:capture -- --env=dev --output=relative.json`
Result: PASS-as-rejection; exited 2 before preflight/browser launch because the
output path was not absolute.
When: 2026-08-09
Relevant failure/output summary: no file was created and no secret was printed.

Command: `npx playwright test tests/unit/evidence.test.ts tests/unit/redaction.test.ts tests/smoke/authenticated.smoke.ts`
Result: PASS; 22 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: synthetic auth state never entered artifacts;
headers/bodies/query values/path IDs were absent or minimized; screenshot was
not created; trace remained absent.

Command: `npx playwright test tests/unit/realRunGate.test.ts --project=nightwatch`
Result: PASS; 6 passed, 0 failed.
When: 2026-08-09
Relevant failure/output summary: pure contract checks and a loopback-only
runtime proxy-health check passed. Synthetic state used fake values only; no
Alphaus DNS/TCP/browser activity occurred.

Command: `npx tsc --noEmit` and `git diff --check` after M5
Result: PASS.
When: 2026-08-09
Relevant failure/output summary: the dedicated gate config is included in the
typecheck; no whitespace errors.

Command: `npm run observe:preflight -- --env=dev`
Result: PASS; verified `appdev.alphaus.cloud`, API/auth host contracts, and
explicit production denial; output states no DNS/TCP/browser activity.
When: 2026-08-09
Relevant failure/output summary: no authentication state was required and no
real environment was contacted.

Command: `npm run observe:gate -- --help`
Result: PASS; printed the safe local-only gate usage.
When: 2026-08-09
Relevant failure/output summary: no browser context or selected target was
opened.

Command: `NIGHTWATCH_TRACKED_REPOS=nightwatch npm run observe:gate -- --env=dev --storage-state=/tmp/nightwatch-phase-2a-missing-state.json`
Result: PASS-as-rejection; the command exited non-zero with precise
`authentication-state` and `repository-freshness` failures while the local
proxy checks passed.
When: 2026-08-09
Relevant failure/output summary: missing external state was not opened or
printed; no target was contacted. The initial manual-test discovery issue was
repaired with a dedicated `playwright.gate.config.ts` before this validation.

## Decisions Made During This Task

Decision: Use exactly one task directory, `phase-2a-controlled-observation`,
and set its starting baseline to current HEAD `3a271218...`.
Reason: the Phase 1.3 task is complete and the requested work must have a new
active task with no continuity ambiguity.
Evidence/constraint: Nightwatch AGENTS.md requires fresh work to route through
new SPEC/PLAN/STATE/REPORT files before implementation.

Decision: Keep `Current SHA` as a compatibility alias and add explicit `Last
validated implementation SHA` fields.
Reason: preserve the Phase 1.3 routing shape while making the baseline meaning
unambiguous and allowing the validator to distinguish approved checkpoint
advances from implementation drift.
Evidence/constraint: a state-file update necessarily creates a descendant
commit; exact HEAD equality alone cannot safely prove implementation freshness.

Decision: Keep the verified config `uiBaseUrl` as the default real target and
require any explicit override to use the same host, with explicit API/auth host
arrays in the selected config.
Reason: the user task forbids URL guessing and requires config/URL/policy
agreement; a host override would weaken that contract.
Evidence/constraint: current Nightwatch configs already contain the verified
Ripple dev/next browser hosts; preflight is intentionally no-network.

Decision: Make authenticated evidence minimization a recorder-level second
guard, not only a caller convention.
Reason: real page/network observers can encounter sensitive values in multiple
paths; metadata-first persistence must remain true if a caller forgets a
redaction step.
Evidence/constraint: real authenticated artifacts may contain customer/account
data, headers, bodies, storage, or console text; recorder strips those classes
and focused tests use synthetic values only.

Decision: Make manual capture fail before browser creation when stdin is not an
interactive terminal.
Reason: the current agent must not open a real target and then discover that a
human cannot complete login/MFA; the safe continuation is an exact user action.
Evidence/constraint: the task permits stopping with `USER_ACTION_REQUIRED` and
forbids obtaining credentials another way.

Decision: Keep the pre-real-run evaluator pure and collect only local proxy and
storage facts in its runtime wrapper; invoke the gate through a dedicated
Playwright config that excludes it from the ordinary suite.
Reason: the gate must be reusable before any authenticated context is created,
while the global setup can still provide the mandatory loopback proxy health
check without contacting the selected target.
Evidence/constraint: M5 requires precise fail-closed checks and prohibits real
authenticated navigation until every check passes.

## Discoveries

- The Phase 1.3 final handoff commit is a continuity-only checkpoint advance,
  not an implementation change.
- The current working tree correctly produces `STALE` because M1 implementation
  and focused-test changes are not yet committed; the warning is not suppressed.
- The existing config had verified UI URLs but no separate API/auth host
  contract; M2 now records those sets explicitly without changing runtime
  allowlist behavior.
- Standard local evidence retains its Phase 1 redaction behavior; only an
  authenticated recorder switches to the stricter metadata-first policy.
- Manual capture has not been invoked; no real target, credential, MFA code, or
  storage state exists in this repository/session.
- The gate CLI initially found no manual test because manual helpers are
  excluded from the ordinary Playwright match; a dedicated gate config now
  keeps that helper explicit and out of the full suite.

## Blockers

None at M5. Human authentication or a narrow unresolved-host approval may
become a later conditional blocker.

## Safety Events

NONE during Phase 2A setup. The historical Phase 1.1 `api.alphaus.cloud` event
remains documented with unknown path, method, credential attachment, and
response; no production investigation is being attempted.

## Deferred / Follow-Up

- Phase 2B deterministic read-only Ripple journeys and all later phases.
- Real dev/next observation cannot begin until explicit target, auth state, and
  every required safety gate pass.

## Resume Recipe

1. Read this STATE, then SPEC and PLAN if context is uncertain.
2. Verify `git status --short --branch` and `git rev-parse HEAD`.
3. Implement the bounded M6 unauthenticated canary and destination manifest.
4. Run M6 only after `observe:preflight` and `observe:gate` pass for exactly one
   selected `dev` or `next` target; do not load storage state.
5. Update STATE with exact sanitized runtime results and checkpoint before M7.

## Completion Snapshot

Populate only when complete. If human input is required, record the exact
command and set `Status: IN_PROGRESS` with `USER_ACTION_REQUIRED` in the
current milestone/next action instead.
