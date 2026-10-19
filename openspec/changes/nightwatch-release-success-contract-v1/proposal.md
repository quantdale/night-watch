## Why

The release-success evaluator requires a receipt whose `campaignTermination` is
`COMPLETED_SUCCESSFULLY`, but the campaign runner had six exits and every one
was a failure class (`BUDGET_EXHAUSTED`, `CANCELLED`, `PAUSED`, `SAFETY_BLOCKED`,
`NO_PROGRESS`): 33/33 receipts on this host were `NO_PROGRESS`, 32 with a
healthy provider. Condition #3 (`autonomous-yield-proof`) was therefore
unreachable by construction. In parallel, the session that carries this work
was registered under the wrong task id by its own `claim --adopt`, which made
`WORKSPACE_DUPLICATE_TASK_CLAIM` fail every gate and `integrate` answer
`SESSION_CONTINUITY_MISMATCH`, with no supported C-00 correction available.

## What Changes

- A campaign completes only through a host-computed verdict over the whole
  investigation population: a finite plan declared before running, the plan
  exhausted, started == completed, population >= 2, at least one investigation
  reaching its own declared end, zero non-completing terminations anywhere, no
  stagnation exit, `VALID_PROVIDER_RUN`, and >= 1 tool action. NO_PROGRESS,
  PROVIDER_DEGRADED, PAUSED, CANCELLED, SAFETY_BLOCKED and budget exhaustion
  remain strictly distinct and non-qualifying; nothing is relabelled.
- Per-investigation diagnostics survive checkpoint deletion (R6-02) and the
  sibling-observation scope is separated from the investigation scope (R6-03).
- The resume path retires the `PAUSED` suspension placeholder when the resumed
  investigation finishes (R6-04), with sticky suspended-provider-failure
  protection.
- The C-00 session CLI gains one narrow, owner-approved recovery command
  (`retarget-task`, D-180) that corrects the task id of the current owned
  record and nothing else, and this session's mistaken claim is corrected
  through it.
- The governed completion path continues: gates, fast-forward integration,
  exact-head CI at the next substantive checkpoint S6, full evidence
  re-earning, and a prepared-but-unexecuted parent-12.5 provider package.

## Impact

- Affected code: `src/core/agentRuntime/` (completion verdict, diagnostics,
  local campaign loop, receipt binding), `bin/nightwatch-agent.mjs`,
  `bin/nightwatch-session.mjs`, `bin/lib/session-authority.mjs`, the hardening
  rule surface, and the task continuity records.
- No certification requirement is weakened; the evaluator's qualification
  conditions are unchanged.
- No provider call, no spend, no credential handling and no Alphaus contact.
