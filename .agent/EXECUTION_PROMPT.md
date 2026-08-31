# EXECUTION PROMPT — Replay Budget and Dossier Closure

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-replay-budget-and-dossier-closure-v1
OpenSpec: openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/
Planned-From: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Target Branch: main
Predecessor Task ID: nightwatch-dev-soak-replay-yield-v1
Predecessor Status: COMPLETE

## Mission

Close the proven final gap in the current Nightwatch evidence chain:

fresh candidate -> replay reservation -> attack replay -> reproduction
classification -> bounded minimization -> sanitized dossier.

The completed soak produced 8 fresh strict candidates across 4 campaigns and
2 stable fingerprints, but every reproduction queue was refused before replay
executor entry because the three required collection journeys had already
consumed `journeyContexts=3/3`.

Fix that budget architecture without weakening DVR-011, containment, privacy,
current-source identity, or finite campaign authority.

## M0 — reproduce before modifying

1. Fetch/prune and prove clean `main == origin/main`.
2. Read the active task, OpenSpec, predecessor REPORT/STATE, campaign budget,
   orchestrator, checkpoint, replay, minimizer, and dossier code.
3. Run baseline typecheck/hardening/project/handoff/campaign/replay gates.
4. Build a deterministic local regression for exactly:
   - three required journey contexts consumed;
   - fresh settled capture-complete product candidate admitted;
   - cluster queues reproduction;
   - reproduction reservation rejected with `BUDGET_EXHAUSTED`;
   - attack replay executor callback count remains 0.
5. Prove this is the same abstraction boundary as the four real soak queues.

Do not alter a limit before the reproducer exists.

## M1 — design the smallest safe bounded model

Inspect existing budget ownership and choose the smallest provable design.
Possible shapes include:

- a dedicated reproduction reserve;
- collection/reproduction sub-budgets;
- prepare-time reserved replay capacity;
- deterministic transfer of explicitly unused capacity.

Do not mechanically change 3 -> 4 unless the accounting model proves why that
new authority is bounded and safe.

Required invariants:

- all real contact authority is finite and explicit;
- no candidate => zero replay contact;
- only fresh current DVR-011-admitted candidates can spend replay reserve;
- stale/historical candidates spend nothing;
- incomplete capture/framework/auth/environment outcomes cannot gain replay
  authority;
- duplicate candidate/cluster identity cannot multiply replay count;
- checkpoint/resume cannot double-spend;
- interruption cannot duplicate executor entry;
- source/version drift invalidates stale replay authority;
- reserve accounting is deterministic and persisted;
- budget exhaustion remains fail closed;
- minimization/dossier remain downstream of successful admitted replay;
- existing safety/privacy/containment limits remain unchanged.

If the safest model requires a small explicit increase in total authorized
journey contacts, encode that increase as a named versioned bounded profile
with tests and rationale; never hide it as a retry or generic limit bump.

## M2 — adversarial implementation validation

Implement the owning abstraction and test at least:

1. pre-fix starvation case now reserves one bounded replay;
2. zero candidates use zero replay reserve;
3. one candidate cannot exceed configured replay cap;
4. many candidates cannot exceed cap;
5. duplicate fingerprints/clusters cannot multiply reserve;
6. interrupted pre-entry resume spends once;
7. interrupted post-entry resume does not execute twice;
8. stale source/manifest fails before replay;
9. framework capture failure remains non-replayable;
10. auth/environment divergence remains non-replayable;
11. exhausted collection and replay budgets remain truthful;
12. successful reproduction can proceed to minimization/dossier;
13. failed/inconclusive reproduction cannot fabricate dossier readiness.

Run focused campaign/replay/checkpoint/triage suites plus:

- typecheck;
- hardening;
- semantic compatibility;
- owner provenance;
- synthetic campaign;
- project/handoff/agent checks;
- gate:local;
- gate:clean.

If runtime behavior or persistence semantics change materially, run full
canonical/isolated parity.

## M3 — fresh DEV confirmation

Only after local validation:

1. validate owner-managed DEV authentication and guarded preflight;
2. prepare a fresh current-source manifest;
3. never resume predecessor soak checkpoints;
4. never replay historical fingerprints;
5. execute the minimum bounded sample needed to naturally obtain a fresh
   DVR-011-admitted candidate.

Authorization bounds for confirmation:

- maximum 3 fresh campaign attempts;
- maximum 3 attack replay executions total;
- maximum 1 successful minimization/dossier chain required for closure.

Every attempt remains independent evidence. A later success cannot relabel an
earlier failure.

## M4 — close the chain

When a fresh candidate exists:

- prove the budget reservation came from the new versioned accounting;
- execute attack replay;
- classify REPRODUCED / product-state drift / precondition divergence /
  auth divergence / environment divergence / framework capture / invalid replay
  using existing bounded taxonomy;
- if REPRODUCED, run the existing bounded minimizer;
- if dossier readiness is satisfied, generate the sanitized dossier;
- verify stable candidate, cluster, replay-plan, minimization, and dossier
  identity;
- verify safety/privacy counters and cleanup.

Do not publish or open an issue.

If the implementation is correct but no fresh candidate appears within the
authorized DEV sample, close as
`REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`.

## Defect policy

Any Critical/High Nightwatch defect discovered in budget, replay, checkpoint,
minimization, dossier, capture, or safety stops further real execution until
root cause, local reproducer, owning fix, permanent regression, and gates pass.

## Terminal outcomes

Use one truthful outcome:

- `REPLAY_BUDGET_AND_DOSSIER_VERIFIED`
- `REPLAY_BUDGET_FIXED_REPLAY_INCONCLUSIVE`
- `REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`
- `REPLAY_BUDGET_DESIGN_BLOCKED_SAFETY`
- `REPLAY_BUDGET_TASK_FAILED_NIGHTWATCH_DEFECT`

Preserve `OPERATIONALLY_ACCEPTED` under `PROJECT_VERDICT_EFFECT: PRESERVE`
unless genuinely invalidating evidence requires a separate `REEVALUATE`
successor.

At final closure run the strongest relevant gates, inspect exact-head Actions
once, classify `steps=[]` as external non-evidence, reconcile all continuity
documents, push clean main, and report exact counts.

Begin with M0.
