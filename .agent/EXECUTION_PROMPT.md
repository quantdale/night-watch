# Execution Prompt — corrective child campaign

Task ID: nightwatch-final-completion-corrections-v1
CHILD OF: nightwatch-final-product-completion-v1

You are resuming the corrective child campaign in the owned session
worktree `session/nightwatch-final-completion-corr-c45f0e9d`. Read
`.agent/ACTIVE_TASK.md`, then the task `SPEC.md`, `PLAN.md`, `STATE.md` and
the change's `tasks.md`/`audit.md` in that order, then resume from
STATE.md's Next Action.

Order (RESUME_PROMPT controls): task 6.1 FIRST (repository formatter
policy), then groups 2-6 in order. After each group: focused suites,
`gate:dev`, `gate:milestone`; commit guards before `hardening:rules`;
update STATE. Never weaken a safety rule, gate, test, probe, skip policy,
certification condition or evidence requirement. Never write under the
canonical checkout while this session is live. External contact is OD-3
only.

At close-out: integrate with `--expect-head`, observe exact-head CI green,
release then remove the session (after the branch reachability proof), run
`gate:clean` from canonical with no live session, archive the change with
`--skip-specs`, record every finding's disposition in REPORT, and route
ACTIVE_TASK back to the parent at IN_PROGRESS with Next action
"M9 task 10.2 remainder".
