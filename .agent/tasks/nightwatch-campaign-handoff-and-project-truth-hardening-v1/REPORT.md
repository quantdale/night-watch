# Campaign Handoff + Project Truth Hardening — Execution Report

Status: COMPLETE
Task ID: nightwatch-campaign-handoff-and-project-truth-hardening-v1
Phase: CAMPAIGN-HANDOFF-AND-PROJECT-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Starting SHA: cf26ef88fdfe2d36c321c4c176674c5c8ee0d8fa
Validated implementation SHA: e4ac7076600f9a347d230445aa312e321f635624

## Outcome

The reproduced planner-to-executor route gap is repaired by a versioned,
read-only handoff parser/checker and a required `HANDOFF_TRUTH` quality-gate
group. Project-state v2 now has an explicit owned-key schema and faithful
promotion lifecycle/effective-authority fields. The implementation checkpoint,
clean-gate branch-shape repair, terminal continuity records, and local/clean
acceptance are complete. External exact-head CI is recorded as a separate
non-authoritative observation.

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
- Final clean-head structural checks passed at
  `d6de61a90d85fd362b7b52a293ada4bf6ee93c34`: `handoff:check`,
  `project:check`, `agent:check`, `agent:audit`, `hardening:check`,
  `quality-gate:spec`, `gate:inventory`, `typecheck`, and `git diff --check`.
  Agent history was `84` tasks / `60` strict v2 / `24` legacy v1 with `0`
  strict errors and `34` legacy warnings; the continuity/project checks took
  `2.80s` / `66176 KiB` and `4.35s` / `127504 KiB`, respectively.
- Final `npm run gate:local` passed at `d6de61a90d85fd362b7b52a293ada4bf6ee93c34`
  with all 10 groups passing, `HANDOFF_TRUTH` exactly once before
  `PROJECT_TRUTH`, receipt `receipt:sha256:3f9a2aa3c9d7c359442bece6`, wall
  `338.91s`, and peak RSS `1363832 KiB`.
- Final `npm run gate:clean` passed at the same head under Node `20.20.2` with
  all 10 groups passing, clean-before/after true, no module/auth/finding-state
  reuse, zero sibling writes, receipt
  `clean-receipt:sha256:73824a0f3232d8f5ca1b95a4`, gate receipt
  `receipt:sha256:8645bd3b379a3e986b449b3e`, wall `449.18s`, and peak RSS
  `1216152 KiB`.
- Exact-head GitHub Actions was observed once after push: run `33088870668`,
  job `98575933447`, and head `6d62d23113c51132c217d704c24996f84f7a91be`
  matched exactly. The required job completed with zero steps and was
  classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; this is external
  non-evidence and no retry or log retrieval was performed.

## Safety and closure

All work remains repository-local, offline, deterministic, and synthetic-only.
DEV/NEXT/production contacts, authenticated product traffic, database/cloud/
infrastructure operations, sibling writes, publication, runtime AI, and
canonical promotion are all zero. The OpenSpec checklist, task plan/state/
report, prompt, and final push synchronization are terminally coherent. The
single exact-head Actions observation is classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, remains external non-evidence, and does
not weaken local acceptance.
