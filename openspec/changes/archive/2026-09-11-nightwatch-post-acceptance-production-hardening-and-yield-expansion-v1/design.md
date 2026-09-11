## Context

After operational acceptance the correct live authority is ACTIVE_TASK COMPLETE + project-state block OPERATIONALLY_ACCEPTED at 598e7fa. Handoff:check already enforces EXECUTION_PROMPT Status == ACTIVE_TASK Status, so stale BLOCKED correctly fails HANDOFF_STATUS_MISMATCH, but the final docs commits were pushed without re-running the gate. ROADMAP/CURRENT_STATE narratives have no mechanical gate at all, so present-tense BLOCKED survives alongside the machine block.

## Goals / Non-Goals

**Goals:**
- Make contradictory live BLOCKED vs ACCEPTED impossible without failing a required gate (hardening:check or project-state-check via docs-truth validation).
- Keep historical BLOCKED facts as historical, not present tense.
- Strengthen real-product coverage, oracle depth, and replay/resume reliability using fresh source evidence.

**Non-Goals:**
- New production or DEV mutation, infra/data ops, credential automation, weakening containment, speculative inference, publication.

## Decisions

- Truth reconciliation is first milestone of this campaign: rewrite stale present-tense BLOCKED to historical BLOCKED then terminal ACCEPTED at 598e7fa, preserving prior blocked probes as history.
- Validator hardening is added to `bin/hardening-check.mjs` as `checkDocumentationTruth`: when PROJECT_COMPLETION_STATUS is OPERATIONALLY_ACCEPTED, ROADMAP tail must not claim current BLOCKED and CURRENT_STATE narrative operational section must not claim current BLOCKED; EXECUTION_PROMPT already covered by handoff.
- Source expansions remain fail-closed with bounded extractors, positive/negative/ambiguity/adversarial fixtures, and deterministic digests.
- Real DEV remains serial read-only via existing launchers with external storage-state; no concurrent DEV to keep attribution clear.

## Risks / Trade-offs

- Adding docs-truth validation risks false positives if ROADMAP phrasing varies; mitigation is narrow exact-string plus normalized check for "current campaign is ... BLOCKED" referring to operational-acceptance-v1 while machine block is ACCEPTED.
- Hardening must not mask product bugs as Nightwatch defects; error taxonomy stays bounded and categorical.
