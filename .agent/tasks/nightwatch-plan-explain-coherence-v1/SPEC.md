# SPEC — nightwatch-plan-explain-coherence-v1

## Frozen intent

Pin the cross-command coherence between `plan` and `explain`: every
member id emitted by `plan --json` must resolve in
`explain <member-id> --json` with explanation
`PRIORITY_COMPONENTS_AND_GATES` and the matching `requestedId`.
Guards against silent divergence between the plan builder that emits
ids and the preview plan that `explain` looks up (two plan namespaces
exist; `campaign` shows the phase20 plan, which is NOT explainable by
design).

## Hard boundaries (frozen)

One new focused test file only (`tests/unit/planExplainCoherence.test.ts`);
no product change; no manifest/registry/gate change; no force-push; no
history rewrite. C-00 worktree discipline.

## Declared deletions

None. Additive-only.

## Acceptance (frozen)

- New test green: first `plan --json` member id explains positively.
- Focused suites green; `tsc --noEmit`, `hardening:check`,
  `agent:check`, `project:check`, `handoff:check` green.
- Integrated to `origin/main`, session released, worktree removed, task
  COMPLETE with REPORT.
