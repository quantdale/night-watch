# Audit — Exact-Head CI Baseline Repair and Truth Reconciliation

Every figure below was measured during this campaign, either directly from
GitHub or from a mechanically reproduced runner-shaped topology. Company
repositories were read through the existing confined read-only boundary and
were not modified. No product environment was contacted.

## A.1 — The run, verified directly against GitHub

`gh run view 33572572053` — workflow `Nightwatch hardening`, head
`c3fed38abd281e8648c039ac3befe8034c13e868`, conclusion `failure`, job
`100069494765`.

Steps: `Set up job` success, `Check out source` success, `Set up Node` success
(node v20.20.2, npm 10.8.2), `Install without lifecycle scripts` success,
`Execute authoritative quality gate` FAILURE, post-steps success.

The job ran for 5m36s and emitted one receipt line. This is a runner that
bootstrapped and executed repository code — not a zero-step platform block.

## A.2 — The authoritative receipt

`receipt:sha256:1a55a1e307541c094dcbfb3f`,
`gateDefinitionDigest: sha256:4e676246…`, `nodeMajor: 20`,
`environmentClass: CI`.

| group | status | counts |
|---|---|---|
| GATE_DEFINITION | PASS | — |
| STATIC | PASS | — |
| HARDENING | PASS | — |
| HANDOFF_TRUTH | PASS | — |
| PROJECT_TRUTH | PASS | — |
| AGENT_CONTINUITY | PASS | — |
| SEMANTIC_COMPATIBILITY | PASS | 1950 total / 1937 passed / 13 skipped / 0 failed |
| OWNER_PROVENANCE | PASS | 91 passed |
| SYNTHETIC_CAMPAIGN | TEST_FAILURE | 121 passed / 2 failed |
| PATCH_INTEGRITY | NOT_RUN | — |
| WORKSPACE_INTEGRITY | NOT_RUN | — |

`SEMANTIC_COMPATIBILITY` carried `details.failedLocations: []`.
`SYNTHETIC_CAMPAIGN` carried NO `details` key at all — the diagnostic gap,
visible in the receipt itself.

## A.3 — The missing five

The synthetic campaign is 128 tests across 12 files. The receipt reported 121
passed and 2 failed, and `skipped: null`. 128 − 121 − 2 = 5.

`tests/unit/l6Containment.test.ts` declares
`test.describe.configure({ mode: 'serial' })` over 6 tests. When its first test
fails, Playwright reports the remaining 5 as "did not run" — NOT as "skipped".
`parseCounts` matched only `/(\d+)\s+skipped/`, so the five had no
representation. 121 + 2 + 5 = 128 exactly.

## A.4 — Reproduction and harness calibration

Runner-shaped topology was built with a fresh local clone at the exact head,
outside the sibling root, `npm ci --ignore-scripts` under Node 20.20.2, and a
mount namespace hiding the sibling root and the Bubblewrap binary.

The harness was calibrated rather than trusted. A first attempt bind-mounted an
EMPTY DIRECTORY over the sibling root; on the runner the path does not exist at
all, and the difference produced 11 spurious `SEMANTIC_COMPATIBILITY` failures
against the real run's 0. Making the path genuinely absent reduced that to 5.

`ART-SBX-01`: the 5 residual failures (`selfDevPortfolio.test.ts:469,491,513,545`
and `selfDevSandboxConfinement.test.ts:243`) are caused ONLY by the relocated
`$HOME`, proven by isolation — real `$HOME` with no siblings gives 30 passed,
while a relocated `$HOME` with siblings present still fails 4. GitHub ran
`SEMANTIC_COMPATIBILITY` green at this exact head, so these are a harness
artifact and not a CI fact.

For the `SYNTHETIC_CAMPAIGN` lane the harness reproduces the real run exactly:
1 census failure + 1 containment failure + 5 did-not-run of 128.

## A.5 — DEF-CI-01, measured

With the sibling root absent, `bin/nightwatch-intelligence.mjs
eligibility-census --json` exits 0 with empty stderr and emits:
`completeness.state: UNKNOWN`, `operationCompleteness.state: UNKNOWN`,
`note: NO_MECHANICALLY_PROVABLE_SOURCE_SURFACE`, `portfolio: null`,
`queue: null`, no `census` key, all analyzer counters 0, and all six approved
repositories `status: SOURCE_UNAVAILABLE` with `SOURCE_REPOSITORY_UNAVAILABLE: 1`
and `sourceSha: null`.

That is a first-class fail-closed classification, not a masquerade. Consumers
read it: `src/controlCenter/adapters/sourceAdapter.ts:211-212` reads
`operationCompleteness.coverageState` and normalizes an unrecognized value to
`UNMEASURED`. Nothing treats exit 0 as trustworthiness. The defect is that the
test asserted content over a population it never checked.

## A.6 — DEF-CI-02, measured

`actions/runner-images` `ubuntu24/20260823.283` — bubblewrap is not in the
image's installed-apt-packages inventory. `bwrapPath()` probes only
`/usr/bin/bwrap` and `/bin/bwrap`, so it returns null and
`qualifyL6RuntimeCapability()` returns
`failureCapability('UNAVAILABLE', 'BWRAP_UNAVAILABLE')` at `l6.ts:937-938`.

`assertL6RuntimeCapability` already refuses that capability. The production
path is correct and fail-closed; the test asserted `PROVEN` unconditionally.

## A.7 — Why local and clean certification missed both

`bin/quality-gate-clean.mjs` clones into `os.tmpdir()` and runs the gate on the
SAME HOST. The sibling root, `$HOME` and the Bubblewrap binary are all still
present, so a runner-topology defect is outside what it can observe. Local and
clean certification remain valid for what they measure.

## A.8 — PATCH_INTEGRITY and WORKSPACE_INTEGRITY, pre-verified

Both have never executed on GitHub, because the gate stops at the first
required failure. Exercised standalone in a CI-shaped checkout they PASS:
`workspace-integrity.mjs check` returns `verdict=PASS
reason=WORKSPACE_INTEGRITY_SATISFIED` with `class=CANONICAL_MAIN` and all seven
sub-checks PASS, confirming the documented single-worktree exception fires;
`selfdev-catalog-integrity.mjs` returns `checkoutClean: true`, `git diff
--check` is clean, and `git status --porcelain` is empty. `test-results/` is
gitignored, so a failed run cannot dirty the checkout.

## A.9 — Safety

No production, NEXT or DEV contact. No authenticated browsing, credential
capture, auth-state inspection or credential refresh. No datastore, AWS, GCP,
IAM or Kubernetes access. No sibling-repository write. No external publication.
No `PROD_OBSERVE`. C-06 is untouched and remains fail-closed. No safety
authority was expanded by this campaign; the only authority change is that the
deep containment lane is now REQUIRED to be proven wherever the host can
provide it, which is a tightening.
