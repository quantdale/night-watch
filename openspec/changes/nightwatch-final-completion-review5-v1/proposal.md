## Why

An independent review-5 validated the range `ce289948..2e0cfda0` (the closed
review-4 child campaign plus the parent's M9 10.2/10.3 work) and produced the
18 findings in `audit.md`. Two are HIGH:

- **R5-01** — archive-move smuggling (a regression from R4-13):
  `ARCHIVE_MOVE_PATH_RE` approves any file at any depth or extension, and the
  range classifier checks the archive path per commit but uses the aggregate
  diff, so a test file added in one commit and "archived" in the next
  classifies `DOCUMENTARY_DESCENDANT` while `playwright test --list` still
  picks it up.
- **R5-12** — certification is unreachable by construction: the evaluator
  requires a verified receipt whose subject equals each condition id, but only
  three receipt kinds are produced; 15 of 16 conditions and 8 of 11 lanes have
  no honest producer.

The remaining findings are the same class of defect on the same surfaces:
declared-deletion renames (R5-02), receipts that verify from a dirty tree or
for subjects their producer never executed (R5-03, R5-04), guard mutants that
survive because the families are text anchors (R5-05, R5-06, R5-08), CLI
regressions from the M9 migrations (R5-07), CI-record defects (R5-09), small
truths and identifying data (R5-10, R5-18), process breaches and stale
continuity (R5-11, R5-17), host-dependent certification (R5-13), a UI receipt
that can never verify (R5-14), a yield condition that is unsatisfiable and
spoofable (R5-15) and a topology verdict that trusts one boolean (R5-16).

The owner decided (D-152, 2026-10-02): **"both"** — keep OD-2 (target
`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129, all 16 conditions) and do the
integrity fixes (Track A) and the reachability work (Track B) together in one
bounded child campaign. The parent `nightwatch-final-product-completion-v1` is
paused at M9 task 10.4 (`d68bb1a7`) so this child can resolve the whole
review-5 scope before the parent resumes.

## What Changes

One requirement per task group in `specs/review5-closure/spec.md`:

**Track A — integrity and product fixes (first)**

1. **A1 Archive-move integrity** — approval only for approved planning shapes
   whose source path was approved and existed at the range base, classified
   commit by commit.
2. **A2 Deletions** — `--no-renames` everywhere, with a real totality rule.
3. **A3 Receipt verification completeness** — clean-emit for every certifying
   kind; a closed subject set per kind.
4. **A4 Behavioural guard coverage** — behavioural fixtures and probes for
   every R5-05 mutant, plus a committed mutation harness in `gate:milestone`.
5. **A5 DEV-launcher effect analysis** — an AST scan replacing the line regex.
6. **A6 CLI correctness** — the migration regressions and a behavioural
   shared-parser rule.
7. **A7 CI record truth** — the wrong run entry, the unrecorded runs, run-order
   staleness and newest-observation derivation.
8. **A8 Small truths** — the end-to-end failure-count test, stale prose, the
   ledger entry, the absent-Prettier skip, remaining session identifiers.
9. **A9 Process and continuity** — an append-only claim journal, `npm run
   prepush`, review-4/parent record corrections, parent continuity sync.

**Track B — make certification reachable, honestly**

10. **B1 Producer Matrix** — design before code: all 16 conditions and 11
    lanes, with the persistence mechanism recorded in D-152.
11. **B2 Producers** — a real producer for every condition and lane; the UI
    receipt fixed.
12. **B3 Clean-clone verifiability** — the D-152 persistence mechanism and
    content-addressed receipt names.
13. **B4 Yield proof** — a verifiable, unspoofable yield receipt tied to the
    parent's 12.3 authorization.
14. **B5 Topology verdict** — schema, digest, class and head verified.
15. **B6 Reachability proof** — a fixture-repository end-to-end proof of 16/16.

16. **C Close-out** — the full authoritative set, integration with exact-head
    CI green, `gate:clean` from canonical, the per-ID REPORT, archival with
    spec sync, and routing back to the parent at M9 10.4.

## Capabilities

### New Capabilities

- `review5-closure`: the requirements above.

## Impact

Checkpoint classification and receipt verification (`bin/lib/checkpoint-role.mjs`,
`bin/lib/release-evidence.mjs`, `bin/project-state-check.mjs`), the hardening
rules and probe registry, the DEV-launcher and shared-parser rules, several
operator CLIs, the CI block record, release-certification producers and their
tests, and the continuity records. No Alphaus repository, environment or
datastore is touched; the parent keeps its single-use grants (the 12.3 paid
run and the 15.4 npm query); the exit rule (no review-6 by default) is the
stop condition for Track B.
