# Task State

## Identity

Task ID: nightwatch-validation-classification-and-skip-truth-v1
Phase: VALIDATION_CLASSIFICATION_AND_SKIP_TRUTH_V1
Status: COMPLETE
Starting SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Branch: session/nightwatch-open-spec-truth-closu-7138ca21
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
LAST_VALIDATED_IMPLEMENTATION_SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_VALIDATION_CLASSIFICATION_AND_SKIP_TRUTH_V1_STATUS: COMPLETE

## Objective

Implement
`openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/`
so skip identities are enforced, universe classification matches the default
runner, stored npm scripts exist, and the production-completion spec counts
are corrected.

## Current Milestone

COMPLETE / STOP — M1 through M4 are closed and the change is integrated in
the W1 checkpoint.

## Completed Milestones

- M1 — skip-identity enforcement (tasks 1.1–1.4):
  `config/semantic-compatibility.v1.json` carries `canonicalSkipIdentities`
  and `bin/semantic-compat.mjs` runs Playwright with the list reporter plus a
  bounded JSON report, enforces the policy through
  `bin/lib/semantic-skip-policy.mjs`, and fails `UNDECLARED_SKIP` /
  `SKIP_POLICY_UNCONFIGURED` with a non-zero exit. The first cone run
  measured every live skip identity (13: one phase14 contract report, eleven
  phase14 fresh-source snapshot tests, one selfDev uid-semantics probe); the
  three honest host-probe identities are declared.
- M2 — universe class vs default runner and the 18→12 supersession (tasks
  2.1–2.6): `bin/lib/validation-classification.mjs` implements the class vs
  `testMatch` rule, the stored-script rule and the Playwright-config bind;
  the six smokes moved to `LOCAL_FIXTURE_SMOKE` on the `full-regression`
  lane; `owner-manual` is `MANUAL_OWNER` only with the never-executed
  sentence removed; `BROWSER_WORKFLOW.evidenceLane` and `UI_LANE.evidenceLane`
  name real scripts; the production-completion specs and proposal state 12.
- M3 — Playwright config bind and fixture loaders (tasks 3.1–3.4):
  `auth:capture-synthetic` binds `playwright.capture.synthetic.config.ts`;
  both race-child fixtures load `bin/lib/typescript-runtime-loader.mjs`; the
  three consumer suites pass (91 tests).
- M4 — digest and closeout (tasks 4.1–4.4): `inventoryDigest` refreshed
  under the G2/G3 convention; hardening, typecheck and the cone are green;
  strict OpenSpec validation PASS; no `lanes:manual` delivery and no
  production-completion box ticked.

## Work In Progress

None. All 18 boxes are ticked with evidence and the change is integrated.

## Exact Next Action

STOP — this change is complete. `lanes:manual` for the 12 `MANUAL_OWNER`
harnesses remains production-completion G2/F-02 work under one-shot owner
authorization.

## Files Changed

- `config/semantic-compatibility.v1.json` — `canonicalSkipIdentities`.
- `bin/semantic-compat.mjs`, `bin/lib/semantic-skip-policy.mjs` (new,
  + `.d.mts`) — skip-identity enforcement.
- `bin/lib/validation-classification.mjs` (new, + `.d.mts`),
  `bin/hardening-check.mjs` — the four classification rules.
- `bin/lib/validation-universe.mjs` — `LOCAL_FIXTURE_SMOKE` vocabulary.
- `config/validation-universe.v1.json`,
  `config/validation-lane-state.v1.json` — reclassification, script fixes,
  refreshed digest.
- `package.json` — `auth:capture-synthetic`.
- `tests/fixtures/ai-owner-decision-race-child.mjs`,
  `tests/fixtures/private-artifact-race-child.mjs` — shared loader.
- `tests/unit/validationClassification.test.ts`,
  `tests/unit/semanticSkipIdentity.test.ts` (new).
- `openspec/changes/nightwatch-production-completion-programme-v1/…` — the
  18→12 spec and proposal amendments (spec files only; no box ticked).
- `tests/unit/{agent-state,plannerHandoff,projectState}.test.ts` — fixture
  trees brought to the stricter contract.
- This task directory and the change's `tasks.md`.

## Validation Ledger

- `npm run test:semantic-compat` — PASS, 2120 total / 2107 passed / 13
  skipped / 0 failed; `skipPolicy.result=PASS`, `declared=13`,
  `undeclared=0`; cone exit 0 (recorded 2026-09-14).
- `npx playwright test tests/unit/validationClassification.test.ts
  tests/unit/semanticSkipIdentity.test.ts --workers=1` — PASS, 14 tests
  (four rules with negative fixtures, the skip-policy cases, the live
  declaration integrity, the live repository pass).
- `npx playwright test tests/unit/aiOwnerReview.test.ts
  tests/unit/aiReview.test.ts tests/unit/privateArtifactAtomic.test.ts
  --workers=1` — PASS, 91 tests after the fixture loader convergence.
- `npm run validation:universe` — PASS; the new modules and suites are
  registered and the stored `inventoryDigest` is
  `sha256:af1792e06ac143fa4adf57ec`.
- `node bin/hardening-check.mjs`, `npm run typecheck`,
  `npm run agent:check` — PASS.
- `openspec validate nightwatch-validation-classification-and-skip-truth-v1
  --strict` — PASS.
- The affected fixture trees (`agent-state`, `plannerHandoff`,
  `projectState`) were brought to the stricter contract after the cone
  exposed 73 fixture failures: the archive check is skipped for a repository
  with no archive, the handoff fixture gives its successor change a task
  record, the copied module closures include the new archive module, and the
  agent-state fixture's default STATE milestone matches its ACTIVE milestone.
- `npm run gate:local` at `6bc70522` — PASS, all eleven required groups,
  receipt `receipt:sha256:204417295a4935d7857cb6b2`.
- `npm test` at `6bc70522` — PASS, 5127 passed / 18 skipped / 0 failed.

## Decisions Made During This Task

- The 13 live skip identities are declared as three honest host-probe
  identities rather than left undeclared: the phase14 snapshot tests and the
  selfDev uid probe skip on an absent host precondition, the receipt records
  `skipped > 0` and never counts a skip as a pass, and no task in this change
  authorizes converting those tests to fail closed. The alternative — leaving
  them undeclared — would leave `SEMANTIC_COMPATIBILITY` red and was rejected
  because the programme completion gate requires `gate:local` PASS.
- The six smokes keep their G21.8 synthetic-state reason as a dedicated
  `LOCAL_FIXTURE_SMOKE` class on the `full-regression` lane rather than being
  copied into `FULL_REGRESSION` or excluded from `testMatch`.

## Discoveries

- Playwright's JSON reporter (via `PLAYWRIGHT_JSON_OUTPUT_NAME` with the list
  reporter still on stdout) is the reliable skip-identity source; skipped
  tests carry `annotations[type=skip].description` and their spec file/line.
- The new checks legitimately tighten test fixtures: a fixture repository
  without an archive has no index to validate, a READY successor change now
  needs a task record, and a fixture's ACTIVE/STATE milestones must agree.

## Blockers

None.

## Safety Events

None.

## Deferred / Follow-Up

- `lanes:manual` for the 12 `MANUAL_OWNER` harnesses remains
  production-completion G2/F-02 work.

## Resume Recipe

Task complete. Do not resume this task. A future change that adds a skip must
declare its identity in `canonicalSkipIdentities`; a future change that adds
an active OpenSpec change must add a task record, or the gate fails.

## Completion Snapshot

- The change is COMPLETE: all 18 boxes ticked with evidence and integrated.
- Undeclared skips now fail `SEMANTIC_COMPATIBILITY`; the cone is green with
  13 declared skips; an UNAVAILABLE class can no longer carry default-runner
  files; stored npm script names resolve; every Playwright config is bound;
  and the fixture TypeScript loader has one implementation.
- The production-completion specs state 12, not 18, and no programme box was
  ticked.
