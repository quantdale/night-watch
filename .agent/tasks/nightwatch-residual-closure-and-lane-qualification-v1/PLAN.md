# Plan — residual closure and lane qualification

Task ID: nightwatch-residual-closure-and-lane-qualification-v1

## Approach

Order the work so that evidence classes are settled before anything is
documented, and so that the destructive item comes last and behind a flag.
Every milestone validates before the next begins, and each records the exact
command and result rather than a summary adjective.

## Milestones

- **M0 — execution truth** — PENDING. Owned session claimed on a current
  base with workspace verdict PASS; SPEC, PLAN, STATE and the OpenSpec route
  committed; the predecessor re-verified terminal COMPLETE and untouched.
- **M0b — restore the planning-only checkpoint (R-07)** — PENDING. Teach
  project-state truth to assert the predecessor binding for a
  `READY_FOR_EXECUTION` prompt, which is the binding that state actually has,
  rather than the campaign binding the handoff protocol forbids. Keep the
  active-prompt rule unchanged and add a regression for both states.
- **M1 — browser lane qualification (R-01)** — PENDING. Record host
  capability from observed binaries. Execute the lane inside this owned
  session. Record the receipt and update the host-capability lane state to
  the proven class.
- **M2 — CI block observation (R-02)** — PENDING. Record the observed run
  identity, annotation and existing block class in project state. Leave
  `CI_STATUS` non-passing. Name the owner action and revisit condition.
- **M3 — project-state reconciliation (R-03)** — PENDING. Add the
  predecessor closure section in the established shape. Advance the
  validated-SHA fields to a checkpoint whose receipts exist, or record the
  mechanical reason they cannot advance. Prove no historical content changed.
- **M4 — documented surface (R-04)** — PENDING. Document
  `--enable-local-review`, its effect and the review store location. Give the
  phase-14 contract-health check a documented script. Re-check
  definition-of-done item 13 against the command surface.
- **M5 — residue (R-05)** — PENDING. Release the two stale session worktrees
  through the session CLI from the canonical checkout. Remove merged session
  branches. Decide the legacy v1 records: migrate, or declare permanently
  historical so the warning becomes intentional rather than noise.
- **M6 — evidence retention (R-06)** — PENDING. Implement refusal-first
  retention: status by default, removal behind an owner flag, a refusal set
  computed before any removal set, unprovable means refused. Add regressions
  for the refusal set, the owner-flag boundary and the reclaim-nothing case.
- **M7 — certification** — PENDING. Full offline regression, `gate:local`,
  UI typecheck/tests/build, root typecheck, `validation:universe`. Resolve
  every declared lane into one of the three classes. Privacy and diff review,
  continuity update, fast-forward integration, session release.

## Sequencing constraints

- M1 precedes M3, because the closure section must state the lane's proven
  class rather than restate the predecessor's UNAVAILABLE record.
- M2 precedes M3 for the same reason, and because the CI fields live in the
  same document.
- M6 is last before certification. It is the only milestone that can remove
  anything, and it stays behind an explicit owner flag throughout.
- M5's worktree release runs from the canonical checkout, which requires this
  session's tree to be clean at that moment.

## Validation per milestone

Each milestone runs the smallest sufficient check and records the exact
result: `workspace:check` and `agent:check` for M0 and M5; the browser lane
for M1; `project:check` for M2 and M3; `hardening:check` for M4; the new
retention regressions plus `npm test` for M6; the full certification set for
M7. A failure inside scope is repaired before the next milestone starts.

## Rollback

Every change is additive or documentation-shaped except M6's optional
removal, which is owner-gated and never runs during implementation. If a
milestone fails validation and cannot be repaired in scope, the session
branch is left unintegrated and the failure is recorded; no partial state
reaches `main`.
