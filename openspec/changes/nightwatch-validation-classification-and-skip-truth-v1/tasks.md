## 1. Skip-identity enforcement

- [ ] 1.1 Extend `config/semantic-compatibility.v1.json` with `canonicalSkipIdentities` (`file` + `reasonToken`); empty list means zero skips permitted in the cone
- [ ] 1.2 Change `bin/semantic-compat.mjs` so Playwright exit 0 is necessary but not sufficient: parse skip locations/messages; any skip not on the allowlist yields `result: UNDECLARED_SKIP` and non-zero exit; missing allowlist field yields `SKIP_POLICY_UNCONFIGURED`
- [ ] 1.3 Add a focused test that runs a one-file skipped fixture through the real `bin/semantic-compat.mjs` comparison helper (or a extracted pure function) and asserts `UNDECLARED_SKIP`; an allowlisted skip still records `skipped > 0` and is not counted as passed
- [ ] 1.4 Run the current cone once, record every live skip identity, and either declare only honest host-probe identities or leave snapshot-absent phase-14 skips undeclared so those tests must fail closed (do not dump the first run into the allowlist blindly)

## 2. Universe class vs default runner

- [ ] 2.1 Add `bin/lib/validation-classification.mjs` and call it from `checkValidationUniverse`: a class whose lane-state is `UNAVAILABLE_CAPABILITY` must not list files matching `playwright.config.ts` `testMatch` (`VALIDATION_CLASS_UNAVAILABLE_BUT_DEFAULTED`)
- [ ] 2.2 Move the six `LIVE_APP_SMOKE` paths (`scenarios/ripple/local.smoke.ts`, `tests/smoke/{authenticated,negative,passive-run,proxy,safety}.smoke.ts`) into `FULL_REGRESSION` or a new `LOCAL_FIXTURE_SMOKE` class mapped to the `full-regression` lane; do not copy (universe uniqueness); preserve the G21.8 synthetic-state reason as a comment on the new class
- [ ] 2.3 Narrow `config/validation-lane-state.v1.json` `owner-manual` to `MANUAL_OWNER` only; delete the evidence sentence that the six smokes "have never executed"; keep class `UNAVAILABLE_CAPABILITY` for the 12 true manual harnesses
- [ ] 2.4 Rule: every `npm run <script>` in universe `evidenceLane` / lane-state `command` must exist in `package.json` scripts (`VALIDATION_EVIDENCE_SCRIPT_MISSING`); replace `test:browser` with `control-center:ui:browser`
- [ ] 2.5 Tests: current HEAD after 2.2–2.4 passes the new rules; a fixture that puts `tests/smoke/safety.smoke.ts` back under UNAVAILABLE fails; a fixture evidenceLane `npm run test:browser` fails
- [ ] 2.6 **SUPERSEDE G2 18→12 in the still-active production-completion programme.** Amend `openspec/changes/nightwatch-production-completion-programme-v1/specs/validation-lane-closure/spec.md`: replace the requirement "The 18 authorization-gated checks SHALL have an executable route" and its scenarios (`all 18 checks`) with **12** `MANUAL_OWNER` harnesses only; remove `LIVE_APP_SMOKE=6` from that never-run UNAVAILABLE inventory; keep `lanes:manual` as the executable route for those 12. Amend `openspec/changes/nightwatch-production-completion-programme-v1/specs/authenticated-capability-lifecycle/spec.md` so authenticated dependents are the 12 `MANUAL_OWNER` checks plus the named real launchers (Phase 9B/10B, `journey:phase2c`, `explore:phase4`, `api:phase5`, `campaign:real`, C-12), **not** the six fixture smokes (already G21.8-exempt). Align the programme `proposal.md` "18 never-run checks" phrasing with 12. Do not tick G2/G21 implementation boxes as done; this is a spec correction, not `lanes:manual` delivery.

## 3. Playwright config bind and fixture loaders

- [ ] 3.1 Fail `PLAYWRIGHT_CONFIG_UNBOUND` for a tracked root `playwright*.config.ts` referenced by neither a package.json script, a `bin/*.mjs`, nor the G14 retention list
- [ ] 3.2 Bind `playwright.capture.synthetic.config.ts` with a `package.json` script (e.g. `auth:capture-synthetic`) classified `MANUAL_OWNER`, or add it to the retention list with that reason; prefer the script so an operator can find it
- [ ] 3.3 Replace local `transpileModule` loaders in `tests/fixtures/ai-owner-decision-race-child.mjs` and `tests/fixtures/private-artifact-race-child.mjs` with `bin/lib/typescript-runtime-loader.mjs`; fail `FIXTURE_TYPESCRIPT_LOADER_FORK` on a remaining copy
- [ ] 3.4 Re-run the two race tests that consume those fixtures; they MUST still pass

## 4. Digest and closeout

- [ ] 4.1 Record the computed `inventoryDigest` after universe JSON changes; refresh the stored digest at integration under the existing G2/G3 owner convention (do not invent a second digest authority)
- [ ] 4.2 `npm run hardening:check` PASS; `npm run typecheck` PASS; semantic-compat cone either PASS with only declared skips or fail with `UNDECLARED_SKIP` naming the undeclared files (no silent skips)
- [ ] 4.3 `openspec validate nightwatch-validation-classification-and-skip-truth-v1 --strict` PASS
- [ ] 4.4 Do not implement `lanes:manual` for the 12 manual harnesses; do not tick production-completion G2/G15/G16/G21 implementation boxes as done (2.6 is a spec amendment only)
