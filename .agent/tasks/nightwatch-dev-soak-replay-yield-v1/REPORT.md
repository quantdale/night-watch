# DEV Capture Soak, Replay, and Yield — Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-dev-soak-replay-yield-v1
Phase: DEV_SOAK_REPLAY_YIELD_V1
Status: COMPLETE
Project verdict effect: PRESERVE
Starting SHA: 754aa629b4b24bda0eca98fe567cc44ef536e30d
Last validated implementation SHA: fa236b690ceace3a420771645fce9f99bf751ea8
Last documentation checkpoint SHA: d7efa05ea5498b2b4960b4230592787506860e84

## Scope and terminal rule

This was a bounded, serial, read-only DEV soak covering Phase 2C capture,
Phase 4 exploration, Phase 5 API first/fresh-replay behavior, five fresh
Phase 7 campaign prepare/resume pairs, and current-candidate replay/dossier
closure. DVR-011 admission was not weakened. Historical candidates and
predecessor checkpoints were never replayed.

The evidence-backed terminal outcome is
`SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE`: the fresh strict
product-candidate gate emitted candidates, but bounded reproduction budget
prevented attack replay, minimization, and dossier generation.

## Authentication, source, and safety boundary

- M0 DEV preflight resolved the target to `https://appdev.alphaus.cloud/ripple/`
  with the DEV API/auth hosts; production was explicitly denied.
- Owner-managed storage state remained at the external path
  `/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`. No credential bytes,
  cookies, tokens, or raw authenticated evidence entered Git or this report.
- M1 observations with an auth result were `56/56` valid. All five M3
  prepare/resume pairs passed the owner auth boundary; no
  `HUMAN_AUTH_ACTION_REQUIRED` stop occurred.
- Every M1–M3 campaign/checkpoint safety vector was zero. Privacy remained
  `PASS`; no production, proxy, unknown-destination/approval, mutation,
  datastore/database, infrastructure, action-caused-unknown, or publication
  event was recorded.

## Validation and execution ledger

### M0 — readiness

The offline/source gates, continuity/audit, handoff, project truth,
pre-DEV gate, local safety gate, semantic compatibility, owner provenance,
synthetic campaign, and source-gap checks passed before DEV contact. The
pre-DEV gate covered semantic `1,950` total / `1,937` passed / `13` skipped /
`0` failed, owner provenance `91` passed, and synthetic campaign `77` passed.
No executable Nightwatch source was changed for this task.

### M1 — ten independent Phase 2C invocations

Ten serial no-retry launchers produced ten fresh matrices. They reached
`56/60` possible observations and `28/30` possible replay comparisons:

| Measure | Result |
| --- | ---: |
| Evidence PASS | `37/56` |
| Capture COMPLETE | `54/56` (`96.4%`) |
| Observation SETTLED | `50/56` (`89.3%`) |
| `BODY_READ_TIMEOUT` | `2/56` (`3.6%`) |
| `BODY_UNAVAILABLE` | `0` |
| Replay comparison PASS | `18/28` |
| Auth valid / privacy PASS / safety PASS | `56/56` / `56/56` / `56/56` |

The non-pass records were primarily the account `malformed-json` product
oracle, with six settlement timeouts and one bounded capture-defect
classification. Resource accounting reported `11,262` requested,
`10,867` completed, `317` policy-canceled, and `18` HTTP-failed resources.
The focused observer/oracle regression passed `18` tests. Source review found
no Nightwatch-owned Critical/High timeout defect.

### M2 — Phase 4 and Phase 5

Five Phase 4 explorations ran serially. The payer/common subrecords passed
`20/20` across first/replay pairs. The account anchor reached its structural
marker `5/5` and produced the same current product/runtime oracle failure
(`malformed-json`) `5/5`; no framework defect was classified.

Five Phase 5 API cycles completed all six first/fresh-replay operations:
`30` operations, `60` attempts, `60/60` oracle PASS, `60/60` HTTP 2xx, valid
JSON for all responses, and fresh replay lineage for every replay. The API
cycles recorded zero mutation, database, production, proxy, unknown-target,
credential, or customer-value counters.

### M3 — five fresh Phase 7 campaigns

Each campaign used a newly written manifest/checkpoint in a distinct
owner-only `HOME` root (`p7-01-home` through `p7-05-home`). The deterministic
content identity was the same for each current-source manifest:

- source: `fa236b690ceace3a420771645fce9f99bf751ea8`
- campaign: `campaign:sha256:1054b8271440fc29f7fb5f21`
- manifest: `manifest:sha256:154410a95040816ba1b63de0`

The shared identity does not mean a predecessor checkpoint was reused:
the default-store collision was not counted, no existing checkpoint was
resumed or deleted, and each isolated root received its own fresh checkpoint.

Campaign 1 completed the payer work item, then stopped at the common journey
with `PARTIAL_RUNTIME_INFRA_FAILURE / PREFLIGHT_FAILED` and
`SETTLEMENT_TIMEOUT`; account and API work were skipped. Campaigns 2–5
completed all five work items and stopped truthfully at
`PARTIAL_BUDGET_EXHAUSTED / BUDGET_EXHAUSTED`.

Aggregate M3 results:

| Measure | Result |
| --- | ---: |
| Prepare/resume pairs | `5/5` |
| Truthful terminal checkpoints | `5/5` |
| Completed work items | `21/25` (`84%`) |
| Account journey reach | `4/5` (`80%`) |
| Fresh product candidates | `8` across `4/5` full campaigns |
| Stable candidate fingerprints | `2` |
| Reproduction queues | `4`, all blocked before executor entry |
| Attack replay executors | `0` |
| Minimization queue / dossiers | `0` / `0` |
| Safety / privacy | all zero / `PASS` |

The eight candidate records came only from the shared settled,
capture-complete, product-behavior-anomaly gate. They were account
`malformed-json` observations with `reproduced=false`, `minimized=false`,
and missing deployment/datastore evidence that is outside the owner scope.
They remained `PROTOCOL_ONLY / UNRESOLVED`.

### M4 — replay and dossier decision

No stale candidate was resumed. The four fresh full campaigns each queued one
cluster, but the required journeys had already consumed the bounded
`journeyContexts` allowance (`3/3`). Reproduction reservation therefore
failed closed with `BUDGET_EXHAUSTED` before any attack replay callback.
There is no supported real replay-only launcher that can bypass that campaign
budget, so no executor was invented and no completed campaign was retried.

Consequently, candidate-to-replay, candidate-to-minimization, and
candidate-to-dossier yields were all `0/8`. This is not replay starvation:
fresh candidates existed. It is replay-inconclusive because the bounded
per-kind budget prevented the required reproduction step.

## Quantitative diagnosis

The predecessor's final current-source campaign was `BODY_UNAVAILABLE` with
zero candidates and zero dossiers. After DVR-012, M1 recorded zero
`BODY_UNAVAILABLE` outcomes, while `BODY_READ_TIMEOUT` remained at `2/56`;
M2 reached the account marker in all five Phase 4 runs; and M3 reached the
account candidate path in four of five campaigns. This is improved capture
reach, not proof that all settlement instability is eliminated.

The residual result is attributable to two bounded conditions:

1. DEV settlement/capture remains intermittently incomplete (`6/56` M1
   settlements timed out; M3 had one settlement-limited campaign).
2. The real campaign's per-kind `journeyContexts` budget is exhausted by the
   three required journeys before one-cluster reproduction can reserve its
   additional journey/replay budget.

No source repair is justified by this sample. The local timeout regression,
all Phase 4 framework classifications, all Phase 5 API checks, and all
campaign safety/privacy gates passed; the observed account anomaly remains a
product/runtime finding requiring replay evidence that this bounded run could
not obtain.

## Evidence hygiene and cleanup

Only sanitized matrices, manifests, checkpoints, ledgers, briefs, and
aggregate receipts were used for this report. Raw authenticated
`network.jsonl`, `events.jsonl`, `console.jsonl`, and error-context files were
not inspected or copied. Isolated campaign roots and owner findings
directories were mode `700` after validation. Post-soak process health was
`node=4`, `chrome=2`, `playwright=0`, `listeners=5`; no Playwright process
residue remained.

External CI is not claimed as passing. Project-level CI truth remains
`NO_STEPS_EXTERNAL_NON_EVIDENCE`; local validation and the guarded DEV
evidence are the authorities for this task.

## Current closure state

Complete. M0 through M6 are closed. Terminal outcome:
`SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE`. The final local,
continuity, project-truth, synthetic, privacy, and clean-checkout validation
evidence is recorded in STATE.md; external CI remains non-evidence.
