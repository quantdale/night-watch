# EXECUTION PROMPT — DEV Capture Soak, Replay, and Yield

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-dev-soak-replay-yield-v1
OpenSpec: openspec/changes/nightwatch-dev-soak-replay-yield-v1/
Planned-From: 754aa629b4b24bda0eca98fe567cc44ef536e30d
Target Branch: main
Predecessor Task ID: nightwatch-dev-requalification-v1
Predecessor Status: COMPLETE

## Mission

Measure whether Nightwatch's remaining `BODY_READ_TIMEOUT` /
`BODY_UNAVAILABLE` behavior is transient or systemic, obtain a materially
larger bounded real-DEV reliability sample, and drive at least one fresh
current-manifest anomaly through replay and dossier/yield closure if the
existing DVR-011 admission rules produce an eligible candidate.

Do not reopen DVR-001..DVR-012 unless fresh evidence reproduces the defect
family. Do not weaken candidate admission merely to make replay run.

## Permanent constraints

- DEV only through existing guarded launchers; serial target contact.
- No production or NEXT contact; no product mutation.
- No database/datastore, infrastructure, deployment, or cloud operation.
- No Alphaus sibling-repository writes or external publication.
- No credentials, cookies, tokens, storage-state bytes, raw DOM/responses,
  authenticated traces, customer values, or raw findings in Git.
- No force-push, containment weakening, proof weakening, or retry relabeling.
- Auth is owner-managed and external. If not page-valid, stop at the human
  boundary and print the repository-approved headed capture command.

## M0 — baseline and readiness

Fetch/prune, prove clean `main == origin/main`, read current task/predecessor
evidence, run typecheck/hardening/agent/project/handoff/campaign-focused gates,
validate current approved-source/runtime identity, run DEV preflight, and
validate the external owner-managed storage state. If invalid, stop before
product contact at `HUMAN_AUTH_ACTION_REQUIRED`; after owner refresh,
revalidate freshness and gates.

## M1 — capture reliability soak

Run **10 independent Phase 2C invocations** serially unless a Critical/High
Nightwatch defect requires an earlier stop. Every invocation is independent
evidence, never a retry that overwrites a prior outcome.

Measure per payer/common/account journey: attempts/completions, settlement,
intentional known-read capture, BODY_READ_TIMEOUT/BODY_UNAVAILABLE/other
bounded capture codes, auth/environment/framework/product classification,
strict replay result, account-inventory reach, admitted product identity,
safety/privacy, elapsed time, and browser/child/proxy cleanup.

If capture failures correlate with request class, content size, journey,
context, response type, lifecycle, or timing, build deterministic local
reproducers and fix the owning abstraction. After every executable fix,
quarantine stale manifests and rerun focused + gate validation before fresh
DEV contact.

## M2 — cross-phase soak

Run **5 independent Phase 4 bounded explorations** and **5 independent Phase 5
source-generated API first+fresh-replay cycles** serially. Require repeated
account-inventory coverage whenever safety/readiness permits. Preserve
browser-vs-API differences as evidence rather than normalizing them away.

## M3 — fresh campaign soak

Run **5 independently prepared current-source Phase 7 campaigns**, each using a
fresh manifest and the current bounded five-work-item portfolio.

Never resume stale pre-repair manifests. Track campaign class, work-item
completion, account-inventory reach, capture-limited stops, candidate/cluster/
dossier yield, checkpoint correctness, source drift, duplicate/lost work,
safety, privacy, and cleanup.

## M4 — current replay and dossier closure

Only fresh DVR-011-admitted current-manifest product candidates may enter
attack replay. Historical fingerprints are comparison evidence only.

Execute at most **5 replay executions total**. Preserve deterministic
reproduction, product-state drift, auth/environment divergence, semantic
non-reproduction, invalid replay, and framework capture failure as distinct
outcomes. Never promote incomplete capture. If reproduction succeeds, run
bounded minimization and dossier generation and verify identity stability.

If the full soak yields zero fresh candidates, close replay as
`STARVED_BY_CURRENT_ADMISSION`, not PASS.

## M5 — quantitative diagnosis

Report actual rates, not a retry-selected success story:

- intentional known-read complete-capture rate;
- BODY_READ_TIMEOUT/BODY_UNAVAILABLE frequency;
- settlement success rate;
- per-journey/context failure distribution;
- account-inventory reach rate;
- fresh candidates per campaign;
- candidates replayable/reproduced;
- dossiers generated;
- fingerprint/cluster stability;
- before/after impact of any repair;
- correlation with duration, size, resource role, lifecycle, endpoint;
- final attribution: Nightwatch capture, DEV environment, product behavior,
  auth, or sample scarcity.

## Defect rule

Any newly discovered Critical/High Nightwatch defect stops real execution
until local reproduction, root cause, owning repair, permanent regression,
campaign/replay compatibility, typecheck/hardening, current-source refresh,
and fresh DEV confirmation where authorized.

Never weaken DVR-011, safety, containment, or classification to manufacture
yield.

## Final validation

Run focused capture/campaign/replay regressions, typecheck, hardening,
agent:check/audit, handoff, project, semantic compatibility, owner provenance,
synthetic campaign, Control Center checks if touched, gate:local, gate:clean,
and canonical/isolated parity when runtime/state/source behavior changed
materially.

Inspect exact-head Actions once. `steps=[]` remains external non-evidence.

## Terminal outcomes

Use exactly one evidence-backed closure category:

- `SOAK_COMPLETE_REPLAY_DOSSIER_VERIFIED`
- `SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE`
- `SOAK_COMPLETE_REPLAY_STARVED_BY_CURRENT_ADMISSION`
- `SOAK_BLOCKED_AUTH_OR_ENVIRONMENT`
- `SOAK_FAILED_NIGHTWATCH_DEFECT`

Preserve `OPERATIONALLY_ACCEPTED` under `PROJECT_VERDICT_EFFECT: PRESERVE`
unless evidence genuinely requires a separate `REEVALUATE` successor.

Begin with M0. Do not skip the human auth boundary.
