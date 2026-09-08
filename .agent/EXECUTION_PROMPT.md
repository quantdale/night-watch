# EXECUTION PROMPT — Repository Master Hardening Implementation

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-repository-hardening-implementation-v1
OpenSpec: openspec/changes/nightwatch-repository-hardening-implementation-v1/
Planned-From: 0ac7b3d037b5059f670eca715fc30adaf58e7334
Target Branch: main
Predecessor Task ID: nightwatch-reproduction-surface-coverage-autonomous-yield-v1
Predecessor Status: COMPLETE

Task directory: `.agent/tasks/nightwatch-repository-hardening-implementation-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

Execute `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` from live repository
truth through its dependency-ordered roadmap and its repository-level
definition of done.

That review inventoried every tracked path at baseline
`1942ea37757bbb914de6281f505ee6118b5c67f0` and closed as `REVIEW COMPLETE —
canonical implementation plan; execution has not started`. It registers
fifteen findings. NW-15 is the W10 reproduction-surface wave, already
complete and certified under its own owner; consume its results and do not
reopen it. The remaining fourteen — NW-01 through NW-14 — are this campaign.

The repository needs selective repair, not a rewrite. The confirmed defects
are prototype-inherited enum acceptance in reasoner-facing validators,
checkout-dependent private-path exclusions, Bug Atlas path escape and
leaf-symlink writes, non-atomic autonomous checkpoint persistence,
ineffective cancellation in the Phase-5 relay, sensitive JSON parse
diagnostics, retrospective worktree-capacity admission, and incomplete
release-test accounting. No P0 is claimed.

This is intentionally a long campaign. Do not stop after recon, one finding,
one green suite, or one roadmap phase.

## Read first

1. `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` — sections 4 (findings
   register), 6 (roadmap), 7 (definition of done), 8 (agent instructions)
2. `.agent/tasks/nightwatch-repository-hardening-implementation-v1/{SPEC,PLAN,STATE,REPORT}.md`
3. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, `.agent/PLANS.md`
4. `openspec/changes/nightwatch-repository-hardening-implementation-v1/`
5. `docs/CURRENT_STATE.md` for the current snapshot, then live
   Git/workspace/session truth and the affected source and tests.

## Re-establish truth before implementation

Do not assume the plan's diagnosis. Every finding is a review-time hypothesis.

Before implementing one, determine independently:

- live `HEAD` and `origin/main`, and whether the canonical checkout is behind;
- all worktrees, session claims and C-00 ownership;
- whether the finding still reproduces in live source, with a focused probe
  or a failing test;
- whether W10's integrated work has already changed the surface;
- which shared contract the repair belongs to, and whether that contract is
  frozen yet.

Where live code or W10 outcomes contradict the plan, the live evidence wins:
record the contradiction, update the finding status with its resolution
evidence, and preserve the original rationale. A finding closed as ALREADY
SATISFIED requires the same standard of proof as one closed by a repair.

## Ordered workstreams

Execute in the roadmap's dependency order. Shared contracts freeze before
their consumers change.

1. **Phase 0 — execution truth.** NW-06 prospective worktree admission and
   proof-gated rollback; open the NW-08 discovered-inventory work; reconcile
   the live routing and programme records.
2. **Phase 1 — trust and private paths.** NW-01 own-key vocabulary closure;
   NW-02 the single topology-aware private-path authority; NW-03 confined
   and atomically published Atlas snapshots; NW-13 content-free sensitive
   diagnostics. Freeze the shared path, publication and error contracts
   first.
3. **Phase 2 — recoverable autonomous state.** NW-04 generations, bounded
   reads, explicit same-ID semantics and old-checkpoint compatibility, on the
   NW-02 and NW-03 primitives.
4. **Phase 3 — resource lifecycles.** NW-05 one abortable end-to-end relay
   deadline; NW-12 the fixed per-client SSE bound.
5. **Phase 4 — operator workflow.** NW-09 shipped opt-in review with a
   truthful capability DTO, then NW-10 pagination and NW-11 validation,
   cancellation and coalescing on the frozen DTOs. One owner holds the
   overlapping UI API and App surfaces.
6. **Phase 6 — release truth.** Close NW-08 against the discovered universe
   and NW-14 dependency, portability and documentation reconciliation; then
   NW-07's residual continuity coherence, once the records it must agree with
   are terminal.
7. **Phase 7 — certification.** Execute the definition of done at one
   integrated candidate checkpoint and record residual P2/P3 with impact,
   reason, owner decision and revisit condition.

## Constraints

LOCAL only.

NOT AUTHORIZED: DEV / NEXT / production contact; cloud, datastore or
infrastructure work; C-07 DEV, C-08b, C-12 / C-13 / C-14 live execution;
Slack / Leslie / Pondr / Notion; external filing or comment; credential,
deployment or owner-scope-freeze changes; sibling repository writes; force
push, rebase or amend of another session's commits, `git stash`, or broad
`clean` / `restore` / `reset` outside owned paths; retiring, pruning,
adopting or editing another session, including to create worktree capacity;
arbitrary reasoner shell, Git, network or filesystem authority.

Preserved and load-bearing: the permanent owner scope freeze; L6 process and
network containment; the Phase 9 / 9A.1 / 10 semantic admission rules;
mechanical dossier admission and `humanReviewRequired`; historical
`PRE_FAIL_POST_PASS` and strict `EXACT_REDISCOVERY` semantics; the W9
reproduction executor and W10 surface-map contracts; loopback, Host/Origin,
CSRF and CSP guarantees; snapshot, checkpoint, evidence and review schema
identities; and lockfile reproducibility.

Every adversarial test uses fabricated inputs inside a disposable temporary
directory it creates, and asserts that sentinels outside the authorized root
are byte-identical afterwards. No credential, private owner finding, customer
datum or machine-specific absolute path enters Git.

## Validation

For each milestone: probe, implement, run its own suite, run the suites of
the surfaces it touched, repair failures in scope, record exact counts and
receipts in `STATE.md`, then advance. Prefer operation-count, error-code and
byte-identity assertions over wall-clock thresholds.

After any reconciliation with `origin/main`, rerun the affected suites. A
pre-reconcile pass never certifies post-reconcile code, and a worker summary
never certifies an integrated head.

Before the campaign closes, run and record: `npm run typecheck`,
`npm run hardening:check`, `npm run agent:check`, `npm run handoff:check`,
`npm run project:check`, `npm run workspace:check`, `npm run session:check`,
full `npm test`, `npm run gate:local`, a fresh Node 20 `npm run gate:clean`
with no reused `node_modules`, the UI typecheck/test/build lane, the bin
syntax lane, and `git diff --check`.

## Acceptance and completion gates

The campaign may close only when:

- every in-scope finding is CLOSED with acceptance evidence satisfying its own
  criteria, or explicitly DEFERRED with impact, reason, owner decision and
  revisit condition;
- no unresolved P0/P1 remains in local release scope;
- the fourteen items of the plan's repository-level definition of done are
  each satisfied or honestly reported UNAVAILABLE with their own evidence
  requirement — an external CI block, an unqualified host, or absent network
  policy is neither a failure nor a pass;
- prototype-name and coercion probes fail before effects while valid
  persisted protocol inputs still load;
- crash injection yields one complete checkpoint generation and same-ID
  clobber is impossible;
- timeout, cancel and disconnect leave no active owned work after cleanup;
- every discovered executable test or check is classified, with the inventory
  digest and exact counts recorded;
- Git contains no raw findings, auth state, credentials, customer data or
  transient machine paths.

Do not mark the campaign complete from per-milestone summaries. Certify the
integrated head independently.

Do NOT claim DEV/NEXT/production proof, publication authority, strict
`EXACT_REDISCOVERY`, previously-unknown-defect yield, organizational release
approval, or formal accessibility certification. None of those are in scope
and none is proven by this work.

## Git and reporting

Work only in the owned C-00 session worktree declared in
`.agent/ACTIVE_TASK.md`. Commit per validated milestone with exact evidence in
`STATE.md`; integrate only by verified fast-forward compare-and-swap
(`nightwatch-session.mjs integrate`). A rejected push means reconcile,
revalidate and retry — never force.

Campaign closeout takes three integrations, because `project:check` enforces
implementation → exact-head CI → project-state reconciliation: push the
substantive implementation; push a docs commit advancing
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` to it, whose CI run still fails
`PROJECT_TRUTH` with `CI_BASELINE_STALE`; then push a docs commit recording
that run's SHA. Run the final `gate:local` from the canonical checkout on
`main`, fast-forwarded to `origin/main` first, because an integrated session
worktree becomes `STALE_SESSION` and fails `HANDOFF_TRUTH` there.

Update the findings register in
`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` as each finding closes,
preserving its original rationale beside its resolution evidence.

Begin now from live Git, workspace and session truth, and continue through
the full roadmap rather than stopping at planning or early implementation.
