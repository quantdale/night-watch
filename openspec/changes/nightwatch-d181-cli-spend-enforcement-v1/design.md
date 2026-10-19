## Context

The pure admission and the `AgentRuntime` pre-dispatch seam exist and are
behaviourally detected, but they are unreachable from production: the CLI
never builds or passes the ceiling, and the pause/resume envelope carries no
spend state. The harness cannot cap output tokens, so a wire-enforced output
bound is unavailable and the second route (an account-side hard stop) is
required.

## Goals / Non-Goals

Goals: make every metered campaign ceiling-bound before dispatch, resume-held
and identity-bound; distinguish fixtures mechanically; keep the enforcement
chain complete and tested end to end through the real CLI.

Non-Goals: no inference, no grant change, no certification-rule change, no
account-side claims without evidence.

## Decisions

1. **Mechanical metering boundary.** The campaign kind is derived from the
   resolved adapter identity (the repository's own provider print adapter),
   never from a label or an environment flag: the metered class is exactly the
   route that can qualify a provider proof, and it is exactly the route that
   must be ceiling-bound.
2. **Identity-bound ceiling.** The declaration carries the provider and model
   it authorizes; a run whose resolved identity disagrees refuses before
   dispatch (the same substitution logic as the grant identity match).
3. **Resume equality.** The ceiling is persisted in the campaign progress
   envelope; a resume must re-supply a declaration identical to the persisted
   one. Absent, widened, narrowed and identity-mismatched resumes are all
   refused with distinct codes.
4. **Output bound.** `pi --help` exposes no output-token cap, so the bound is
   not wire-enforceable through the harness; metered runs therefore require
   the owner-declared account-side hard stop with its evidence reference,
   recorded with the run, as the mission's second route specifies.
5. **Fail closed before dispatch.** All required conditions are checked at
   launch and at campaign start, before the first investigation exists.

## Risks / Trade-offs

- A missing or mis-declared ceiling now refuses a real run: that is the point
  — an unauthorized metered run must never start.
- The account-side hard stop is declared, not machine-verified (the control
  plane is not readable with model-plane keys); the declaration is recorded
  for audit and the pre-dispatch admission remains the enforced in-process
  bound.
