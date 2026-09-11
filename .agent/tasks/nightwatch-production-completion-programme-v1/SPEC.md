# Nightwatch production completion programme

## Task purpose

Execute the bounded 21-group programme specified by
`openspec/changes/nightwatch-production-completion-programme-v1/` so that
Nightwatch closes the record-level gaps (F-01 … F-12) and the code-level gaps
(F-13 … F-21) that remain after the eleven consecutive terminal campaigns
certified at `36bd493`, and leaves every locally closable lane closed with
honest evidence and every externally blocked lane recorded with a named owner
action and revisit condition.

## Established starting state

- Task ID: `nightwatch-production-completion-programme-v1`
- Starting SHA: `36bd4930db978423f97e16f35250c2e66bfa112c`
  (`HEAD == origin/main`, working tree clean apart from the untracked OpenSpec
  change this task executes).
- Predecessor `nightwatch-control-center-style-and-absence-truth-v1` is
  terminal COMPLETE and integrated; A-01 through A-04 closed.
- Measured baseline (audit.md, reconfirmed live): `typecheck`,
  `hardening:check`, `project:check`, `agent:check`, `validation:universe`
  and `session:status` PASS; 432 declared checks with 18 never executed;
  `POSITIVE_DEPLOYMENT_FACTS: 0`; 0 admitted findings; 57 OpenSpec changes
  with 150 stale unchecked boxes; 31 legacy v1 task records; 19 historical
  `test-results*` roots; 904 lines of confirmed dead architecture; 62 CLI
  entry points bound by runtime string paths; 319 schema literals with no
  lifecycle; no accessibility evidence.
- The permanent owner scope freeze, L6 containment, fail-closed egress,
  C-00 protocol, C-10 privacy firewall and D-4 production unloadability all
  remain binding and unchanged.

## Required deliverables

1. Groups 1–13: ledger truth and the spec baseline; validation lane state as
   data; CI-topology clean gate and exact-head CI authority; operator CLI
   contract; evidence lifecycle hygiene; workspace/continuity drift closure;
   documentation currency; Control Center residual truth; dependency and
   supply-chain currency; deployment fact acquisition; contained DEV semantic
   acceptance; autonomous yield proof; release definition and verdict.
2. Groups 14–21: dead architecture closure; CLI-to-implementation contract;
   structural rule soundness; schema version lifecycle; UI error taxonomy
   rendering; configuration contract and UI decomposition; accessibility
   certification; authenticated capability lifecycle.
3. Every group's own tasks.md boxes ticked only when its acceptance evidence
   exists; every owner-decision or external dependency recorded as a decision
   request or a blocking condition, never fabricated.
4. `REPORT.md`, task `STATE.md`, `.agent/ACTIVE_TASK.md`,
   `.agent/EXECUTION_PROMPT.md` and the durable docs reconciled to the
   certified checkpoint.

## Explicit non-goals

- Contact with any real Alphaus environment, production data, database,
  sibling repository write, or credential use.
- Acquiring or self-authorizing the owner/organizational decisions the
  programme names (CI route, egress authorization, `mochi` access, evidence
  reclaim approval, branch deletion, provider capability).
- Weakening any authorization gate, the privacy firewall, C-00, or the owner
  scope freeze.
- Re-opening any terminal campaign's findings.
- Publishing anything outside the repository.

## Safety constraints

- LOCAL only; sibling repositories stay read-only.
- Never force-push, rebase or amend another session's commits; never touch
  another owner's session (`nightwatch-repository-hardening--e7b9be89` is
  foreign and remains untouched).
- One writing agent, one owned session worktree, one session identity.
- No secret, credential, token, cookie, or raw customer value enters source,
  artifacts or `.agent` files.
- Every deletion of a tracked file is declared under `## Declared Deletions`
  before validation.

## Declared Deletions

None.

## Acceptance criteria

- `openspec validate --all` exits zero and `openspec/specs/` is non-empty.
- Every implemented group has its tasks.md boxes ticked with evidence, and
  every un-closeable lane is recorded with its class, owner action and
  revisit condition.
- Root `typecheck`, `hardening:check`, `project:check`, `agent:check`,
  `validation:universe`, UI typecheck/tests/build, browser lane and the full
  offline regression pass at the final implementation checkpoint.
- `gate:local` passes at the certified checkpoint from the owned session with
  the project/task truth reconciled to it.
- The final `git diff` contains only intentional, specification-aligned
  changes; the session is integrated by fast-forward and `HEAD == origin/main`.
