# EXECUTION PROMPT — Residual Closure and Lane Qualification

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-residual-closure-and-lane-qualification-v1
OpenSpec: openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/
Planned-From: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
Target Branch: main
Predecessor Task ID: nightwatch-repository-hardening-implementation-v1
Predecessor Status: COMPLETE

Task directory: `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

The predecessor campaign closed all fifteen master-plan findings and left
four lanes recorded UNAVAILABLE. Audited against this live host, those four
are not equivalent. One of them already executes and passes here. One has an
observed external cause that project state does not record. Two genuinely
need an owner capability.

Resolve every declared lane into exactly one of `PROVEN`,
`BLOCKED_EXTERNAL` or `UNAVAILABLE_CAPABILITY`; prove what this host can
prove; close the bookkeeping the predecessor deferred; and give evidence
growth a bounded, refusal-first retention policy.

This is a bounded campaign, not a long one. It has no dependency on any owner
capability that is currently absent. Do not stop after recon or one
milestone, and do not let it grow into the yield campaign.

## Read first

1. `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/`
   — `audit.md` first; it holds the measured baseline
2. `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, `.agent/PLANS.md`
4. `docs/HOST-CAPABILITY-MATRIX.md` §4 and §5, then `docs/CI_HARDENING.md`
5. `docs/CURRENT_STATE.md` for the current snapshot, then live
   Git/workspace/session truth

## Re-establish truth before implementation

The audit's numbers are measurements, not permissions. Before implementing,
determine independently: live `HEAD` and `origin/main`; all worktrees,
session claims and C-00 ownership; whether each finding still holds; and
whether the host still provides the capabilities the audit observed.

Where live evidence contradicts the audit, the live evidence wins. Record the
contradiction and its resolution evidence, and preserve the original
rationale.

## Ordered workstreams

Evidence classes settle before anything is documented. The only milestone
that can remove anything comes last, behind an explicit owner flag.

1. **M0 — execution truth.** Owned session on a current base, workspace
   verdict PASS, planning checkpoint committed, predecessor re-verified
   terminal COMPLETE and untouched.
2. **M1 — R-01 browser lane.** Record host capability from observed
   binaries. Execute the lane inside the owned session. Record the receipt
   and update the host-capability lane state to the proven class. A run from
   the canonical checkout does not satisfy this.
3. **M2 — R-02 CI observation.** Record the observed run identity, the
   annotation and the existing `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` class.
   Leave `CI_STATUS` non-passing. Never project execution from a workflow
   parse. Name the owner action and the revisit condition.
4. **M3 — R-03 project state.** Add the predecessor closure section in the
   established shape. Advance the validated-SHA fields to a checkpoint whose
   receipts exist, or record mechanically why they cannot. Prove no
   historical section, receipt or SHA changed.
5. **M4 — R-04 documented surface.** Document `--enable-local-review`, what
   it enables and the owner-local review store location. Give the phase-14
   contract-health check a documented script. Re-check definition-of-done
   item 13.
6. **M5 — R-05 residue.** Release the two stale session worktrees through
   the session CLI from the canonical checkout; both claim terminal-COMPLETE
   tasks, so release is correct and adoption is not. Remove merged session
   branches. Decide the legacy v1 records: migrate, or declare permanently
   historical so the warning becomes intentional.
7. **M6 — R-06 retention.** Refusal-first: status by default, removal behind
   an explicit owner flag, the refusal set computed before any removal set,
   and unprovable reference status meaning refused. Never rewrite, truncate
   or replace an artifact. Regressions for the refusal set, the owner-flag
   boundary and the reclaim-nothing outcome.
8. **M7 — certification.** Full offline regression, `gate:local`, UI
   typecheck/tests/build, root typecheck, `validation:universe`. Every
   declared lane in exactly one class. Privacy and diff review, continuity,
   fast-forward integration, session release.

## Constraints

- LOCAL only. Sibling repositories read-only. No credential, auth state or
  real finding in Git.
- Implementation in the campaign's owned session worktree; the canonical
  checkout stays clean while an owned session is live.
- Additive or behaviour-preserving for valid inputs. Artifacts written by
  earlier schemas must keep reading.
- No stale worktree with a live holder is released, adopted, edited or
  removed. Never create capacity by removing another owner's session.
- No gate weakened, no test deleted or skipped for green output. Skipped,
  unavailable and zero-step never mean PASS.
- Fast-forward compare-and-swap integration only. Never force-push or
  rewrite history.

## Out of scope and unauthorized

```
REAL PRODUCTION CONTACT:            NOT AUTHORIZED
NEXT / DEV EXECUTION:               NOT AUTHORIZED
NETWORK EGRESS / ADVISORY SCAN:     NOT AUTHORIZED
C-12 / C-13 / C-14 LIVE EXECUTION:  NOT AUTHORIZED
C-08b / C-07 DEV:                   NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:    NOT AUTHORIZED
EXTERNAL FILING:                    NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:           NOT AUTHORIZED
SIBLING WRITES:                     NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:       NOT AUTHORIZED
```

Also excluded: reopening NW-01 through NW-15; the real-yield campaign and
strict `EXACT_REDISCOVERY`; splitting the five archive documents; promoting
the 84 `FULL_REGRESSION` suites into the authoritative gate; and clearing the
GitHub billing block, which is an owner action outside this repository.

## Validation

Per milestone, the smallest sufficient check, with the exact command and
result recorded in `STATE.md`: `workspace:check` and `agent:check` for M0 and
M5; the browser lane for M1; `project:check` for M2 and M3;
`hardening:check` for M4; the new retention regressions and `npm test` for
M6; the full certification set for M7.

## Acceptance and completion gates

The campaign is COMPLETE only when every acceptance criterion in `SPEC.md`
is met with evidence, every declared lane resolves to exactly one of the
three classes, no absent run is recorded as a pass, and the certification
checkpoint is integrated by fast-forward with terminal continuity and a
released session.

Completion grants no DEV, NEXT, production, publication or organizational
release authority, and proves neither strict `EXACT_REDISCOVERY` nor
previously-unknown-defect yield.

## Git and reporting

Commit validated work in the owned session with focused messages. Integrate
only by fast-forward compare-and-swap, verify `HEAD == origin/main` after the
push, and leave the tree clean. Record receipts and exact counts in
`STATE.md` as they are produced, never copied from a predecessor. Write
`REPORT.md` at closure with residual work, owner decisions, safety events and
honest limits.
