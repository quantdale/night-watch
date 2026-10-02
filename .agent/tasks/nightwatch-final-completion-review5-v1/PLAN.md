# PLAN — nightwatch-final-completion-review5-v1

## Purpose

Resolve the 18 findings of the independent review-5 (`audit.md`) inside one
bounded child campaign, in two tracks, so the paused parent terminal campaign
`nightwatch-final-product-completion-v1` can resume at M9 task 10.4 on sound
and reachable certification.

## Starting State

Canonical is `d68bb1a7` = `origin/main` (the parent's pause checkpoint, a
documentation-only descendant of `2e0cfda0`, whose exact-head CI run 36916725274
is GREEN 15/15); the parent is paused at M9 task 10.4 (10.2 76/76 and 10.3
COMPLETE), no live parent session; the release verdict is 0/16 conditions met
(certification refused, fail-closed). The review-4 child is closed and
archived. The review-5 findings are recorded verbatim in `audit.md`; the task
groups verbatim in `tasks.md`.

## Scope

Groups A1-A9 (Track A), B1-B6 (Track B) and C (close-out) of `tasks.md`.

## Non-Goals

- No cryptographic receipt authentication (OD-5 declines it).
- No parent milestone work (M9 10.4 onward stays in the parent).
- No parent single-use grant (12.3 paid run, 15.4 npm query).
- No machinery beyond the Producer Matrix and the findings: if Track B cannot
  honestly make all 16 conditions reachable, STOP (exit rule).
- No review-6 by default.

## Safety Constraints

Read-only toward Alphaus repositories and every external system. No secrets,
credentials, customer data or absolute home paths in source, artifacts or
`.agent` files. Only local synthetic fixtures and bounded local child
processes. External contact is GitHub Actions observation and C-00
fast-forward pushes only. Never force-push, never rewrite history, never touch
another owner's worktree.

## Architecture / Approach

Each finding is fixed at its own source and proven twice: by a behavioural
regression test and by registered mutants that are DETECTED by behaviour. One
commit per fix. Track B begins only after the Producer Matrix in `design.md`
is complete and strict-validated; every producer's end-to-end test uses real
producer output; certification is proven from a fixture-repository clean
clone. The child closes only on an observed green exact-head CI at the tip
that contains its close-out.

## Milestones

### M0 — Bootstrap

- Objective: create the bounded child campaign from the parent's pause
  checkpoint `d68bb1a7`.
- Acceptance: the change + continuity v2 + PLAN M0 land as ONE commit (the
  task-ID ledger registration, which must name that commit's SHA, follows in
  the same unpushed batch — D152-5); `openspec validate` strict PASS;
  `agent:check` PASS.
- **Status:** COMPLETE (bootstrap commit)

### MA1 — Archive-move integrity (A1.1)

- Objective: no test or source file can be smuggled through an archive move.
- Files/areas: `bin/lib/checkpoint-role.mjs`, its fixtures and probes.
- **Status:** NOT_STARTED

### MA2 — Deletions (A2.1)

- Objective: `--no-renames` everywhere with a real totality rule.
- **Status:** NOT_STARTED

### MA3 — Receipt verification completeness (A3.1-A3.2)

- Objective: clean emit for every certifying kind; closed subject sets.
- **Status:** NOT_STARTED

### MA4 — Behavioural guard coverage (A4.1-A4.3)

- Objective: R5-05 mutants detected by behaviour; the mutation harness runs in
  `gate:milestone`.
- **Status:** NOT_STARTED

### MA5 — DEV-launcher effect analysis (A5.1)

- Objective: an AST effect scan; all 12 R5-06 mutants detected.
- **Status:** NOT_STARTED

### MA6 — CLI correctness (A6.1-A6.2)

- Objective: the M9 migration regressions fixed; the shared-parser rule is
  behavioural.
- **Status:** NOT_STARTED

### MA7 — CI record truth (A7.1)

- **Status:** NOT_STARTED

### MA8 — Small truths (A8.1-A8.2)

- **Status:** NOT_STARTED

### MA9 — Process and continuity (A9.1-A9.4)

- Objective: claim journal, `npm run prepush`, record corrections, parent
  prose sync; also makes the task-group ledger see letter-prefixed task IDs
  (discovery D-1 in STATE).
- **Status:** NOT_STARTED

### MB1 — Certification Producer Matrix (B1.1)

- Objective: the matrix complete for 16 conditions and 11 lanes, the
  persistence mechanism recorded in D-152, strict-validated; any incomplete
  row is an owner STOP.
- **Status:** NOT_STARTED

### MB2 — Producers (B2.1-B2.2)

- **Status:** NOT_STARTED

### MB3 — Clean-clone verifiability (B3.1)

- **Status:** NOT_STARTED

### MB4 — Yield proof (B4.1)

- **Status:** NOT_STARTED

### MB5 — Topology verdict (B5.1)

- **Status:** NOT_STARTED

### MB6 — Reachability proof (B6.1)

- Objective: fixture end-to-end 16/16 MET, or the exit rule.
- **Status:** NOT_STARTED

### MC — Close-out (C.1-C.4)

- Objective: the full authoritative set, integration, CI observation, release,
  removal, `gate:clean`, REPORT, archival, route back to the parent.
- **Status:** NOT_STARTED

## Validation Strategy

Focused suites plus the registered mutants during implementation;
`npm run prepush` (once A9.2 lands; its components by hand before) before every
push; `gate:dev` and `gate:milestone` at group boundaries; `hardening:rules`
after every guard change (commit the guard first — probe restores discard
uncommitted work); the full authoritative set before integration; exact-head CI
observed at the integrated tip. Never classify a missing, unknown, all-skipped
or zero-executed validation result as PASS.

## Decision Log

- 2026-10-02 — Adopt the owner decision "both" verbatim as D-152 (source:
  `RESUME_PROMPT_5.md`). Track A first; B1 before B2; exit rule; behavioural
  and committed mutation testing; clean-clone-verifiable evidence.
- 2026-10-02 — Per-group design decisions D152-1..D152-5 are recorded in
  `openspec/changes/nightwatch-final-completion-review5-v1/design.md`.

## Discoveries

- D-1 — the task-group ledger and the task-ID ledger match only `N.M` task
  IDs, so this change's `A1.1`/`B1.1`/`C.1` IDs are invisible to both until the
  patterns are extended (landed first under A9.4).

## Deferred Work

(none yet)

## Completion Criteria

See `SPEC.md` "Completion Criteria". All groups ticked, every review-5 finding
dispositioned, gates and CI green, `gate:clean` from canonical with no live
session, REPORT written, change archived with spec sync, ACTIVE_TASK routed
back to the parent at M9 task 10.4 — or BLOCKED by the exit rule.
