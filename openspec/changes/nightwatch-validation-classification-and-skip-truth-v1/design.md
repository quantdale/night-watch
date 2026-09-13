## Context

Three independent truth surfaces currently disagree about what a green
validation run means.

**Skip policy.** `config/semantic-compatibility.v1.json` declares
`expectedSkipPolicy: "only canonical skip identities may skip"`.
`bin/semantic-compat.mjs` (the `SEMANTIC_COMPATIBILITY` gate group) spawns
`npx playwright test … --project=nightwatch --workers=1`, parses passed /
skipped / failed counts, and sets `result: PASS` iff Playwright's exit
status is 0. The policy string is never read. `tests/unit/phase14ContractReport.test.ts`
contains `test.skip(true, "disposable snapshot not present in this environment")`
and is in the Phase 14 cone.

**Universe vs runner.** `config/validation-universe.v1.json` `LIVE_APP_SMOKE`
lists six files whose comments and bodies are local fixture smokes
(`startFixtureServer`, SAFETY driver, Ripple local journey with
`NIGHTWATCH_UI_URL` unset). `playwright.config.ts` `testMatch` includes
them. `config/validation-lane-state.v1.json` `owner-manual` groups
`MANUAL_OWNER` **and** `LIVE_APP_SMOKE`, class `UNAVAILABLE_CAPABILITY`,
evidence "have never executed", command `npm run lanes:manual` (script
absent). The universe entry even records G21.8: these six "build synthetic
local state against loopback fixtures and never read the real owner capture
artefact". Residual-closure already requires that a lane which executes is
not carried as unavailable.

**Stale script names and unbound configs.** `BROWSER_WORKFLOW.evidenceLane`
says `npm run test:browser` (not a script). Lane-state for that class
correctly says `npm run control-center:ui:browser`.
`playwright.capture.synthetic.config.ts` has no importer.
`tests/fixtures/ai-owner-decision-race-child.mjs` and
`tests/fixtures/private-artifact-race-child.mjs` fork
`bin/lib/typescript-runtime-loader.mjs`.

G2 of production-completion *created* lane-state as data and populated it
from the 36bd493 audit's "never executed" claim. That claim is false for
the six smokes on current `playwright.config.ts`. G2's still-active spec
`validation-lane-closure` still requires an executable route for **18**
authorization-gated never-run checks (`MANUAL_OWNER=12` +
`LIVE_APP_SMOKE=6`). This change **SUPERSEDES that 18-count (18 → 12)**
and adds the check G2 did not: class vs default `testMatch`. Apply-phase
amends the production-completion delta specs so the two active programmes
cannot disagree. G21.8 already exempts the six smokes from auth pre-flight;
`authenticated-capability-lifecycle` still names them as dependents and
must be amended to match G21.8.

## Goals / Non-Goals

**Goals:**

- Semantic-compat fails on undeclared skips.
- Universe classes that `npm test` actually runs cannot be UNAVAILABLE.
- Stored `npm run <script>` names exist.
- Playwright configs are bound or retained; fixture TS loading is one
  implementation.

**Non-Goals:**

- Building `lanes:manual` for the 12 true manual harnesses (still G2).
- Moving the six smokes *out* of `npm test` (they already run; keep them
  running and tell the truth).
- Making `typecheck:bin` blocking (G15).
- Decomposing `hardening-check.mjs` (G16).
- Changing L0–L6 containment of the smoke tests themselves.

## Decisions

### D1 — Reclassify the six smokes; do not exclude them from testMatch

Excluding them from `playwright.config.ts` would make the universe's
"never executed" claim true by deleting coverage. The tests are the Phase
0/1 acceptance smokes. Move `LIVE_APP_SMOKE` files into `FULL_REGRESSION`
(already the class for `npm test`) or a new executed class `LOCAL_FIXTURE_SMOKE`
whose lane-state is `PROVEN`/`STALE_EVIDENCE` bound to the last `npm test`
receipt. Prefer a dedicated class so the six files remain enumerable, but
the dedicated class MUST map to the `full-regression` lane (or a new proven
lane), never `owner-manual`.

This is the 18 → 12 supersession: `validation-lane-closure` keeps
`lanes:manual` for the 12 `MANUAL_OWNER` files; it MUST NOT keep the six
smokes in that inventory. Task 2.6 edits that spec and
`authenticated-capability-lifecycle` in
`openspec/changes/nightwatch-production-completion-programme-v1/` during
apply. Do not leave the 18-count live after reclassification.

Alternative rejected: keep `LIVE_APP_SMOKE` and change lane-state to PROVEN.
The class *name* would still say "live app". Rename is part of telling the
truth.

Alternative rejected: "complement G2 without amending it." The 18-count is
a published-in-the-active-change requirement. Leaving it would make
`openspec/changes/` self-contradictory the moment this change's universe
JSON moved the six files.

### D2 — Skip identities are structured data, not regex over titles

Add `canonicalSkipIdentities: [{ file, reasonToken }]` to
`config/semantic-compatibility.v1.json`. `reasonToken` matches a substring of
the skip message or the Playwright skip title. Empty allowlist is legal and
means "zero skips permitted in the cone".

`bin/semantic-compat.mjs` already captures stdout/stderr. Parse skip lines
(`test.skip` reports as `… skipped` with location). Any skip whose `(file,
reasonToken)` pair is missing → `UNDECLARED_SKIP`.

Do not treat "sibling checkout unavailable" as automatically allowed.
exact-head-ci-baseline already requires fail-closed-when-absent for census
content. A cone test that skips on absent sibling is either declared (with
the reason that it is a *host* probe, not evidence) or converted to
fail-closed. This change does not convert tests; it fails undeclared skips
so the owner of that suite must choose.

### D3 — Script-existence and class-vs-testMatch are hardening rules

They are static over JSON + `package.json` + `playwright.config.ts` source.
Implement in a focused helper (`bin/lib/validation-classification.mjs`)
called from `checkValidationUniverse` in `hardening-check.mjs` (that function
already owns universe completeness). Do not grow a new gate group.

### D4 — Capture-synthetic config is bound, not deleted, unless G14 retention is easier

`tests/manual/auth-capture.synthetic.ts` is the intended consumer. Add
`package.json` script `auth:capture-synthetic` that runs Playwright with
that config, classified `MANUAL_OWNER` (it is already in that class). That
is a bind, not a new product path. Alternative: add the config path to the
G14 retention list with reason `MANUAL_OWNER_PLAYWRIGHT_CONFIG`. Prefer the
script so an operator can find it (residual-closure "documented where an
operator will find it").

### D5 — Fixture loaders call the shared loader; do not typecheck fixtures

`tests/fixtures/*.mjs` are outside `BIN_SYNTAX`. Replace the local
`loadTypeScriptModule` with the exported function from
`bin/lib/typescript-runtime-loader.mjs`. Keep the files as ESM. If the
shared loader's API is CommonJS-shaped, add a thin named export rather than
forking transpile options.

## Risks / Trade-offs

- **[Risk] Semantic-compat turns red on `main` because the cone currently skips.** → Mitigation: first run semantic-compat, record the actual skip identities, and either declare the honest host-probe ones or (preferred for snapshot-absent phase14 tests) leave them undeclared so the suite must fail closed — that second path is a behaviour change of those tests and MUST be a numbered task, not a silent skip-list dump.
- **[Risk] inventoryDigest must change when universe JSON changes.** → Mitigation: follow the G2/G3 convention: implement the JSON + rule, record the computed digest, owner refreshes `inventoryDigest` at integration. The rule fails if digest is stale; that is existing hardening behaviour.
- **[Risk] Moving LIVE_APP_SMOKE files into FULL_REGRESSION duplicates them if they are also listed there.** → Mitigation: universe completeness already forbids a file in two classes. The six paths must be *moved*, not copied.
- **[Risk] Parsing Playwright skip lines is format-brittle.** → Mitigation: assert against Playwright 1.62.1 (pinned). A probe test runs a one-file fixture that skips and checks detection. If the reporter format changes, the probe fails.

## Migration Plan

1. Land skip-policy enforcement in reporting mode **only if** a first run
   shows skips that need an allowlist discussion. Default is blocking, with
   the allowlist committed in the same change as any declared identities.
2. Move the six smoke paths; update lane-state owner-manual to
   `MANUAL_OWNER` only; drop the "never executed" sentence.
3. Fix evidenceLane script names.
4. Bind capture-synthetic; replace fixture loaders.
5. Refresh inventoryDigest at integration (owner).
6. Rollback: revert config + checker; smokes remain in `npm test` either way.

## Open Questions

Whether the six smokes become `FULL_REGRESSION` members or a new
`LOCAL_FIXTURE_SMOKE` class mapped to the full-regression lane. Default:
new class, same lane, so they stay enumerable. Recorded here so the
implementer does not invent a third lane.

## Affected surfaces

- `bin/semantic-compat.mjs`
- `config/semantic-compatibility.v1.json`
- `config/validation-universe.v1.json`
- `config/validation-lane-state.v1.json`
- `package.json` (optional `auth:capture-synthetic`)
- `tests/fixtures/ai-owner-decision-race-child.mjs`
- `tests/fixtures/private-artifact-race-child.mjs`
- `bin/lib/validation-classification.mjs` (new)
- `bin/hardening-check.mjs` (call site only)
- `openspec/specs/residual-closure/spec.md` (via delta)
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/validation-lane-closure/spec.md` (18→12, apply-phase)
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/authenticated-capability-lifecycle/spec.md` (apply-phase)

## Testing strategy

- Fixture Playwright skip not on allowlist → semantic-compat non-zero,
  `UNDECLARED_SKIP`
- Allowlisted skip → PASS, skipped count > 0, passed does not include it
- Universe JSON with `tests/smoke/safety.smoke.ts` under UNAVAILABLE +
  default testMatch → `VALIDATION_CLASS_UNAVAILABLE_BUT_DEFAULTED`
- `npm run test:browser` in evidenceLane → `VALIDATION_EVIDENCE_SCRIPT_MISSING`
- Unbound playwright config fixture → `PLAYWRIGHT_CONFIG_UNBOUND`
- Fixture file containing `transpileModule` → `FIXTURE_TYPESCRIPT_LOADER_FORK`
- Current HEAD after reclassification: all new rules pass
