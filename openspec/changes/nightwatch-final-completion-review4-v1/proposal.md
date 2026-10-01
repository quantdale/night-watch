## Why

An independent review-4 validated the range `b9306626..ce289948` (the closed
corrective child campaign plus the first parent resume batch) and produced the
24 findings in `audit.md`. Three of them are HIGH and all three lie directly on
the certification path:

- **R4-01** — the certification deadlock is back: no production caller passes
  `verifyBindingReceipt` to `checkpointRoleViolations`, so any commit that
  adds or changes a `receiptDigest` in `config/release-evidence.v1.json` is
  classified substantive, and every descendant of the certified checkpoint S
  that binds evidence makes all tree-bound probes `NOT_AT_CHECKPOINT`.
- **R4-02** — rename detection hides source deletions: the range classifiers
  use `git diff --name-only` without `--no-renames`, so a `docs:` commit that
  moves a source file into `.agent/` classifies DOCUMENTARY and eight probes
  report MET.
- **R4-03** — receipt verification is incomplete: `verifyPersistedReceipt`
  never checks the verdict, the schema or the subject, so a hand-written FAIL
  receipt with a recomputed digest verifies and the production checker can
  report a condition MET from a forged UI receipt.
- **R4-04** — the topology certification consumer passes when no receipt
  exists (`checked:false` falls through to MET) and lets a local receipt stand
  in for exact-head CI, while attributing the topology class to the CI run.

The remaining findings are MEDIUM/LOW but they are the same class of defect on
the same surfaces: guard mutants that survive (R4-08, R4-09), CI truth that is
not recorded or is bent to fit a guard (R4-10, R4-11, R4-12, R4-13), a
cross-guard contradiction that goes red exactly when a legitimate documentary
descendant certifies (R4-06), receipts that are never written where the
verifier reads them (R4-07), product defects that D-149's own refusal count and
the proxy liveness probe do not reach (R4-14, R4-15), and records/continuity
that do not state what happened (R4-20, R4-22, R4-23).

The parent campaign `nightwatch-final-product-completion-v1` is paused at a
clean checkpoint (`67eb3098` = `origin/main`, exact-head CI green) precisely so
this bounded child can resolve the whole review-4 scope before the parent
resumes at M9 task 10.2 remainder and runs on to M14 and its certification.

## What Changes

The seven task groups in `tasks.md`, one requirement per group in
`specs/review4-closure/spec.md`:

1. **Certification soundness (OD-5, OD-6).** Wire the production receipt
   verifier into every `checkpointRoleViolations` call; `--no-renames` on every
   checkpoint/range name listing; a complete `verifyPersistedReceipt`
   (subject→kind mapping, schema, SHA, PASS verdict, clean emit, content
   digest); a topology consumer that fails closed without a local Bubblewrap
   PROVEN receipt at S together with exact-head CI EXECUTED_PASS at S; an
   `autonomous-yield-proof` condition that is certifying only from the
   authorized 12.3 paid-run yield receipt and is never removed from the
   required set; the real-tree test expectation derived from
   `classifyCheckpointRange`; receipts persisted where the verifier reads them
   with tests writing to a fixture root; D-150 recorded with the
   tamper-evident (never "forgery-proof") receipt limit stated in
   SAFETY_MODEL, DECISIONS and the release-evidence module header.
2. **Guard robustness.** A mutant family of at least five probes per guard for
   every survivor named in R4-08, with behavioural fixtures for both `kind:
   'commit'` and `kind: 'range'`; the DEV-launcher short-circuit rule analyses
   statements inside top-level `try`/`if`/blocks, local-call assignments and
   the full fs mutation vocabulary, with a family including the four R4-09
   survivors.
3. **CI truth.** `NIGHTWATCH_PUSH_BEFORE` passed explicitly to the HARDENING
   child and declared in environment-surface, with a wiring test; the
   `CI_STATUS` status word derived from the project-state block /
   ci-block-record instead of a literal, with the truthful CURRENT_STATE CI
   fields restored at the correct anchor; every red run and its repair
   recorded in `config/ci-block-record.v1.json` history with a staleness check
   against the last pushed head's observation; a close-out procedure that runs
   `hardening:check` + `agent:check` + `project:check` before any close-out
   push, commits on canonical only under a live MAINTENANCE claim, approves
   archive moves only when byte-identical, and drops the archived child from
   `config/task-id-ledger.v1.json`.
4. **Product correctness.** `captureFailureCounts` carried into the main-path
   journey evidence, its manifest entry and journey event and the auth-invalid
   manifest entry, with the recorded summary under test; proxy liveness that
   tolerates transient misses (N consecutive failures or a bounded deadline,
   declared constants, DECISIONS entry) with FLAKE-003's mechanism corrected
   and the identities re-run under load; the VC-01 required list restored to
   the storage-state live cookie-readability test plus the three
   devLoginSecurity tests; the formatter-policy suite running real Prettier in
   a CI lane with a fixed `.prettierignore` comment; accurate
   `ai-local-canary` help.
5. **Ledger and records.** `TASK_GROUP_TASK_RE` accepting suffixed IDs with a
   regression for an open `9.5b`; the corrections-v1 report corrected by
   appended dated annotations with a per-ID disposition table for all 71 IDs.
6. **Hygiene and continuity.** The merged corrections session branch deleted
   with its SHA recorded; gate:clean receipts recording source worktree path
   class, live-session count and the declared SESSION WORKTREE; every
   release/remove recorded with timestamp and output; parent ACTIVE_TASK/STATE/
   PLAN prose synced, with the task-group checker extended to compare declared
   counts and session in prose with the structured fields.
7. **Close-out.** Focused suites, `gate:dev`, `gate:milestone` and
   `hardening:rules` PASS with every mutant family DETECTED; the full
   authoritative validation set exit 0; integration with exact-head CI green,
   release and removal with `--delete-branch`, `gate:clean` from canonical with
   no live session; a REPORT with a per-ID disposition table for R4-01..R4-24
   and archival with spec sync; the DECISIONS session-identity correction and
   the public-CI-artifact record; an active parent task line under group 15 for
   the owner revert-to-private step.
