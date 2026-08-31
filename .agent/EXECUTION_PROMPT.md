# EXECUTION PROMPT — Bounded DEV Requalification

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-dev-requalification-v1
OpenSpec: openspec/changes/nightwatch-dev-requalification-v1/
Planned-From: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Target Branch: main
Predecessor Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Predecessor Status: COMPLETE

## Mission

Use the freshly refreshed owner-managed DEV authentication state to obtain a
bounded, serial, truthful real-system sample from the existing read-only Phase
2C, Phase 4, Phase 5, campaign, and replay paths. Preserve independent
outcome categories and do not reopen or relabel the completed predecessor.

## Permanent constraints

- No production or NEXT contact and no DEV mutation.
- No infrastructure, deployment, database, datastore, or cloud operations.
- No Alphaus sibling-repository writes, external publication, issue creation,
  or automatic owner/team messaging.
- No credentials, cookies, tokens, storage-state bytes, raw customer values,
  raw DOM/responses, authenticated traces, or raw findings in Git, task files,
  diagnostics, or shared artifacts.
- No force-push, retry-based correctness certification, proof weakening,
  opaque scoring, or arbitrary canonical promotion.
- Use only the existing guarded serial launchers and the owner-local external
  state produced by the human-led auth capture.

## Required workstreams

1. Validate successor continuity, handoff, project truth, safety, and DEV
   preflight before any target operation.
2. Run three independent Phase 2C observations and retain every sanitized
   journey/replay classification.
3. Run one Phase 4 read-only exploration, one Phase 5 read-only API operation,
   one campaign prepare/resume, and one safe selected replay when available.
4. Inspect product-vs-framework classification, finding deduplication,
   persisted state, cleanup, and resource boundaries.
5. Reproduce and repair any Nightwatch Critical/High defect before continuing;
   otherwise perform final local/clean/state/Git reconciliation.

## Execution rule

Every result is retained as a categorical observation. A retry is a new
observation and may not erase or relabel an earlier mismatch. Auth,
environment, timing, framework, product, and unknown results never become
unqualified PASS. `NO_SAFE_NEW_FAMILY` remains unchanged.

## Active continuity

The active task is
`.agent/tasks/nightwatch-dev-requalification-v1/` under
`nightwatch.agent-continuity.v2`. It declares
`PROJECT_VERDICT_EFFECT: PRESERVE` while the bounded read-only sample is
underway. If validated evidence invalidates acceptance, stop and use the
explicit `REEVALUATE` protocol before further campaign work.

## Initial next action

Run `npm run agent:check`, `npm run handoff:check`, `npm run project:check`,
`npm run hardening:check`, and `npm run observe:preflight -- --env=dev`.
If they pass, run the first serial Phase 2C observation with the external
owner-local state.

## Current checkpoint

The owner-led DEV auth capture completed successfully at the starting Git
head. The state was structurally validated and written outside the workspace;
no secret values were printed. No real product observation has been claimed in
this successor yet.

## Terminal action

At closure, complete the successor STATE/REPORT, validate the final evidence,
commit and push the checkpoint, and verify clean `main` parity. Do not close
while any required observation or recovery result is unexplained.
