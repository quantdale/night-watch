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

The first Phase 2C invocation exposed DVR-001: settlement timeout and
incomplete capture were mislabeled as a product anomaly. The shared
observation classifier and focused regression now pass locally. Invocation 2
confirms DVR-001 is repaired, but both observations still timed out because
`activeJourneyRequests` counts unfinished static subresources and passive
unknown traffic. Repair that settlement-tracking boundary locally before the
next DEV invocation. Preserve both observed pairs as
`FRAMEWORK_CAPTURE_DEFECT` with `SETTLEMENT_TIMEOUT`.

## Current checkpoint

The owner-led DEV auth capture completed successfully and the successor
activation checks passed at checkpoint `2e7e84f`. The first guarded Phase 2C
invocation completed two payer observations but timed out at the bounded
settlement barrier; no safety violation or product finding was admitted. The
shared classification repair and focused validation are checkpointed at
`dd5ff766828d71706c75b6ffb86e5b2267c7ffb9`; the settlement-tracking repair is
checkpointed at `247b27ae9e48279692359a29147a51cc7fa2bc2a`. The next real
invocation exposed DVR-003: one settled known-read JSON response had
unavailable body capture, causing strict replay divergence and a framework
capture classification. The bounded response-capture repair, safe categorical
diagnostics, and deterministic local truncated-response regression are
checkpointed at `1d3eb0a5c498d22b54a24f635cb34805aa69f057`. The next
independent invocation showed DVR-004: a passive unknown JSON body timeout
still poisoned aggregate capture health although intentional known reads
completed. Scope capture health to intentional source-reviewed known reads,
preserve passive per-response diagnostics, then execute another independent
Phase 2C invocation. The capture-scope repair is checkpointed at
`224801f879c55f61df8eb9d285f27f63f672595c`; that run's payer pair passed,
but its common pair exposed DVR-005 because unknown capture status masked
bootstrap 5xx/missing-read evidence. The attribution-precedence repair is
checkpointed at `d1b9f31880ee22605f47d6c459c40287c5c491c3`. Independent
invocation `nightwatch-20260831T094029Z-e57a` then confirmed passing
payer/common replay and a stable account product oracle with no Nightwatch
capture defect. The first Phase 4 run at
`nightwatch-20260831T095007Z-246e` completed one bounded payer exploration,
then stopped fail-closed on a fresh-context critical bootstrap 502 product
oracle. A second bounded run at `nightwatch-20260831T095337Z-c375` passed
payer/common contexts and stopped at the known account malformed-JSON product
oracle. Phase 5 then passed six first executions and six fresh replays with
zero safety/privacy violations. Preserve these outcomes and advance to the
guarded campaign prepare/resume path. Prepare passed as
`campaign:sha256:394f3fd1ed3828e2914a6373`, but exact resume exposed DVR-006:
the first payer work item produced two legitimate repeated anomaly
occurrences with the same fingerprint and the orchestrator wrote duplicate
values into the checkpoint's set-valued execution summary. The checkpoint
validator correctly failed closed. Reduce and repair this locally before any
further DEV campaign execution; preserve occurrence evidence and only
canonicalize the summary identity set.

## Current next action

Rerun the bounded DEV preflight, prepare a fresh current-source campaign, and
resume that new manifest using the owner-local state. The DVR-006 repair is
checkpointed at `3cbe5f2f36dcaf4d94aa0a203649126aedb26be3`; the expected stale
manifest refusal and its truthful launcher classification are checkpointed at
`c1f5f529e830757cc2c3124aae46047bda863173`. Preserve both prior outcomes
independently and do not execute the stale manifest again.

## Terminal action

At closure, complete the successor STATE/REPORT, validate the final evidence,
commit and push the checkpoint, and verify clean `main` parity. Do not close
while any required observation or recovery result is unexplained.
