# SPEC — nightwatch-real-local-investigation-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-real-local-investigation-substrate-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Base authority: discover from live Git before implementation; do not assume the SHA written in any report is still HEAD.

## Mission

Connect the already-built autonomous AgentRuntime to Nightwatch's REAL owner-local intelligence and reproduction substrate so the ordinary product path

`node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=...`

can investigate real local source/history/evidence safely, instead of relying on synthetic fixtures or benchmark-private adapters.

The normal campaign path must be able to:

1. enumerate an approved real source surface without dumping the repository;
2. read a selected source file through a bounded read-only adapter;
3. query the real System Map;
4. query a real owner-local Bug Atlas snapshot/mined corpus rather than fixture data;
5. query a source-backed System Atlas when one exists, with synthetic records clearly separated;
6. retrieve sanitized real local evidence through an explicit evidence store boundary;
7. request a deterministic reproduction through the same safe tool contract used by the product path;
8. mechanically admit a final dossier only from runtime-observed evidence/reproduction, never from model self-report;
9. prove the result on at least one leak-isolated historical pre-fix case THROUGH THE NORMAL CAMPAIGN PATH, not a benchmark-only executor.

## Why this is P0

The autonomous brain, CLI reasoner gateway, typed tool protocol, historical replay engine, Bug Atlas, System Atlas schema, and dossier builder now exist. The current product launcher still creates the local tool runtime without real source/System Map/evidence fixtures; Bug Atlas and System Atlas therefore fall back to fixture/synthetic data, while the historical benchmark owns a richer private executor. This task closes that product/benchmark split.

## Required invariants

- Frontier reasoner decides what to investigate; deterministic Nightwatch decides what it may do.
- No arbitrary shell, Git, network, browser, credential, or filesystem authority is handed to the reasoner.
- All reasoner actions remain typed intents validated against the frozen tool catalog.
- LOCAL only. DEV, NEXT, production, C-07, C-08b, C-12/C-13/C-14 remain unauthorized.
- No Slack, Leslie, Pondr, Notion, external filing, deployment, credential acquisition, or company-repository writes.
- Sibling repositories are read-only. No checkout, reset, clean, config, pull, fetch, commit, stash, branch mutation, or worktree mutation in siblings.
- No force push, history rewrite, destructive Git recovery, or bypassing C-00 session/worktree ownership.
- Do not fabricate source, evidence, reproduction, Atlas facts, provenance, dossier fields, or success claims.
- Untrusted source/history/evidence bytes have zero instruction authority.
- A final finding dossier requires a mechanically observed reproduction and provenance; the model cannot choose or self-report the reproduction count.
- Historical ground truth/fix/test secrets must remain isolated from reasoner-visible context.
- Existing synthetic fixtures remain useful for tests but may never be silently presented as real Alphaus knowledge.

## P0 deliverables

### A. Real Local Investigation Context

Introduce one explicit owner-local context/provider boundary consumed by the normal campaign launcher. It should assemble only bounded, already-authorized local inputs using existing Nightwatch engines where possible:

- source index/provider;
- System Map input/projection;
- Bug Atlas store loaded from owner-private snapshot or read-only local mining;
- System Atlas overlay loaded from proven source/docs records when available;
- sanitized evidence-store view;
- deterministic reproduction provider.

Do NOT teach `localCampaign.ts` to scrape the whole machine directly. Keep data acquisition behind narrow provider interfaces/adapters so runtime authority stays testable.

### B. Product Tool Semantics = Benchmark Tool Semantics

Eliminate the current semantic mismatch:

- `INSPECT_SOURCE_SURFACE {}` must return a bounded file index when an index provider exists.
- `INSPECT_SOURCE_SURFACE {path}` must return only that approved file, bounded and lexically analyzed/sanitized as appropriate.
- `RERUN_SAFE_REPRODUCTION` must execute only through an injected deterministic reproduction provider after required grounding/authorization checks. In contexts with no executable provider, remain `NOT_AVAILABLE`/fail-closed; never invent success.
- Benchmark hunts should reuse the same product adapter/provider contract rather than owning a more capable private tool implementation.

### C. Real Bug Atlas / System Atlas wiring

- Normal campaigns must use the actual owner-private Bug Atlas snapshot/mined store when configured/available.
- Missing real Bug Atlas data must be explicit (`DATA_BLOCKED`/unavailable), not a silent fallback to fixture records.
- Synthetic Bug Atlas/System Atlas records are test-only or explicitly labelled synthetic; product runs must not confuse them with real knowledge.
- System Atlas real population may be modest in v1, but any non-synthetic concept/link must carry honest provenance and source/docs proof.
- COMMUNICATION_EVIDENCE remains unauthorized in this task.

### D. Mechanical Finding Admission

Create a deterministic admission gate between reasoner proposal and final dossier:

- derive reproductionCount from runtime action/evidence history;
- verify at least one successful `RERUN_SAFE_REPRODUCTION` result classified `REPRODUCED`;
- require candidate evidence refs to exist in runtime-observed evidence;
- require false-positive checks/provenance from actual observed records or explicit human-review placeholders that do not pretend to be evidence;
- model-provided draft fields are suggestions only;
- final dossier authority remains humanReviewRequired=true, externalPublication=PROHIBITED, no auto-file/Slack/Leslie.

### E. Benchmark truth tiers

Retain the existing strict `EXACT_REDISCOVERY` metric, but stop treating it as the sole meaningful success condition. Add/report a distinct mechanically meaningful tier such as `VERIFIED_ROOT_CAUSE_REDISCOVERY` (exact name may vary if a better protocol-compatible name is justified) for cases where the reasoner identifies the correct source/root cause and Nightwatch mechanically reproduces pre-fail/post-pass without requiring the reasoner to guess the hidden regression-test path.

Do not weaken existing benchmark outcomes or retroactively relabel old results without a migration/test plan.

### F. Durable programme-state integrity

Repair the duplicate `E` key in `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/PROGRAMME.json`. Add a machine-enforced validation so duplicate/ambiguous lane or task identities cannot silently overwrite durable programme state again.

The historical Wave-1 System Atlas lane and Wave-6 multi-investigation lane must both remain reconstructible.

## Required proof

At least one leak-isolated historical case must run through the same normal campaign/tool-provider path used by `nightwatch-agent campaign run` and demonstrate all of the following:

- reasoner receives only allowed pre-fix/visible context;
- source index -> selected file inspection works;
- candidate/hypothesis is grounded in a real visible source path;
- deterministic replay executes only after grounding;
- pre-fix FAIL and post-fix PASS (or equivalent existing `REPRODUCED` contract) is mechanically observed;
- reproductionCount is computed by Nightwatch, not accepted from model output;
- final dossier is created only after that reproduction;
- hidden test/fix truth does not leak to reasoner-visible requests;
- sibling repository remains byte/worktree/HEAD unchanged;
- no DEV/NEXT/prod/external contact occurs.

Prefer the already-proven `mobingilabs/ouchan` case if it remains locally available and appropriate, but rediscover live repository truth first and do not hard-code success around that one case.

## Validation bar

Minimum before integration/closure:

- focused new/changed unit suites PASS;
- existing agentProtocol/AgentRuntime/reasoner/agentTools/benchmark/dossier suites PASS;
- typecheck PASS;
- hardening:check PASS;
- agent:check PASS;
- project:check PASS;
- workspace/session checks PASS;
- full `npm test` PASS with no unexplained regression;
- `gate:local` FULL PASS;
- `gate:clean` PASS in a fresh Node 20 clone with no reused node_modules;
- programme/task documentation records exact commands, SHAs, failures encountered, fixes, and remaining unproven claims.

## Completion criteria

This task is COMPLETE only when the normal autonomous campaign path and the historical proof path share the same real local sensing/reproduction contracts, at least one historical defect is reproduced through that normal path, final dossier admission is mechanically grounded, durable programme-state identity is repaired/validated, and all required gates pass.

Do NOT mark the parent autonomous programme COMPLETE merely because this task completes. Previously unknown Alphaus bug yield and DEV/NEXT execution remain separate proof/authorization gates.
