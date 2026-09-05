# Task State

## Identity

Task ID: nightwatch-reviewer-surface-and-intel-scale-v1
Phase: REVIEWER_SURFACE_AND_INTEL_SCALE_V1
Status: IN_PROGRESS
Starting SHA: 868761d2128d5155db454623bc2fa01622a57d33
Last validated implementation SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
Last substantive checkpoint SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
Last documentation checkpoint SHA: 96b100af42e7335ce39e2652265c458e2210522a
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-reviewer-surface-and--30ec5809
Last checkpoint: M1 COMPLETE and gate-certified — gate:local PASS 11/11 (receipt:sha256:2a2896e1ce24ebc6106d3a02); next M2 reviewer projection
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 868761d2128d5155db454623bc2fa01622a57d33
LAST_VALIDATED_IMPLEMENTATION_SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 882138c40e650b95ff8923b790b4b90c7edefdfa
LAST_DOCUMENTATION_CHECKPOINT_SHA: 96b100af42e7335ce39e2652265c458e2210522a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_REVIEWER_SURFACE_AND_INTEL_SCALE_V1_STATUS: IN_PROGRESS

## Objective

Repair DEF-FC-04 and harden task/continuity metadata against
cross-campaign drift; implement the deferred Control Center reviewer
experience over the certified FC-1 finding intelligence; measure
finding-intelligence cost at 1k/5k/10k and optimize only where measured;
add large-corpus and endurance coverage; re-certify privacy, mutation,
clean gate, regression and deterministic fresh-process evidence; and
reconcile durable documentation. No production, NEXT, DEV, or live C-12
contact.

## Current Milestone

M8 (W7) — durable documentation reconciled. M7's certification evidence is
recorded below; M9 (final certification and REPORT) is next.

## Completed Milestones

- M1 (W0): repository truth, DEF-FC-04 repaired, continuity metadata hardened
  against cross-campaign drift. `inspectActiveTaskRouting()` in
  `bin/agent-state.mjs` binds the routing block's `CAMPAIGN` and
  `SESSION WORKTREE` to the active task identity and its `STATE.md` branch,
  and scans every `session/...` occurrence in the document. The rule runs
  inside `npm run agent:check`, which the required `AGENT_CONTINUITY` gate
  group executes, so it is gate-enforced rather than advisory.
  `npx playwright test tests/unit/activeTaskRoutingBinding.test.ts` → 7 passed;
  `tests/unit/agent-state.test.ts` → 118 passed, including four end-to-end
  probes that the rule is INVOKED, not merely defined. That file is in the
  `semantic-compatibility` lane, so those probes run inside the required
  `SEMANTIC_COMPATIBILITY` gate group.
- M2 (W1): reviewer projection. `src/controlCenter/contracts/reviewer.ts`
  (epistemic-class contract), `src/controlCenter/adapters/reviewerAdapter.ts`
  (the projection), `src/controlCenter/authorities/reviewerAuthority.ts`
  (findings snapshot → real cone calls), route `/api/v1/reviewer` through the
  router, collector, server and default collector, and RS-1 hardening.
  `npx playwright test tests/unit/reviewerProjection.test.ts` → 22 passed.
- M3 (W2): the Control Center reviewer view. `ui/control-center/src/types.ts`
  (view definition + reviewer types), `api.ts` (`loadReviewer`), `App.tsx`
  (`ReviewerView`, `EpistemicBadge`, `ReviewerElementCell`). The badge renders
  the server's `epistemicClass` as TEXT, not colour alone, and the UI computes
  no class of its own. `control-center:ui:test` → 14 passed;
  `control-center:ui:browser` → 2 passed against the freshly built bundle.
- M4 (W3): finding-intelligence scale measured. `bin/finding-intel-scale.mjs`
  (`npm run intel:scale`) compiles `tests/unit/findingIntelScaleProbe.ts` and
  runs it in ONE FRESH PROCESS PER SIZE, so no size's warm JIT flatters the
  next. Measured on Node 22, budget 240 s. Numbers in `## Measured scale
  envelope` below.

## Work In Progress

M4. Finding-intelligence scale measurement at 1k / 5k / 10k.

Closed in M1:

M1. Repository truth established:

- HEAD == origin/main == `868761d2128d5155db454623bc2fa01622a57d33`,
  canonical checkout clean, single worktree before session start.
- Predecessor `nightwatch-frontier-completion-reliability-v1` is
  COMPLETE/STOP, validated implementation `8265ace`, as its records claim.
- `npm run agent:check` PASS with 2 known warnings (CHECKPOINT_ADVANCE,
  LEGACY_TASK_NOT_STRICTLY_VALIDATED).
- Owned session worktree `session/nightwatch-reviewer-surface-and--30ec5809`
  created from `868761d` and claimed; fresh `npm ci` exit 0.

DEF-FC-04 proven mechanically, not asserted:

- `git show 48c0a60:.agent/ACTIVE_TASK.md` — the `## Routing and safety`
  block was authored for `nightwatch-plan-explain-coherence-v1`:
  "IMPLEMENTATION AUTHORIZED: one focused coherence test file only", and
  names worktree `session/nightwatch-plan-explain-coherenc-faaf601a`.
- `git show 0c5cb42:.agent/ACTIVE_TASK.md` — FC-1 opened. The identity
  fields were rewritten to FC-1; the routing block is byte-identical to
  48c0a60's.
- `git show 868761d:.agent/ACTIVE_TASK.md` — FC-1 closed with the same
  stale block still in place.
- FC-1's own `.agent/EXECUTION_PROMPT.md` authorized source, tests,
  schemas, contracts, CLI, reviewer surfaces, documentation, commits,
  pushes and clean-clone certification, and FC-1's `STATE.md` records
  branch `session/nightwatch-frontier-completion-r-9e1b3a60`. So an entire
  campaign ran with an active-task routing block that named a retired
  worktree and authorized almost none of what the campaign did.
- `npm run agent:check` returns PASS on that document. Continuity v2
  validates the structured fields and the cross-file status machine; the
  routing block is unstructured prose no rule reads. The routing block is
  what an agent consults to decide what it may write, so this is an
  authority defect, not a cosmetic one.

## Measured scale envelope (M4, before optimization)

Node 22, fresh process per size, deterministic synthetic corpus (~1 in 20
findings shares an earlier fingerprint, 1 in 10 has none, contract identities
repeat over a bounded set).

| Stage | 1,000 | 5,000 | 10,000 | 1k→5k | 5k→10k | Class |
|---|---|---|---|---|---|---|
| `PAIRWISE_RELATIONSHIPS` | 1,815 ms | 44,562 ms | 177,910 ms | x24.55 | x3.99 | QUADRATIC |
| `RECURRENCE_AGAINST_HISTORY` | 318 ms | 7,580 ms | 30,167 ms | x23.87 | x3.98 | QUADRATIC |
| `DEFECT_CLASS_GROUPING` | 1.8 ms | 5.0 ms | 7.1 ms | x2.84 | x1.42 | LINEAR |
| `REVIEWER_AUTHORITY_AND_PROJECTION` | 1,739 ms | 7,689 ms | 30,264 ms | x4.42 | x3.94 | mixed |

CPU tracks wall closely throughout (194 s CPU against 178 s wall at the 10k
pairwise stage): this is compute, not waiting. Peak RSS stays modest — 58 MiB
at 1k rising to 119 MiB at 10k on the reviewer path — so memory is not the
constraint at these sizes. Latency is.

What the numbers actually say:

- Exhaustive pairwise classification is quadratic, confirmed rather than
  assumed: 49,995,000 pairs at 10k, ~3.6 µs each. The threshold for a
  one-second interactive budget is about 280,000 pairs, i.e. ~750 findings.
  The reviewer authority's default `pairwiseLimit` of 2000 was set before any
  measurement and is wrong: 2,000 findings is ~2M pairs ≈ 7.2 s.
- Recurrence is also quadratic, and not because of the classification: the
  cone re-validates and re-sorts the entire history on every call, so a corpus
  of n costs O(n²) validation.
- `REVIEWER_AUTHORITY_AND_PROJECTION` looks LINEAR from 1k→5k only because the
  2000-finding pairwise limit switches pairwise OFF above it. Its 5k→10k
  quadratic is recurrence alone. A limit that changes the shape of a
  measurement is a good reason to read the stages separately rather than trust
  a single end-to-end number.
- Defect-class grouping is linear and costs 7 ms at 10k. It is explicitly NOT
  optimized: nothing in the measurement justifies touching it.

## Certification evidence (M7)

Privacy red team. Sentinel categories planted and rejected across every free
field of the reviewer projection — `findingId`, the Alphaus team name and
every basis field — for `CUSTOMER_SENTINEL`, `ACCOUNT_SENTINEL`,
`EMAIL_SENTINEL`, `COST_SENTINEL`, `TOKEN_SENTINEL`, `Bearer` tokens,
JWT-shaped values, AWS-shaped keys and email addresses. The error path is
treated as a privacy surface in its own right: every rejection is asserted to
name the field and never to echo the value. At volume, the 1,000 / 5,000 /
10,000 payloads are scanned for the same categories.

Mutation campaign, reversible, one at a time, restore verified byte-identical:

```text
introduced: 20
detected:   18
equivalent:  2  (M06, M09 — with evidence, see below)
survived:    0
restore drift: 0
```

Categories: epistemic classification, review authority, privacy, truncation
truth, page-scoping equivalence, recurrence history, the pairwise limit, the
AH-1 vocabulary duplicate, the continuity routing rule, and the UI's textual
labelling.

M02 was a genuine gap and is now closed. The existing test asserted only that
an UNKNOWN relationship projects a null value, which holds whether the
contradiction is rejected or silently swallowed — UNKNOWN has no value either
way. An UNKNOWN arriving WITH an advisory pointer is a contradiction in the
input, and dropping it quietly would hide an upstream defect.

M06 and M09 are recorded as EQUIVALENT MUTANTS with evidence rather than
pretended killed: deleting either guard leaves the same rejection with the
same field name, because `safeCode`/`safeId` reject null on that field anyway.
The guards are kept because they state the rule where it applies and would
become load-bearing if those helpers loosened.

Determinism: `node bin/frontier-determinism.mjs 20` → 1 unique semantic digest
across 20 fresh processes (`eea1586a11254ac5f9fb231a...`).

## Large-corpus and endurance evidence (M6)

`tests/unit/reviewerLargeCorpus.test.ts` drives the whole served path —
authority, projection, loopback server, HTTP, JSON — against 1,000 / 5,000 /
10,000 findings, with identifiers reversed so the first page is the NEWEST
findings.

| Check | Result |
|---|---|
| Bounded page over 1,000 / 5,000 / 10,000 | 200, 50 rows, `truncated: true`, cursor present |
| End-to-end HTTP latency at 10,000 | 512 ms for the whole test including server start |
| Epistemic class present on every element, at every size | holds |
| Sentinel screen at volume | no sentinel in any payload |
| Above the pairwise limit | every relationship UNKNOWN with `RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT` |
| Byte-identical across three repeated requests at 5,000 | holds |
| Endurance: 200 consecutive requests over 5,000 findings | 200/200 identical bodies; latency drift and retained heap growth both inside bound |
| Control Center browser lane, 30 consecutive iterations | 30 pass / 0 fail |

The latency bound in that suite is deliberately loose against the measured
359 ms worst case and tight enough that the pre-M5 30 s behaviour could not
pass. A tight bound would be a flake generator, and a flake that gets retried
away is worse than no bound. No retry was added anywhere.

## Measured scale envelope (M5, after optimization)

Same harness, same corpus, same three sizes, fresh process each.

| Stage | 1,000 | 5,000 | 10,000 | Class |
|---|---|---|---|---|
| `PAIRWISE_RELATIONSHIPS` (raw cone) | 1,948 ms | 45,583 ms | 179,539 ms | QUADRATIC |
| `RECURRENCE_AGAINST_HISTORY` (raw cone) | 316 ms | 7,495 ms | 30,466 ms | QUADRATIC |
| `DEFECT_CLASS_GROUPING` (raw cone) | 1.7 ms | 3.8 ms | 7.2 ms | LINEAR |
| `REVIEWER_AUTHORITY_AND_PROJECTION` (served page) | 13.3 ms | 16.7 ms | 26.0 ms | LINEAR |
| `REVIEWER_WORST_CASE_PAGE` (newest 50) | 149.1 ms | 171.0 ms | 359.5 ms | LINEAR |

The three raw-cone stages are unchanged, and that is the control: the cones
themselves were not modified, so the improvement is entirely in what the
served path asks of them. The served path went from 30,264 ms to 26.0 ms at
10,000 findings — 1,164x — and from QUADRATIC to LINEAR. Peak RSS on that
path fell from 118.6 MiB to 98.8 MiB.

`REVIEWER_WORST_CASE_PAGE` exists because the first re-measurement was
flattering itself: identifier order matched chronological order, so the first
page selected the OLDEST findings, which have almost nothing to compare
against. With identifiers reversed the page is the newest fifty — the page a
reviewer actually opens — and costs 359.5 ms at 10,000 findings. Honest
worst-case improvement against the pre-optimization number: 84x.

The `pairwiseLimit` default moved 2000 → 2500 on measurement, not intuition:
at exactly 2,500 findings, with pairwise ON, the worst-case page measures
384.5 ms wall / 441.3 ms CPU — inside a one-second interactive budget with
margin. Above the limit, relationships report UNKNOWN with
`RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT`, which is why the 10,000
worst case (359.5 ms) is cheaper than the 2,500 one (384.5 ms): different work,
truthfully labelled, not a faster answer to the same question.

### What was deliberately NOT optimized

- `groupDefectClasses`: linear, 7.2 ms at 10,000 findings. Nothing justifies
  touching it.
- A shared-key index over relationship candidates, which was the obvious first
  idea. `evidenceFor` counts `SAME_REPLAY_OUTCOME` as evidence, and
  `replayOutcome` has three values, so nearly every pair shares a key and the
  index would exclude almost nothing. Rejected on the classifier's own rules
  rather than after building it.
- The cones' own quadratic complexity. The served path no longer reaches it,
  and changing certified cone internals for a path that no longer stresses
  them would be a change without a measurement behind it.

## Blockers

(none)

## Exact Next Action

M9 (W8): run the authoritative full regression and `gate:local` on the
committed tree, run `gate:clean` on a fresh `npm ci`, fill the completion
snapshot and `REPORT.md`, then STOP before any live C-12 / DEV / NEXT /
production work.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | campaign rebind; DEF-FC-04 routing-block repair | Modified |
| `AGENTS.md` | routing-block binding rule documented under continuity v2 | Modified |
| `bin/agent-state.mjs` | `inspectActiveTaskRouting()` + live invocation | Modified |
| `bin/agent-state.d.mts` | declaration for the new export | Modified |
| `tests/unit/activeTaskRoutingBinding.test.ts` | DEF-FC-04 regression, bound to real history | Added |
| `tests/unit/agent-state.test.ts` | fixture routing block + 4 end-to-end invocation probes | Modified |
| `tests/unit/projectState.test.ts` | fixture routing block | Modified |
| `tests/unit/plannerHandoff.test.ts` | fixture routing block | Modified |
| `docs/CURRENT_STATE.md` | live-state rebind and checkpoint anchors | Modified |
| `src/controlCenter/contracts/reviewer.ts` | reviewer contract with epistemic classes | Added |
| `src/controlCenter/adapters/reviewerAdapter.ts` | the projection | Added |
| `src/controlCenter/authorities/reviewerAuthority.ts` | findings snapshot → real cone calls | Added |
| `src/controlCenter/server/{router,collector,server,defaultCollector}.ts` | `/api/v1/reviewer` | Modified |
| `bin/hardening-check.mjs` | RS-1 reviewer-surface rule | Modified |
| `config/semantic-compatibility.v1.json` | both new suites registered in a required lane | Modified |
| `tests/unit/reviewerProjection.test.ts` | M2 regression | Added |
| `ui/control-center/src/{types,api,App}.tsx?` | reviewer view | Modified |
| `ui/control-center/src/App.test.tsx` | reviewer view tests; nav count | Modified |
| `tests/browser/controlCenterBrowser.browser.ts` | reviewer coverage + view totality | Modified |
| `bin/finding-intel-scale.mjs` | fresh-process scale harness | Added |
| `tests/unit/findingIntelScaleProbe.ts` | deterministic scale probe | Added |
| `package.json` | `intel:scale` script | Modified |
| `src/controlCenter/authorities/reviewerAuthority.ts` | page-scoped intelligence; measured `pairwiseLimit` | Modified |
| `src/controlCenter/adapters/reviewerAdapter.ts` | `total`, truthful truncation | Modified |
| `tests/unit/reviewerLargeCorpus.test.ts` | large-corpus + endurance | Added |
| `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` | RS-1 records and the measured envelope | Modified |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff | Modified |
| `.agent/tasks/nightwatch-reviewer-surface-and-intel-scale-v1/**` | campaign records | Added |
| `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/**` | OpenSpec change | Added |

## Validation Ledger

| Check | Result |
|---|---|
| `git rev-parse HEAD origin/main` | both `868761d`, clean |
| `npm run session:status` (canonical, pre-start) | PASS, single worktree |
| `npm run agent:check` (at `868761d`) | PASS + 2 known warnings — the DEF-FC-04 evidence |
| `npm run handoff:check` (planning artifacts staged) | PASS |
| `npm ci` (session worktree, fresh) | exit 0 |
| `node bin/nightwatch-session.mjs claim` | SESSION_CLAIMED, class OWNED_SESSION |
| `inspectActiveTaskRouting` vs `868761d` + FC-1 `STATE.md` | FOREIGN_WORKTREE_REFERENCE raised on the real drifted document |
| `inspectActiveTaskRouting` vs `48c0a60`, `0c5cb42`, `868761d` | all fail closed (CAMPAIGN_MISSING + SESSION_WORKTREE_MISSING) |
| `npx playwright test tests/unit/activeTaskRoutingBinding.test.ts` | 7 passed |
| `npx playwright test tests/unit/agent-state.test.ts` | 118 passed (114 pre-existing + 4 new invocation probes) |
| `npx playwright test tests/unit/projectState.test.ts` | 64 passed |
| `npx playwright test tests/unit/plannerHandoff.test.ts` | 12 passed |
| `npm run test:semantic-compat` | 2037 / 2024 passed / 13 skipped / 0 failed — PASS (FC-1 baseline 2033/2020/13/0) |
| `npm run gate:local` (committed tree, M1) | PASS 11/11, receipt:sha256:2a2896e1ce24ebc6106d3a02 |
| M1 integrated | origin/main 96b100a; implementation anchor 882138c |
| `npx playwright test tests/unit/reviewerProjection.test.ts` | 22 passed |
| RS-1 hardening branch probes | 6/6 fire (severity drift, authority literal, advisory-guard totality, sentinel screen, UNKNOWN pointer, final verdict authority) |
| `npm run test:semantic-compat` (M2) | 2066 / 2053 passed / 13 skipped / 0 failed — PASS, 148 files |
| `npm run control-center:ui:typecheck` | clean |
| `npm run control-center:ui:test` | 14 passed |
| `npm run control-center:ui:browser` | 2 passed (fresh build, 287,658 bytes, no external references) |
| `npm run intel:scale 1000,5000,10000 --budget-ms 240000` (M4, before) | completed at all three sizes |
| `npm run intel:scale 1000,5000,10000 --budget-ms 240000` (M5, after) | served path 30,264 ms → 26.0 ms at 10k; worst-case page 359.5 ms |
| `npm run intel:scale 1000,2500` (at the pairwise limit) | worst-case page 384.5 ms wall / 441.3 ms CPU |
| `npx playwright test tests/unit/reviewerProjection.test.ts` (M5) | 27 passed, including paged-vs-exhaustive byte equality at 5 page sizes |
| `npx playwright test tests/unit/reviewerLargeCorpus.test.ts` | 6 passed (35.8 s), endurance 200/200 |
| Control Center browser lane x30 | 30 pass / 0 fail |
| Mutation campaign (20 reversible) | 18 detected, 2 equivalent with evidence, 0 survivors, 0 restore drift |
| `node bin/frontier-determinism.mjs 20` | PASS, 1 unique digest across 20 fresh processes |
| `npx playwright test` (full regression) | 3944 total / 3931 passed / 13 skipped / 0 failed (9.5 m) |
| RS-1 scale-probe purity probe | fires on `Math.random` in the probe |
| `npm run typecheck` | clean |
| `npm run hardening:check` | PASS |
| `npm run agent:check` (repaired document) | PASS + 2 known warnings |
| `npm run project:check` | PASS once committed (dirty-tree code only, pre-commit) |

## Decisions Made During This Task

- D-REV-1: `DEF-FC-04` is allocated for the cross-campaign routing-block
  drift. `DEF-FC-01..03` were taken by FC-1 and no `DEF-FC-04` existed in
  the repository before this campaign; the identifier enters durable
  records, so the allocation is recorded rather than assumed.
- D-REV-2: the routing block is made structured (`CAMPAIGN`,
  `SESSION WORKTREE`) rather than left as prose, because a checker cannot
  bind what it cannot parse, and prose is what drifted.

## Discoveries

- The browser lane said "all seven built Control Center views" while nine
  existed: it had kept passing through two view additions because the count
  was in the test NAME, not in an assertion. It is now a totality check over
  the live navigation, and it proved itself immediately by failing on the
  overview `#` href.
- The intelligence cones emit PROSE evidence (`RECURRENT` evidence strings,
  `mechanicalEvidence`, `counterexamples`) written for the human filing
  report. Unbounded free text must not cross onto the public surface, so the
  reviewer projection derives categorical basis codes from the same results
  instead of forwarding the prose. Discovered by five test failures, not by
  reading.
- `bin/project-state-check.mjs` and `bin/planner-handoff-check.mjs` both run
  `bin/agent-state.mjs` as a subprocess, so one new continuity rule reaches
  three suites, not one: `agent-state.test.ts` (65 failures), then
  `projectState.test.ts` and `plannerHandoff.test.ts` (26). The blast radius of
  an `agent:check` addition is wider than the file it lives in.
- The first RS-1 advisory-guard rule was DEAD: two projection functions carry
  the guard, so `includes(literal)` stayed satisfied when one was deleted.
  Replaced by a totality relation — emitted `advisoryOnly: true` values must
  equal guarded inputs. Every one of the six RS-1 branches is now probed by
  deliberate mutation, because a hardening rule that cannot fail proves
  nothing.
- `project:check` requires `.agent/EXECUTION_PROMPT.md` `Status` and
  `Campaign ID` to match the active task, so the `READY_FOR_EXECUTION`
  planning-only checkpoint described in `.agent/PLANNER_HANDOFF.md` would
  fail `project:check` if committed on its own. Every campaign in the
  recorded history instead opens with the prompt and `ACTIVE_TASK.md`
  moving to `IN_PROGRESS` in the same commit. This campaign follows the
  mechanically enforced route, and the contradiction is recorded for M8.

## Safety Events

One workspace-integrity event, detected by the repository's own check and
repaired; no data, privacy, or authority consequence.

- 2026-09-05, M9. `npm run agent:check` failed with ten
  `WORKSPACE_EXCLUDE_DRIFT` errors: ten `**/.claude/...` patterns had been
  written into the SHARED `$GIT_COMMON_DIR/info/exclude`, which C-00
  requires to hold zero effective patterns because it is common to every
  worktree and is never private per-session scratch state.
- Cause: an agent-harness `ScheduleWakeup` call during this session. The
  harness initialized its scheduled-task machinery, wrote its runtime
  paths into the shared exclude, and created
  `.claude/scheduled_tasks.lock` in the canonical checkout. Not a campaign
  change and not a repository decision.
- Repair: the shared exclude was restored to the stock comment-only git
  template and the stale lock file removed. The patterns were deliberately
  NOT migrated into the tracked `.gitignore`: whether the repository
  ignores harness runtime state is a repository decision, and encoding a
  tooling side effect as policy would be the wrong resolution.
- Verification: `npm run agent:check` returns to PASS with its three known
  warnings; `WORKSPACE_EXCLUDE_POLICY` is green.
- Worth noting for the next session: the C-00 shared-exclude invariant is
  load-bearing precisely because an external tool can write there without
  the repository noticing. It noticed.

No production, NEXT, DEV, or live C-12 contact. No credential
access. No sibling-repository write. No force push. No history rewrite.

## Deferred / Follow-Up

- `.agent/PLANNER_HANDOFF.md`'s `READY_FOR_EXECUTION` lifecycle contradicts
  `project:check`'s execution-prompt binding rule (see Discoveries).
  Reconcile in M8 rather than mid-campaign.

## Resume Recipe

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-reviewer-surface-and--30ec5809`
2. `node bin/nightwatch-session.mjs claim --task nightwatch-reviewer-surface-and-intel-scale-v1 --adopt`
3. Read this `STATE.md`, then `PLAN.md` for the current milestone.
4. Continue from `## Exact Next Action`.

## Completion Snapshot

(filled at close)
