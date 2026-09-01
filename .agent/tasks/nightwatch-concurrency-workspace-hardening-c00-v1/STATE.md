# Task State

## Identity

Task ID: nightwatch-concurrency-workspace-hardening-c00-v1
Phase: CONCURRENCY_WORKSPACE_HARDENING_C00_V1
Status: COMPLETE
Starting SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
Last validated implementation SHA: d8fdf952c7ede0691ea6bc93308d37974a4381bb
Last substantive checkpoint SHA: d8fdf952c7ede0691ea6bc93308d37974a4381bb
Branch: session/c00-a396cd1f
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
LAST_VALIDATED_IMPLEMENTATION_SHA: d8fdf952c7ede0691ea6bc93308d37974a4381bb
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d8fdf952c7ede0691ea6bc93308d37974a4381bb
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONCURRENCY_WORKSPACE_HARDENING_C00_V1_STATUS: COMPLETE

## Objective

Prevent concurrent Nightwatch development agents from sharing mutable
checkout/index state and mechanically detect corruption of repository-global
Git state.

## Current Milestone

COMPLETE / STOP — M0 through M10 are closed.

## Work In Progress

NONE — the campaign is complete. C-01 is deliberately not started.

## Exact Next Action

STOP — C-00 is complete and certified locally. Do not begin C-01 in this task;
the next campaign is C-01 truncation truth / discovery paging, which requires a
fresh session worktree under the newly enforced protocol.

## Starting evidence

Measured read-only at `2517c26a019bbf8aa53008cd57658b917cc79bea`:

- `HEAD == origin/main`, canonical worktree clean.
- `git ls-files -v` — zero non-`H` entries.
- `.git/info/exclude` — pristine Git template, zero effective patterns.
- `.git/hooks` — 14 entries, all `*.sample`; `core.hooksPath` unset.
- Two worktrees registered: the canonical checkout on `main`, and the
  predecessor session worktree `session/c00-a396cd1f` at the same SHA with no
  commits and no live holder process.

## Completed Milestones

- M0 — safe bootstrap. Live Git state discovered; the planning/review
  checkpoint verified present; the pre-existing predecessor worktree proven
  abandoned (no process with a working directory inside it) and adopted rather
  than duplicated or deleted.
- M1 — durable continuity-v2 task. `SPEC.md`, `PLAN.md`, `STATE.md`,
  `REPORT.md`, the OpenSpec change (audit/proposal/design/tasks/specs), and
  `.agent/ACTIVE_TASK.md` all bound to this task. `PLAN.md`/`STATE.md` were
  rewritten to the protocol's required heading skeleton, which the predecessor
  drafts lacked.
- M2 — ownership model. Per-worktree record
  `nightwatch.workspace-session.v1`, six-way classification, `O_EXCL`
  exclusive claim, boot-digest liveness with an optional process anchor,
  fail-closed unknown states, no absolute path in durable truth.
- M3 — hygiene invariants. Index flags per worktree, shared exclude allowlist,
  hooks-only-samples plus unset `core.hooksPath`, worktree metadata, and the
  cross-session canonical-cleanliness rule.
- M4 — declared-deletion gate over committed, staged and unstaged tracked
  deletions against the session base; behavioural prohibitions documented in
  `AGENTS.md`.
- M5 — integration protocol: `git push origin HEAD:refs/heads/main` from the
  session worktree, merge-not-rebase reconciliation, conflict abort, verified
  fast-forward.
- M6 — lease decision: none implemented; analysis recorded (D-103).
- M7 — integration into `agent:check`, `handoff:check`, `hardening:check`, the
  required `WORKSPACE_INTEGRITY` gate group, and four npm entry points.
- M8 — adversarial matrix A–L: 39 deterministic cases on disposable synthetic
  repositories, proving both failure and repaired-green for every class.
- M9 — pinned pre-C-01 baseline recorded in `docs/design/PRE-C01-BASELINE.md`
  at clean SHA `886d8362b6f0979ccdfc2881abb46cb5ac79b359`.
- M10 — full validation stack green; documentation updated; serialized
  fast-forward integration into canonical `main`.

## Files Changed

- .agent/ACTIVE_TASK.md
- .agent/EXECUTION_PROMPT.md
- .agent/tasks/nightwatch-concurrency-workspace-hardening-c00-v1/{SPEC,PLAN,STATE,REPORT}.md
- AGENTS.md
- bin/agent-state.mjs
- bin/hardening-check.mjs
- bin/nightwatch-session.mjs
- bin/planner-handoff-check.mjs
- bin/quality-gate.mjs
- bin/quality-gate-spec.mjs
- bin/workspace-integrity.mjs
- config/quality-gate.v1.json
- config/workspace-integrity.v1.json
- docs/CURRENT_STATE.md
- docs/DECISIONS.md
- docs/design/PRE-C01-BASELINE.md
- openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/**
- openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md
- package.json
- scenarios/ripple/local.smoke.ts
- src/core/qualityGate/definition.ts
- tests/unit/changeIntelligenceBacktest.test.ts
- tests/unit/phase23QualityGate.test.ts
- tests/unit/plannerHandoff.test.ts
- tests/unit/projectState.test.ts
- tests/unit/workspaceIsolation.test.ts

No sibling company repository was modified. No tracked file was deleted, so the
`## Declared Deletions` section of `SPEC.md` is `NONE`.

## Validation Ledger

- First `agent:check` in the session worktree: `FAIL (22 errors)` — the
  predecessor `PLAN.md`/`STATE.md` lacked every required heading. Repaired.
- Adversarial matrix, first execution: 35/36 — reproduced DEF-02
  (`git merge --no-rebase` is not a `git merge` option, and the failure was
  misreported as a conflict). Repaired, then 36/36, then 38/38 with the
  policy-source cases. `36/36` and `38/38` are intermediate points in that
  progression, not the terminal count: the matrix closed at **39/39**, which
  is the mechanically proven number of `test('` cases in
  `tests/unit/workspaceIsolation.test.ts` and the figure carried by
  `REPORT.md` and `docs/CURRENT_STATE.md` (re-verified under C-01).
- `test:semantic-compat`, first execution after wiring: `TEST_FAILURE` with
  zero counts — reproduced DEF-03 (`import.meta` in a module reached through
  Playwright's CommonJS transform). Repaired.
- `test:semantic-compat`, second execution: 1,950 / 1,910 / 13 / 27 —
  reproduced DEF-04 (fixtures copying the checker's bin dependencies) and
  DEF-05 (fixtures using `.git/info/exclude` as a fixture mechanism).
  Repaired.
- Full canonical regression, first execution after those repairs: 2,748 total
  / 2,740 passed / 13 skipped / 8 failed — reproduced DEF-06 (sibling
  REPOSITORIES root derived from the checkout's own location, which breaks in
  an out-of-tree worktree). Repaired, plus a `hardening:check` guard.
- Final `npm run typecheck` — PASS.
- Final `npm run hardening:check` — PASS.
- Final `npm run quality-gate:spec` — PASS, 11 required groups,
  definition digest `sha256:4e676246bbfce731df63dab76248d9bbc8ce682986026721754cdfe0b6cb5f5a`.
- Final `npm run handoff:check` — PASS.
- Final `npm run project:check` — PASS.
- Final `npm run agent:check` / `npm run agent:audit` — PASS, 0 strict errors.
- `npm run workspace:check` — PASS, all seven invariants.
- `npm run gate:local` at `cb1fed4c2d09490bb84ea2ed228a6994dfa7d634` — PASS,
  11/11 groups, receipt `receipt:sha256:15c8418350969c2f772133b1`.
- `npm run gate:clean` (Node 20 disposable clone) at the same head — PASS,
  11/11 groups, gate receipt `receipt:sha256:e9b78082ea8116654d264ae6`,
  clean receipt `clean-receipt:sha256:68dc94360941752326cd3b89`.
- After the final full suite, the session-worktree root contained zero entries
  other than registered worktrees — observational proof that DEF-09 is closed.
- Semantic compatibility: 1,950 / 1,937 / 13 / 0 — exactly equal to the
  canonical `main` baseline measured independently.
- Owner provenance 91 passed; synthetic campaign 128 passed.
- Full canonical Playwright regression on the session branch: 2,749 total /
  2,736 passed / 13 skipped / 0 failed. Independently measured pre-C-00
  canonical `main` baseline: 2,710 / 2,697 / 13 / 0. The delta is exactly the
  39 new C-00 adversarial cases, with identical skip counts.
- External GitHub Actions CI was not run and is not claimed green.

## Decisions Made During This Task

- D-C00-1 / D-101 — isolation over cooperation; one writing agent owns one
  worktree and one session branch.
- D-C00-2 — ownership metadata lives in the per-worktree Git directory.
- D-C00-3 / D-102 — indexes are per-worktree, and the index invariant is
  "no lowercase tag and no `S`/`s`"; both correct the independent review.
- D-C00-4 / D-103 — no main-integration lease.
- D-C00-5 — integration pushes `HEAD:refs/heads/main`, never checks out `main`.
- D-C00-6 — adopt, never duplicate or delete, an abandoned same-campaign
  session worktree.
- D-C00-7 / D-104 — the declared-deletion gate is the enforceable core of file
  ownership; the destructive-command prohibitions remain behavioural rules.
- D-C00-8 — an allowlist comparison requires the inspected repository's own
  committed allowlist; without one the exclude invariant is `NOT_APPLICABLE`
  plus an advisory, never a silent PASS.
- D-C00-9 — the canonical-branch rule applies only to shared topologies; a
  solo checkout (fresh clone, CI checkout, clean-checkout gate) shares nothing.
- D-C00-10 — nothing may derive the sibling REPOSITORIES root from its own
  checkout location.

## Discoveries

DEF-01 … DEF-09 are recorded in full in `REPORT.md` §13, with the residual
concurrency risks RES-1 … RES-6 in §14. The load-bearing discoveries:

- Independent review §11 item 2 is mechanically wrong twice: index flags are
  per-worktree, not shared, and `skip-worktree` is the uppercase `S` tag, so a
  "no lowercase letters" rule would have missed the observed incident.
- Worktree isolation does not remove the index-flag hazard for the canonical
  checkout, whose index remains shared by everyone who works there.
- Out-of-tree session worktrees break any resolution that derives a sibling
  path from the checkout's own location; three such surfaces existed, and one
  of them silently created stray directories in the session-worktree root.

## Safety Events

None. Zero DEV/NEXT/production contact, zero authentication or credential
access, zero datastore/cloud queries, zero sibling-repository writes, zero
publication. Destructive Git behaviour was exercised only inside disposable
synthetic repositories created by the tests.

## Deferred / Follow-Up

- C-01 truncation truth / discovery paging — the next campaign, out of scope
  here, to be run in a fresh session worktree under this protocol.
- RES-6 — shared `$GIT_COMMON_DIR/config` keys beyond `core.hooksPath` are not
  yet invariants.
- The response-contract count divergence between two census surfaces at one
  identical source snapshot is recorded in `docs/design/PRE-C01-BASELINE.md`
  for C-01 to reconcile; C-00 deliberately did not reconcile it.

## Resume Recipe

STOP — task complete; do not resume. This session is closed. A future campaign
is a NEW task with a NEW session worktree created through
`node bin/nightwatch-session.mjs start`; it does not resume this one.

## Completion Snapshot

- Status: COMPLETE. All ten milestones closed; every acceptance criterion in
  `SPEC.md` met.
- Validated implementation checkpoint:
  `d8fdf952c7ede0691ea6bc93308d37974a4381bb`.
- Local quality gate: PASS, 11/11 required groups.
- Clean Node 20 quality gate: PASS, 11/11 required groups.
- Adversarial matrix A–L: 39/39 on disposable synthetic repositories.
- Full regression parity: 2,749 / 2,736 / 13 / 0 against a pre-C-00 canonical
  baseline of 2,710 / 2,697 / 13 / 0; the delta is exactly the new C-00 cases.
- Pinned pre-C-01 baseline recorded with reproduced digests
  `srcsnapshot:sha256:04ff583971865f335902f5ad` and
  `source-eligibility-census:sha256:2f97b732e0472df347f695a1`.
- Integration: fast-forward push of the session branch onto canonical `main`,
  verified `HEAD == origin/main` afterwards; remote topology remains `main`
  only; live heads are discovered from Git, not persisted here.
- Project verdict effect: PRESERVE. C-00 granted no new product or runtime
  authority.
- Nine defects found and repaired; six residual concurrency risks recorded
  rather than hidden.
- External CI: not run, not claimed green.
- DEF-07 (stale-base advisory for a released claim), DEF-08 (a tracked
  dependency symlink in a session's own unpushed commit) and DEF-09 (a fixture
  writing into the real workspace parent) were found during closure, repaired,
  and each carries a permanent mechanical guard.
- Closure, measured after integration: canonical
  `HEAD == origin/main == 5567e249dcf5e0f31c92a4f1a08f7001caa2f1f0`; canonical
  worktree clean; exactly one registered worktree; local and remote branch
  inventory `main` only; `workspace:check` PASS with zero worktrees requiring
  owner attention; zero non-`H` index entries, zero effective shared exclude
  patterns, zero non-sample hooks, `core.hooksPath` unset.

## Blockers

None.
