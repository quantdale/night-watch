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

M0 only: `session:status` PASS.

## Safety

DEV contacts 0, NEXT contacts 0, production contacts 0, sibling writes 0,
leakage 0 (no evaluation run yet), credentials 0, external publications 0,
force pushes 0, destructive operations 0.
