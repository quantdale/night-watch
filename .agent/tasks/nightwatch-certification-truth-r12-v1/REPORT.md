# R-12 Certification Manifest + Project Truth Closure — Report

- Starting SHA: `cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Substantive implementation anchor: `506d64fd878d2d02a7e93b28d8b515ab4fd97691`
- Certified exact-head checkpoint: `5cc783572bf7f943e3168a7ae98c2106ee963cff`, run `33784345028`
- Task objective: make the authoritative gate run every campaign certification
  suite, enforce that as a totality rather than a per-campaign courtesy, and
  reconcile the project-truth documents to the completion the repository
  actually reached.
- Safety events: NONE
- Remaining blockers: none.
- Recommended next phase/task: C-05 universe discovery and admission hygiene.

## The finding

The authoritative gate has eleven required groups. Exactly three execute
tests, and each runs only the suites its versioned manifest names:

| Group | Selector |
|---|---|
| `SEMANTIC_COMPATIBILITY` | `config/semantic-compatibility.v1.json` |
| `OWNER_PROVENANCE` | three suites named literally in `package.json` |
| `SYNTHETIC_CAMPAIGN` | `config/synthetic-campaign.v1.json` |

**No required group runs the full canonical regression.** `npm test` is a
separate human-run observation. So a suite absent from those manifests never
executes in `gate:local`, `gate:clean` or CI, however green it is locally.

238 suites were on disk; 173 were registered; 65 were not. Six of the 65 were
campaign certification suites carrying source-completeness and proof-safety
guarantees the gate had never run:

| Campaign | Suite |
|---|---|
| C-01 | `tests/unit/sourceOperationCompleteness.test.ts` |
| C-01 | `tests/unit/sourceInventoryCompleteness.test.ts` |
| C-01 | `tests/unit/cacheCurrentness.test.ts` |
| C-01 | `tests/unit/callScopedSourceRead.test.ts` |
| C-02a | `tests/unit/c02aOpenApiAdmission.test.ts` |
| C-06 | `tests/unit/c06PhpReadOnlyProof.test.ts` |

C-15b's report named two of these. **The other four are debt this campaign
discovered**, so the recorded debt had understated itself by four suites.

The omission was structural, not clerical. Registration was enforced by
hand-written per-campaign loops in `bin/hardening-check.mjs` — six of them, for
R-11, C-11, C-02b, C-03, C-04 and C-15b. Three campaigns never wrote one, and
nothing detected the absence. A rule each campaign must remember to add is not
a rule.

## What changed

**Registration.** All six suites are registered in `SYNTHETIC_CAMPAIGN`, the
lane every existing campaign certification suite already used. The lane went
from 27 files / 619 cases to **34 files / 738 cases**, so 119 cases that the
gate had never executed now gate every commit.

**One authority.** `config/campaign-certification.v1.json` declares 12
campaigns and 28 suites. One hardening rule enforces three conjuncts:

1. **totality** — every campaign task directory matching the campaign-id
   pattern under `.agent/tasks/` is declared;
2. **existence** — every declared suite exists on disk;
3. **registration** — every declared suite appears in a lane whose gate group
   the gate definition marks `required`.

The lane list is validated against the gate definition's `commandKey`s rather
than taken on the registry's word, so the registry cannot authorise its own
lanes.

**Completeness is anchored to campaign metadata, not filenames.** §17 forbids a
filename-only heuristic where stronger campaign metadata exists. A rule of the
shape "every `tests/unit/c*.test.ts` must be registered" would have missed all
four C-01 suites — none is named `c01*` — and would misfire on unrelated suites
beginning with `c`. The task ledger is a bounded set of eleven directories that
the task protocol already requires a campaign to create.

**The six loops are deleted, not supplemented.** Two authorities for one rule
drift, and that divergence is exactly what produced this debt. Every suite the
retired loops guarded is preserved verbatim in the registry and asserted so by
name. A line-by-line audit of the removals confirmed that only registration
logic was taken out; each campaign's other boundary assertions remain, and all
six boundary functions are still defined and still called.

**The judgement is pure and exhaustively probed.** It lives in
`bin/lib/campaign-certification.mjs` and takes every input as data, so the same
function that enforces the repository is negative-probed on synthetic input by
`tests/unit/r12CampaignCertification.test.ts` — 16 permanent failure-path
cases. A guard whose failure paths are only ever exercised by hand is a guard
nobody knows still works, which is how the original loops rotted.

## Truthfulness of the C-02a registration

C-02a has five `test.describe` blocks. Four are inline-fixture deterministic.
The fifth, "the real committed blueapi artifact", carries
`test.skip(() => !siblingRepoAvailable(...))` at line 313. Registering it is
honest because `bin/campaign-synthetic.mjs` parses `skipped` into its receipt
and fails only on a non-zero Playwright status: a skip is recorded, never
folded into `passed`.

**No deterministic stand-in was fabricated, and no rule was weakened.** C-06
needed no accommodation at all — it builds disposable temporary repositories
and points `createSiblingSourceAccess` at those, never at
`DEFAULT_SIBLING_ROOT`.

## Project-truth reconciliation

Master ledger rows corrected to current normative status, each with its exact
certification evidence, and each preserving what it superseded:

- **C-02b** — DONE. 147 proven RPCs at `blueapi@691422e5`. Its measured
  streaming split (114 unary / 0 client / 33 server / 0 bidirectional)
  **refutes** the row's historical "90 streaming RPCs repo-wide" figure, which
  is preserved as history rather than quietly replaced.
- **C-03** — DONE. 12 proto services bound as `SOURCE_FACT`.
- **C-04** — DONE **with one acceptance figure NOT met and not rounded up**:
  the ≥ 400 edge criterion **FAILS at 382**. The cause is measured — the
  frontend universe is a single admitted repository whose enumeration
  completes, so reaching 400 requires admitting another, which is C-05's work.
  The safety criterion holds exactly: zero `SOURCE_FACT` edges from a
  non-literal path. The residual is carried by C-05, not closed here.
- **C-11** — DONE. Zero real production contact; the eleven gates were
  exercised against mock production only. C-11 grants no production
  observation authority.
- **C-15** — the row stays OPEN because C-15c is genuinely open, but its
  "C-15b graph rebuild remains open" wording is corrected: C-15b is DONE and
  certified, and what C-15b did **not** deliver (HTTP transport for the L1-L4
  projections and server layout) is stated explicitly rather than implied
  finished.

`docs/CURRENT_STATE.md` checkpoint prose was reconciled cell by cell, never
bulk-set. It had named `7879660` / `2a64369` / `3c4756c` with a C-11/R-11
narrative — including a CI anchor describing run `33653818653` as an
`EXECUTED_FAIL` — while the machine block had already advanced to C-15b at
`29a1bbd` / `c770721` with `EXECUTED_PASS`. The
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` row was additionally **malformed**: six
cells in a five-column table, concatenating a C-11 "Why" with a leftover R-11
"Why". The failed run remains a true historical record of how the C-11
sequence terminated and is retained as such; it is simply no longer the current
anchor. The section defining checkpoint ROLES had its "Current value" column
relabelled to the C-11 closure it actually documents, and the roles that are
NOT persisted anchors — live HEAD, documentation descendants — are now defined
explicitly alongside the distinction between validation and certification.

## Defects

**DEF-R12-1 — a hardening rule that had never executed. PRE_EXISTING.**
`checkAgentContinuityIntegrity` was defined in `bin/hardening-check.mjs` and
never called: 50 `check*` functions defined, 49 invoked. It guards that the
continuity checker and the pure protocol module stay read-only, spawn no child
process, reach no network, define the v2 protocol constant, keep `agent:audit`
wired, and keep the documentation-checkpoint allowlist narrow. None of that had
ever been enforced. Found by auditing definition/call parity while retiring the
six registration loops — the same defect class R-12 exists to close: a guard
that looks like coverage and is not. Repair: the call is added. Regression:
probes P11-P13.

**DEF-R12-2 — the revived rule's assertion pointed at the wrong module.
PRE_EXISTING, masked by DEF-R12-1.** It read `bin/agent-state.mjs` and matched
a re-escaped regex-of-a-regex, but the allowlist pattern
`/^docs\/design\/[^/]+\.md$/` had been refactored into
`bin/agent-continuity-protocol.mjs`. Because the rule never ran, the stale
reference stayed invisible; enabling it naively fails on correct code, which is
the likeliest reason someone would disable rather than repair it. Repair: the
assertion is repointed and matches by containment. Its negative half also
required comment stripping — the module's own prose says it is "deliberately
NOT `docs/design/**`", which a raw-text check reads as the very violation it
describes — so `withoutComments` is applied, as elsewhere in that file.

Both are reported rather than hidden because they were fixed.

## Method note

The first canonical regression run was started before the M6 mutation probes
and was still executing while they ran, so the working tree changed underneath
it. That run was **stopped and discarded** rather than reported: a green result
would have been unearned and a red one unattributable. The regression was
re-run against the final, stable tree with no concurrent writes. A discarded
run is evidence about method, not an absence of evidence.

Separately, a `pkill -f "playwright test"` issued to clean up monitoring shells
matched those shells' own command lines and killed a `gate:local` invocation
with them. No repository write was in flight and nothing was corrupted; the
gate was simply re-run from a verified-clean tree. Recorded because a broad
pattern kill is exactly the kind of command this repository's Git-safety rules
exist to discourage.

## Negative probe matrix

13 real-repository mutations, each DETECTED, each restored, tree verified clean
after each:

| # | Mutation | Detected by |
|---|---|---|
| P1 | deregister C-02a from its lane | registration conjunct |
| P2 | deregister C-06 | registration conjunct |
| P3 | deregister C-15b | registration conjunct |
| P4 | deregister a C-11 suite | registration conjunct |
| P5 | delete a declared suite from disk | existence conjunct |
| P6 | drop C-01's campaign entry from the registry | totality conjunct |
| P7 | claim `Status: COMPLETE` on a mid-flight task | `agent:check` `COMPLETE_HAS_WORK_IN_PROGRESS` |
| P8 | point the substantive anchor at an older commit | `agent:check` STALE implementation baseline |
| P9 | project `LIVE_COMPLETION_CLAIM: COMPLETE` while IN_PROGRESS | `project:check` `PROJECT_STATE_LIVE_COMPLETION_CLAIM_MISMATCH` |
| P10 | repoint a lane away from an authoritative manifest | lane-authority conjunct |
| P11 | broaden the checkpoint allowlist to `docs/design/**` | revived `checkAgentContinuityIntegrity` |
| P12 | add a filesystem mutation to the continuity protocol module | revived rule, read-only conjunct |
| P13 | remove the v2 protocol version constant | revived rule |

Plus 16 permanent synthetic failure-path cases in
`tests/unit/r12CampaignCertification.test.ts`, including an empty campaign
ledger (a totality rule over an empty set must fail, never pass vacuously) and
an empty suite set with a declared reason (admissible) versus without one
(rejected).

## Validation

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run hardening:check` | PASS |
| `npm run handoff:check` | PASS |
| `npm run project:check` | PASS, `activeTaskContinuity: PASS` |
| `npm run agent:check` | PASS (2 warnings: `CHECKPOINT_ADVANCE`, legacy v1 tasks) |
| `npm run agent:audit` | tasks=108, strict_v2=84, legacy_v1=24 |
| `npm run workspace:check` | exit 0; owned=true drift=false base=CURRENT canonicalSafe=true attention=0 |
| `npm run gate:inventory` | exit 0 |
| `npm run campaign:synthetic` | 34 files, **738 / 738 / 0 failed**, `deepContainmentLane: PROVEN` |
| `tests/unit/r12CampaignCertification.test.ts` | 32 passed / 0 failed |
| **canonical regression** at `506d64f` | **3,428 total / 3,415 passed / 13 skipped / 0 failed** (baseline 3,396/3,383/13/0 — delta is exactly the 32 new cases; skips unchanged) |
| **`gate:local`** at `506d64f` | **PASS, eleven groups**, LOCAL, Node 22, receipt `receipt:sha256:ec63fe57a093eb63e168ded5` |
| **`gate:clean`** at `f02562d` | **PASS, eleven groups**, Node 20, `siblingWrites: 0`, `cleanBefore/cleanAfter: true`, `nodeModulesReused: false`, inner receipt `receipt:sha256:0efe20276b93f05ebe50ea53`, outer `clean-receipt:sha256:466ca84e35b4d5881a7d76ae` |
| **exact-head CI** at `5cc7835` | **PASS**, run `33784345028` / job `100745379741`, `environmentClass: CI`, Node 20, all eleven required groups, receipt `receipt:sha256:855c3279c6ecb3d30a69ad24` |

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | Six unregistered certification suites execute in an authoritative gate group | PASS | `SYNTHETIC_CAMPAIGN` 738/738 in `gate:local` AND `gate:clean`; the lane grew 619 → 738 |
| 2 | One registration authority; the loops retired | PASS | `config/campaign-certification.v1.json`; six loops deleted; removal audit shows only registration logic removed |
| 3 | Registry totality holds | PASS | three conjuncts in `checkCampaignCertificationRegistry`; probes P5, P6, P10; 16 synthetic failure-path cases |
| 4 | No false CI topology claim | PASS | measured by differencing the CI receipts across the change: `SYNTHETIC_CAMPAIGN` went 619/588/**31 skipped**/0 at `cdfe9d7` to 738/704/**34 skipped**/0 at `5cc7835`. The six suites added +119 total, +116 passed and **exactly +3 skipped** — C-02a's real-source block, which contains exactly 3 `test(` cases. So 116 of 119 newly registered cases genuinely EXECUTE in CI, the 3 that cannot are recorded as skipped rather than passed, and the 31 pre-existing host-capability skips are unchanged |
| 5 | Master ledger status correct; history preserved | PASS | C-02b, C-03, C-04, C-11 rows and the C-15b half of C-15; C-04's 382 shortfall and C-02b's refuted streaming figure both stated |
| 6 | `CURRENT_STATE` prose agrees with the machine block; malformed row repaired | PASS | prose reconciled cell by cell; six-cell row repaired; roles column relabelled historical; drift notes retained |
| 7 | Nine negative probes DETECTED and restored | PASS (exceeded) | 13 real-repository probes, all DETECTED and restored, plus 16 permanent cases |
| 8 | Regression 0 failures; local, clean and exact-head CI PASS; siblingWrites 0; worktree released | PASS | regression 3,428/3,415/13/**0 failed**; `gate:local` PASS; `gate:clean` PASS with `siblingWrites: 0`; exact-head CI PASS at `5cc7835`; session released and worktree removed |

## CI skip accounting

The CI skip count is reported as a DIFFERENCE, not as an absolute, because an
absolute number cannot distinguish a newly registered suite that quietly
declines to run from one that genuinely cannot:

| | total | passed | skipped | failed |
|---|---|---|---|---|
| `cdfe9d7` (pre-R-12) | 619 | 588 | 31 | 0 |
| `5cc7835` (post-R-12) | 738 | 704 | 34 | 0 |
| delta | +119 | **+116** | **+3** | 0 |

The +3 is exactly C-02a's real-source block. The four C-01 suites and C-06
execute fully in CI, which is what registering them was for. The 31
pre-existing skips are host-capability skips and are unchanged; the CI
`deepContainmentLane` is `NOT_EXERCISED_BWRAP_UNAVAILABLE`, which is the
documented and pre-existing runner limitation — the gate requires that lane
`PROVEN` in the `local`, `clean` and `predev` modes, where it is.

Status: COMPLETE
