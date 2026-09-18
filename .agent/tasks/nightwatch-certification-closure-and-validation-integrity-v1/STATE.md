# Task State

## Identity

Task ID: nightwatch-certification-closure-and-validation-integrity-v1
Phase: CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1
Status: IN_PROGRESS
Starting SHA: 521210f706b9383e20dd08d1bfd2f3c47b34687d
Branch: session/nightwatch-certification-closure-1f9ce403
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 521210f706b9383e20dd08d1bfd2f3c47b34687d
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1_STATUS: IN_PROGRESS

## Objective

Remove the blockers and validation blind spots left after G16.9 and the
Control Center design-system campaign, then certify truthfully. Full intent in
`SPEC.md`; execution order in `PLAN.md`.

## Current Milestone

Milestone ID: B — `hardening:rules` becomes gate-authoritative
Milestone status: IN_PROGRESS
What is being attempted: repair the rotted HC-015 probe and the rot class
behind it, then add a required `HARDENING_PROBES` gate group between
`HARDENING` and `HANDOFF_TRUTH` through the gate-definition machinery.

## Completed Milestones

- **A COMPLETE_LOCAL — session `--dry-run` contract.** Root cause: `--dry-run`
  is a single global boolean (`parseArgs`, default at `:544`, set at `:559`)
  that exactly ONE command read — `commandIntegrate` at `:422`. `start`,
  `claim`, `release`, `reconcile` and `remove` all mutate and silently ignored
  it; `release` did not even receive `options` (the dispatcher called
  `commandRelease(context)`). `integrate` honoured it only AFTER a fetch that
  writes the remote-tracking refs, so even the one supported case was not a
  zero-mutation dry run.

  Fix: a declared `DRY_RUN_SUPPORT` table covering every dispatchable command,
  enforced at dispatch. The five mutating commands gained true zero-mutation
  plan reports; `integrate`'s guard moved ABOVE the fetch; `status`/`check`
  now REFUSE the flag (`SESSION_DRY_RUN_NOT_APPLICABLE`, exit 2) rather than
  accepting it as a silent no-op. `start` returns at the last instruction
  boundary that has mutated nothing — after every refusal and after the whole
  plan is computed, before `fs.mkdirSync`.

  Two real defects found while proving it:
  1. An explicit `--base` was never verified, so a dry run answered "this
     start could proceed" for a base that would make the real start fail at
     `git worktree add` — after creating the parent directory. Now
     `SESSION_BASE_INVALID` fails closed before the first mutation.
  2. `withoutComments()` in `bin/lib/hardening/kernel.mjs` strips block
     comments BEFORE line comments, so a `//` comment containing `/*` opens a
     phantom block comment that DELETES real code from the view every
     `read()`-based rule sees. Three C-00 rules failed loudly on my own
     comments containing `refs/remotes/**`. The dangerous direction is the
     silent one: a fail-if-present rule goes vacuous over the deleted span.
     Recorded here and carried into milestone C for repair with a probe.

  Proof: `tests/unit/workspaceIsolation.test.ts` gained NW-07, 13 cases, each
  asserting a full topology snapshot (worktree list, every ref, branch tips,
  HEAD, symref, status, index, the shared `worktrees/` tree, `info/exclude`,
  `hooks`, and the target path) byte-identical across the dry run. Cases cover
  clean admission, at-capacity refusal, invalid base, occupied path, invalid
  and valid fault-injection tokens, unsafe workspace, repetition, capacity
  non-consumption, the full mutating lifecycle, read-only refusal, help-text
  truth, and contract totality over `COMMANDS`. Negative probe: reintroducing
  the defect fails 5 of the 13, including the capacity case that is the exact
  recorded failure mode. 67/67 in the file pass; `typecheck`, `typecheck:bin`
  and `hardening:check` PASS. No session artefact leaked: the tests run against
  disposable fixtures under the test's own temporary directory.

## Measured Baseline

Recorded at `521210f7` before any change (see `PLAN.md` for the full list):

- `hardening:rules` exits 1 — `rules=83 probes=90 detected=89 undetected=1
  restored=80 statusUnchanged=true`; HC-015 UNDETECTED.
- Sibling `ripple-api` HEAD `4e3e200db3bda7b58bc250feb7f76997d95ae2cc`;
  `27bb007a` is a clean ancestor, 31 commits back.
- Of the four admitted recipes' source files, `ExchangeRate.php`,
  `Account.php` and `BillingGroup.php` are BYTE-IDENTICAL across the two SHAs
  (blobs `636415c3`, `357b1403`, `27df7526`). Only `Routing.yaml` changed, by
  +7 lines, and the change touches only the `password` anchor and the
  `updateUserPassword` route — none of the four admitted routes.

## Blockers

- NONE currently.

## Safety Events

- NONE. No production, DEV or NEXT contact; no network egress; no credentials;
  no sibling write. Sibling `ripple-api` read with `rev-parse`, `cat-file`,
  `diff` and `status` only; its pre-existing untracked `AGENTS.md` was observed
  and left exactly as found.

## Exact Next Action

Repair probe HC-015 and the active-task indirection class behind it, then wire
`hardening:rules` into the authoritative gate as a required `HARDENING_PROBES`
group between `HARDENING` and `HANDOFF_TRUTH`.

## Resume Recipe

1. Read `SPEC.md`, then `PLAN.md`, then this file.
2. `npm run session:status`; this session is
   `nightwatch-certification-closure-1f9ce403`. Adopt it if stale
   (`claim --task nightwatch-certification-closure-and-validation-integrity-v1 --adopt`).
3. Commit before running `hardening:rules`: the probe campaign restores files
   from disk and would discard uncommitted work, including a guard under test.
4. Continue the Exact Next Action. Owner-gated programme items stay OPEN.

## Work In Progress

Milestone B: repairing probe HC-015 and the active-task indirection class
behind it, then adding the required `HARDENING_PROBES` gate group.

## Files Changed

- `bin/nightwatch-session.mjs` — `DRY_RUN_SUPPORT` table, dispatch guard, plan
  emitters, zero-mutation dry-run branches for the five mutating commands,
  `integrate`'s guard moved above the fetch, explicit `--base` verification,
  truthful help text.
- `tests/unit/workspaceIsolation.test.ts` — NW-07, 13 cases.
- `.agent/ACTIVE_TASK.md`, this task directory, the OpenSpec change.

## Validation Ledger

- `tests/unit/workspaceIsolation.test.ts` — 67/67 PASS (NW-07: 13/13).
- NW-07 negative probe — 5/13 FAIL with the defect reintroduced, as required.
- `npm run typecheck` — PASS.
- `npm run typecheck:bin` — PASS (conformance 14/70, REPORTING mode).
- `npm run hardening:check` — PASS, 83 rules.
- `npm run hardening:rules` — RED at base (HC-015 UNDETECTED); milestone B.

## Decisions Made During This Task

- Read-only commands refuse `--dry-run` instead of accepting it silently.
- The dry-run plan names its candidate session name as a CANDIDATE, because the
  name carries four random bytes and a real start draws a fresh suffix.

## Discoveries

- Recorded in `## Measured Baseline` above and in `PLAN.md ## Discoveries`.

## Deferred / Follow-Up

- Owner-gated production-completion items stay OPEN.

## Completion Snapshot

Not yet complete. Filled at closure.
