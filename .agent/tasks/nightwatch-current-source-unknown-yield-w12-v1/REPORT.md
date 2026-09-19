# W12 — Current-source unknown-defect yield — Report

Status: COMPLETE
The frozen matrix and evidence are closed, governed documentation agrees, and
W12 carries the exact verdict `PARTIAL — BLOCKED`.

## A. BASELINE

- Starting SHA: `4e763f3f079863a262906a8b134539e309c8d054`
- Predecessor: W11 `nightwatch-autonomous-yield-proof-w11-v1`,
  `PARTIAL — BLOCKED`; historical freeze and evidence remain immutable.
- Provider/model: `opencode-go/glm-5.3` through opencode CLI `1.18.31`.
- Toolchain: Node `v22.22.1`, Go `go1.25.3`, Git `2.43.0`, bubblewrap `0.9.0`.
- Exact frozen universe: eight CURRENT repositories at the SHAs in
  `evidence/current-source-census.json`; 4,124 eligible source files, 1,120
  executable files, and 152 executable targets. Census completeness is
  explicitly `TRUNCATED` at the Ouchan source-file bound.
- W11 remains a separate immutable predecessor: historical EXACT `0/13`,
  three mechanical admissions, four `MISSING_REPRODUCTION` refusals, and an
  invalid provider-blocked unknown arm.

## B. EXPERIMENT FREEZE

The predeclared first-pass policy selected `opencode-go/glm-5.3` after one
valid structured probe; later preference entries were not probed. The complete
W12 freeze was committed before investigation at
`dce063d6f52faf2ce87b028afb8702a65e4de422`, with frozen pre-investigation SHA
`05caa0671d95f7a29ea56fb470ec14dfce01fece` and fingerprint
`sha256:8ea18e4fe5e9315271dd55df`. It binds the broad run, all eight scoped
runs, exact repository SHAs, budgets, admission, stopping, safety, leakage,
novelty, and denominator rules.

## C. COVERAGE

The fixed matrix was attempted in order: one broad all-eight run followed by
eight repository-scoped runs. The broad run reached all eight repositories and
produced valid source activity. Scoped runs 01–08 all ended provider-blocked
before source actions; no provider or scope substitution occurred.

| Run class | Planned | Attempted | Valid provider | Provider-blocked |
|---|---:|---:|---:|---:|
| Broad all-eight | 1 | 1 | 1 | 0 |
| Repository-scoped | 8 | 8 | 0 | 8 |
| **Total** | **9** | **9** | **1** | **8** |

The broad run reached 8/8 repositories, inspected 18 unique source paths, and
exposed 32 source entries / 5 executable sources. Scoped source opportunity was
0/8 because the frozen provider failed before source actions.

## D. YIELD

All figures below are derived from the preserved machine receipts in
`evidence/global-yield-aggregation.json`; provider-invalid runs are not
converted into zero-yield observations.

| Metric | W12 value | Denominator / interpretation |
|---|---:|---|
| Investigations started / completed | 11 / 11 | all attempted runs |
| Reasoner calls | 83 | all attempted runs |
| Tool actions | 28 | broad receipt; scoped runs had none |
| Provider failures | 56 | failure receipts only; 23 timeouts, 33 nonzero exits |
| Broad unique inspected source paths | 18 | valid broad run |
| Candidates proposed | 2 (`c1`, `c2`) | candidate population |
| Reproduction attempts / executions | 2 / 2 | candidate reproduction denominator |
| Reproductions qualifying | 0 | 2 attempts, both not reproduced |
| `MISSING_REPRODUCTION` refusals | 2 | candidate population |
| Mechanical admissions | 0 | no dossier/admission synthesized |
| Novelty adjudications | 0 | post-admission only; not applicable |
| Leakage events | 0 | firewall and canary evidence |
| Sibling identity changes | 0 | 9 after-run snapshots unchanged |

Provider response bytes were 16,564 in the valid broad run. Scoped provider
response bytes were 0. Fields not captured by scoped sanitized receipts remain
`NOT_CAPTURED`; they are not silently treated as zero.

## E. FINDINGS

Two broad candidates were mechanically proposed. Both reached the existing
contained reproduction path, both were `NOT_REPRODUCED`, and both were refused
as `MISSING_REPRODUCTION`. No candidate was promoted to a Nightwatch finding,
and no Alphaus organizational novelty claim was made.

## F. ZERO-YIELD INTERPRETATION

The valid broad run contains zero admissions, but the complete current-source
yield question is not certified as a zero-admission result because all eight
required scoped runs were provider-blocked before source activity. Provider
failure is a measurement condition, not a zero-yield denominator; W12 does not
claim that the repositories contain no defects.

## G. DEFECTS FOUND IN NIGHTWATCH ITSELF

No Nightwatch framework defect was exposed by W12 evidence. The W12 freeze
guard received a focused regression test covering all six mutation classes and
widened resume refusal. The committed freeze/runtime provider-failure ceiling
mismatch (`3` frozen supplemental versus `8` existing HOUR_1 runtime) is
preserved as an integrity warning; it was not tuned after results.

## H. PROVIDER HEALTH

The first valid probe selected `opencode-go/glm-5.3`. The broad run returned a
valid structured response but encountered 8 provider failures and terminated at
the existing budget boundary. Every scoped run then failed before a valid
response: runs 01–03 had six runtime timeouts each; runs 04–08 had six nonzero
exits each. The provider remained frozen and no later candidate was selected.

## I. SAFETY

`evidence/final-safety-proof.json` records zero DEV/NEXT/production or
database/data-plane contacts, zero authenticated browser runs, zero sibling
writes/installs/fetches, zero credentials/customer values, zero hidden-truth
leaks, zero issue/PR/publication events, and zero force-push/history-rewrite
events. Provider CLI egress is reported separately and was the only authorized
external egress. All nine after-run identity receipts match the before snapshot.

## J. VALIDATION

Focused W12 integrity validation passed: 2/2 tests in
`tests/unit/w12EvaluationFreezeIntegrity.test.ts`; the W11 leakage canary
passed 5/5; continuity coherence passed 5/5; review-store hardening passed
23/23; typecheck passed; `typecheck:bin` passed in its declared reporting
mode; serial hardening and hardening probes passed; agent, handoff, project,
workspace, session, validation-universe, and strict OpenSpec checks passed.
The direct synthetic campaign passed 1,897/1,897 with
`deepContainmentLane: PROVEN`, and full `npm test` passed 5,265 tests with 0
failures and 18 skips. `gate:local` passed its first nine groups, then timed
out at the fixed ten-minute MEDIUM synthetic-lane bound; its receipt is
`receipt:sha256:c5107a12b6bd0a89263c5c2`. The timeout is classified as a
bounded gate-environment result because the direct synthetic lane and full
regression passed; `gate:clean` is the final lifecycle check.

## K. GIT / C-00

The final task checkpoint is prepared from the owned W12 session
`session/nightwatch-current-source-unknow-75aee275`; its live Git SHA remains
discoverable from Git and is not predicted here. The terminal lifecycle is
fast-forward integration with `HEAD == origin/main`, owned-session release and
removal, followed by the clean-checkout gate. Raw campaign checkpoints remain
owner-local under `/home/dalepalaca/.nightwatch/` and are not committed.

## L. GROUP 12

W11's 12.1–12.6, 12.9, and 12.10 evidence remains historical. W12 reconciles
12.7 as provider-blocked after the broad-plus-eight-scoped attempt, 12.8 with
receipt-derived metrics and explicit missing fields, 12.11 with the bounded
current-state/README publication, and 12.12 through the recorded local
validation plus the terminal C-00 integration, release, cleanup, and clean-gate
lifecycle.

## M. FINAL VERDICT

`PARTIAL — BLOCKED`

The broad run produced a valid measurement, but the eight scoped runs required
for sufficient current-source coverage were provider-blocked before source
actions. The exact unblock condition is a valid structured result from the
frozen `opencode-go/glm-5.3` provider under the already committed policy; a
future retry requires a fresh owner-authorized wave and freeze. This verdict is
not a claim of zero defects, zero current-source yield, or organizational
novelty.
