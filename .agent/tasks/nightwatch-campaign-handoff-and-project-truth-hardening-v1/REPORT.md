# Campaign Handoff + Project Truth Hardening — Execution Report

Status: IN_PROGRESS
Task ID: nightwatch-campaign-handoff-and-project-truth-hardening-v1
Phase: CAMPAIGN-HANDOFF-AND-PROJECT-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Starting SHA: cf26ef88fdfe2d36c321c4c176674c5c8ee0d8fa
Validated implementation SHA: dabb8a8ae1e1dd1e3ca4a75670ce737ee127a319

## Outcome to date

The reproduced planner-to-executor route gap is repaired by a versioned,
read-only handoff parser/checker and a required `HANDOFF_TRUTH` quality-gate
group. Project-state v2 now has an explicit owned-key schema and faithful
promotion lifecycle/effective-authority fields. The implementation checkpoint
is source/test/config validated; terminal documentation, clean gates, and
external exact-head CI classification remain closure work.

## H0 and reproduced findings

- Pulled `origin/main` fast-forward-only to `cf26ef88fdfe2d36c321c4c176674c5c8ee0d8fa`.
- Literal audit covered all discovered tracked files: `1359` tracked,
  `1359` reviewed, `1359` regular, `0` unexplained nonregular; bytes
  `14898287`, lines `297923`.
- Safe path/content manifest digests are recorded in STATE.md; no source body,
  credential, customer value, or private finding was persisted.
- Playwright enumeration at takeover: `2589 tests in 214 files`, exit `0`.
- Planner findings A–F were reproduced as defects or existing-gate
  dispositions in STATE.md. The stale unrelated prompt, unchecked READY
  route, missing route checker, permissive v1 block, SPENT/NONE output
  mismatch, and SHA-role closure hazard all have executable evidence.

## Implemented protocol

- `nightwatch.planner-executor-handoff.v1` parses only the owned header after
  the first H1; prose cannot authorize execution.
- Header validation is strict for required/unknown/duplicate/malformed fields,
  status/version, safe identifiers, exact OpenSpec route, `main`, predecessor
  status, and 40-character Planned-From SHA.
- `READY_FOR_EXECUTION` binds to the named terminal predecessor without
  requiring premature activation. `IN_PROGRESS`, `BLOCKED`, and `COMPLETE`
  bind to the active continuity-v2 task and matching status.
- The checker requires the exact tracked regular OpenSpec route, all required
  planning files, one-level `specs/*/spec.md`, real Git ancestry, safe
  component paths, no symlinked route components, bounded reads/enumeration,
  fixed shell-disabled Git/agent subprocesses, and categorical bounded output.
- Existing continuity SHA-role classification remains authoritative. The
  exact OpenSpec planning paths are accepted as documentation checkpoints;
  source-like/nested paths remain unapproved. Synthetic planned → active →
  substantive → docs closure → complete fixtures prove role transitions.
- Project-state v2 rejects unknown, duplicate, missing, malformed, oversized,
  generic competing authority, and stale Phase-15 machine-block fields. It
  preserves the real catalog renderer/validator and portfolio selector, and
  emits lifecycle and effective promotion authority under distinct keys.

## Validation receipts

- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS.
- `npm run quality-gate:spec` — PASS; 10 required groups; definition digest
  `sha256:4c5a9d19416fd2e0c24f01a2fd6a518b8faf47f866665ae37af21abbf8921044`.
- `npm run gate:inventory` — PASS; 10 logical groups, 153 unique test files,
  0 duplicate authoritative executions.
- Focused continuity/handoff/project/gate matrix — `158/158 PASS`.
- Handoff matrix — `12/12 PASS`, including deterministic x3 output,
  malformed/secret-like/oversized metadata, traversal, symlink, branch,
  ancestry, identity, status, SHA-role, and source-drift cases.
- `npm run handoff:check` — PASS for the active IN_PROGRESS route.
- `npm run agent:check` — PASS with the expected legacy-task and checkpoint
  warnings while documentation closure is dirty; `npm run agent:audit` — exit
  `0`, 84 tasks / 60 strict v2 / 24 legacy v1 / 0 strict errors.
- `npm run campaign:synthetic` — `66 passed`, wall `29.80s`, peak RSS
  `268968 KiB`.
- `npm run test:semantic-compat` — `1920 total / 1907 passed / 13 skipped /
  0 failed`, wall `395.66s`, peak RSS `1332692 KiB`.
- `npm run test:owner-provenance` — `91 passed`, wall `13.05s`, peak RSS
  `240332 KiB`.
- Pre-closure `npm run gate:local` reached `HANDOFF_TRUTH` exactly once and
  correctly stopped at the dirty-tree `PROJECT_TRUTH` failure; downstream
  groups were `NOT_RUN`.
- The live `project:check` is intentionally pending a clean documentation
  checkpoint; its current dirty-tree result is not counted as a code failure.

## Safety and remaining closure

All work remains repository-local, offline, deterministic, and synthetic-only.
DEV/NEXT/production contacts, authenticated product traffic, database/cloud/
infrastructure operations, sibling writes, publication, runtime AI, and
canonical promotion are all zero. Remaining closure work is to commit the
documentation checkpoint, run local/clean gate acceptance and final
enumeration/performance checks, mark the OpenSpec tasks and continuity files
terminal, push without force, verify `HEAD == origin/main`, and observe the
exact-head Actions run once. A zero-step external run remains non-evidence.
