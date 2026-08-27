# Campaign Handoff + Project Truth Hardening

## Task purpose

Make the planner-to-executor handoff and the machine-owned project-state
snapshot fail closed on stale, cross-campaign, malformed, role-confused, or
unchecked state. The change is local, repository-only, deterministic, and
synthetic-only.

## Authorization and scope

- Task ID: `nightwatch-campaign-handoff-and-project-truth-hardening-v1`
- Phase: `CAMPAIGN-HANDOFF-AND-PROJECT-TRUTH-HARDENING-V1`
- Authorization class: `NIGHTWATCH_CAMPAIGN_HANDOFF_AND_PROJECT_TRUTH_HARDENING_V1`
- Starting Git baseline: `cf26ef88fdfe2d36c321c4c176674c5c8ee0d8fa`
- Planned-from baseline: `7165beeda3006ce1f64e61e7ae62fa919441fe96`
- Target branch: `main`
- Continuity protocol: `nightwatch.agent-continuity.v2`

## Required outcomes

1. A versioned, strict, read-only handoff checker owns the canonical
   `.agent/EXECUTION_PROMPT.md` header and binds campaign, OpenSpec route,
   planned-from ancestry, branch, predecessor, and task state.
2. READY_FOR_EXECUTION permits a terminal predecessor to remain active until
   activation; IN_PROGRESS, BLOCKED, and COMPLETE bind to the matching fresh
   continuity-v2 task.
3. Strict OpenSpec route, duplicate/unknown field, malformed metadata,
   traversal, symlink, untracked, branch, and Git ancestry failures are
   deterministic and bounded.
4. Implementation and documentation SHA roles remain distinct through the
   planned, active, substantive, documentation-closure, and terminal states.
5. A strict successor project-state block rejects unknown or duplicate fields,
   contains only validated/derived current facts, moves stale Phase-15 fields
   to historical prose, and exposes promotion lifecycle/effective authority
   semantics without ambiguity.
6. The authoritative local, CI-capable, clean, and pre-DEV gate path runs the
   handoff truth exactly once and retains read-only/no-network behavior.
7. Permanent synthetic adversarial tests cover the OpenSpec matrix,
   continuity/SHA-role matrix, project-state matrix, boundedness, and
   deterministic repeatability.

## Non-goals

No DEV/NEXT/production or authenticated product contact; no database,
datastore, cloud, infrastructure, deployment, sibling-repository write,
publication, AI-runtime authority, canonical promotion, source-proof
expansion, proxy/L6 work, historical-task migration, or force-push.

## Safety invariant

All checker and fixture work uses local temporary repositories and synthetic
values. Checkers perform no writes, fetches, network calls, model calls,
product calls, or data-plane operations.
