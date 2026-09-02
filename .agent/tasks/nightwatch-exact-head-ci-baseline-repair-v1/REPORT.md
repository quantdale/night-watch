# REPORT.md

Task: nightwatch-exact-head-ci-baseline-repair-v1

Status: COMPLETE

Starting SHA: `c3fed38abd281e8648c039ac3befe8034c13e868`
Validated implementation SHA: `b99ce4e61166e52b554dd6ac07b7678b433959da`

## Summary

Exact-head Actions run `33572572053` at `c3fed38` was the first run in this
project's history to bootstrap the runner and execute `gate:ci`. It failed on
two synthetic-campaign cases, and the receipt could not say which two. This
campaign identified both root causes, repaired them without weakening any
safety invariant, made such a failure debuggable from its own receipt,
reconciled project truth, and established a green exact-head CI baseline in
which `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` executed on GitHub for the
first time.

## Root causes

Both were TEST defects asserting a property of the developer's host as though
it were a property of this repository. In each case the PRODUCTION path was
already correct and already fail-closed. Neither implicates C-06.

**DEF-CI-01** — `tests/unit/eligibilityCensus.test.ts:211`, "operator
proof-chain census is byte-stable across three fresh processes". Expected
`NO_INDEPENDENT_GAP`, received `undefined`. `DEFAULT_SIBLING_ROOT`
(`src/core/source/siblingSource.ts:17`) is the absolute path
`/home/dalepalaca/go/src/alphaus-main/REPOSITORIES`, which cannot exist on a
runner. `bin/nightwatch-intelligence.mjs:120` therefore took the
`NO_MECHANICALLY_PROVABLE_SOURCE_SURFACE` branch and emitted no `census` key at
all, while correctly reporting all six approved repositories as
`SOURCE_UNAVAILABLE` and completeness `UNKNOWN`. The test asserted census
CONTENT without first asserting the census POPULATION.

Adjudication: the operator does not masquerade — consumers read its
completeness state (`src/controlCenter/adapters/sourceAdapter.ts:211` normalizes
an unrecognized coverage state to `UNMEASURED`) and nothing treats exit 0 as
trustworthiness. Operator exit semantics were therefore left untouched, sparing
eight subcommands and the 1,967-test compatibility cone.

**DEF-CI-02** — `tests/unit/l6Containment.test.ts:10`, "rootless L6
qualification proves direct process/network denial and relay transport".
Expected `PROVEN`, received `NOT_PROVEN`. The `ubuntu-24.04` runner image ships
no Bubblewrap binary, so `bwrapPath()` returned null and
`qualifyL6RuntimeCapability()` correctly returned
`failureCapability('UNAVAILABLE', 'BWRAP_UNAVAILABLE')`. Because the suite is
serial, that first failure cascaded the remaining five cases into Playwright's
"did not run" bucket — which is exactly the five unaccounted-for tests
(121 + 2 + 5 = 128).

**DEF-CI-03** — the diagnostic blindness that made the other two expensive to
find. `parseSafeDetails` keyed only on `nightwatch.semantic-compatibility.v1`,
so no Playwright-backed group could contribute detail, and `parseCounts` had no
pattern for "did not run".

## Repairs

Each repaired suite discriminates on a value the SYSTEM UNDER TEST reports —
never an environment variable, never a host path probe — and asserts the
full-strength behaviour where the capability is present AND the fail-closed
behaviour where it is absent. Nothing is skipped in either topology, and the
fail-closed branches are coverage that did not previously exist.

`bin/lib/gate-receipt.mjs` is now the only path from child output into a
receipt, allowlisting integers, tracked `tests/**` paths with line numbers, and
enum tokens; a malformed value is dropped rather than sanitized. `didNotRun` is
its own bucket. The receipt records which containment lane ran, and the gate
REQUIRES the proven lane in `local`, `clean` and `predev`, mirroring
`PATCH_INTEGRITY`'s existing mode-aware strictness.

## Evidence

| item | value |
|---|---|
| starting SHA | `c3fed38abd281e8648c039ac3befe8034c13e868` |
| substantive SHA | `b99ce4e61166e52b554dd6ac07b7678b433959da` |
| canonical regression | 2,839 tests / 226 files; 2,826 passed, 13 skipped, 0 failed |
| baseline regression at `c3fed38` | 2,822 tests / 225 files (delta is exactly the 17 tests added) |
| synthetic before (runner topology) | 121 passed / 2 failed / 5 did not run |
| synthetic after (runner topology) | 128 passed / 0 failed / 0 did not run |
| synthetic after (host with containment) | 128 passed, `deepContainmentLane: PROVEN` |
| semantic compatibility | 1,950 → 1,967 total; 1,954 passed / 13 skipped / 0 failed |
| local gate receipt | `receipt:sha256:1418a489942c4a4154389fc1` |
| clean gate receipt | `clean-receipt:sha256:fc6d35a027e0fe3128ed865b` (gate `receipt:sha256:3a629d413edbebb4b8d42b80`) |
| GitHub run / job | `33590645175` / `100123768379` |
| GitHub receipt | `receipt:sha256:120582acb7bb971190a3a05d` |

All eleven required groups PASS on GitHub: `GATE_DEFINITION`, `STATIC`,
`HARDENING`, `HANDOFF_TRUTH`, `PROJECT_TRUTH`, `AGENT_CONTINUITY`,
`SEMANTIC_COMPATIBILITY`, `OWNER_PROVENANCE`, `SYNTHETIC_CAMPAIGN`,
`PATCH_INTEGRITY`, `WORKSPACE_INTEGRITY`.

The runner-shaped local sandbox produced the SAME receipt digest as the real
runner, so the reproduction was bit-exact rather than merely indicative.

## Project-truth corrections

`CI_OBSERVED_SHA` and `CI_EXECUTED_SHA` advanced from `6b13744`/`NONE` to
`b99ce4e`, and `CI_STATUS` from `NO_STEPS_EXTERNAL_NON_EVIDENCE` to
`EXECUTED_PASS`. The live-state block moved to this campaign and back to
`COMPLETE`. Historical zero-step runs are preserved unrewritten as facts about
the runs they describe. D-108 through D-111 record the reclassification, the
host-capability rule, the clean-gate limitation, and the diagnostics contract.
`PROJECT_STATE_CI_EVIDENCE_STALE` mechanically detects the staleness class that
existed at campaign start, and is covered by three new `projectState` tests.

## Safety

No safety authority was expanded; the only authority change is a tightening
(the deep containment lane is now required to be proven wherever the host can
provide it). No production, NEXT or DEV contact. No authenticated browsing,
auth capture or refresh, or credential/auth-state inspection. No customer data,
datastore, AWS, GCP, IAM or Kubernetes access. No sibling-repository write and
no external publication. No `PROD_OBSERVE`. Sibling repositories were read only
through the existing confined read-only boundary. C-06 is untouched and remains
fail-closed. C-10 was NOT implemented.

## Deferred

- A CI-topology clean gate; `gate:clean` runs on the same host it clones from
  and structurally cannot certify runner topology (D-110).
- `ART-SBX-01`: five `selfDev*` cases fail under a relocated `$HOME` in the
  local sandbox only; they pass on the real runner and are a harness artifact.

## Remaining critical path

`C-10 → C-11 → C-12 → C-13 → C-14`. C-10 requires its own explicit one-shot
owner authorization and its own task directory.
