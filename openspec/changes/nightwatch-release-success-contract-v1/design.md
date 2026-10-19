## Context

Two defects bound the release gate. First, campaign-level successful
completion was unreachable: `runCampaignLoop` exposed six exits and each was a
giving-up class, while `evaluateYieldCampaignEvidence` requires
`COMPLETED_SUCCESSFULLY`. Second, the C-00 session lifecycle could not correct
a live claim registered under the wrong task id: `claim` creates a new session
identity and refuses a live holder, `recover` only clears a crashed transition
lock, and editing a record by hand is forbidden.

## Goals / Non-Goals

Goals: make genuine completion reachable and provable; preserve every
non-qualifying termination as distinct; correct the one misassigned claim
through a governed operation; keep the whole certification surface intact.

Non-Goals: no provider execution or spend here; no relaxation of the evaluator;
no second ownership system; no owner override for arbitrary records; no change
to any other session's claim or work.

## Decisions

1. **Host-computed completion verdict.** Completion is pure arithmetic over
   counters the engine already maintains, computed over the whole population.
   A model claim or caller flag can never qualify a run. One investigation is
   not a campaign; a degraded provider is refused outright and is never
   historically forgiven.
2. **Declared finite plan.** A campaign that did not declare its investigation
   plan before running cannot complete; a stagnation-guard exit or any
   non-completing termination anywhere refuses completion.
3. **Diagnostics before deletion.** Per-investigation causes are captured
   before checkpoint deletion and persisted through the receipt diagnostics
   block, because a `NO_PROGRESS` exit otherwise destroys its own evidence.
4. **Scope separation.** `--observe-repository` is independent of
   `--repository`; observing a sibling never widens what is investigated.
5. **Resume repair.** The `PAUSED` suspension placeholder is retired when the
   resumed slot finishes, with a sticky flag so a pre-suspension provider
   failure is never erased.
6. **One narrow recovery (D-180).** `retarget-task` corrects only the task
   field of the current live record: exact session/HEAD/previous-task/
   replacement-task expectations, explicit `--owner-recovery` intent, live
   holder and branch binding, replacement-task existence as a tracked STATE
   that identifies it, active-task routing coherence, no live collision, the
   existing transition-locked revision-CAS publication, and one sanitized
   audit line. Tracked continuity corrections follow as ordinary commits.

## Risks / Trade-offs

- Weak completion semantics could let a stalled run masquerade as success; the
  verdict therefore refuses every non-completing termination and requires the
  population invariants above.
- A broad recovery command would become an ownership bypass; `retarget-task`
  is therefore expectation-bound, single-record, owner-gated and covered by a
  negative matrix (wrong session/HEAD/task, foreign or ambiguous state,
  concurrency, malformed records).
