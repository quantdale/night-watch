## ADDED Requirements

### Requirement: An UNAVAILABLE class SHALL not include default-runner files

A validation-universe class whose lane-state row is
`UNAVAILABLE_CAPABILITY` SHALL NOT list any file that matches the default
Playwright config's `testMatch` (`playwright.config.ts`).

Files that the default `npm test` runner executes SHALL be classified in a
lane whose class is `PROVEN` or `STALE_EVIDENCE` of a `PROVEN` class, never
`UNAVAILABLE_CAPABILITY`.

The six local fixture smokes currently listed under `LIVE_APP_SMOKE`
(`scenarios/ripple/local.smoke.ts` and
`tests/smoke/{authenticated,negative,passive-run,proxy,safety}.smoke.ts`)
SHALL be reclassified into an executed class. Their G21.8 admission that they
build synthetic loopback state and never read the owner capture artefact
SHALL be preserved as the reason they are not `MANUAL_OWNER`.

#### Scenario: default-runner files in an UNAVAILABLE class fail the check

- **WHEN** `config/validation-universe.v1.json` lists `tests/smoke/safety.smoke.ts` under a class whose lane-state is `UNAVAILABLE_CAPABILITY`
- **AND** `playwright.config.ts` `testMatch` includes `**/tests/**/*.smoke.ts`
- **THEN** `hardening:check` reports `VALIDATION_CLASS_UNAVAILABLE_BUT_DEFAULTED` naming the file and the class
- **AND** the structural-invariants group fails

#### Scenario: reclassified fixture smokes pass

- **WHEN** those six files belong to a class whose lane-state is `PROVEN` or `PROVEN (STALE_EVIDENCE)`
- **AND** they still do not require the owner capture artefact
- **THEN** this requirement passes
- **AND** the 12 `tests/manual/*.ts` files remain `MANUAL_OWNER`

### Requirement: The never-run authorization-gated inventory SHALL be 12, not 18

This requirement **SUPERSEDES** the still-active production-completion
capability `validation-lane-closure` requirement "The 18 authorization-gated
checks SHALL have an executable route" (`openspec/changes/nightwatch-production-completion-programme-v1/specs/validation-lane-closure/spec.md`).

The never-run `UNAVAILABLE_CAPABILITY` authorization-gated set SHALL be
exactly the 12 `MANUAL_OWNER` harnesses. It SHALL NOT include any of the
six files formerly classified `LIVE_APP_SMOKE`. Those six execute under
the default Playwright runner and are not authorization-gated.

The production-completion `lanes:manual` executable route, one-shot owner
authorization, and `OWNER_POLICY_BLOCKED` refusal remain the route for
those 12. This requirement does not deliver `lanes:manual`; it corrects
the count and membership.

The still-active `authenticated-capability-lifecycle` opening claim that
every authenticated capability includes the six `LIVE_APP_SMOKE` checks
is likewise superseded: those six are G21.8-exempt fixture smokes and
SHALL NOT be listed as authenticated dependents.

#### Scenario: counting the six smokes toward the 18 fails

- **WHEN** the never-run authorization-gated inventory still lists any of
  `scenarios/ripple/local.smoke.ts` or `tests/smoke/{authenticated,negative,passive-run,proxy,safety}.smoke.ts`
- **THEN** the inventory is rejected as stale
- **AND** the required membership size is 12 (`MANUAL_OWNER` only), not 18

#### Scenario: the 12 manual harnesses remain the UNAVAILABLE auth-gated set

- **WHEN** lane-state is emitted after reclassification
- **THEN** `owner-manual` covers `MANUAL_OWNER` only
- **AND** those 12 remain `UNAVAILABLE_CAPABILITY` until G2's `lanes:manual` route runs under owner authorization

### Requirement: A stored npm-script name SHALL exist

Every `command` and `evidenceLane` string in
`config/validation-universe.v1.json` and
`config/validation-lane-state.v1.json` that contains `npm run <script>`
SHALL name a key that exists in `package.json` `scripts`.

A missing script is `VALIDATION_EVIDENCE_SCRIPT_MISSING`, not a passing
absent scan.

#### Scenario: test:browser as evidenceLane fails the check

- **WHEN** `BROWSER_WORKFLOW.evidenceLane` contains `npm run test:browser`
- **AND** `package.json` has no `test:browser` script
- **THEN** the check reports `VALIDATION_EVIDENCE_SCRIPT_MISSING` naming `test:browser`
- **AND** the structural-invariants group fails

#### Scenario: the real browser script passes

- **WHEN** the stored string is `npm run control-center:ui:browser`
- **AND** that script exists
- **THEN** the script-existence clause passes

### Requirement: Every Playwright config SHALL be bound or declared retained

Every tracked `playwright*.config.ts` at the repository root SHALL be
referenced by a `package.json` script, a `bin/*.mjs` launcher, or an
explicit retention reason in `config/reference-graph.v1.json` (or the
successor retention list G14 already uses for source). An unbound config
SHALL fail `PLAYWRIGHT_CONFIG_UNBOUND`.

#### Scenario: capture-synthetic unbound fails

- **WHEN** `playwright.capture.synthetic.config.ts` is tracked and no script or bin references it and it is not on the retention list
- **THEN** the check reports `PLAYWRIGHT_CONFIG_UNBOUND` naming the file

#### Scenario: a bound config passes

- **WHEN** `playwright.control-center.config.ts` is referenced by `control-center:ui:browser`
- **THEN** the binding clause passes for that file

### Requirement: Test fixtures that load TypeScript SHALL use the shared loader

A tracked file under `tests/fixtures/` that transpiles TypeScript at runtime
SHALL load `bin/lib/typescript-runtime-loader.mjs`. A local
`require.extensions['.ts']` + `typescript.transpileModule` copy SHALL fail
`FIXTURE_TYPESCRIPT_LOADER_FORK`.

#### Scenario: a forked fixture loader fails the check

- **WHEN** `tests/fixtures/ai-owner-decision-race-child.mjs` defines its own `loadTypeScriptModule` with `transpileModule`
- **THEN** the check reports `FIXTURE_TYPESCRIPT_LOADER_FORK` naming the file

#### Scenario: the shared loader passes

- **WHEN** the fixture imports or otherwise invokes `bin/lib/typescript-runtime-loader.mjs` and has no local transpile hook
- **THEN** the loader clause passes
