# Task State

## Identity

Task ID: nightwatch-c10-provenance-truth-closure-v1
Phase: C10_PROVENANCE_TRUTH_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
Branch: session/nightwatch-c10-provenance-truth--ba3470bc
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
LAST_VALIDATED_IMPLEMENTATION_SHA: c763c056d306172df3c03c03781f5ec5516944e9
LAST_SUBSTANTIVE_CHECKPOINT_SHA: c763c056d306172df3c03c03781f5ec5516944e9
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_C10_PROVENANCE_TRUTH_CLOSURE_V1_STATUS: IN_PROGRESS

## Objective

Bind the C-10 production privacy vocabularies mechanically to genuine source
evidence, and reconcile repository project-state truth, so C-11 `PROD_OBSERVE`
may rely on C-10 as a real prerequisite rather than on a self-asserted
provenance label.

## Current Milestone

M11 — validation complete; integration and exact-head CI remain.

## Verified Starting Truth

Discovered independently before any file was modified:

| Fact | Verified value | How |
| --- | --- | --- |
| Repository | `quantdale/night-watch` | `git remote -v` |
| `origin/main` | `cb631cc4af3c3572f4cbf78da04a8265075fbfa5` | `git fetch` + `rev-parse` |
| Local HEAD | identical to `origin/main`; tree clean | `git status --porcelain` empty |
| Worktrees | canonical only, on `main` | `git worktree list` |
| Prior active task | `nightwatch-production-privacy-firewall-c10-v1`, COMPLETE | `.agent/ACTIVE_TASK.md` |
| C-10 substantive implementation | `23523cc743c77b2250738caa980c218dab8671bb` | ancestor of HEAD |
| Final exact-head CI | run `33601265465` at `cb631cc`, `success` | GitHub API, read-only |
| Final exact-head job | `100155266632` "Executable quality gate", `success` | GitHub API, read-only |
| Node major | 20 | gate receipt in run log |
| Required groups | all eleven PASS | gate receipt in run log |
| `SYNTHETIC_CAMPAIGN` | 221 total / 221 passed / 0 failed | gate receipt |
| Receipt digest | `receipt:sha256:f38b272bec3a37464257e194` | gate receipt |

The prompt's §0 expectations matched reality exactly. No rebase of the campaign
plan was required.

### Delta against repository documents

Two repository documents were BEHIND this verified truth at campaign start,
which is the A9/A11 defect this campaign repairs:

- `.agent/ACTIVE_TASK.md` named run `33600603779` / job `100153229914` at
  `1234daf` with receipt `receipt:sha256:aecae84fb070b89734a6efc0` — a real
  but superseded run.
- `docs/CURRENT_STATE.md` named run `33590645175` / job `100123768379` at
  `b99ce4e` with receipt `receipt:sha256:120582acb7bb971190a3a05d`, and held
  all five live anchors at `b99ce4e`.

`b99ce4e`, `23523cc` and `1234daf` are all ancestors of `cb631cc`, so the
staleness is ancestor substitution rather than divergence — precisely the class
A10 must learn to detect.

## Completed Milestones

- M0 — campaign records and OpenSpec change created; `ACTIVE_TASK`,
  `EXECUTION_PROMPT` and the `CURRENT_STATE` live-state block routed to this
  task. `handoff:check` PASS, `agent:check` PASS, `project:check` PASS.
- M1 — A2 reproduction recorded in `audit.md` with captured output, then
  retained as the forgery-resistance assertions rather than deleted.
- M2 — A3/A7 authority core: `ValidatedSourceEvidence`, the deterministic
  length-prefixed binding encoder, the computed-digest mint with NO digest
  parameter, and the module-private `WeakSet` runtime brand.
- M3 — A4 route derivation: the OpenAPI-operation adapter over C-02a evidence,
  and the PHP adapter failing closed because C-06 admits no production route.
- M4 — A5 key derivation: OpenAPI-definition, PHP row-key and fixed-contract
  adapters; the label-accepting constructors withdrawn; TEST-ONLY seam added.
- M5 — A6 forgery-resistance suite, 32 tests covering all eleven adversarial
  classes.
- M6 — A8 isolation: cone import profile retained (`node:crypto` only) and the
  mint's importer set mechanically bounded, both negative-probed.
- M7 — A9 `CURRENT_STATE` reconciliation with per-field semantics stated.
- M8 — A10 validator repair plus the eight adversarial cases.
- M9 — A11/A12 certification and digest-semantics reconciliation, history
  preserved as history.
- M10 — A13 inventory-driven persisted-position coverage, negative-probed.
- M11 — A14 validation: full set green (see ledger).

## Work In Progress

M11 — validation is complete and green (see the ledger). Remaining: integrate
the session branch through the C-00 tooling, obtain an exact-head GitHub
Actions result with all eleven required groups PASS, set the CI anchors from
that run, and close the A15 gate.

## Exact Next Action

Integrate the session branch `session/nightwatch-c10-provenance-truth--ba3470bc`
into `main` through `node bin/nightwatch-session.mjs integrate`, push, then
identify the exact-head GitHub Actions run at the resulting `origin/main` and
confirm all eleven required groups PASS. Then set `CI_OBSERVED_SHA`,
`CI_EXECUTED_SHA` and `CI_STATUS` in `docs/CURRENT_STATE.md` from that run, and
evaluate the A15 gate item by item.

## Files Changed

| Path | Change |
| --- | --- |
| `.agent/ACTIVE_TASK.md` | routed to this campaign |
| `.agent/EXECUTION_PROMPT.md` | rewritten for this campaign, `Planned-From: cb631cc` |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/SPEC.md` | new |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/PLAN.md` | new |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/STATE.md` | new |
| `.agent/tasks/nightwatch-c10-provenance-truth-closure-v1/REPORT.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/audit.md` | new, carries the recorded A2 reproduction |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/proposal.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/design.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/tasks.md` | new |
| `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/specs/production-provenance-authority/spec.md` | new |

## Validation Ledger

All results recorded from actual runs in the session worktree. The substantive
implementation is `c763c056d306172df3c03c03781f5ec5516944e9` (the DEF-C105-1
repair); the gates executed at `93d15b3`, whose only difference from it is
approved documentation.

| Check | Result | Detail |
| --- | --- | --- |
| Git/CI starting-truth verification | PASS | read-only; every §0 expectation confirmed |
| A2 forgery reproduction | REPRODUCED | four distinct failures captured in `audit.md` |
| `typecheck` | PASS | exit 0 |
| `hardening:check` | PASS | offline structural invariants hold |
| `handoff:check` | PASS | — |
| `project:check` | PASS | — |
| `agent:check` | PASS | 2 warnings (checkpoint advance, 24 historical legacy v1 tasks) |
| `agent:audit` | PASS | 101 tasks, 77 strict v2, `strict_errors=0` |
| `gate:inventory` | PASS | 11 logical groups, 0 duplicate test-file executions |
| `test:semantic-compat` | PASS | 1,975 total / 1,962 passed / 13 skipped / 0 failed |
| `campaign:synthetic` | PASS | 16 files, 256 total / 256 passed / 0 failed, `deepContainmentLane: PROVEN` locally |
| C-10 privacy suites | PASS | `c10ProductionProjection` + `c10AcceptanceSuite` green after authority rewiring |
| C-10.5 provenance suite | PASS | `c105ProvenanceAuthority` 34/34 |
| C-10.5 persisted-position suite | PASS | `c105PersistedFieldCoverage` 14/14 |
| Project-state validator suites | PASS | `projectState` + `agent-state` 52 tests, including the 8 A10 cases |
| Full canonical regression | PASS | 2,975 total / 2,962 passed / 13 skipped / 0 failed |
| `gate:local` | PASS | Node 22, all eleven groups, `receipt:sha256:50f85aa10248ac17323c9290` at `93d15b3` |
| `gate:clean` | PASS | Node 20, all eleven groups, `siblingWrites: 0`, `clean-receipt:sha256:ed216b4c47ec9247d6507a40` (inner gate `receipt:sha256:8ebb52eacf14b0da3b36ca9b`) at `93d15b3` |
| Exact-head GitHub Actions | PENDING | run after integration to `main` |

### Negative probes (proving the new gates bite rather than pass vacuously)

| Probe | Expected | Observed |
| --- | --- | --- |
| A module outside `src/core/prodProvenance/**` imports the mint | FAIL | FAIL — "only src/core/prodProvenance/** may mint production authority" |
| Production code imports the TEST-ONLY seam | FAIL | FAIL — "only tests/** may import it" |
| A new free-form persisted field `operatorNote` with no declared disposition | FAIL | FAIL — inventory totality diff |
| The A10 invariant against the live stale baseline | FAIL | FAIL — `PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE` and `PROJECT_STATE_CI_BASELINE_STALE` |

| A module removes the key-vocabulary guard call site | FAIL | FAIL — "dead-guard regression" |

### C-10.5 dedicated test total

56 tests: 34 provenance authority + 14 persisted-position coverage + 8
project-state A10 cases.

### Defect found in this campaign's own implementation

**DEF-C105-1 — key-vocabulary authority guard was dead code.**
`assertProductionKeyVocabularyAuthority` was written and exported but never
called. The route side was wired into `assertSourceProvenRoute` and pinned by a
hardening rule; the key side was not. Reproduced before repair: a TEST_ONLY key
vocabulary is genuinely minted, so it satisfied `isSourceProvenKey` membership,
and an arbitrary key literal reached persisted evidence through
`provenFields[].name` — the F-14 position. Repaired by wiring the guard into
`toProductionEvidence`, adding two hardening rules (guard exists; call site
exists) and a regression test with a PRODUCTION-marked counter-case. The
dead-guard rule was negative-probed. Disposition: CLOSED.

A second review finding was coverage rather than a defect: the A13 tamper set
declared `keyProvenance`, `vocabularyProvenanceClass` and
`routeProvenanceClass` as CLOSED_VOCABULARY but planted no sentinel in them —
the DEF-C10-5 shape recurring inside the coverage suite. All three are in fact
rejected by the firewall; they are now planted, and a new test asserts the
tamper set is TOTAL over string-capable evidence-root positions.

## Decisions Made During This Task

- **Verify §0 before trusting it.** The prompt's CI expectations disagreed with
  both `ACTIVE_TASK.md` and the `CURRENT_STATE` narrative. Resolved read-only
  through the GitHub API: run `33601265465` / job `100155266632` at `cb631cc`
  with receipt `receipt:sha256:f38b272bec3a37464257e194` is real and green, so
  the prompt is correct and both repository documents are behind. A9 and A11
  therefore transcribe verified values, and the two stale documents are the
  defect rather than the prompt.
- **Runtime brand over type brand.** A6 requires that serialized JSON cannot
  become a trusted capability by matching shape. `Object.freeze` plus shape
  validation — all C-10 had — cannot express that, and a TypeScript brand is
  erased at runtime. A module-private `WeakSet` keyed on object identity is
  pure, so it is cone-legal, and it fails closed across any serialization
  boundary.
- **No digest parameter at all.** Validating a supplied digest against a
  recomputation only proves internal consistency: a caller who supplies both
  members and digest supplies a self-consistent pair. The mint therefore
  exposes no digest parameter, making the forgery inexpressible rather than
  merely detectable.

## Discoveries

- The A2 weakness is real and wider than the brief assumed: there is no
  non-test producer of either vocabulary anywhere in `src/` or `bin/`, so every
  `SOURCE_PROVEN_*` claim in the shipped system originated from a test fixture.
  C-10 built and tested the consumption side of the boundary; the minting side
  was never built.
- `routeVocabulary.ts`'s own header asserts that "the provenance digest binds
  this set to that source". No code performed that binding — the comment
  described an intent the implementation never had, which is plausibly how the
  gap survived review.
- The `CURRENT_STATE` drift is broader than the five fields A9 names: the
  "Exact-head CI is green" narrative section also still described run
  `33590645175` at `b99ce4e`.
- `node:crypto` is already the one node builtin the C-10 cone may import, so
  computing provenance identity inside the cone is legal under the existing
  Workstream E isolation rule and needs no gate change.

## Blockers

None.

## Safety Events

None. Safety ledger:

| Item | Value |
| --- | --- |
| Real production contact | 0 |
| Real DEV contact | 0 |
| Real NEXT contact | 0 |
| Credential / auth-state inspection | 0 |
| Sibling repository writes | 0 |
| External publication | 0 |
| Real customer identifiers used | 0 (synthetic sentinels only) |
| Implementation in canonical checkout | 0 |

## Deferred / Follow-Up

C-11 `PROD_OBSERVE` (Stage B) is deliberately not started in this task and is
hard-gated behind the Stage-A completion gate.

## Resume Recipe

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-c10-provenance-truth--ba3470bc`
2. `node bin/nightwatch-session.mjs status` — confirm the session worktree is
   owned and the canonical checkout is untouched.
3. Read this file's `## Exact Next Action`, then `PLAN.md` `## Milestones` for
   the first non-terminal milestone.
4. Implement → validate → record results here → advance.

## Completion Snapshot

Not complete. Stage A is complete only when every item of the A15 gate holds;
if any item fails, Stage A is reported incomplete and C-11 is not started.
