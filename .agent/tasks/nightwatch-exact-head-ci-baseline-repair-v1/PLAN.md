# Nightwatch exact-head CI baseline repair and truth reconciliation

## Purpose

Exact-head Actions run `33572572053` is the first run that bootstrapped the
runner and executed `gate:ci`. It failed two synthetic-campaign cases. The
observable capability after this campaign is an exact-head GREEN CI baseline
in which `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` execute for the first
time, a receipt that names its own failing locations, and project truth that
describes the real CI state.

## Starting State

- Task ID `nightwatch-exact-head-ci-baseline-repair-v1`; starting SHA
  `c3fed38abd281e8648c039ac3befe8034c13e868`, verified equal to `origin/main`.
- Predecessor `nightwatch-php-readonly-proof-c06-v1` is COMPLETE at substantive
  SHA `7ce2cf91a00f1916ea1e04790dc395a809ef8727`.
- The gate is eleven required groups in `config/quality-gate.v1.json`, executed
  serially by `bin/quality-gate.mjs`, which discards child output and emits one
  bounded receipt.
- Established and not to be rediscovered: the CI job's step-by-step outcome,
  the receipt group results, and the runner image's package inventory.

## Scope

Reproduce, root-cause and repair the two CI failures; make synthetic-campaign
diagnostics sufficient; reconcile project truth; certify on GitHub.

## Non-Goals

C-10 and beyond, `PROD_OBSERVE`, any product-environment contact, any
credential inspection, sibling-repository writes, publication, and a
CI-topology clean gate.

## Safety Constraints

As `SPEC.md`. The controlling rule is that a repair may not convert a real
failure into silence: every absence must be classified, recorded and required
wherever the host can provide the capability.

## Architecture / Approach

Both defects share one shape: a test asserted a property of the DEVELOPER'S
HOST as though it were a property of this repository. The repair replaces each
with an invariant that is true in both topologies and strictly stronger,
because it additionally pins down the fail-closed behaviour that was never
covered before.

The diagnostic gap is separate and structural: `parseSafeDetails` keyed on a
single schema, so no Playwright-backed group could contribute detail. The fix
is a repository-owned launcher that emits a bounded categorical receipt, plus a
gate boundary module that allowlists what may cross into a receipt.

## Milestones

- M1 — Mechanical reproduction under runner-shaped topology; calibrate the
  harness against the real run's group results. Acceptance: both failures
  reproduce with the exact identities and the arithmetic matches 121/2/5 of
  128. Validation: `npm run campaign:synthetic` under the sandbox.
  Status: COMPLETE.
- M2 — Root cause for `DEF-CI-01` and `DEF-CI-02`, including whether test or
  production code is wrong. Acceptance: each names test, assertion, source path
  and environmental delta. Status: COMPLETE.
- M3 — Repair `DEF-CI-02` via `l6ContainmentAvailability()` plus a
  two-branch classification invariant. Acceptance: 6 tests pass in BOTH
  topologies with zero skips. Validation: `npx playwright test
  tests/unit/l6Containment.test.ts` in both. Status: COMPLETE.
- M4 — Repair `DEF-CI-01` by asserting population before content. Acceptance:
  4 tests pass in BOTH topologies. Validation: `npx playwright test
  tests/unit/eligibilityCensus.test.ts` in both. Status: COMPLETE.
- M5 — Bounded diagnostics: manifest, launcher, gate boundary module, and the
  mode-aware deep-lane requirement. Acceptance: receipt carries
  `failedLocations`, `didNotRun` and `deepContainmentLane`; `gate:inventory`
  and `hardening:check` follow the manifest. Status: COMPLETE.
- M6 — Project-truth reconciliation and the `PROJECT_STATE_CI_EVIDENCE_STALE`
  validator. Acceptance: the validator flags the campaign-start block; history
  preserved. Status: COMPLETE.
- M7 — Full regression, `gate:local`, `gate:clean`. Acceptance: all green;
  counts measured and reported rather than assumed. Status: IN_PROGRESS.
- M8 — Integrate, push, and certify the exact-head GitHub run. Acceptance:
  `gate:ci` executes and is green with all eleven groups passing.
  Status: NOT_STARTED.

## Validation Strategy

Focused suites for each changed path in both topologies, then the required
stack: `typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, the canonical Playwright regression, `gate:local`, and
clean Node 20 `gate:clean`. Counts are measured and reported; no test is
removed to preserve an old count.

## Decision Log

- 2026-09-02 — Classify `DEF-CI-01` as a TEST defect, not a product defect.
  Reason: every consumer reads the completeness/coverage state rather than
  trusting a zero exit; `src/controlCenter/adapters/sourceAdapter.ts` normalizes
  an unknown coverage state to `UNMEASURED`, and the operator already reports
  each repository as `SOURCE_UNAVAILABLE`. Evidence: consumer grep plus the
  operator's emission under an absent sibling root. Consequence: operator exit
  semantics are untouched, sparing eight subcommands and the compatibility cone.
- 2026-09-02 — Do NOT install Bubblewrap in the workflow. Reason: it would not
  remove the need for the invariant repair, and it would make apt availability
  and the Ubuntu 24.04 unprivileged-userns policy inputs to CI greenness.
  Consequence: deferred follow-up.
- 2026-09-02 — Keep `mode: 'serial'` on the L6 suite. Reason: those tests bind
  ports and spawn detached namespace children; serial is resource isolation,
  and the cascade is addressed by making every case pass in both topologies.
- 2026-09-02 — Make the deep-lane requirement mode-aware rather than skipping.
  Reason: this mirrors `PATCH_INTEGRITY`'s existing `mode !== 'local'`
  strictness; the invariant is constant and only its host precondition varies.

## Discoveries

- `gate:clean` clones into `os.tmpdir()` but runs on the SAME HOST, so the
  sibling root, `$HOME` and Bubblewrap are all still present. It structurally
  cannot catch a runner-topology defect. This is the campaign's real lesson.
- Playwright reports unreached cases as "did not run", NOT as "skipped", so the
  gate's `/(\d+)\s+skipped/` pattern could never see them.
- `bin/quality-gate-inventory.mjs` used a `/g`-flagged regex with `.test()`,
  whose stateful `lastIndex` makes repeated calls alternate true/false.

## Deferred Work

- A CI-topology clean gate that reproduces runner shape (no sibling root, no
  Bubblewrap, fresh `$HOME`) rather than same-host cleanliness.
- `ART-SBX-01`: five `selfDev*` cases fail under a relocated `$HOME` in the
  local sandbox. They pass on the real runner, so they are a harness artifact
  and out of scope here.

## Completion Criteria

As `SPEC.md`, plus: canonical checkout clean, `origin/main` equal to the
intended final commit, no stale task worktree or branch, and C-06 still
fail-closed.
