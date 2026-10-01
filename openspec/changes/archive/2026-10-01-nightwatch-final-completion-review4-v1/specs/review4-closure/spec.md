## ADDED Requirements

### Requirement: Certification soundness is complete and reachable

Every production caller of `checkpointRoleViolations` SHALL pass the
production receipt verifier; the `() => true` shortcut SHALL survive only
inside test fixtures. Every `git diff` / `diff-tree` name listing used to
classify a commit or a range SHALL pass `--no-renames`. `verifyPersistedReceipt`
SHALL require the subject, the receipt kind, its schema, the 40-hex SHA, the
PASS verdict field for that kind, a clean emit and the re-derived content
digest, and a `FAIL`, mismatched-kind or mismatched-subject receipt SHALL
never verify. The topology certification consumer SHALL fail closed when no
receipt exists and SHALL certify only on a local Bubblewrap `PROVEN` topology
receipt at S together with exact-head CI `EXECUTED_PASS` at S; a degraded CI
envelope SHALL be recorded as non-certifying evidence and the topology class
SHALL NOT be attributed to the CI run. `autonomous-yield-proof` SHALL be
certifying only from the authorized single paid-run yield receipt (a completed
campaign at S with recorded provider calls) and SHALL remain in the required
set while honestly NOT MET. The real-tree checkpoint test SHALL derive its
expectation from `classifyCheckpointRange`. Gate and clean receipts SHALL be
persisted where the verifier reads them, and tests SHALL NOT write receipts
into the real checkout. D-150 SHALL record OD-5/OD-6 verbatim with source, and
the tamper-evident (never "forgery-proof"/"unforgeable") receipt limit SHALL be
stated in `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md` and the
`bin/lib/release-evidence.mjs` module header.

#### Scenario: A binding commit at a descendant of S stays documentary

- **WHEN** a commit at a descendant of the certified checkpoint S adds or
  changes a `receiptDigest` whose receipt is persisted, schema-valid,
  subject-matching, PASS and digest-matching for that SHA
- **THEN** the commit is classified DOCUMENTARY and the range from S stays
  DOCUMENTARY_DESCENDANT

#### Scenario: Hand-written FAIL receipt never verifies

- **WHEN** a receipt file is hand-written with `finalResult: FAIL` and a
  correctly recomputed content digest
- **THEN** `verifyPersistedReceipt` returns `verified: false` with a verdict
  reason and the condition it would bind stays unmet

#### Scenario: A renamed source file is a deletion

- **WHEN** a `docs:` commit runs `git mv src/... .agent/...`
- **THEN** the commit is SUBSTANTIVE and no tree-bound probe reports MET

#### Scenario: Missing topology receipt fails closed

- **WHEN** exact-head CI is `EXECUTED_PASS` at S but no local topology receipt
  exists at S
- **THEN** the topology consumer reports NOT MET (`TOPOLOGY_RECEIPT_ABSENT`),
  never MET by absence

#### Scenario: Yield proof is required but honestly unmet

- **WHEN** no paid-run yield receipt exists
- **THEN** `autonomous-yield-proof` is present in the required set with
  `certifying: true` and resolves NOT MET, and 15/16 never reads as 16/16

### Requirement: Guard survivors are killed by mutant families

Every guard named in review-4 R4-08 and R4-09 SHALL be registered with a
mutant family of at least five probes in
`config/hardening-rule-probes.v1.json`: the literal named mutant, an
equivalent one-line rewrite, an early-return or short-circuit variant, an
input stub and a structural variant. Every member SHALL be DETECTED.
Behavioural fixtures SHALL cover `kind: 'range'` as well as `kind: 'commit'`.
The DEV-launcher short-circuit rule SHALL analyse statements inside a top-level
`try`, effects wrapped in `if (…)`, local calls reached through assignment, and
the full fs mutation vocabulary.

#### Scenario: A stubbed classifier callback is detected

- **WHEN** the range-classifier callback is replaced by one that returns `[]`
- **THEN** the registered probe for that guard is DETECTED

#### Scenario: A wrapped DEV effect is detected

- **WHEN** a launcher performs a state-mutating call inside a top-level `try`
  block, or through a local assignment
- **THEN** the DEV-launcher short-circuit rule reports it

### Requirement: CI truth is recorded, never bent

`NIGHTWATCH_PUSH_BEFORE` SHALL be passed explicitly to the HARDENING child
process and declared in the environment surface. The `CI_STATUS` status word
SHALL be derived from the project-state block and `config/ci-block-record.v1.json`
instead of a hard-coded literal, and the truthful CURRENT_STATE CI fields
SHALL be restored at the correct anchor. Every red run and its repair SHALL be
recorded in the CI block record history, and a check SHALL fail when the
record's observed run is older than the last pushed head's observed run. No
close-out push SHALL be made before `hardening:check`, `agent:check` and
`project:check` pass locally; canonical commits SHALL require a live
MAINTENANCE claim; archive moves SHALL be approved only when byte-identical to
the archived source; and `config/task-id-ledger.v1.json` SHALL NOT list an
archived change.

#### Scenario: A red run enters the history

- **WHEN** a pushed head fails CI and is repaired forward
- **THEN** both the red run and its repair run appear in the CI block record
  history with their SHA and failure class

#### Scenario: The ledger drops an archived change

- **WHEN** a change is archived
- **THEN** `config/task-id-ledger.v1.json` no longer lists it and the ledger
  check passes

### Requirement: Product correctness defects are fixed with their evidence

`captureFailureCounts` (including `BODY_READ_ACQUISITION_BOUND`) SHALL be part
of the recorded run summary on the main journey path: its evidence, its
`journeyEvidence` manifest entry, the journey event and the auth-invalid
manifest entry, and the test SHALL assert the recorded summary rather than the
observer. Proxy liveness SHALL tolerate transient misses: a fatal
`PROXY_LIVENESS_FAILED` SHALL require N consecutive failures or a bounded
deadline, both declared as constants with a DECISIONS entry, and held body-read
slots SHALL always be released. The VC-01 required list SHALL include the
storage-state live cookie-readability test and the three devLoginSecurity
tests. The formatter-policy parent-cwd test SHALL run Prettier itself and the
suite SHALL be reachable from a CI lane, with the `.prettierignore` comment
corrected. `ai-local-canary` SHALL have accurate help or accept the advertised
`=` flag form, with dead code removed.

#### Scenario: A single missed probe is not fatal

- **WHEN** one health probe times out and the next probe succeeds inside the
  threshold window
- **THEN** the run continues and no `PROXY_LIVENESS_FAILED` is recorded

#### Scenario: A sustained outage is fatal within the deadline

- **WHEN** every probe fails past the declared threshold or deadline
- **THEN** `PROXY_LIVENESS_FAILED` is recorded within the declared bound

#### Scenario: The recorded summary carries the refusal count

- **WHEN** a main-path journey run acquires bodies and refuses at least one at
  the concurrency bound
- **THEN** the recorded evidence, its manifest entry and the journey event all
  carry the same `captureFailureCounts`

### Requirement: Ledger and record truth

`TASK_GROUP_TASK_RE` SHALL see suffixed task IDs, so an open `9.5b` keeps its
group incomplete. The corrections-v1 REPORT SHALL be corrected by appended
dated annotations (never rewritten) with a per-ID disposition table covering
every one of its 71 IDs, the integration/push annotations the finding names,
the missing DONE note and the CI-run pairing correction.

#### Scenario: A suffixed open task keeps its group open

- **WHEN** a task-group ledger declares group 9 complete while `9.5b` is open
- **THEN** `agent:check` reports the group as incomplete

#### Scenario: Every archived finding has a disposition

- **WHEN** the corrections-v1 REPORT's review-4 correction section is read
- **THEN** every VB/VC/VD/VA/VE/CF/RV/R3 ID appears individually with exactly
  one disposition

### Requirement: Hygiene and continuity reflect what happened

The merged corrections session branch SHALL be deleted only after ancestry is
proven and its SHA recorded. `gate:clean` receipts SHALL record the source
worktree path class, the live-session count and the declared SESSION WORKTREE,
and every release/remove SHALL be recorded in STATE with its timestamp and
output. The parent ACTIVE_TASK/STATE/PLAN prose SHALL agree with the structured
fields (live session, declared counts, no stray fragment, the resume anchor,
the exact next action, PLAN M9), and the task-group checker SHALL compare the
declared counts and session in prose with the structured fields.

#### Scenario: Prose drift is detected

- **WHEN** the parent prose declares a different count or session worktree
  than the structured fields
- **THEN** `agent:check` fails with the task-group/continuity diagnostic

#### Scenario: A clean receipt names its topology

- **WHEN** `gate:clean` emits a receipt
- **THEN** the receipt records the source worktree path class, the live-session
  count and the declared SESSION WORKTREE

### Requirement: Close-out is complete and evidenced

Every mutation family SHALL be DETECTED by `hardening:rules`; the focused
suites, `gate:dev`, `gate:milestone`, and the full authoritative set SHALL exit
0; integration SHALL push a fast-forward to `origin/main` and observe
exact-head CI green at the integrated tip; the session SHALL be released and
removed with `--delete-branch`; `gate:clean` SHALL run from canonical with no
live session; a REPORT SHALL carry a per-ID disposition table for R4-01..R4-24;
the change SHALL be archived with spec sync; ACTIVE_TASK SHALL route back to the
parent at "M9 10.2 remainder"; the DECISIONS session identity SHALL be replaced
by a non-identifying provenance reference via an appended correction and the
public CI-artifact exposure recorded; and the parent group 15 SHALL carry the
owner revert-to-private step as an active task line.

#### Scenario: Every review-4 finding has a disposition

- **WHEN** the review-4 REPORT is read
- **THEN** R4-01 through R4-24 each appear individually with evidence

#### Scenario: Close-out leaves no live session

- **WHEN** the child closes
- **THEN** the session is released and removed with its branch deleted,
  `gate:clean` has run from canonical, and ACTIVE_TASK routes to the parent
