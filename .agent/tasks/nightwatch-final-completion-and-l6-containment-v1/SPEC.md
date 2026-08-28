# Final Completion and L6 Containment

## Purpose

Take Nightwatch from the historical `PROJECT_NOT_COMPLETE_BLOCKED` state
through a fresh current-head audit and, if technically safe and possible,
prove rootless process/network containment sufficiently to certify release
completion. If the proof cannot be made, retain an explicit fail-closed
blocker with complete evidence rather than overstating the boundary.

## Authorization and scope

- Task ID: `nightwatch-final-completion-and-l6-containment-v1`
- Phase: `FINAL-COMPLETION-AND-L6-CONTAINMENT-V1`
- Authorization class: `NIGHTWATCH_FINAL_COMPLETION_AND_L6_CONTAINMENT_V1`
- Starting Git baseline: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`
- Planned-from baseline: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`
- Target branch: `main`
- Continuity protocol: `nightwatch.agent-continuity.v2`

## Required outcomes

1. Every tracked path is accounted for and role-reviewed at this live head.
2. All material defects, release gaps, skips, retries and authority
   inconsistencies are repaired or explicitly classified with executable
   evidence.
3. L6 is either mechanically proven with a versioned ready capability and
   adversarial matrix, or remains visibly unsupported and blocks completion.
4. Authenticated OOPS never bypasses the capability gate and is enabled only
   if the complete containment proof succeeds.
5. Local, clean-checkout and UI/campaign qualification are reproducible and
   current project/CI truth is accurate.

## Non-goals

No real DEV/NEXT/production contact, credentials, databases, cloud or
infrastructure operations, sibling repository writes, publication, privileged
network administration, system-wide DNS/proxy/hosts mutation, TLS MITM,
runtime AI, self-development promotion or force-push.

## Safety invariant

All execution is repository-local and synthetic. Unknown, unavailable or
ambiguous process/network capability fails closed before target workspace,
child or browser creation. Raw customer values, secrets and unsafe network
details do not enter source, task state, durable evidence or reports.

## Terminal outcomes

Exactly one outcome is permitted:

- `PROJECT_COMPLETE_AND_CI_CERTIFIED`
- `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`
- `PROJECT_NOT_COMPLETE_BLOCKED`
