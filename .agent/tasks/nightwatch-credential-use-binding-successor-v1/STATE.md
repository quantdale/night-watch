# Task State

## Identity

Task ID: nightwatch-credential-use-binding-successor-v1
Phase: CREDENTIAL_USE_BINDING_SUCCESSOR_V1
Status: COMPLETE
Starting SHA: d5175a7d676cbff5584b887363ceaa1d7d7b879f
Last validated implementation SHA: c1670abedee07c8b5d36ad2de5ee4419f5859ac8
Last substantive checkpoint SHA: c1670abedee07c8b5d36ad2de5ee4419f5859ac8
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-successor-campaign-en-628d8bb9
Last checkpoint: 2026-10-10 — COMPLETE. The blocker that held this child BLOCKED was the independently reproduced live-source drift set (12 failures on the certified baseline); that blocker was cleared by the parent campaign's M3 live-source hermeticity work (tasks 4.1/4.2) and this child's residual scope was closed by the M8 9.2 follow-through at `b98a48d58d512f5970cabe1242d38f11606840ac`. Closure is proven by receipt, not asserted: `tests/unit/devCredentialEffectBinding.test.ts` 7/7 (one-shot mark, a swap that detaches the pin, navigation between effects, a `formaction` redirect refused before any effect, the proxy-instance mismatch, the full pinned-handle login against the fixture, and a source census pinning the effect sites / the single same-evaluate verification / the credential consumer census), plus `tests/unit/devLoginSecurity.test.ts` 6/6, typecheck PASS and `hardening:check` PASS at HEAD. No secret effect after detected document/form/route drift; the normal synthetic path passes.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d5175a7d676cbff5584b887363ceaa1d7d7b879f
LAST_VALIDATED_IMPLEMENTATION_SHA: c1670abedee07c8b5d36ad2de5ee4419f5859ac8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: c1670abedee07c8b5d36ad2de5ee4419f5859ac8
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CREDENTIAL_USE_BINDING_SUCCESSOR_V1_STATUS: COMPLETE

## Objective

Bind credential-bearing login effects to one exact live document/form and
fail closed when that identity changes.

## Current Milestone

COMPLETE / STOP — adversarial validation is COMPLETE. Credential binding, per-effect
revalidation and synthetic race/mutation regressions are implemented,
focused/static green and now broad-lane green: the live-source drift blocker is
cleared (parent M3, tasks 4.1/4.2) and the M8 9.2 follow-through closed this
child's residual scope. The clean milestone had no auth failure even while it
was blocked; its 12 failures were the independently reproduced live-source drift
set, not a credential defect.

## Completed Milestones

- Prior shard/census/run-evidence/proxy children are preserved as BLOCKED/deferred.
- Synthetic reproduction established that generic locators could be reused
  after document/form replacement.
- M2 implementation complete: non-secret identity markers, captured form
  action/method/target, one-shot binding, revalidation, and stale error mapping.
- Focused dev-login security suite passed 6/6; typecheck and hardening passed.
- Identity and form-action mutations each caused their focused regression to
  fail in a disposable archive, proving both guards are load-bearing.

## Work In Progress

None. The implementation, the strict OpenSpec and the closure evidence are
checkpointed. Nothing is open in this child: the classified broad-gate residual
was the parent's live-source hermeticity work, which is COMPLETE.

## Exact Next Action

STOP. This task is COMPLETE and terminal. No next action; the successor loop
held this child only while its broad-lane residual was unclassified, and that
residual is now closed by the parent's live-source hermeticity work (M3 4.1/4.2)
and this child's own M8 9.2 follow-through (`b98a48d5`).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-credential-use-binding-successor-v1/SPEC.md` | frozen child intent | new this session |
| `.agent/tasks/nightwatch-credential-use-binding-successor-v1/PLAN.md` | child plan | new this session |
| `.agent/tasks/nightwatch-credential-use-binding-successor-v1/STATE.md` | child waypoint | new this session |
| `.agent/tasks/nightwatch-credential-use-binding-successor-v1/REPORT.md` | child report | new this session |
| `openspec/changes/nightwatch-credential-use-binding-successor-v1/` | strict contract | complete/validated |
| `src/auth/loginForm.ts` | one-shot binding/revalidation | implemented |
| `src/auth/devAutoLogin.ts` | binding integration/error mapping | implemented |
| `tests/unit/devLoginSecurity.test.ts` | synthetic race regressions | implemented |

## Validation Ledger

Command: synthetic credential reproduction
Result: REPRODUCED
When: 2026-09-24
Relevant failure/output summary: replacing the approved form after preflight
left generic locator credentials usable without a fresh binding.

Command: `npx playwright test tests/unit/devLoginSecurity.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS — 6/6
When: 2026-09-24
Relevant failure/output summary: normal synthetic login, replaced document,
changed form action, non-DEV ordering, token gate, and MCP policy all pass.

Command: `npm run typecheck`; `npm run hardening:check`
Result: PASS
When: 2026-09-24
Relevant failure/output summary: no type or structural regressions.

Command: `npm run session:status`
Result: PASS
When: 2026-09-24
Relevant failure/output summary: canonical clean and owned session coherent.

Command: `/tmp/nightwatch-credential-mutation.sh`
Result: PASS — both mutations detected
When: 2026-09-24
Relevant failure/output summary: removing the non-cloneable identity check or
form-action comparison made the corresponding synthetic race regression fail.

Command: `npm run gate:dev`
Result: TEST_FAILURE / CLASSIFIED RESIDUAL
When: 2026-09-25
Relevant failure/output summary: 5455 passed / 13 failed; 12 failures are the
known live-source drift set. The additional `reviewStore.test.ts` traversal
test failed only in the parallel gate because another shard created an unrelated
file in the shared OS temp parent; it passed when the four shard-1 failures were
replayed alone. No credential/auth test failed.

Command: first `npm run gate:milestone` after the OpenSpec repair
Result: STEP_FAILED / REPLAY REQUIRED
When: 2026-09-25
Relevant failure/output summary: typecheck, hardening, agent, handoff, bin
typecheck, and hardening-rules passed; `project:check` refused the intentionally
dirty worktree before test selection. The strict credential OpenSpec scenario
omission was repaired, and milestone evidence was rerun from a clean commit.

Command: `npm run gate:milestone` from clean checkpoint `f41c6cc3`
Result: TEST_FAILURE / PREEXISTING-SCOPE BLOCKER
When: 2026-09-25
Relevant failure/output summary: all mandatory command steps passed; 5456 passed
/ 12 failed across 393 selected tests. The 12 failures are the known
live-source drift set; the parallel review-store temp race did not recur. No
credential/auth test failed.

## Decisions Made During This Task

Decision: bind with both a non-secret DOM marker and a non-cloneable JS
identity, because cloned DOM can preserve attributes.
Reason: document replacement must fail before credential input.

## Discoveries

- Generic locators do not bind an element identity.
- The binding must be created before provider retrieval and revoked on all exits.

## Blockers

`gate:dev` and `gate:milestone` cannot certify the broad affected lane. Twelve
live-source/current-sibling failures reproduce independently of credential
binding; no credential regression appears. The child is honestly BLOCKED rather
than claiming a green milestone.

## Safety Events

NONE. All credential values were synthetic sentinels in local browser tests; no
real credential or target was used.

## Deferred / Follow-Up

- Preserve the 12 live-source drift failures for a separate hermeticity/currentness successor.
- Preserve the shared-temp race for `nightwatch-shard-temp-isolation-v1`.
- Dynamic listener proof, popup target admission, and full journal recovery remain later.

## Resume Recipe

Terminal task. Do not resume; there is no unfinished work in this child. 1. Preserve this blocked child and its exact evidence.
2. Return to the umbrella state and execute shard temp isolation.

## Completion Snapshot

COMPLETE 2026-10-10. The credential-use binding successor is terminal against
its actual receipts: implementation `c1670abe`, closure follow-through
`b98a48d58d512f5970cabe1242d38f11606840ac` (M8 9.2), focused proof
`tests/unit/devCredentialEffectBinding.test.ts` 7/7 and
`tests/unit/devLoginSecurity.test.ts` 6/6, typecheck PASS, `hardening:check`
PASS at HEAD `c931444a`. The only blocker ever recorded against this child was
the broad live-source drift residual, cleared by the parent's M3 hermeticity
work; no credential, secret, DEV/NEXT/production contact, sibling mutation,
network egress or publication occurred. Residuals are explicit and bounded:
arbitrary dynamic-listener proof and the NW-AUD-021 task 2.1 DEV-lane scope
remain outside this child and are recorded in the census, not here.
