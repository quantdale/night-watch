# Task State

## Identity

Task ID: nightwatch-p1-observation-scope-ma8-v1
Phase: P1_OBSERVATION_SCOPE_MA8_V1
Status: IN_PROGRESS
Starting SHA: 0195a39e60e82b80439ec10ad5a36453804fe030
Last validated implementation SHA: ce166001e8b9721ae169ccabbd5239ef1342a28a
Last substantive checkpoint SHA: ce166001e8b9721ae169ccabbd5239ef1342a28a
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-p1-observation-scope--3bd1d83d
Last checkpoint: NONE — campaign scaffolded; M1 reconciliation recorded below
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0195a39e60e82b80439ec10ad5a36453804fe030
LAST_VALIDATED_IMPLEMENTATION_SHA: ce166001e8b9721ae169ccabbd5239ef1342a28a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ce166001e8b9721ae169ccabbd5239ef1342a28a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_P1_OBSERVATION_SCOPE_MA8_V1_STATUS: IN_PROGRESS

## Objective

Implement and certify the MA-8 / F-13 P1 observation-scope admission
architecture (canonical E-16) with zero real production contact. C-12 is NOT
executed by this campaign.

## Current Milestone

M6 — Hardening and mutation campaign. IN PROGRESS.

## Completed Milestones

- **M1 reconciliation (read-only).** `git fetch`; branch `main`; HEAD ==
  origin/main == `0195a39e60e82b80439ec10ad5a36453804fe030` (matches the
  campaign's expected SHA; no reset performed). `git status` clean. One
  registered worktree (canonical). `session:status` PASS
  (`WORKSPACE_INTEGRITY_SATISFIED`, canonical maintenance, no live owned
  session before start). Recent commits end at `0195a39` (R-13/C-15c docs
  close-out). OpenSpec lifecycle: no open change; prior campaigns COMPLETE.
  ACTIVE_TASK was `nightwatch-overnight-reliability-r13-v1` COMPLETE.
  EXECUTION_PROMPT and PLANNER_HANDOFF are the R-13 COMPLETE records.
  Exact-head CI inspected once: run `33841467907` → conclusion `failure`,
  `runner_id = 0`, empty runner name, zero steps — recorded as
  `EXTERNAL BLOCKER — NO RUNNER / ZERO STEPS`, not a product failure.
  No concurrent active owner conflicts.
- **Repository-native definitions read.** MA-8
  (`PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md:63`), UA-8 (`:86`), F-13
  (`:776-803`), E-16 (`:1345`, canonical — the predecessor label stands),
  C-12 (`:107` — criterion must become "zero requests attributable to
  Nightwatch, every proxy-traversing request counted and attributed"),
  C-11 deferral (`nightwatch-prod-observe-safety-kernel-c11-v1/SPEC.md:31`),
  master-plan `design.md §5.5` (`P1: observe the operator's own already-loaded
  production page; issue no request`) and `§5.6` observer identity.
- **C-11 kernel read in full.** `src/core/prodObserve/` (types,
  productionRunGate, authorization, observationConfig, killSwitch, budget,
  breakers, receipt, index); eighteen-gate request-issuance chain confirmed
  inapplicable to P1 by construction. Scout-mapped consumers: prodPrivacy
  policy/projector, prodEvidence firewall/persistenceAudit, hardening
  `checkC11ProdObserveBoundary`, both manifests, and the R-12 certification
  judgement (`bin/lib/campaign-certification.mjs` — totality rule covers only
  `-(c|r)[0-9]+[a-z]*-v[0-9]+$` ledger tasks; this task id is exempt; adding
  an `MA-8` declaration entry is safe, no exact-set pin exists).
- **Session claimed.** Worktree
  `session/nightwatch-p1-observation-scope--3bd1d83d` at the base SHA;
  SPEC.md (frozen) + PLAN.md written.

## Work In Progress

- M6 hardening rule written and passing; bounded mutation campaign pending.
- M7 full validation, repeatability, clean clone, review, docs, REPORT,
  integration, release.

## Exact Next Action

Run the bounded adversarial mutation campaign (§12 probes): introduce each
mutation, prove the intended verification fails, restore byte-identical,
re-pass. Then M7 full validation.

## Files Changed

Checkpoint `ce16600`: the full campaign-owned set (cone, 7 suites + fixture
support, OpenSpec change, task record, handoff prompt, both manifests,
hardening dispatch). See `git show --stat ce16600`. No sibling writes; no
certified-cone modifications.

## Validation Ledger

Checkpoint `ce16600` (session branch, pre-integration):
`tsc --noEmit` clean; 127/127 P1 focused tests green
(37 admission + 24 config + 20 attribution + 6 privacy + 8 capability +
27 state-machine + 5 mock-subject); `hardening:check` PASS (incl. the new
`checkP1ObservationScopeBoundary`). Full gate, clean clone, and mutation
campaign still pending (M6–M7).

## Check conformance notes (mid-campaign, expected)

- `agent:check` PASS (warnings: legitimate CHECKPOINT_ADVANCE for docs-only
  movement after the implementation checkpoint; 24 legacy v1 tasks
  historical). `handoff:check` PASS. `workspace:check` owned/drift-free.
- `project:check` reports exactly `PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE`
  and nothing else. That is the protocol working, not drift: a campaign that
  changes implementation cannot have a self-consistent baseline until its
  validation anchors advance (CURRENT_STATE design prose). Resolves at M7
  close after `gate:local` + integration.
- C-00 dependency topology: the worktree first shared the canonical install
  via a `node_modules` symlink; the C-00 rule requires a session worktree to
  install its own dependencies, and the symlink also dirtied
  `git status --porcelain`. Replaced with a real `npm ci`; tree clean.
- CURRENT_STATE live block rebound to this campaign
  (IN_PROGRESS/CONTINUE/NONE); EXECUTION_PROMPT rewritten for MA-8.

## Mutation ledger (M6, `/tmp/p1mutate.py` — probes outside the repo)

14 probes, 14 detected, 0 survivors. Each probe: sha256-recorded, exact-string
mutation applied, biting verification run (MUST fail), bytes restored from
backup and hash-compared, verification re-run (MUST pass). Worktree verified
clean (`git status` empty, `git diff HEAD` empty) after the campaign.

| Probe | Mutation | Biting verification |
|---|---|---|
| P1-MUT-01 | remove `P1_HOST_ADMISSION` from the gate list | matrix host case + hardening gate list |
| P1-MUT-02 | host decision allow-all | matrix host case + config suite |
| P1-MUT-03 | UNKNOWN attribution as autonomous | attribution + state-machine suites |
| P1-MUT-04 | planted navigation primitive in session | capability suite + hardening |
| P1-MUT-05 | privacy-capability gate disabled | matrix privacy cases |
| P1-MUT-06 | window expiry disabled | matrix + state-machine window cases |
| P1-MUT-07 | kill switch never engages | admission + lifecycle kill cases |
| P1-MUT-08 | stale authorization accepted | matrix expiry case |
| P1-MUT-09 | consumed grant reusable | double-admit + property cases |
| P1-MUT-10 | wrong implementation SHA permitted | matrix identity case |
| P1-MUT-11 | C-11 executor import into P1 cone | capability suite + hardening reverse rule |
| P1-MUT-12 | denial code duplicated across gates | chain-identity uniqueness |
| P1-MUT-13 | Nightwatch-caused misclassified as preexisting | lifecycle + mock-subject cases |
| P1-MUT-14 | session bounds unenforced | bounds-invalid + hardening bounds rule |


## Decisions Made During This Task

Decision: New sibling cone `src/core/prodObserveP1/`, never inside
`src/core/prodObserve/`.
Reason: C-11's hardening asserts its cone's contents and reverse-isolation;
placing P1 inside would force edits to C-11's boundary. Consumption only.
Evidence/constraint: `checkC11ProdObserveBoundary` reads `src/core/prodObserve/`
exclusively; C-11 STATE §Discoveries (comment-stripping scanner).

Decision: P1 duplicates the grant-registry / config-loader / kill-switch
patterns (~tens of lines each) instead of importing them from `prodObserve`.
Reason: the C-11 reverse-isolation rule fails any non-test file outside the
cone importing `core/prodObserve`; extending its allowlist would weaken a
certified rule. F-12 demands separation in both directions.
Evidence/constraint: scout-extracted reverse rule in `bin/hardening-check.mjs`.

Decision: Declare campaign `MA-8` in `config/campaign-certification.v1.json`
even though this task id is ledger-exempt.
Reason: the declared→registered→exists conjuncts then machine-check P1 suite
registration; the R-12 tests pin no exact campaign set.
Evidence/constraint: `validateCampaignCertification` lines 129-163;
`r12CampaignCertification.test.ts` uses `toContain`/subset assertions.

## Defects found and disposition

| ID | Defect | Disposition |
| --- | --- | --- |
| **DEF-P1-1** (introduced) | `P1_IMPLEMENTATION_IDENTITY` read the config before `P1_CONFIGURATION_INTEGRITY`, making the integrity gate unfalsifiable for null config — the DEF-C11-1 class recurring | CLOSED — integrity precedes identity and window; order hardening-enforced; regression: one-fault matrix |
| **DEF-P1-2** (introduced) | `p1ObserverIdentitySatisfies` accepted any non-`UNKNOWN` runtime value, so an untyped caller passing an out-of-vocabulary identity class would satisfy the minimum by accident | CLOSED (second-pass review) — membership checked first, unknown fails closed; regression: out-of-vocabulary matrix fault |

## Discoveries

- E-16 is canonical repository truth, not a predecessor invention — the
  campaign implements against it directly.
- The master-plan `P1 → P2` gate (`design.md §5.5:275`) still says "zero
  requests issued by Nightwatch"; F-13/C-12-row requires the attributable
  rewording. This campaign implements the corrected criterion in code; the
  historical design text stays historical (reconciled in docs, not rewritten).

## Blockers

None. External prerequisites (operator subject, admitted P1 config, C-08b
facts, runner provisioning) are out-of-scope inputs to a future C-12, not to
this implementation campaign.

## Safety Events

NONE

## Deferred / Follow-Up

- C-12 P1 passive production observation (requires new explicit owner
  authorization after review of this campaign's evidence).
- C-08b, C-07 DEV, C-13/C-14 — all out of scope.

## Resume Recipe

Read SPEC.md, PLAN.md, then this file. Worktree:
`session/nightwatch-p1-observation-scope--3bd1d83d`. Exact next action above.

## Completion Snapshot

Not complete. No implementation, no validation, no integration yet.
