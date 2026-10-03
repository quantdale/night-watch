# Report — review-5 corrective campaign

Status: IN_PROGRESS
Task ID: nightwatch-final-completion-review5-v1
Phase: COMPLETION_REVIEW5_V1
CHILD OF: nightwatch-final-product-completion-v1
Starting SHA: d68bb1a7c7cf244da654815a1e7f266e1985f30c

Note: the archive, the ledger-entry removal, the publication of `review5-closure` and the COMPLETE flip described
below land in the canonical close-out commit that follows the integration of this tip and the release of the
session (the handoff and continuity guards keep an IN_PROGRESS record's change un-archived until then).

## Scope

The groups of `tasks.md` (Track A: A1-A9, Track B: B1-B6, close-out C), one spec
requirement per group in
`openspec/changes/nightwatch-final-completion-review5-v1/specs/review5-closure/spec.md`.
The owner decision "both" (D-152, 2026-10-02) kept OD-2 (the target is
`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129, all 16 conditions) and asked for
the integrity fixes first (Track A) and certification made reachable honestly
(Track B). Every finding of the independent review-5 (`audit.md`) has exactly one
disposition below.

## Per-ID disposition table

| ID | Sev | Task | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| R5-01 | high | A1 | CLOSED | `ARCHIVE_MOVE_PATH_RE` approves only the planning shapes (`proposal`/`design`/`audit`/`tasks.md`, `.openspec.yaml`, one-level capability specs); a range is judged commit by commit and an unreadable or unlistable commit is a violation for every listed path. `archiveMoveIntegrity.test.ts` runs the production classifier over real Git repositories (add-then-archive a test file is SUBSTANTIVE); mutants BM-002, BM-004 (and R1 = BM-001). |
| R5-02 | medium | A2 | CLOSED | `--no-renames` on every name listing in the declared-deletion gate and every checkpoint/range listing, enforced by a SYNTACTIC totality rule (`bin/lib/name-listing-scan.mjs`, `RENAME_AWARE_LISTINGS`) instead of two text anchors; `nameListingRenameTotality.test.ts` and the `git mv` regression in `workspaceIsolation.test.ts`. |
| R5-03 | medium-high | A3 | CLOSED | Gate receipts record `sourceRootCleanAtEmit`; `RECEIPT_KINDS.gate.requireCleanEmit` is true and the per-schema clean field is enforced (a dirty gate receipt no longer verifies); `gateReceiptPersistence.test.ts`; mutant BM-006. |
| R5-04 | medium | A3 | CLOSED | `bin/lib/receipt-schemas.mjs` is a closed table: each schema declares its subject set and an `executed(body)` derivation from what the producer RAN, so a receipt claiming a subject it never executed, or a foreign subject, verifies for nothing; mutants BM-007, BM-008. |
| R5-05 | medium | A4 | CLOSED | The collector/classifier guards are driven by behavioural fixtures (`checkpointBindingFacts`, `evidenceEvaluationInputs`, `releaseReceiptProbes` tests over real Git repositories and real producer output), the probes were re-anchored, and the committed behavioural mutation harness (`bin/lib/hardening/mutation-harness.mjs`, `npm run hardening:mutants`, wired into `gate:milestone`) applies each registered mutant to a scratch copy: 116 mutants / 116 DETECTED / 0 survived. |
| R5-06 | medium | A5 | CLOSED | The DEV-launcher effect scan is an AST analysis (`bin/lib/dev-launcher-effects.mjs`, 22 samples) covering IIFEs, destructured calls, `Reflect.apply`, `.call`, aliases, function expressions, dynamic import and the region before the guard; the 12 R5-06 mutants are registered (BM-025..036) and detected. |
| R5-07 | medium | A6 | CLOSED | `nightwatch-agent` refuses an unknown command with exit 2 through declared `choices`; `phase22-dev explain <id>` declares its positional; the help text lists only consumed flags; `phase23-dev` is OWNER_GATED; `cliRegressionsR5.test.ts` (the unknown-command test now distinguishes the declared-choices refusal from the stray-positional refusal; BM-037..041). |
| R5-08 | medium | A6 | CLOSED | The shared-parser rule has a behavioural sweep (`operatorCliHelpSweep`, `operatorCliStructure`): every bin is run under `--help`, `--print-metadata` and an unknown argument and must not execute; bins are listed from git; `nightwatch.mjs --help` separates LIBRARY_RETAINED modules from undeclared ones; the registry now counts 77 bins (the new `certify-evidence` is declared); mutants BM-042..051. |
| R5-09 | medium | A7 | CLOSED | The CI block record is validated in RUN ORDER, the newest observation per SHA decides the claim, the wrong 027367d9 entry is repaired, every red and repair run is recorded and the top level is the newest run (`ciBlockRecord.test.ts`; BM-052..056). |
| R5-10 | low-medium | A8 | CLOSED | The `captureFailureCounts` end-to-end test asserts a non-zero `BODY_READ_ACQUISITION_BOUND` in the recorded summary (BM-058) and exposed a REAL defect fixed here: a refused body read left `response.body()` with no rejection handler, an unhandled rejection that Playwright blamed on an unrelated test (BM-071, `bodyReadAcquisition.test.ts`); the stale CURRENT_STATE CI prose, the archived review-4 ledger entry (now auto-detected, BM-057) and the formatter-policy absent-Prettier branch are repaired. |
| R5-11 | medium | A9 | CLOSED | An append-only canonical claim journal (`.agent/CLAIM_JOURNAL.md`, `bin/lib/claim-journal.mjs`) with a coverage check and recorded gaps for `67eb3098`, `e5ec64ca`, `46c8b674`; `npm run prepush` (typecheck, typecheck:bin, hardening:check, agent:check, project:check, affected suites) referenced by every integrate step (`SESSION_PREPUSH_REQUIRED`); the false review-4 statements are corrected by APPENDED blocks (the clean receipt's declared worktree, the 90%-similar archive rename, the SUBSTANTIVE close-out commit, the unclaimed commits, the post-deletion SHA record); the four red runs the lane would have prevented are recorded. |
| R5-12 | high | B1, B2, B6 | CLOSED (reachable; see Reachability) | The Producer Matrix (27 rows) is complete and strict-validated; every subject has a producer in the closed table `bin/lib/certification-subjects.mjs`; `npm run certify:evidence` produces, imports, publishes, binds and verifies receipts; `certificationEvidence`, `certifyEvidence` and `certificationReachability` tests; mutants BM-072..088 and BM-115..116 (R5-12 family). |
| R5-13 | medium-high | B3 | CLOSED | Receipts are committed under the tracked `evidence/certification/<S>/<subject>.json` (add-only, content-verified guard class `ADD_ONLY_EVIDENCE_RECEIPT`), the verifier reads that directory, file names are the subject (no `local-<head12>` overwrite), and the four host-bound checks consume the committed measurement of S (`committedMeasurement.test.ts`, `evidenceReceiptGuard.test.ts`; BM-093..102, BM-108). The clean-clone proof is evaluator-level (see Recorded limits). |
| R5-14 | medium | B2 | CLOSED | The UI harness receipt digest carries the `receipt:` prefix and a verdict re-derived from its recorded tests, `executed` requires every harness test to pass, and `ui-error-taxonomy-rendering` verifies from REAL producer output (`releaseReceiptProbes.test.ts`; BM-089..092). |
| R5-15 | medium | B4 | CLOSED | `config/yield-run-authorization.v1.json` (NOT_GRANTED by default, set by the parent at 12.3), provider and model labels in the recorded reasoner identity, and an evaluator that qualifies a run only against a GRANTED record with the exact declared print-CLI digest, provider and model within `maxQualifyingRuns` (`yieldAuthorization.test.ts`, G12 probe tests; BM-109..114). |
| R5-16 | low-medium | B5 | CLOSED | The topology consumer admits only receipts that are schema-valid, `topology-receipt:`-digest-verified and class/certifying-consistent; a PROVEN class needs a non-static PASS run with the Bubblewrap envelope and no unexercised absence (`topologyReceiptVerification.test.ts` over REAL `gate:topology static` output and its one-field forgeries; BM-103..107). |
| R5-17 | low | A9 | CLOSED | ACTIVE_TASK's three ledger fields are compared with STATE's and a missing or different value fails (`TASK_GROUP_LEDGER_ACTIVE_DRIFT`); the live-session prose scan is every letter case outside history paragraphs; the progress scan covers every statement form and the PLAN; the bin-typecheck note carries the live figures (BM-065..070); the parent prose is synced at the route-back. |
| R5-18 | low | A8 | CLOSED | The remaining session identifiers are redacted by appended corrections `CORR-R5-18-001..003`, and D-152 records that the full identifier remains in earlier PUBLIC git history (never rewritten). |

## Validation

- Local at the integrated tip `5b2ea0f7`: `npm run prepush` PASS (6029 passed / 0 failed);
  `npm test` 6029 passed / 0 failed / 33 declared skips (6062 executed); `gate:dev` PASS and
  `gate:milestone` PASS (each over the Track B scope with `--base=4f4d7bfd`); `gate:local` PASS
  (15 groups, receipt persisted); `hardening:rules` 95 rules / 273 probes / 273 DETECTED / 0
  undetected with every mutation restored; `hardening:mutants` 116 mutants / 116 DETECTED / 0
  survived; `typecheck`, `typecheck:bin` (15/77 conforming, 1402 ceiling), `hardening:check`,
  `schema:check`, `validation:universe`, `agent:check`, `agent:audit`, `project:check`,
  `workspace:check`, `session:check` and `openspec validate --all --strict` exit 0.
- Exact-head CI: every run is recorded in `config/ci-block-record.v1.json`; Track A
  at `4f4d7bfd` run **37044532848** GREEN; Track B at `5b2ea0f7` run **37062959122** GREEN.
- Mutation testing found real defects, not only weak tests: BM-063/064 (the lane validator was
  never run on a mutated lane), BM-037/047 (an equivalent and an ineffective mutant), BM-072/086
  (redundant checks removed instead of kept dead) and the unhandled body-read rejection (R5-10).

## Reachability (R5-12) — result and the exit rule

**Mechanism.** The persistence mechanism is D-152's: tracked, add-only, content-verified receipts in
a documentary descendant of S, verified by the same code from a clean clone. The proof
`tests/unit/certificationReachability.test.ts` produces 15 receipts with the real CLI, imports the
host UI receipt, classifies the evidence commit DOCUMENTARY with the real classifier, and from a
clean clone with NO artifacts directory reaches **16/16 MET at EXACT evidence** through the real
evaluator and verifier; the host and the clone agree on every condition; removing, tampering with or
mis-binding one receipt removes exactly that condition. DECLARED LIMIT: the sixteen live checks are
a stand-in verdict there; each is a separate measurement. The REAL `bin/project-state-check.mjs`
run in a clean clone of the real tree (with `node_modules` present) gave the same check state as the
host on all 16 conditions.

**The real tree today** (at the integrated tip, certified checkpoint `027367d9`, 0/16 MET because
every tree probe is `NOT_AT_CHECKPOINT` until a new S is certified, and these are the underlying
measurements):

| # | Condition | Measured now | What reaching MET needs |
| --- | --- | --- | --- |
| 1 | validation-lane-closure | UNMET: 10 PROVEN lanes carry evidence that strictly precedes S; `owner-manual` unavailable (revisit 2026-10-11) | rebind every lane at the final S (receipts for lanes 17-27) and renew the `owner-manual` record before S |
| 2 | exact-head-ci-authority | UNMET: no local PROVEN topology receipt at S (CI is EXECUTED_PASS) | run `gate:topology` on the Bubblewrap host at S, then `certify:evidence`; the GitHub run at the final S |
| 3 | autonomous-yield-proof | UNMET: the authorization record is NOT_GRANTED and no authorized run exists | **parent 12.3**: set GRANTED with the declared CLI digest, provider and model before S, run once, derive the receipt |
| 4 | completion-ledger-truth | measured PASS | receipt at the final S |
| 5 | operator-cli-contract | measured PASS (77 bins, 73 conforming operator CLIs) | receipt at the final S |
| 6 | documentation-currency | measured PASS | receipt at the final S |
| 7 | workspace-continuity-drift-closure | measured PASS | receipt at the final S |
| 8 | dependency-supply-chain-currency | measured PASS on the qualified host (`vueReviewDue` 2026-10-09) | **parent 15.4** refresh (including biome and prettier) before S |
| 9 | dead-architecture-closure | measured PASS | receipt at the final S |
| 10 | cli-implementation-contract | UNMET: bin type-check mode REPORTING, 1402 diagnostics | **parent M9 10.4-10.6**: annotate to zero and set BLOCKING |
| 11 | structural-rule-soundness | measured PASS | receipt at the final S |
| 12 | schema-version-lifecycle | measured PASS | receipt at the final S |
| 13 | ui-error-taxonomy-rendering | UNMET: no UI-harness receipt on this host | `gate:ui` at S, then `certify:evidence import` |
| 14 | configuration-contract | measured PASS | receipt at the final S |
| 15 | accessibility-certification | UNMET: no accessibility record on this host | the browser lane at S (Chrome), then `certify:evidence` |
| 16 | authenticated-capability-lifecycle | measured PASS | receipt at the final S |

**Exit rule.** Track B made all 16 conditions REACHABLE honestly: every condition has an honest
producer and a verification path from a clean clone, and none needed an owner decision. It did not
REACH them on the real tree, and it could not: conditions 3, 8 and 10 depend on the parent's grants
and work (12.3, 15.4, M9 10.4-10.6), and the final S does not exist yet. The exit rule did not
trigger; there is no review-6 by default.

## Recorded limits

- Receipts are tamper-evident, not tamper-proof (OD-5): no signature, key or MAC; nothing here says
  or implies "forgery-proof" or "unforgeable".
- The reachability proof is evaluator-level with a stand-in for the sixteen live checks, and the
  fresh-clone `project:check` comparison was run on the real tree (no committed evidence yet), not
  on a synthetic S with every external input. A full-machinery synthetic-S `project:check` proof is
  NOT claimed.
- `owner-manual` is certified only as a recorded, current, unexpired unavailable lane.
- The child claimed neither single-use grant (12.3 paid run, 15.4 npm query); both stay with the
  parent. The repository stays TEMPORARILY PUBLIC (D-149) until the owner's revert step.
- `npm run prepush` exceeded its 600 s advisory target (770-1370 s) because the affected set is the
  whole suite after infrastructure changes; it is reported, not hidden.

## Safety events

No Alphaus DEV/NEXT/production contact; no authenticated runtime, database, cloud or infrastructure
operation; no sibling-repository mutation; no external publication, issue or pull request; no force
push or history rewrite. External contact was OD-3 only: Git fetch/push and GitHub Actions
observation. One process event: the session holder's process ended mid-campaign, the worktree became
`STALE_SESSION` and `handoff:check` rejected it (`HANDOFF_TARGET_BRANCH_MISMATCH`); it was re-adopted
with `claim --adopt` (`sess-931bc42f5779` -> `sess-e4ffed7ba3f7`) and the claim journal windows were
closed and opened accordingly.

## Close-out record

- Integrated: Track A `4f4d7bfd` (run 37044532848 GREEN), Track B `5b2ea0f7` (run 37062959122
  GREEN), then the close-out documentary commits; each tip's exact-head run is recorded in
  `config/ci-block-record.v1.json`.
- Archive: the change moved to `openspec/changes/archive/<date>-nightwatch-final-completion-review5-v1/`
  with spec sync (`openspec/specs/review5-closure/`); its `config/task-id-ledger.v1.json` entry is
  removed in the same commit (an archived change's IDs are no longer enforced).
- Route: `.agent/ACTIVE_TASK.md` returns to `nightwatch-final-product-completion-v1`, resuming at M9
  task 10.4 (annotate bins to zero diagnostics); `SESSION WORKTREE: NONE` and the parent STATE branch
  `main` until the parent claims its own session.
- Scope discipline: no finding outside review-5 was added to this campaign.
