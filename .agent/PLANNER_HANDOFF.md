# Planner → Executor Handoff

Additive; stricter repository rules win. The planner writes `.agent/EXECUTION_PROMPT.md` only after auditing actual code, tests, docs, recent commits/diffs, useful issues/PRs, and native state. It must contain the versioned `nightwatch.planner-executor-handoff.v1` header: `Status`, `Campaign ID`, exact `OpenSpec`, `Planned-From`, target branch, named predecessor task/status, one high-impact campaign, scope, ordered workstreams, constraints, validation, acceptance/completion gates, and Git/reporting requirements; then commit/push and stop without implementing.

The canonical header lifecycle is strict. `READY_FOR_EXECUTION` is a
planning-only checkpoint and may leave the terminal predecessor in
`ACTIVE_TASK.md`; `IN_PROGRESS`, `BLOCKED`, and `COMPLETE` must bind to the
same active continuity-v2 campaign task and status. The exact route is checked
by `npm run handoff:check`, which requires tracked regular OpenSpec
`audit.md`, `proposal.md`, `design.md`, `tasks.md`, and at least one
`specs/*/spec.md`, plus a real `main`-branch Planned-From ancestor. The
authoritative quality gate runs this check once before project/task truth.

For `/goal continue`: read repository instructions, this file, the execution prompt if present, and native campaign/state files; reconcile against current Git/implementation; resume the first genuinely incomplete requirement of an ACTIVE prompt, without redoing landed work; validate, fix introduced Critical/High regressions, update state, and commit/push per local policy. Otherwise fall back to native continuation semantics; if none exists, report that planning is required.
