# Session 2 — Campaign, Replay, Minimization & Triage Runtime Convergence

Authorization required: PHASE_15_S2_CAMPAIGN_TRIAGE_CONVERGENCE_LOCAL_ONLY
Precondition: Session 1 terminal marker and handoff are present on live main.

## Objective

Converge the Phase 7/12/13 campaign pipeline so selection, semantic authority, replay, minimization, clustering, confidence, dossier readiness, checkpointing, and resume semantics use explicit shared contracts rather than parallel historical seams.

## Required implementation work

A. Candidate lifecycle state machine
- Add an explicit deterministic state model from OBSERVED -> ADMITTED -> REPRODUCED -> MINIMIZED/UNCHANGED -> TRIAGED -> DOSSIER_READY/REJECTED/UNRESOLVED.
- Encode legal transitions and fail closed on impossible transitions.
- Protocol-only and semantic candidates remain explicit variants, not hidden reinterpretations.

B. Replay/minimization binding completion
- Route supported candidate classes through TriageReplayPlanV2 + occurrence identity + injected executor result as the only certification path.
- Centralize exact-vs-reduced replay outcome normalization.
- Journey reduced semantics remain PRECONDITION_DIVERGENCE unless mechanically supported.
- Remove obsolete dead replay shims only after caller audit and focused proof.

C. Semantic authority at promotion boundary
- Make the Session-1 unified contract resolution/currentness result load-bearing in semantic candidate promotion.
- STALE/UNAVAILABLE/AMBIGUOUS/PARTIAL can never become HIGH/READY.
- Protocol-only path remains historical-compatible.

D. Minimization evidence quality
- Repair any remaining path that can claim minimality without at least one genuine reduced candidate when reduction is possible.
- Add explicit outcomes such as NO_REDUCIBLE_CANDIDATE, REDUCTION_PRECONDITION_UNAVAILABLE, MINIMALITY_PROVEN, MINIMALITY_NOT_PROVEN.
- Reuse bounded minimizer; do not invent new action authority.

E. Cluster/confidence/dossier convergence
- Establish one semantic-aware promotion result DTO containing cluster identity, replay evidence class, minimization class, confidence class, dossier readiness, source/currentness class, and safe reason codes.
- Keep v1 dossier read compatibility; new semantic path should produce v2-ready evidence only when predicates are satisfied.

F. Checkpoint/resume/versioning
- Version any new load-bearing campaign contract.
- Resume must fail closed before executor callbacks on incompatible candidate-lifecycle/replay/semantic versions.
- Add deterministic migration/read compatibility for historical checkpoints where safe; otherwise classify unsupported legacy state explicitly.

G. Integrated synthetic campaign proof
- Expand synthetic campaign/shadow fixtures to exercise protocol-only, semantic-current, semantic-stale, partial coverage, replay divergence, reducible, non-reducible, false-positive, duplicate occurrence, version drift, and resume cases.
- At least 3 deterministic repeats with zero mismatches and zero privacy/safety floors.

## Testing cadence

Focused implementation tests per workstream plus one moderate campaign/triage integration pack. Run campaign:synthetic. Do NOT run a real campaign, full canonical Playwright, isolated full regression, or repository-wide hardening.

## Required terminal state

PHASE_15_S2_CAMPAIGN_TRIAGE_CONVERGENCE: IMPLEMENTED_FOCUSED_GREEN
PHASE_15_PROGRAM_STATE: SESSION_2_COMPLETE_SESSION_3_REQUIRED
NEXT ACTION: STOP

Append exact evidence and changed dependency cone to Phase-15 HARDENING_HANDOFF.md. Push fast-forward only.