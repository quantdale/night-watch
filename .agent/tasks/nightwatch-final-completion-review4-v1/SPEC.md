# SPEC — nightwatch-final-completion-review4-v1 (frozen intent)

## Identity

- Task ID: `nightwatch-final-completion-review4-v1`
- Phase: `COMPLETION_REVIEW4_V1`
- CHILD OF: `nightwatch-final-product-completion-v1`
- Campaign class: `COMPLETION_REVIEW4_V1`
- Project verdict effect: `PRESERVE`
- Continuity protocol: `nightwatch.agent-continuity.v2`
- Starting SHA: `67eb30981b4bb4d6bb6959b9afee9345938f5750`
- Canonical change: `openspec/changes/nightwatch-final-completion-review4-v1/`

## Objective

Resolve **every** finding of the independent review-4 (R4-01..R4-24, recorded
verbatim in `openspec/changes/nightwatch-final-completion-review4-v1/audit.md`)
so the paused parent terminal campaign can resume at M9 task 10.2 remainder on
a sound certification path.

## Frozen scope

1. **Certification soundness (OD-5, OD-6).** Wire the production receipt
   verifier into every `checkpointRoleViolations` call; `--no-renames` on every
   checkpoint/range name listing; a complete `verifyPersistedReceipt`; a
   topology consumer that fails closed without a local Bubblewrap PROVEN
   receipt at S together with exact-head CI `EXECUTED_PASS` at S;
   `autonomous-yield-proof` certifying only from the authorized 12.3 paid-run
   yield receipt and never removed from the required set; the real-tree test
   expectation derived from `classifyCheckpointRange`; receipts persisted where
   the verifier reads them with tests on a fixture root; D-150 recorded with
   the tamper-evident receipt limit stated in SAFETY_MODEL, DECISIONS and the
   release-evidence module header.
2. **Guard robustness.** Mutant families (>= 5 probes each, all DETECTED) for
   every survivor named in R4-08 and R4-09, with behavioural fixtures for
   `kind: 'range'` as well as `kind: 'commit'`, and the widened DEV-launcher
   effect analysis.
3. **CI truth.** `NIGHTWATCH_PUSH_BEFORE` passed and declared; the `CI_STATUS`
   status word derived, not literal; truthful CURRENT_STATE CI fields restored;
   red runs and repairs recorded; close-out procedure enforced.
4. **Product correctness.** `captureFailureCounts` in every recorded summary on
   the main journey path; proxy liveness tolerating transient misses with
   declared constants and a DECISIONS entry; VC-01 required list restored;
   formatter policy running real Prettier in a CI lane; accurate
   `ai-local-canary` help.
5. **Ledger and records.** `TASK_GROUP_TASK_RE` accepts suffixed IDs; the
   corrections-v1 REPORT corrected by appended dated annotations with a per-ID
   disposition table for all 71 IDs.
6. **Hygiene and continuity.** Merged session branch deleted after ancestry
   proof with its SHA recorded; gate:clean receipts record worktree topology
   and live-session count; release/remove recorded; parent prose synced and
   checked.
7. **Close-out.** Focused suites + `gate:dev` + `gate:milestone` +
   `hardening:rules` PASS; the full authoritative set exit 0; integration with
   exact-head CI green; release and remove with `--delete-branch`;
   `gate:clean` from canonical with no live session; REPORT with a per-ID
   disposition table for R4-01..R4-24; archival with spec sync; ACTIVE_TASK
   routed back to the parent at "M9 10.2 remainder".

## Frozen rules

- The review-4 scope is closed. A new finding enters scope only if it is HIGH
  severity **and** lies on the certification path; every other new finding goes
  to the parent census with a disposition. There is no review-5 by default.
- Never tick on an unintegrated commit without `(implemented; CI pending)`.
  Never close a group or the child without an observed green exact-head CI at
  the tip that contains the close-out.
- Never push without running `hardening:check`, `agent:check` and
  `project:check` locally first. Never commit on canonical without a live
  MAINTENANCE claim.
- Never change a truthful record to satisfy a guard. Fix the guard, or record
  the conflict and STOP.
- Receipts are tamper-evident only. No wording may call them forgery-proof or
  unforgeable.
- The parent owns the single-use grants (the paid run is 12.3, the npm query is
  15.4). This child claims none of them.
- The repository is temporarily public: nothing secret, customer-derived,
  authentication-bearing or identifying may be published, and no new absolute
  home path may be added.
- No Alphaus DEV/NEXT/production contact. No force-push. No history rewrite.

## Declared Deletions

The advertised deletions for this session (measured against the session base
`67eb30981b4bb4d6bb6959b9afee9345938f5750`). Every tracked-file deletion is
listed here before it happens.

- `openspec/changes/nightwatch-final-completion-review4-v1/audit.md`
  (archived by move to `openspec/changes/archive/2026-10-01-nightwatch-final-completion-review4-v1/audit.md` at close-out)
- `openspec/changes/nightwatch-final-completion-review4-v1/design.md` (archived by move at close-out)
- `openspec/changes/nightwatch-final-completion-review4-v1/proposal.md` (archived by move at close-out)
- `openspec/changes/nightwatch-final-completion-review4-v1/tasks.md` (archived by move at close-out)
- `openspec/changes/nightwatch-final-completion-review4-v1/specs/review4-closure/spec.md` (archived by move at close-out)

## Completion Criteria

The child is COMPLETE only when: every review-4 finding has exactly one
recorded disposition with evidence; every §5 mutant family is DETECTED; the
focused suites, `gate:dev`, `gate:milestone` and the full authoritative set all
exit 0; exact-head CI at the integrated close-out tip is green and recorded;
the session is released and removed with `--delete-branch`; `gate:clean` runs
from canonical with no live session; the REPORT carries the per-ID disposition
table; the change is archived with spec sync; and ACTIVE_TASK routes back to
the parent at "M9 10.2 remainder".
