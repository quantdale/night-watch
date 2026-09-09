# Plan — residual closure and lane qualification

Task ID: nightwatch-residual-closure-and-lane-qualification-v1

## Purpose

Resolve every declared validation lane into an honest class, prove the ones
this host can prove, close the bookkeeping the predecessor campaign deferred,
and bound the growth of local evidence — without reopening any closed finding
and without weakening a gate to produce green output.

## Starting State

- Starting SHA `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142`; planning checkpoint
  integrated at `a180a081d92f32a75fd26909d6e3362459cea990`.
- Predecessor `nightwatch-repository-hardening-implementation-v1` is terminal
  COMPLETE with NW-01 through NW-15 CLOSED.
- Live audit at the starting SHA is recorded in the OpenSpec `audit.md`:
  typecheck, hardening, handoff, project, workspace PASS; `agent:check` PASS
  with 4 warnings; `validation:universe` 427 discovered / 0 unclassified.
- The browser workflow lane passed 4/0 in 3.8 minutes from the canonical
  checkout — evidence without an owning session, so not yet a receipt.
- CI has never executed: all 100 most recent runs failed in about three
  seconds with a payment/spending-limit annotation and no step started.
- R-07 was discovered while landing this campaign's own planning checkpoint.

## Scope

R-01 browser lane qualification and receipt. R-02 CI block observation.
R-03 project-state reconciliation. R-04 shipped-surface documentation.
R-05 worktree and legacy-record residue. R-06 refusal-first evidence
retention. R-07 the planning-only handoff checkpoint.

## Non-Goals

- Reopening NW-01 through NW-15 or re-deriving their acceptance evidence.
- The real-yield campaign, strict `EXACT_REDISCOVERY` and
  previously-unknown-defect yield.
- Splitting the five append-heavy archive documents.
- Promoting the 84 `FULL_REGRESSION` suites into the authoritative gate.
- Any network egress, including an online dependency-advisory scan.
- Clearing the GitHub billing block, which is an owner action.
- DEV, NEXT, production, cloud, datastore, external filing, publication, and
  the owner-run manual and live-app harnesses.

## Safety Constraints

- LOCAL only; sibling repositories read-only; no credential, auth state or
  real finding in Git.
- Implementation in this campaign's owned session worktree; the canonical
  checkout stays clean while an owned session is live.
- Retention never rewrites, truncates or replaces an artifact, and refuses
  anything it cannot prove unreferenced.
- No stale worktree with a live holder is released, adopted, edited or
  removed; capacity is never created by removing another owner's session.
- No gate weakened, no test deleted or skipped for green output.
- Fast-forward compare-and-swap integration only; never force-push.

## Architecture / Approach

Lane state becomes three-valued — `PROVEN`, `BLOCKED_EXTERNAL`,
`UNAVAILABLE_CAPABILITY` — because the predecessor's single UNAVAILABLE
conflated an absent host capability with an authority the campaign did not
hold. A `PROVEN` lane must carry a receipt from an owning session, so a
canonical-checkout run never satisfies it.

R-07 is repaired by modelling the binding the planning state actually has
rather than by relaxing a comparison: a `READY_FOR_EXECUTION` prompt carries
its predecessor explicitly, so project-state truth asserts that binding and
leaves the active-prompt rule untouched. No error vocabulary changes.

Retention is refusal-first: the refusal set is computed before any removal
set, reporting is the default mode, removal is owner-gated, and an artifact
whose reference status cannot be proven is refused rather than removed.

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

## Validation Strategy

Each milestone runs the smallest sufficient check and records the exact
result: `workspace:check` and `agent:check` for M0 and M5; the browser lane
for M1; `project:check` for M2 and M3; `hardening:check` for M4; the new
retention regressions plus `npm test` for M6; the full certification set for
M7. A failure inside scope is repaired before the next milestone starts.

## Decision Log

Decision: classify lanes three ways rather than available/unavailable.
Reason: the predecessor's UNAVAILABLE conflated a missing host capability with
an authority it did not hold, and one such lane in fact passes here.

Decision: a lane result from the canonical checkout is evidence, never a
receipt.
Reason: C-00 makes the canonical checkout a non-implementation worktree.

Decision: repair R-07 by asserting the predecessor binding.
Reason: the planning state has a real binding to check, so the guard should
model it rather than be exempted from checking anything.

Decision: land the planning checkpoint as documentation only, before the R-07
source repair.
Reason: `STALE_IMPLEMENTATION_BASELINE` correctly refuses source changes while
a terminal predecessor is still the active task.

Decision: exclude the real-yield campaign.
Reason: it depends on provider capability this campaign does not establish and
would make a bounded closure campaign unbounded.

## Discoveries

- The browser workflow lane executes and passes on this host; its UNAVAILABLE
  record reflected untested host qualification, not a failure.
- The CI block has an observed, non-code cause and the repository already
  defines the class for it but records no observed instance.
- `docs/CURRENT_STATE.md` has no closure section for the predecessor campaign.
- `README.md` never mentions the shipped `--enable-local-review` capability.
- `artifacts/` growth is unbounded at 13,367 directories and 915 MB.
- R-07: the documented planning-only handoff checkpoint cannot land, because
  two individually correct guards together forbid it.

## Deferred Work

- The real-yield campaign, gated on confirmed provider capability.
- The online dependency-advisory lane, gated on authorized network egress.
- Exact-checkpoint CI execution, gated on the owner clearing the billing
  block.
- The 12 `MANUAL_OWNER` and 6 `LIVE_APP_SMOKE` lanes, gated on DEV
  authentication and separate authorization.
- Splitting the five archive documents and promoting the 84
  `FULL_REGRESSION` suites, both with the predecessor's recorded reasons.

## Completion Criteria

Every acceptance criterion in `SPEC.md` met with evidence; every declared lane
in exactly one of the three classes; no absent run recorded as a pass; the
certification checkpoint integrated by fast-forward with terminal continuity
and a released session.

## Rollback

Every change is additive or documentation-shaped except M6's optional
removal, which is owner-gated and never runs during implementation. If a
milestone fails validation and cannot be repaired in scope, the session
branch is left unintegrated and the failure is recorded; no partial state
reaches `main`.
