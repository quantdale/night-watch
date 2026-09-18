# Task State

## Identity

Task ID: nightwatch-autonomous-yield-proof-w11-v1
Phase: AUTONOMOUS_YIELD_PROOF_W11_V1
Status: IN_PROGRESS
Starting SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Last validated implementation SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Last substantive checkpoint SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-autonomous-yield-proo-72d452ea
Last checkpoint: M0 preflight COMPLETE and measured. Provider
`opencode-go/glm-5.3` frozen by a rule declared before probing; 8/8 admitted
repositories CURRENT with matching SHAs; 4,124 eligible / 1,120 executable
source files and 152 distinct executable targets; historical corpus is 9
fixture cases (1 negative control) plus 5 strict-EXACT-eligible mined cases.
No evaluation has been run.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
LAST_VALIDATED_IMPLEMENTATION_SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_AUTONOMOUS_YIELD_PROOF_W11_V1_STATUS: IN_PROGRESS

## Objective

Measure, with evidence and without fabrication, whether Nightwatch can achieve
strict historical `EXACT_REDISCOVERY` under leak-free conditions and whether it
can discover and mechanically admit a previously unknown owner-local defect.
Close Production Completion Group 12.

## Current Milestone

Milestone ID: M4
Milestone status: IN_PROGRESS
What is being attempted: freezing the previously-unknown-defect campaign
definition — repository set, SHAs, host-owned scopes, budgets and stopping
condition — at a committed SHA before any unknown-arm execution begins.

## Completed Milestones

- M2 strict historical `EXACT_REDISCOVERY` arm COMPLETE under frozen definition
  `sha256:824deef9922975feab5af69f`. 14/14 cases attempted and evaluated in 66.8
  min over 78 reasoner calls; 0 `ENVIRONMENT_BLOCKED`; 13 substantive scored, 1
  negative control. **EXACT = 0, exact rate 0/13 = 0.00.** 10 near matches, 4
  reproductions, 7 candidates proposed, 3 mechanical admissions, 4 refused
  `MISSING_REPRODUCTION`, 0 false positives, 0 leakage events across 78 audited
  request blobs. Per-case dispositions are in REPORT.md and
  `evidence/historical-arm-result.json`.
- M3 miss analysis COMPLETE. `testMatch` is false in 13/13 substantive cases and
  is the only universally failing condition: 9 cases reached file recall 1.00
  and 5 cleared both recall thresholds, failing EXACT solely on the unnamed
  hidden test. Mechanically established: the hidden `knownFailingTest` appears
  nowhere in the reasoner-visible context for all 8 fixtures (neither name nor
  stem), and for mined cases it is a test ADDED by the fix commit — `git
  diff-tree` shows status `A` for `childbillinggroup_test.go` at `5985281b` and
  `date_test.go` at `2f3b1c34`, so neither exists in the pre-fix tree the
  reasoner inspects. Strict EXACT therefore requires a filename that is not
  derivable from observable evidence under the leak-free conditions the arm
  enforces. Recorded as a measured limit; EXACT was NOT weakened and no near
  match was promoted. Classified as a benchmark-reachability result, not a
  Nightwatch framework defect, and not a model-efficacy repair target.
- M1 evaluation freeze COMPLETE and committed at `eeceec8e`, BEFORE the first
  provider evaluation. `evaluation-freeze.historical.json` fixes provider,
  corpus membership, negative controls, budgets, the unchanged EXACT
  definition, near-match distance, the reproduction requirement, the leakage
  rule, the admission rule and the `ENVIRONMENT_BLOCKED` denominator rule;
  fingerprint `sha256:824deef9922975feab5af69f`.
- M7 leakage-checker canary proof COMPLETE at `92862aca`: all six hidden fields
  are caught when deliberately planted, a multi-field leak reports all six, the
  same blobs without the plant are clean, real fixture visible contexts carry
  none of their own hidden truth, and an empty hidden field manufactures
  neither a false clean nor a false leak. 5 tests PASS.
- M8 (partial) freeze-integrity and arm-refusal proofs COMPLETE at `92862aca`:
  the freeze fingerprint is pinned, the frozen EXACT thresholds are asserted
  equal to the live scoring constants, the case counts must add up, the
  provider selection shape is asserted first-pass (earlier entries ABSENT,
  later entries NOT_PROBED), and the arm runner refuses both an unfrozen model
  and an unconfigured provider with exit 2 before any provider call. 9 tests
  PASS.
- M0 provider/toolchain/repository preflight COMPLETE. Toolchain: Node
  v22.22.1, Go 1.25.3, Git 2.43.0, bubblewrap 0.9.0, opencode CLI 1.18.31.
  Provider selection rule declared before probing; `opencode-go/omen-alpha`
  confirmed ABSENT from the current 341-entry model list; `opencode-go/glm-5.3`
  passed the structured probe at preference #2 (exit 0, 16,281 ms, valid
  `nightwatch.reasoner-turn-response.v1`); preferences #3-#5 deliberately not
  probed. Repository census: 8/8 CURRENT, every live SHA equal to its
  `expectedSourceSha`; 4,124 eligible source files, 1,120 executable, 152
  distinct executable targets, not truncated. Historical corpus: 9 fixture
  cases (`bench-negative-quiet-000` is the negative control) plus 5 mined cases
  carrying both `knownFailingTest` and `minedReplay`.

## Work In Progress

The unknown-yield arm has not been defined or executed. Its definition is being
frozen now, after the historical arm closed, so historical results cannot bias
its scope.

## Exact Next Action

Commit the frozen unknown-yield campaign definition (repository set, SHAs,
host-owned `--repository` scopes, budgets, stopping condition), then execute the
owner-local unknown-yield campaigns through the ordinary
`nightwatch-agent campaign run --reasoner=cli` path (M5).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-autonomous-yield-proof-w11-v1/**` | W11 SPEC/PLAN/STATE/REPORT | CREATED |
| `.agent/ACTIVE_TASK.md` | route the active campaign to W11 | PENDING |
| `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/STATE.md` | record W11 as the active wave | PENDING |
| `openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/**` | W11 OpenSpec change | PENDING |

## Validation Ledger

Command: `node bin/w11-historical-arm.mjs` (frozen historical arm)
Result: COMPLETE — 14/14 evaluated, EXACT 0/13, leakage 0, false positives 0
When: W11 M2
Relevant failure/output summary: no harness failure; one W11 aggregation
labelling defect found and corrected by re-derivation from preserved per-case
evidence.

Command: `npx playwright test tests/unit/w11LeakageCanary.test.ts tests/unit/w11EvaluationFreezeIntegrity.test.ts`
Result: PASS (5 + 9 tests)
When: W11 M7/M8
Relevant failure/output summary: leakage checker proven to fire on all six
hidden fields; freeze bound to live scoring constants; arm refuses an unfrozen
model and an unconfigured provider with exit 2 before any provider call.

Command: `npm run hardening:check` / `npm run hardening:rules` / `npm run validation:universe`
Result: PASS / 83 rules 94 probes 94 detected 0 undetected / PASS
When: W11 M8
Relevant failure/output summary: new suites and bin registered in the
validation universe with the inventory digest advanced.

Command: `npm run session:status`
Result: PASS
When: W11 M0
Relevant failure/output summary: `verdict=PASS`, self class `OWNED_SESSION`,
base CURRENT, canonical safe.

Command: W11 preflight census (repository + reproduction capability)
Result: PASS
When: W11 M0
Relevant failure/output summary: 8/8 repositories CURRENT; 1,120 executable of
4,124 eligible; 152 distinct executable targets; reproduces the W10 M0 figure,
so no regression.

Command: W11 structured reasoner probe via `bin/nightwatch-reasoner-print.mjs`
Result: PASS
When: W11 M0
Relevant failure/output summary: `opencode-go/glm-5.3` exit 0, 16,281 ms,
valid `nightwatch.reasoner-turn-response.v1`, 0 B stderr.

## Decisions Made During This Task

Decision: freeze `opencode-go/glm-5.3` as the primary provider.
Reason: the historical `opencode-go/omen-alpha` no longer exists, and choosing
by observed score would contaminate the evaluation.
Evidence/constraint: a preference list was written down before probing and the
first passing entry was taken; #3-#5 were never probed.

Decision: run the historical arm before the unknown-yield arm.
Reason: it measures investigation quality against known truth before
unknown-source yield can bias interpretation.
Evidence/constraint: W11 execution prompt M2 ordering.

## Discoveries

- **Strict `EXACT_REDISCOVERY` is structurally unreachable under leak-free
  conditions on this corpus.** EXACT requires naming the hidden failing test;
  that filename is absent from the entire reasoner-visible context in all 8
  fixture cases, and for mined cases it is a file the fix commit ADDED, so it
  does not exist at the revision the reasoner inspects. The investigation
  located the right code — file recall 1.00 in 9 of 14 cases — and still could
  not clear EXACT. The metric and the leakage guard are in tension by
  construction.
- W11's own arm aggregation mislabelled proposed candidates as admissions
  (`admitted` on a hunt result means `candidateIds.length > 0`). Corrected
  before publication; the underlying Nightwatch gate was right all along, since
  all 4 candidates lacking reproduction produced no dossier.
- Deterministic reproduction capability is concentrated in exactly ONE of the
  eight admitted repositories (`mobingilabs/ouchan`, 1,120 executable files /
  152 targets). The other seven contribute 0. Investigation breadth is 8
  repositories; execution breadth is 1. Group 12.7's "materially wider slice"
  can therefore be honestly claimed for investigation, not for reproduction.
- The strict-EXACT-eligible real historical corpus is only 5 cases: of 255
  mined records and 234 definable cases, just 5 carry both a non-empty
  `knownFailingTest` and a `minedReplay`. Four are Go (`mobingilabs/ouchan`)
  and one is JavaScript (`mobingilabs/ripple-ui`).

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- DEV/NEXT/production execution, Group 11 DEV semantic acceptance, Phase
  9B/10B, external filing: separately owner-authorized, out of W11.

## Resume Recipe

1. Read SPEC.md, then PLAN.md, then this file.
2. Discover live Git/workspace/session truth; confirm the owned worktree.
3. Do NOT re-run M0 recon; its measurements are recorded above.
4. Continue the Exact Next Action.

## Completion Snapshot

Not complete. W11 is at M1; no evaluation has been run and no yield figure
exists. Do not populate completion evidence until M1-M10 close truthfully.
