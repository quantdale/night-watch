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

### M0 — Establish execution truth

- **Objective:** a live baseline and an owned session, so no repair is built
  on review-time prose.
- **Files / areas:** `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1/*`,
  `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/*`,
  `.agent/EXECUTION_PROMPT.md`, `.agent/ACTIVE_TASK.md`.
- **Actions:** claim an owned session on a current base; re-verify the live
  gates independently; register R-01 through R-07; commit the planning
  checkpoint as documentation only and integrate it.
- **Acceptance:** `session:status` PASS in this owned session; `handoff:check`
  and `agent:check` PASS; the predecessor verified terminal COMPLETE.
- **Validation:** `npm run session:status`, `npm run workspace:check`,
  `npm run agent:check`, `npm run handoff:check`,
  `npm run validation:universe`.
- **Status:** COMPLETE — session `sess-f4f1d66c73a2` on base `58bbf2d`;
  planning checkpoint integrated at `a180a08`; R-01 through R-07 registered.

### M0b — Restore the planning-only handoff checkpoint (R-07)

- **Objective:** the documented `READY_FOR_EXECUTION` state becomes landable
  again, without relaxing any binding.
- **Files / areas:** `bin/project-state-check.mjs`,
  `bin/planner-handoff-protocol.mjs`, `tests/unit/projectState.test.ts`.
- **Actions:** assert the predecessor binding for a planning prompt and leave
  the active-prompt rule untouched; read the header through the handoff
  protocol module; add regressions for the planning pass and both
  wrong-predecessor failures; prove both directions by mutation.
- **Acceptance:** a protocol-valid planning prompt passes `handoff:check` and
  `project:check` together; a wrong predecessor still fails with the existing
  codes; no error vocabulary added, renamed or removed.
- **Validation:** `projectState.test.ts`, `plannerHandoff.test.ts`,
  `npm run typecheck`, `npm run hardening:check`, `npm run project:check`.
- **Status:** COMPLETE — integrated at `a063416`; 67 + 12 tests pass; both
  mutation directions measured.

### M1 — Qualify the browser workflow lane (R-01)

- **Objective:** a lane that runs on this host stops being carried as
  UNAVAILABLE, with a receipt that has an owning session.
- **Files / areas:** `tests/browser/*`, `docs/HOST-CAPABILITY-MATRIX.md`,
  task REPORT/STATE.
- **Actions:** record host capability from observed binaries; execute the lane
  inside this owned session; record the receipt and update the lane state.
- **Acceptance:** the recorded state names this session; a canonical-checkout
  run does not satisfy it.
- **Validation:** `npm run control-center:ui:browser`.
- **Status:** COMPLETE — lane executed 4 passed / 0 failed in 3.8 minutes
  inside this session; host Chrome 151.0.7922.173 and bubblewrap 0.9.0;
  `docs/HOST-CAPABILITY-MATRIX.md` §4a records the lane as PROVEN.

### M2 — Record the CI block as classified observation (R-02)

- **Objective:** an externally blocked lane becomes distinguishable from an
  uninspected one, without modelling a green run.
- **Files / areas:** `docs/CURRENT_STATE.md` release-truth and exact-head CI
  sections.
- **Actions:** observe the run at the exact head through
  `bin/phase23-ci.mjs observe`; record the run id, reason and block class;
  keep `CI_EXECUTED_SHA` at `NONE`; name the owner action.
- **Acceptance:** `CI_STATUS` is non-passing; the classification comes from
  the real classifier, not from prose.
- **Validation:** `node bin/phase23-ci.mjs observe --run-id=<id>`,
  `npm run project:check`.
- **Status:** COMPLETE — classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` /
  `REQUIRED_JOB_STEPS_EMPTY` at `a063416`, `exactHead: true`;
  `CI_STATUS: NO_STEPS_EXTERNAL_NON_EVIDENCE` with `CI_EXECUTED_SHA: NONE`.

### M3 — Reconcile project state (R-03)

- **Objective:** the predecessor campaign is recorded in the shape every prior
  campaign uses, and the validated-SHA fields stop misdescribing reality.
- **Files / areas:** `docs/CURRENT_STATE.md`.
- **Actions:** append the closure section; advance the substantive anchor to
  the real implementation checkpoint; leave the local/clean anchors until this
  campaign produces its own receipts at M7.
- **Acceptance:** every pre-existing historical section, receipt and SHA is
  unchanged.
- **Validation:** `npm run project:check`, `npm run hardening:check`,
  `git diff` review of the archive region.
- **Status:** COMPLETE — closure section appended in the established shape
  and the substantive anchor advanced to a real implementation commit. The
  local/clean anchors are deliberately deferred to M7 rather than inheriting a
  predecessor receipt for a different SHA.

### M4 — Document the shipped surface (R-04)

- **Objective:** an operator can find the opt-in review capability and the
  phase-14 check from the entry-point documentation.
- **Files / areas:** `README.md`, `package.json`.
- **Actions:** document `--enable-local-review`, what it enables, the
  owner-local store location and the four reviewer answers; add a
  `contract:health` script.
- **Acceptance:** definition-of-done item 13 holds against the command
  surface.
- **Validation:** `npm run hardening:check`, `npm run contract:health`.
- **Status:** COMPLETE — README documents `--enable-local-review`, the review
  store and the reviewer's four answers; `npm run contract:health` added.

### M5 — Clear workspace and record residue (R-05)

- **Objective:** the standing stale-worktree warnings become zero or
  intentional, with nothing destroyed that held unique work.
- **Files / areas:** worktree registrations and session branches; no tracked
  source.
- **Actions:** prove merge status and cleanliness before touching anything;
  release stale worktrees through the session CLI from the canonical checkout;
  delete only provably-merged branches; leave the rest for an owner decision.
- **Acceptance:** `workspace:status` reports `attention=0`; no branch with
  unmerged commits is deleted.
- **Validation:** `npm run workspace:status`, `npm run agent:check`.
- **Status:** COMPLETE — both stale worktrees released
  (`contained=true`), `attention=0`; six provably-merged branches deleted;
  sixteen non-merged branches left intact as an owner decision; two audit
  claims corrected from live evidence.

### M6 — Bound evidence retention (R-06)

- **Objective:** local evidence growth has a bounded, refusal-first policy
  that never weakens immutable evidence identity.
- **Files / areas:** a retention capability over repository-owned generated
  outputs, plus regressions.
- **Actions:** compute the refusal set before any removal set; report by
  default; gate removal behind an explicit owner flag; treat unprovable
  reference status as refused; never rewrite or truncate an artifact.
- **Acceptance:** referenced artifacts are provably refused; nothing is
  removed without the flag; reclaiming nothing is a valid outcome.
- **Validation:** the new retention regressions plus `npm test`.
- **Status:** COMPLETE — `src/core/evidenceRetention/index.ts` is a pure
  refusal-first planner and `bin/evidence-retention.mjs` owns every mutation.
  18 regressions pass, including the `--apply` path asserted on disk: the
  referenced artifact survives byte-identical, the orphan is gone, a symlinked
  entry is never followed, and an unusable `--root` blocks instead of falling
  back to the real store. Registered in the AUTHORITATIVE gate.

### M7 — Certify one checkpoint

- **Objective:** one integrated checkpoint where every declared lane sits in
  exactly one class.
- **Files / areas:** the whole repository; task REPORT/STATE;
  `docs/CURRENT_STATE.md`.
- **Actions:** full offline regression, `gate:local`, UI lanes, root
  typecheck, `validation:universe`; resolve every lane; privacy and diff
  review; continuity; fast-forward integration; session release.
- **Acceptance:** no absent run recorded as a pass; terminal continuity; clean
  tree.
- **Validation:** the full certification set.
- **Status:** NOT_STARTED.

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
