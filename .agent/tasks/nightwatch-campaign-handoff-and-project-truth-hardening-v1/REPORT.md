# Campaign Handoff + Project Truth Hardening — Execution Report

Status: IN_PROGRESS
Task ID: nightwatch-campaign-handoff-and-project-truth-hardening-v1
Phase: CAMPAIGN-HANDOFF-AND-PROJECT-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Starting SHA: cf26ef88fdfe2d36c321c4c176674c5c8ee0d8fa
Validated implementation SHA: e4ac7076600f9a347d230445aa312e321f635624

## Outcome to date

The reproduced planner-to-executor route gap is repaired by a versioned,
read-only handoff parser/checker and a required `HANDOFF_TRUTH` quality-gate
group. Project-state v2 now has an explicit owned-key schema and faithful
promotion lifecycle/effective-authority fields. The implementation checkpoint
and clean-gate branch-shape repair are source/test/config validated; terminal
documentation, final clean-tree acceptance, and external exact-head CI
classification remain closure work.

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
- Complete Playwright enumeration exited `0` with `2606 tests in 215 files`.
  The canonical serial execution passed `2590`, skipped `16`, and failed `0`
  in `417.33s` with peak RSS `676356 KiB`; the skip set did not change.
- Pre-closure `npm run gate:local` reached `HANDOFF_TRUTH` exactly once and
  correctly stopped at the dirty-tree `PROJECT_TRUTH` failure; downstream
  groups were `NOT_RUN`.
- The first disposable `npm run gate:clean` installed Node `20.20.2`
  successfully but exposed a gate-shape defect: its clone was detached while
  handoff truth correctly requires `main`. Direct Node 20 and clean-clone
  handoff checks passed. `bin/quality-gate-clean.mjs` was repaired to retain
  and verify local `main`; the repair is the substantive checkpoint
  `e4ac7076600f9a347d230445aa312e321f635624`; the clean gate then passed from
  clean head `0ef83e433a0980807faa1aa8cc3ffbb0aaef809c` under Node `20.20.2`.
  Its gate receipt is `receipt:sha256:c820d97db22648feb70930be` and clean
  receipt is `clean-receipt:sha256:6ae5a05c5c4dfd84fe9564f0`.
- Clean-head `project:check`, `handoff:check`, and `agent:check` passed at
  `0ef83e433a0980807faa1aa8cc3ffbb0aaef809c`.

## Safety and remaining closure

All work remains repository-local, offline, deterministic, and synthetic-only.
DEV/NEXT/production contacts, authenticated product traffic, database/cloud/
infrastructure operations, sibling writes, publication, runtime AI, and
canonical promotion are all zero. Remaining closure work is the terminal
OpenSpec/task/report records, final push without force, `HEAD == origin/main`
verification, and one exact-head Actions observation. A zero-step external run
remains non-evidence.
