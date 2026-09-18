# W11 — Autonomous yield proof — Report

Status: IN_PROGRESS. This report is populated as milestones close; it carries
no completion claim yet.

## Baseline

- Starting SHA: `158a97b8feceb6abf4ea4ccbacab1f20cc46bc35`
- Session branch: `session/nightwatch-autonomous-yield-proo-72d452ea`
- Provider/model: `opencode-go/glm-5.3` through opencode CLI 1.18.31
- Toolchain: Node v22.22.1, Go 1.25.3, Git 2.43.0, bubblewrap 0.9.0

## Preflight (M0)

Recorded in SPEC.md. All 8 admitted repositories CURRENT; 4,124 eligible source
files, 1,120 executable, 152 distinct executable targets; provider structured
probe PASS.

## Historical EXACT arm (M2) — COMPLETE

Frozen definition `sha256:824deef9922975feab5af69f` at `158a97b8`. Provider
`opencode-go/glm-5.3` via opencode CLI 1.18.31. Wall time 66.8 min, 78 reasoner
calls, 78 reasoner-visible request blobs audited.

| Figure | Value |
|---|---:|
| Frozen corpus | 14 |
| Attempted / evaluated | 14 / 14 |
| `ENVIRONMENT_BLOCKED` | 0 |
| Substantive scored | 13 |
| Negative controls scored | 1 |
| **`EXACT_REDISCOVERY`** | **0** |
| **Exact rate** | **0 / 13 = 0.00** |
| Near matches | 10 |
| Reproductions | 4 |
| Candidates proposed | 7 |
| Mechanical admissions (dossiers) | 3 |
| Refused `MISSING_REPRODUCTION` | 4 |
| False positives | 0 |
| Leakage events | 0 |

Denominators. The exact rate is exact rediscoveries / substantive scored cases;
negative controls are excluded, and `ENVIRONMENT_BLOCKED` would be excluded
from both sides (there were none, so the rule did not bind on this host).
Mechanical admissions are dossiers built through the existing path; a proposed
candidate with no reproduction is refused `MISSING_REPRODUCTION` and is not an
admission. 7 candidates = 3 admitted + 4 refused.

### Per-case disposition

| Case | Outcome | testMatch | fileRecall | kwRecall | repro | cand | adm | env |
|---|---|---|---:|---:|---:|---:|---|---|
| `bench-billing-rounding-001` | PARTIAL | false | 1.00 | 0.77 | 1 | 1 | yes | n/a |
| `bench-api-pagination-002` | PARTIAL | false | 1.00 | 0.42 | 0 | 1 | refused | n/a |
| `bench-backend-retry-003` | PARTIAL | false | 1.00 | 0.54 | 0 | 1 | refused | n/a |
| `bench-frontend-cache-004` | PARTIAL | false | 1.00 | 0.47 | 1 | 1 | yes | n/a |
| `bench-data-timezone-005` | PARTIAL | false | 1.00 | 0.40 | 0 | 1 | refused | n/a |
| `bench-integration-webhook-006` | PARTIAL | false | 1.00 | 0.54 | 0 | 0 | no | n/a |
| `bench-regression-redirect-007` | PARTIAL | false | 1.00 | 0.50 | 1 | 1 | yes | n/a |
| `bench-state-transition-008` | PARTIAL | false | 1.00 | 0.44 | 0 | 1 | refused | n/a |
| `bench-negative-quiet-000` (control) | MISS | false | 0.00 | 0.00 | 0 | 0 | no | n/a |
| `mined-...-ouchan-5985281b43cd` | PARTIAL | false | 0.50 | 0.39 | 1 | 0 | no | EXECUTED |
| `mined-...-ouchan-2f3b1c34290f` | PARTIAL | false | 1.00 | 0.78 | 0 | 0 | no | EXECUTED |
| `mined-...-ouchan-1668e68a1190` | MISS | false | 0.00 | 0.00 | 0 | 0 | no | REPLAY_NEVER_REQUESTED |
| `mined-...-ouchan-bc7eb9ce69fb` | MISS | false | 0.00 | 0.00 | 0 | 0 | no | REPLAY_NEVER_REQUESTED |
| `mined-...-ripple-ui-6cb471e1c1cc` | MISS | false | 0.00 | 0.00 | 0 | 0 | no | REPLAY_NEVER_REQUESTED |

Full evidence: `evidence/historical-arm-result.json`.

### The reason EXACT is 0, established mechanically

`testMatch` is false in 13 of 13 substantive cases — every one. It is the only
condition that failed universally: 9 cases reached file recall 1.00, and 5
cleared BOTH recall thresholds and failed EXACT solely because the hidden
failing test was not named.

The hidden failing test is not derivable from anything the reasoner is shown:

- In all 8 fixture cases the hidden `knownFailingTest` filename appears nowhere
  in the reasoner-visible context — neither the full name nor its stem.
- For mined cases the hidden test is `testsAdded[0]`, a test ADDED by the fix
  commit. `git diff-tree` confirms status `A` for
  `childbillinggroup_test.go` at `5985281b` and `date_test.go` at `2f3b1c34`:
  neither file exists in the pre-fix tree the reasoner inspects.

So strict EXACT requires emitting a filename that does not exist in the
observable evidence and whose exact spelling was chosen by the human who later
wrote the fix. Under the leak-free conditions this arm enforces — and the
leakage guard exists precisely to enforce them — that string cannot be
recovered by investigation. **Strict `EXACT_REDISCOVERY` and zero leakage are
in tension by construction, and `EXACT = 0` is therefore primarily a statement
about the metric's reachability, not about investigation quality.**

This is reported as a measured limit. The EXACT definition was NOT weakened,
no threshold was tuned, and no near match was promoted.

## Current unknown-yield arm (M4/M5) — BLOCKED by an external provider outage

Definition frozen at `46d32d3e`, fingerprint `sha256:6145bd666dd08369ec38b018`,
after the historical arm closed and before any unknown-arm execution.

### Run `w11-unknown-broad-1` — INVALID, preserved not overwritten

Launched through the ordinary product path
(`nightwatch-agent campaign run --reasoner=cli --duration=1h --max-turns=12`).

| Metric | Value |
|---|---:|
| wall time | 748,216 ms |
| investigations started / completed | 1 / 1 |
| reasoner calls | 6 |
| **provider failures** | **6 (all `REASONER_TIMEOUT`)** |
| provider response bytes | 0 |
| tool actions of value | 0 |
| unique targets / candidates / admissions | 0 / 0 / 0 |
| reproduction attempts | 0 |
| dossier status | NONE |
| termination | `BUDGET_EXHAUSTED` |

Every provider call timed out and the provider returned zero bytes. This run
measures provider availability, not yield, and it is NOT reported as a
zero-yield result. It is preserved at
`evidence/unknown-broad-1-FAILED-provider-timeout.json`.

### Root cause: external, and outside Nightwatch

Measured directly after the failure:

| Probe | Result | Elapsed |
|---|---|---:|
| `opencode-go/glm-5.3` (frozen primary) | TIMEOUT | 207.8 s |
| `opencode-go/glm-5.3` (repeat) | TIMEOUT | 208.3 s |
| `opencode-go/glm-5.3-flash` (same namespace) | TIMEOUT | 125.3 s |
| `opencode/nemotron-3.5-lightning-free` (other namespace) | **PROBE_OK** | 14.2 s |

The same provider answered in 13.6 s at M0 preflight and served all 78
historical-arm calls with zero failures. The `opencode-go` SUBSCRIBED namespace
is degraded or quota-exhausted; the free namespace, the CLI and the whole local
stack are healthy. Evidence: `evidence/provider-degradation-probe.json`.

### What was deliberately not done

- Provider and account configuration were NOT modified to force availability.
- The frozen provider was NOT swapped for an available one. Choosing a provider
  after seeing results is exactly what the freeze exists to prevent, and a
  substitution would require a new fingerprint and a full rerun of BOTH arms
  for comparability.
- The frozen reachability threshold was NOT lowered. It requires a passing
  provider structured probe, and that probe currently fails.

### Unintended M8 proof

The failure demonstrated, on live traffic rather than in a fixture, that a
provider timeout does not manufacture progress: 6 timeouts produced 0 actions,
0 targets, 0 hypotheses, 0 candidates, 0 reproductions and `dossierStatus:
NONE`, and the campaign terminated on its budget instead of inventing a result.

## Adversarial and resilience checks (M8)

Evidence: `evidence/adversarial-resilience.json`.

| Check | Result | Evidence |
|---|---|---|
| Changed resume scope | FAIL_CLOSED | `CAMPAIGN_SCOPE_MISMATCH`, exit 2, before any provider call |
| Unsupported repository scope | FAIL_CLOSED | `REAL_SOURCE_SCAN_APPROVED_UNIVERSE` |
| Changed provider identity | FAIL_CLOSED | exit 2, "does not name the frozen model", empty stdout |
| Unconfigured provider | FAIL_CLOSED | exit 2, "refusing to start", empty stdout |
| Changed corpus/scoring fingerprint | GUARDED | freeze fingerprint pinned; frozen EXACT thresholds asserted equal to live constants |
| Candidate without reproduction | REFUSED | 4 of 7 live candidates produced no dossier |
| Provider timeout manufacturing progress | PROVEN_LIVE | 6 timeouts → 0 actions, 0 candidates, `dossierStatus: NONE` |
| Negative control candidate-free | PASS | MISS, 0 candidates, 0 false positives |
| Leakage checker live | PASS | all six hidden fields caught when planted |
| Sibling identity unchanged | PASS | see below |

**Sibling writes: 0, mechanically verified.** All eight admitted repositories
still have `HEAD` equal to their frozen SHAs. W11 began `2026-09-19 00:24`; the
newest sibling content mtime across all eight is `2026-09-18 06:49`
(`mobingilabs/ripple-api`, from the predecessor campaign's authorized
re-derivation), roughly 18 hours BEFORE W11 started. The remaining
uncommitted sibling state dates to 2026-08-06/08 and is pre-existing
owner-local modification, not W11's.

## Defects exposed

One, in W11's own harness, found by reading the arm's own output.

**W11 arm aggregation mislabelled candidates as admissions.** The first
aggregate reported `admissions: 7` against `reproductions: 4`, which is
impossible if admission requires reproduction. The hunt result's `admitted`
field is `candidateIds.length > 0` — a candidate was PROPOSED. The mechanically
admitted artefact is the dossier, and `tryBuildVisibleHuntDossier` /
`tryBuildMinedReplayDossier` both return null below `reproductionCount` 1. The
runner now reports `candidatesProposed`, `mechanicalAdmissions` and
`candidatesRefusedMissingReproduction` separately, and records the
`MISSING_REPRODUCTION` refusal per case. The aggregate was re-derived from the
same preserved per-case evidence; no case was re-run and no provider quota was
re-spent, because only the labelling was wrong, not the observations.

Had it gone unnoticed it would have overstated admitted historical yield by
more than 2x. Nightwatch's own gate behaved correctly throughout: the 4
candidates with no reproduction produced no dossier.

No Nightwatch framework defect was exposed by this arm.

## Group 12

Open. 12.1-12.2 evidenced by M0; 12.3 satisfied by the owner prompt plus this
routed wave. 12.4-12.12 remain open.

## Validation

| Check | Result |
|---|---|
| `npm run typecheck` / `typecheck:bin` | PASS |
| `npm run hardening:check` | PASS |
| `npm run hardening:rules` | 83 rules / 94 probes / 94 detected / 0 undetected |
| `npm run agent:check` | PASS |
| `npm run handoff:check` | PASS |
| `npm run project:check` | PASS |
| `npm run workspace:check` / `session:check` | PASS |
| `npm run validation:universe` | PASS |
| **`npm run gate:local`** | **PASS — all 12 required groups**, `receipt:sha256:8c67ffb13a7920f44cfbd870` |
| **`npm test`** | **5263 passed / 0 failed / 18 skipped** (15.0 min) |
| OpenSpec strict validation | PASS for both changed changes |
| `npm run gate:clean` | see below |

Two gate failures occurred before the green run and both were diagnosed rather
than retried blindly. `semanticCompatibility` and `synthetic-campaign` each
failed by exactly one test that passed in isolation; killing the stale
`opencode` processes left over from the provider probes made both suites green
across repeated runs, so they were host contention. The third,
`nw07ContinuityCoherence`, was a REAL defect in this campaign's own documents
and is fixed — see below.

### `gate:clean` — structurally unavailable while a session is live

The clean lane fails at `HANDOFF_TRUTH` with
`ACTIVE_TASK_SESSION_WORKTREE_MISSING`: `.agent/ACTIVE_TASK.md` declares the live
session worktree, and a pristine clone has no worktree registrations at all, so
the declaration can never be satisfied inside the clone. Reproduced directly
with the clean gate's exact clone shape (`git clone --local --no-hardlinks`
into `/tmp`, checked out `-B main <head>`).

This is the documented closeout order, not a defect: the clean lane belongs
AFTER integration and release, run from the canonical checkout once no session
worktree is declared. It is recorded here rather than claimed.

## Safety

DEV contacts 0, NEXT contacts 0, production contacts 0, sibling writes 0,
leakage 0 (no evaluation run yet), credentials 0, external publications 0,
force pushes 0, destructive operations 0.
