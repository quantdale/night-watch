# W13 — Provider-resilient current-source unknown-defect yield — Report

Status: COMPLETE

The residual register, provider policy, evaluation freeze, run matrix,
mechanical aggregation, advisory novelty adjudication, safety proofs, full
validation, and the C-00 integration/release lifecycle are closed. The
terminal verdict is
`COMPLETE — CURRENT-SOURCE YIELD MEASURED, MECHANICAL ADMISSIONS: 1`.

## A. BASELINE

- Task ID: `nightwatch-provider-resilient-current-yield-w13-v1`
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Predecessor: W12 `nightwatch-current-source-unknown-yield-w12-v1`,
  `PARTIAL — BLOCKED`; W11 `nightwatch-autonomous-yield-proof-w11-v1`,
  `PARTIAL — BLOCKED`. Both remain frozen and unmodified.
- Provider history: generation 1 froze `opencode-go/glm-5.3`
  (policy `sha256:a4865dbb6aea4114bfa8bdc9`); D-140, on owner instruction,
  replaced it with `opencode-go/muse-spark-1.3-contributor` at XHIGH reasoning
  effort after the `opencode-go` namespace degraded (policy generation 2,
  `sha256:1efa45195fc018aa22677336`).
- Toolchain: Node v22.22.1, opencode CLI 1.18.31 `/home/dalepalaca/.opencode/bin/opencode`.
- Universe: eight CURRENT repositories at the frozen SHAs; source inventory
  4,124 admitted files (a FLOOR: Ouchan enumeration is truthfully TRUNCATED at
  the 4,096-file contract ceiling), 1,120 executable files and 152 executable
  targets, all in `mobingilabs/ouchan`.

## B. EXPERIMENT FREEZE

- Provider-resilience policy declared, fingerprinted, and committed BEFORE any
  probe; negative probes cover fixed failure-sequence replay determinism,
  single-field mutation detection, and fail-closed resume (8/8 tests).
- Evaluation freeze committed before the first investigative call
  (`sha256:a520d9630a20a3f67321fbb8` generation 1;
  `sha256:10299c668795e69904f4600b` generation 2 after D-140). It binds the
  9-run matrix (one broad all-eight run plus eight repository-scoped runs in
  registry order; 60-minute broad, 30-minute scoped, Ouchan 60 minutes only
  because the census still proved it the sole deterministic-reproduction
  repository), per-run ceilings, the derived HOUR_1 runtime envelope, admission
  and refusal rules, leakage rules, metric denominators, and exhaustion
  behavior. Five integrity tests cover fourteen mutation classes and
  widened/unknown-resume refusal.
- D-141 re-executed `w13-repository-02/03/04` under the SAME freeze after the
  generation-1 outcomes (engine-truncated provider block for 02/03;
  unobservable source activity for 04 after its checkpoint was deleted on
  `NO_PROGRESS`); every earlier receipt is preserved as a generation snapshot.

## C. COVERAGE

All nine frozen runs executed and are valid under the W13 validity rule (at
least one provider returned positive response bytes and positive source
activity, and the policy was never exhausted):

| Run | Class | Termination | Calls | Failures | Tool actions | Candidates | Admissions | Minutes |
|---|---|---|---:|---:|---:|---:|---:|---:|
| broad all-eight | VALID | BUDGET_EXHAUSTED | 45 | 8 | 35 | 0 | 0 | 45.1 |
| repository-01 blue-sdk-go | VALID | BUDGET_EXHAUSTED | 8 | 6 | 2 | 0 | 0 | 13.2 |
| repository-02 blueapi | VALID | NO_PROGRESS | 48 | 2 | 36 | 0 | 0 | 28.1 |
| repository-03 blueinternal | VALID | NO_PROGRESS | 24 | 0 | 12 | 1 | 0 | 11.6 |
| repository-04 grpc-chunk-parser | VALID | NO_PROGRESS | 24 | 0 | 12 | 1 | 0 | 11.5 |
| repository-05 ouchan | VALID | NO_PROGRESS | 66 | 0 | NOT_CAPTURED (checkpoint deleted; durable count unavailable in that harness revision) | 1 | **1** | 42.1 |
| repository-06 ripple-api | VALID | BUDGET_EXHAUSTED | 54 | 2 | 45 | 1 | 0 | 30.5 |
| repository-07 ripple-ui | VALID | BUDGET_EXHAUSTED | 64 | 0 | 44 | 1 | 0 | 30.7 |
| repository-08 wave-api | VALID | BUDGET_EXHAUSTED | 59 | 2 | 41 | 1 | 0 | 30.3 |

Investigations started/completed: 67/67. Investigation breadth is all eight
repositories; execution breadth remains one repository (`mobingilabs/ouchan`),
exactly as the pre-experiment census predicted.

## D. YIELD

All figures are derived from the preserved machine receipts by
`harness/aggregate-yield.mjs` and validated against the R-06 contract
(completeness PASS, per-provider attribution PASS):
`evidence/global-yield-aggregation.json`.

| Metric | Value | Denominator / semantics |
|---|---:|---|
| Planned / attempted / valid runs | 9 / 9 / 9 | EXACT |
| Provider-blocked runs | 0 | EXACT |
| Investigations started/completed | 67 / 67 | EXACT |
| Reasoner calls | 392 | EXACT |
| Provider failures by class | 8 `PROVIDER_NONZERO_EXIT`, 12 `PROVIDER_RUNTIME_TIMEOUT` | EXACT |
| Provider retries (failed calls) | 20 | EXACT |
| Provider transitions | 2 | EXACT (glm-5.3 → kimi-k3 in generation 1) |
| Tool actions | 227 | FLOOR (observable in 8/9 runs; one run's action log was deleted) |
| Unique inspected source paths | 92 | FLOOR (sum of per-run distinct paths) |
| Hypotheses formed | 15 | FLOOR |
| Reproduction attempts / executions | 15 / 15 | EXACT |
| Qualifying reproductions | 1 | EXACT |
| Candidates proposed | 6 | EXACT |
| Refusals | 2 `MISSING_REPRODUCTION`, 3 `REFUSED_NO_REPRODUCTION` | EXACT |
| Mechanical admissions | **1** | EXACT (`mobingilabs/ouchan`, candidate `c1`, `VERIFIED_REPRODUCTION`, reproductionCount 1) |
| Novelty classes | 1 `NOVELTY_AMBIGUOUS` | post-admission only |
| Leakage events | 0 | firewall + canary |
| Provider response bytes | 142,379 | EXACT |
| Wall time | 14,591,898 ms (4.05 h) | EXACT |
| Termination reasons | 5 `BUDGET_EXHAUSTED`, 4 `NO_PROGRESS` | EXACT |

Per-provider attribution:

| Provider | Calls | Valid responses | Failures | Response bytes |
|---|---:|---:|---|---:|
| `opencode-go/muse-spark-1.3-contributor` (gen 2) | 339 | 333 | 5 nonzero exit, 1 runtime timeout | 119,198 |
| `opencode-go/glm-5.3` (gen 1) | 50 | 39 | 3 nonzero exit, 8 runtime timeout | 23,181 |
| `opencode-go/kimi-k3` (gen 1 failover) | 3 | 0 | 3 runtime timeout | 0 |

`opencode-go/qwen3.8-max`, `opencode-go/minimax-m3`, and
`opencode/nemotron-3.5-lightning-free` were never reached: the engine's shared
`HOUR_1` consecutive-failure ceiling (6) stopped each generation-1 blocked run
after the first transition, before the frozen policy could be exhausted.

## E. FINDINGS

Six candidate lifecycle results reached the unchanged mechanical
reproduction/dossier/admission path. One became a Nightwatch mechanical
admission: `mobingilabs/ouchan`, candidate `c1`, `dossierStatus
VERIFIED_REPRODUCTION`, `reproductionCount 1`, from the run that attempted 11
contained reproductions across 8 distinct executable targets. The other five
were refused (`MISSING_REPRODUCTION` / `REFUSED_NO_REPRODUCTION`); no
reproduction-count requirement was reduced, no evidence reference synthesized,
and no dossier inserted by hand.

Post-admission novelty adjudication is `NOVELTY_AMBIGUOUS`: the admission's
dossier artefact was lost to W13-DEF-01, so no comparison against the frozen
known-defect corpus is claimed. No Alphaus organizational novelty is claimed.

## F. ZERO-YIELD INTERPRETATION

Not applicable as a zero-yield claim: the completed matrix produced one
mechanical admission. Nothing here claims that the repositories contain no
defects, that any candidate is an Alphaus-confirmed bug, or that an unfound
defect is absent. Provider failures (20 across the wave) are reported as a
separate provider-health metric and were never converted into zero yield.

## G. DEFECTS FOUND IN NIGHTWATCH

- **D-138/D-139** (inherited, closed): the frozen supplemental provider-failure
  value (3) disagreed with the enforced HOUR_1 ceiling (8). The engine policy is
  now the single authority; a wave-declared envelope must be derived and is
  validated field-by-field, failing closed with the field names
  (`RUNTIME_BUDGET_ENVELOPE_MISMATCH`) before any provider call.
- **W13-DEF-01** (found by live execution): the run harness did not persist the
  mechanical admission dossier, and the campaign deletes its owner-local
  checkpoint on `NO_PROGRESS`, so run 05's dossier identity was lost. Repaired:
  dossiers are now written owner-locally and their identity recorded in receipts.
- **W13-DEF-02** (found by live execution): a valid run's source activity was
  unobservable downstream because the harness result carried no durable
  tool-action counter. Repaired: `LocalCampaignResult.toolActionCount` is a pure
  mechanical count, regression-covered including the failed-provider case.
- **Engine/policy interaction (measured, not repaired):** the engine's shared
  consecutive-failure ceiling is not reset by a deterministic provider
  transition, so a threshold-3 policy can exercise at most two providers before
  the engine stops a run. This bounded the generation-1 failover chain; it is
  reported for a future owner-authorized wave rather than tuned mid-wave.
- **Observability gaps closed in Phase A:** two-value provider failure taxonomy
  replaced by the ten-member taxonomy with sanitized evidence; aggregate
  completeness and per-provider attribution enforced; TRUNCATED source
  populations can only supply FLOOR denominators; the candidate/admission
  invariant and the failed-provider no-progress guard are mechanically probed.

## H. PROVIDER HEALTH

Generation 1: `opencode-go/glm-5.3` degraded mid-wave (17 failures in 50 calls),
with deterministic failover transitions to `kimi-k3` (3 further failures).
The owner then halted that provider (D-140). Generation 2:
`opencode-go/muse-spark-1.3-contributor` at XHIGH effort carried 333 of 339
calls valid with six failures and zero transitions, across the broad run and
runs 04-08; D-141 re-executed 02/03/04 with the same provider and all three
completed valid. No provider was ever reselected because of an investigative
result.

## I. SAFETY

`evidence/final-safety-proof.json` records zero DEV/NEXT/production contacts,
zero authenticated browser runs, zero database/data-plane operations, zero
cloud/infrastructure operations, zero sibling writes/fetches/installs, zero
credentials or customer values, zero hidden-ground-truth leaks, zero issue/PR
or publication events, and zero force-pushes or history rewrites. All eight
sibling repositories match the frozen SHAs before and after the matrix
(`evidence/sibling-identity-before.json`, `evidence/sibling-identity-after.json`).
Provider CLI egress is reported separately and was the only external egress.

## J. VALIDATION

- Focused W13 suites (seven files: aggregate completeness, evaluation-freeze
  integrity, fake-progress/TEF guard, provider failure taxonomy,
  provider-resilience policy, runtime budget envelope, truncation floor):
  **45 passed / 0 failed**.
- `npm run typecheck`: PASS. `npm run typecheck:bin`: PASS in its declared
  reporting mode (14/71 conforming, 1,342 existing non-conformance
  diagnostics, 0 exemptions — unchanged baseline).
- `npm run hardening:check`: PASS. `npm run hardening:rules`: PASS
  (83 rules / 94 probes / 94 detected / 0 undetected / restored).
- `npm run agent:check`, `npm run handoff:check`, `npm run project:check`,
  `npm run workspace:check`, `npm run session:check`: PASS on the clean
  checkpoint.
- `npm run validation:universe`: PASS. Strict OpenSpec validation
  (`openspec validate --all --strict`): 67 passed / 0 failed.
- `npm test` (full canonical regression): **5,310 passed / 0 failed / 18
  skipped**.
- `npm run gate:local`: **PASS, all twelve groups** (GATE_DEFINITION, STATIC,
  HARDENING, HARDENING_PROBES, HANDOFF_TRUTH, PROJECT_TRUTH,
  AGENT_CONTINUITY, SEMANTIC_COMPATIBILITY, OWNER_PROVENANCE,
  SYNTHETIC_CAMPAIGN, PATCH_INTEGRITY, WORKSPACE_INTEGRITY), receipt
  `receipt:sha256:c8278fdfbcb0723d78c96882`.
- `npm run gate:clean` at the C-00-approved lifecycle point: Node 20,
  install PASS, nine groups PASS (GATE_DEFINITION, STATIC, HARDENING,
  HARDENING_PROBES, HANDOFF_TRUTH, PROJECT_TRUTH, AGENT_CONTINUITY,
  SEMANTIC_COMPATIBILITY 2,114/2,127, OWNER_PROVENANCE 91), then the
  `SYNTHETIC_CAMPAIGN` lane timed out at its fixed 600-second MEDIUM bound in
  two terminal attempts (clean receipts
  `clean-receipt:sha256:c3dee9241e056c82cca810ba`). The timeout is classified
  `EXPECTED_ENVIRONMENT_VARIANCE` exactly as R-02 measured it: the direct
  synthetic campaign passes 1,897/1,897, the same lane passed in the
  twelve-group `gate:local` run at the validated checkpoint
  (`receipt:sha256:c8278fdfbcb0723d78c96882`), and this lane's measured pass
  times on this host span 423-643 s around the 600 s bound under concurrent
  multi-agent load. The bound was not raised; neither clean attempt is
  reported as a green gate.

## K. GIT / C-00

W13 owns `session/nightwatch-provider-resilient-cu-623c6535` from
`34517c9b`. The session was re-claimed with `--adopt` after a host reboot
invalidated the original holder (the documented stale-session path; no other
agent ever shared the worktree). All checkpoints are committed from that
worktree; integration is a fast-forward push of `session/...` to `main` with
`HEAD == origin/main` verified afterwards, followed by release and removal of
the session worktree. Raw campaign checkpoints and admission dossiers remain
owner-local under `/home/dalepalaca/.nightwatch/` and are never committed.
Historical generation receipts (`*.gen1.json`, `*.gen2.json`, plus supervisor
attribution/state snapshots) are preserved in the task evidence and are
excluded from the aggregate by name. `npm run gate:clean` was executed twice
as the terminal clean-checkout gate after the first integration; its classified
lane result is recorded in section J and in
`evidence/gate-clean-receipts.json`.

## L. GROUP 12

W11's 12.1-12.6, 12.9, and 12.10 evidence remains historical. 12.7 is
reconciled by a complete valid nine-run matrix; 12.8 by the receipt-derived
aggregate with explicit floors and `NOT_CAPTURED` reasons; 12.11 by the
governed publication of the W13 result; 12.12 by the terminal local/clean
validation and C-00 lifecycle. The four items are re-annotated from actual
W13 evidence, with predecessor text preserved.

## M. FINAL VERDICT

`COMPLETE — CURRENT-SOURCE YIELD MEASURED, MECHANICAL ADMISSIONS: 1`

This is the complete measured-yield verdict family from the W13 spec with the
admission count substituted for the zero-admission case: all nine frozen runs
are valid under the frozen provider-resilience policy, the policy was never
exhausted, and the matrix produced one mechanical admission (novelty
ambiguous, no organizational claim). It is not a claim of zero defects, not an
Alphaus-confirmed bug, and not a uniform single-generation measurement: the
report states both provider generations and their fingerprints explicitly.
