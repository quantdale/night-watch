# SPEC.md

**Task:** nightwatch-exact-head-ci-baseline-repair-v1
**Campaign:** Exact-head CI baseline repair and truth reconciliation
**Objective:** Determine why exact-head GitHub Actions run `33572572053`
executed `gate:ci` and failed two synthetic-campaign cases, repair the root
causes without weakening any safety invariant, make a future
`SYNTHETIC_CAMPAIGN` failure debuggable from its own authoritative receipt, and
reconcile project truth so it describes what actually happened rather than the
zero-step platform block that was true for older runs.

**Scope:**

- Mechanical reproduction of both CI failures under runner-shaped topology
  (Linux, Node 20, clean install, workers=1, retries=0, no sibling source root,
  no Bubblewrap, relocated `$HOME`), with the reproduction's own fidelity
  calibrated against the real run's group results.
- Root-cause identification for `DEF-CI-01` and `DEF-CI-02`, each naming the
  exact test, assertion, responsible source path, and why local and clean
  validation passed while GitHub did not.
- Repair of both root causes by replacing environment-dependent assumptions
  with environment-independent invariants that hold in BOTH topologies.
- Bounded, categorical diagnostics so a `SYNTHETIC_CAMPAIGN` failure names its
  sanitized test locations and its containment-lane classification in the
  authoritative receipt.
- Project-truth reconciliation: live CI state set from evidence, historical
  zero-step runs preserved, and a mechanical validator for the staleness class
  that existed at campaign start.

**Non-goals:**

- No C-10 privacy firewall, no C-11 through C-14, no `PROD_OBSERVE`.
- No production, NEXT or DEV contact; no authenticated browsing; no credential
  or auth-state inspection; no datastore, cloud, IAM or Kubernetes access.
- No sibling-repository writes and no external publication.
- No weakening of the C-06 PHP read-only proof to manufacture a non-zero
  eligible population.
- No CI-topology clean gate; recorded as deferred follow-up work.

**Safety constraints:**

- Repository-local and GitHub-CI repair only.
- No forbidden suppression: no `test.skip`, no platform skip to force green, no
  required group made optional, no file removed from `campaign:synthetic`, no
  fail-closed state converted to a pass, no retries, no timeout inflation, no
  `CI=true` invariant bypass, no swallowed errors, no ignored child exit code,
  no deleted test.
- Absent sibling source must never masquerade as valid evidence.
- Diagnostics are allowlisted, not redacted: only integers, tracked `tests/**`
  paths with line numbers, and fixed enum tokens may enter a receipt.
- All work happens in the owned C-00 session worktree; the canonical checkout
  is never used for implementation.

**Acceptance criteria:**

- Both original CI failures have exact identified root causes and permanent
  regressions that fail if the defect returns.
- Every previously passing assertion still runs at full strength on a host that
  can provide the capability it tests; no test is skipped in either topology.
- `campaign:synthetic` green locally and under runner-shaped topology.
- A `SYNTHETIC_CAMPAIGN` failure surfaces sanitized failing locations, a
  `didNotRun` count distinct from `skipped`, and a containment-lane
  classification in the gate receipt.
- The deep containment lane is REQUIRED to be `PROVEN` in `local`, `clean` and
  `predev`, and explicitly classified where the host cannot provide it.
- `project:check` mechanically detects the stale-CI-evidence class that existed
  at campaign start.
- Full regression, `gate:local`, and clean Node 20 `gate:clean` green.
- Exact-head GitHub `gate:ci` executes AND is green, with `PATCH_INTEGRITY` and
  `WORKSPACE_INTEGRITY` executing and passing for the first time.
- Historical zero-step runs remain historical rather than rewritten.

**Deliverables:**

- Repairs to the two defective test surfaces and the gate diagnostic boundary.
- `config/synthetic-campaign.v1.json`, `bin/campaign-synthetic.mjs`,
  `bin/lib/gate-receipt.mjs`, `tests/unit/syntheticCampaignDiagnostics.test.ts`.
- Reconciled `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.
- Truthful continuity-v2 SPEC / PLAN / STATE / REPORT and an OpenSpec change.
- Validated commit integrated through C-00 tooling, then an exact-head green CI
  observation recorded in a documentation descendant.

**## Declared Deletions:**

NONE
