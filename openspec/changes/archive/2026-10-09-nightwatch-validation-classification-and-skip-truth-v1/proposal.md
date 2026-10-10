# Proposal — Validation classification and skip-identity truth

## Why

The validation universe and the semantic-compatibility gate both *declare*
rules about what a green run means, and neither enforces the rule against the
runner that actually executes.

Measured at HEAD `ebe26ce` on 2026-09-14:

1. `config/semantic-compatibility.v1.json` sets
   `expectedSkipPolicy: "only canonical skip identities may skip"`.
   `bin/semantic-compat.mjs` records a `skipped` count from Playwright output
   and sets `result: PASS` whenever Playwright's exit code is 0. There is no
   skip-identity allowlist and no comparison. A CI-cone suite that
   `test.skip`s because `/tmp/nightwatch-ripple-snapshot-*` is absent still
   greens `SEMANTIC_COMPATIBILITY`.
2. `config/validation-universe.v1.json` classifies six local fixture smokes
   (`scenarios/ripple/local.smoke.ts` and `tests/smoke/{authenticated,negative,passive-run,proxy,safety}.smoke.ts`)
   as `LIVE_APP_SMOKE` with reason "cannot execute in an offline gate" and
   `config/validation-lane-state.v1.json` records that lane as
   `UNAVAILABLE_CAPABILITY` whose evidence is that they "have never executed".
   `playwright.config.ts` `testMatch` includes `**/tests/**/*.smoke.ts` and
   `**/scenarios/**/*.smoke.ts`. Those six files start in-process fixture
   servers, do not `test.skip` on missing owner auth, and are part of
   `npm test`. The universe's own G21.8 note even admits they "build synthetic
   local state against loopback fixtures". The residual-closure requirement
   "a lane that executes is not carried as unavailable" is currently false in
   the data G2 published.
3. The same universe's `BROWSER_WORKFLOW.evidenceLane` names
   `npm run test:browser`, which is not a `package.json` script. The lane-state
   command `npm run control-center:ui:browser` is the real one. The owner-manual
   command `npm run lanes:manual` also does not exist (that missing script is
   already named by production-completion G2/F-02; this change additionally
   requires that every *stored* evidenceLane/command string resolve).
4. `playwright.capture.synthetic.config.ts` is referenced by no launcher,
   script, or test. Two race-child fixtures
   (`tests/fixtures/ai-owner-decision-race-child.mjs`,
   `tests/fixtures/private-artifact-race-child.mjs`) reimplement
   `typescript.transpileModule` instead of using
   `bin/lib/typescript-runtime-loader.mjs`, so they sit outside the F-15
   path/symbol contract.

A green semantic-compat run and an `UNAVAILABLE` smoke lane are therefore not
facts. They are classifications the executor does not obey.

## What Changes

- Enforce `expectedSkipPolicy`: `bin/semantic-compat.mjs` (and the
  `SEMANTIC_COMPATIBILITY` gate group) SHALL fail when a skip is not in a
  declared canonical skip-identity list. The list is data, reviewed, and
  named by test file + skip reason token — not a blanket "skips are fine".
- **SUPERSEDE (18 → 12).** Production-completion G2
  (`validation-lane-closure`) still requires an executable route for
  **18** never-run authorization-gated checks (`MANUAL_OWNER=12` +
  `LIVE_APP_SMOKE=6`) and treats all 18 as `UNAVAILABLE_CAPABILITY`. That
  count is false on current HEAD: the six `LIVE_APP_SMOKE` files match
  default `testMatch` and run under `npm test`. This change reduces the
  never-run authorization-gated set to the **12** `MANUAL_OWNER` harnesses
  only. Reclassify the six local fixture smokes out of `LIVE_APP_SMOKE` /
  `owner-manual UNAVAILABLE_CAPABILITY` into a class the default runner
  actually executes. The lane-state evidence that they "have never
  executed" SHALL be withdrawn. Apply-phase SHALL amend the still-active
  production-completion specs `validation-lane-closure` and
  `authenticated-capability-lifecycle` so the two programmes do not
  disagree.
- Mechanical rule: a universe class whose lane-state is
  `UNAVAILABLE_CAPABILITY` MUST NOT contain files matching the default
  Playwright `testMatch`. A stored `command` or `evidenceLane` that names
  `npm run <script>` MUST name a script that exists in `package.json`.
- Bind or delete `playwright.capture.synthetic.config.ts` (bind it to
  `tests/manual/auth-capture.synthetic.ts` via a documented script, or declare
  it under the G14 retention list with a reason — Playwright configs are
  currently invisible to source reachability).
- Replace the two fixture-local TypeScript loaders with
  `bin/lib/typescript-runtime-loader.mjs`.

**BREAKING** (for the gate, by intent): a previously green
`SEMANTIC_COMPATIBILITY` run that skipped undeclared identities will fail
until those skips are declared or the tests run. That is the point.

## Capabilities

### New Capabilities

- `validation-classification-truth`: validation-universe classes, lane-state
  rows, package.json scripts, and the default Playwright `testMatch` SHALL
  agree; a class cannot be `UNAVAILABLE` while the default runner executes
  its files; stored npm-script names SHALL exist.

- `semantic-skip-identity`: `expectedSkipPolicy` SHALL be an enforced
  allowlist of canonical skip identities, not a comment. Playwright exit 0
  with an undeclared skip is not PASS.

### Modified Capabilities

- `residual-closure`: add a mechanical scenario under the existing
  requirement "a lane that executes is not carried as unavailable" so the
  G2 lane-state record cannot classify default-runner files as
  `UNAVAILABLE_CAPABILITY`. This is a requirement-level tightening of a
  published spec that the current data already violates, not a new product
  feature.

## Impact

- `bin/semantic-compat.mjs`, `config/semantic-compatibility.v1.json`
- `config/validation-universe.v1.json`, `config/validation-lane-state.v1.json`
  (reclassification + digest refresh is an owner-gated universe change;
  this change specifies the rule and the reclassification, and records that
  `inventoryDigest` refresh follows the existing G2/G3 owner convention)
- `playwright.config.ts` only if exclusion is chosen instead of
  reclassification — prefer reclassification so the six smokes stay in
  `npm test`, which is what already happens
- `package.json` only if a bind-script is added for capture-synthetic
- `tests/fixtures/*-race-child.mjs`
- `bin/hardening-check.mjs` or a focused module for the class↔testMatch and
  evidenceLane↔script rules
- `openspec/specs/residual-closure/spec.md` via this change's delta
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/validation-lane-closure/spec.md` (18→12 supersession, apply-phase task 2.6)
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/authenticated-capability-lifecycle/spec.md` (drop six fixture smokes from authenticated dependents, apply-phase task 2.6)
- Quality-gate group `SEMANTIC_COMPATIBILITY`

## Evidence (measured 2026-09-14, HEAD `ebe26ce`)

| Claim | Measurement |
|---|---|
| `expectedSkipPolicy` | present in config; **never read** by `bin/semantic-compat.mjs` except as part of the JSON it does not consult at runtime |
| semantic-compat PASS rule | `process.exitCode = result.status === 0 ? 0 : 1` |
| LIVE_APP_SMOKE files | 6 paths listed above |
| Default `testMatch` | `**/tests/**/*.{test,smoke}.ts`, `**/scenarios/**/*.smoke.ts` |
| `tests/smoke/safety.smoke.ts` | in-process SAFETY fixture; no owner-auth skip |
| `scenarios/ripple/local.smoke.ts` | built-in fixture app when `NIGHTWATCH_UI_URL` unset |
| Lane-state owner-manual | class `UNAVAILABLE_CAPABILITY`, command `npm run lanes:manual` (**no such script**), evidence "have never executed" |
| BROWSER_WORKFLOW evidenceLane | `npm run test:browser` (**no such script**); lane-state command is the real `control-center:ui:browser` |
| `playwright.capture.synthetic.config.ts` | 0 importers outside itself |
| Fixture TS loaders | two files copy `require.extensions['.ts']` + `transpileModule` |

## Out of scope

- Implementing `npm run lanes:manual` for the 12 true `MANUAL_OWNER` harnesses
  (production-completion G2 / F-02 still owns that executable route)
- Changing the 12 `tests/manual/*.ts` files that are correctly excluded from
  default `testMatch`
- Making `typecheck:bin` blocking (G15.7 / 15.11)
- Decomposing `bin/hardening-check.mjs` (G16.9)
- Owner-gated `inventoryDigest` refresh as a social process — the change
  specifies that the digest MUST be refreshed after the universe JSON
  changes, using the existing owner convention

## Dependencies

- **Supersedes, does not complement, the G2 18-count.** Production-completion
  `validation-lane-closure` requirement "The 18 authorization-gated checks
  SHALL have an executable route" (and the F-02 prose `MANUAL_OWNER=12` +
  `LIVE_APP_SMOKE=6` never-run) is **replaced** by this change: never-run
  authorization-gated checks = **12** `MANUAL_OWNER` harnesses. The six
  fixture smokes are default-runner tests, not UNAVAILABLE auth-gated
  work. G2's remaining `lanes:manual` executable route still applies to
  those 12. Apply-phase task 2.6 amends that spec in
  `openspec/changes/nightwatch-production-completion-programme-v1/`.
- **Aligns `authenticated-capability-lifecycle` with G21.8.** G21.8 already
  exempts the six smokes (`AUTH_CAPABILITY_PREFLIGHT_EXEMPT_LANES`) because
  they never read the owner capture artefact. The lifecycle spec's opening
  claim that every authenticated capability includes those six is stale.
  Apply-phase task 2.6 amends that spec so authenticated dependents are
  the 12 `MANUAL_OWNER` harnesses plus the named real launchers, not the
  six fixture smokes.
- Independent of `agent-continuity-live-waypoint` and
  `published-spec-baseline-integrity`.
- Residual-closure delta must keep retention, handoff, and worktree
  scenarios unchanged.
