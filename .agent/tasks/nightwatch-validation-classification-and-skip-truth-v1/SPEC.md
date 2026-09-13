# SPEC.md

**Task:** nightwatch-validation-classification-and-skip-truth-v1
**Campaign:** OpenSpec truth-surface closure
**Objective:** Implement the OpenSpec change
`nightwatch-validation-classification-and-skip-truth-v1`: enforce
`expectedSkipPolicy` against a canonical skip-identity allowlist, make the
validation-universe classification agree with the default Playwright runner
and `package.json` scripts, bind or retain every Playwright config, converge
the fixture TypeScript loaders on the shared loader, and amend the
production-completion spec counts (18→12) without ticking its boxes.

**Scope:**

- `config/semantic-compatibility.v1.json` + `bin/semantic-compat.mjs`
  skip-identity enforcement with `UNDECLARED_SKIP` /
  `SKIP_POLICY_UNCONFIGURED`.
- `bin/lib/validation-classification.mjs` and the
  `VALIDATION_CLASS_UNAVAILABLE_BUT_DEFAULTED` /
  `VALIDATION_EVIDENCE_SCRIPT_MISSING` / `PLAYWRIGHT_CONFIG_UNBOUND` /
  `FIXTURE_TYPESCRIPT_LOADER_FORK` rules.
- Universe/lane-state reclassification of the six fixture smokes, the
  capture-synthetic bind, the two race-child fixture loader replacements, and
  the two production-completion spec amendments.

**Non-goals:** delivering `npm run lanes:manual`; changing the 12
`tests/manual/*.ts` files; decomposing `bin/hardening-check.mjs`; ticking any
production-completion implementation box.

**Safety constraints:** no undeclared skip may pass; a fail-closed path is
never converted into a listed skip; evidence-lane strings must resolve to
real scripts.

**Acceptance criteria:** focused probes green; `node bin/hardening-check.mjs`
PASS; the semantic-compat cone reports only declared skips or fails with
`UNDECLARED_SKIP`; `openspec validate
nightwatch-validation-classification-and-skip-truth-v1 --strict` PASS.

**Deliverables:** the config/rule/test changes, the fixture loader
convergence, the two spec amendments, and the digest refresh under the
existing convention.

**## Declared Deletions:**

NONE
