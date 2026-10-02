## A1. Archive-move integrity

- [x] A1.1 Archive-move approval only for approved planning shapes (`proposal|design|audit|tasks.md`, `.openspec.yaml`, `specs/<cap>/spec.md`) whose source path was approved and existed at the range base; classify every path in a range commit-by-commit, not via the aggregate diff; two-commit smuggle fixture (add test file, then archive) must be SUBSTANTIVE; R1 (`before !== after` dropped) and a single-commit non-identical move registered and DETECTED (R5-01). — DONE (implemented; CI-observed green at `67d8757e`, run 37009611291): `ARCHIVE_MOVE_PATH_RE` admits only the approved planning shapes; `checkpointRoleViolations` judges a range commit by commit (`diff-tree --no-renames -z` per commit) and fails closed for an unlistable range; the two-commit smuggle, add-then-delete, single non-identical move and non-planning-move fixtures are SUBSTANTIVE (tests/unit/archiveMoveIntegrity.test.ts and the guard-integrity rule); probes HC-251..HC-255 registered, HC-208/238/239 re-anchored.

## A2. Deletions

- [x] A2.1 `--no-renames` in the declared-deletion gate and in every name-status/name-only listing that feeds classification or deletion checks; a real totality rule (AST/call scan of every `git diff`/`diff-tree`/`log --name-*` invocation) with probes; `git mv` of a tracked source is a declared-deletion failure (R5-02). — DONE (implemented; CI-observed green at `67d8757e`, run 37009611291): `--no-renames` on the declared-deletion gate and the remaining listings (localGit, preFixSource); `checkNameListingRenameTotality` (parsed scan, `bin/lib/name-listing-scan.mjs`) requires every name-listing flag inside a literal argv array holding `--no-renames` or a declared `--find-renames` listing; `git mv` of a tracked source fails WORKSPACE_UNDECLARED_TRACKED_DELETION (workspaceIsolation tests); probes HC-256..HC-265.

## A3. Receipt verification completeness

- [x] A3.1 Gate receipts record tree cleanliness at emit; `requireCleanEmit` true for every certifying kind; gate:local receipts from a dirty tree are non-certifying (R5-03). — DONE (implemented; CI pending): the gate receipt records `sourceRootCleanAtEmit` (measured at emit, inside the digested body, in both receipt literals); `RECEIPT_KINDS.gate.requireCleanEmit` is true and the per-schema clean field is enforced (`bin/lib/receipt-schemas.mjs`), so a `gate:local` receipt from a dirty or unmeasured tree verifies for nothing; producer tests run the real gate in a git fixture (clean → true, dirty → false); probes HC-266, HC-272. — CI GREEN: exact-head run 37011881613 at `a2e04648`.
- [x] A3.2 Every receipt kind declares a closed subject set derived from what its producer executed (no `subjects:null`); a receipt naming a subject its producer did not execute never verifies (R5-04). — DONE (implemented; CI pending): `bin/lib/receipt-schemas.mjs` is the single closed schema table (closed subject set, clean-emit field, and an `executed(body)` derivation per schema); the gate kind's `subjects` is the closed union (never `null`); a receipt naming a subject outside its schema's set, or one whose body records no executed groups/tests for the subject, never verifies; probes HC-267..HC-271. — CI GREEN: exact-head run 37011881613 at `a2e04648`.

## A4. Behavioural guard coverage (collector/classifier)

- [x] A4.1 Replace text-anchor guards with behavioural fixtures for: checkpoint binding facts (headSha, porcelain, range class, changedFiles), range violation callback, `certifying`, G12/G18/G20 relations, `bindingReceiptVerifier`, `evidenceArtifactAtSha`, `artifactDemoted`, `evidenceCertifying`, `verifyPersistedReceipt` digest path, `archiveMoveHolds`, unreadable/unlistable diff handling (fail closed) (R5-05). — DONE (implemented; CI pending).
- [x] A4.2 Register every R5-05 mutant (N1–N10, V1, R1–R5, the two R4-08 literals) as probes; all DETECTED by behaviour, not anchors (R5-05). — DONE (implemented; CI pending).
- [x] A4.3 Commit the mutation harness (§1.3) and run it in gate:milestone (R5-05). — DONE (implemented; CI pending).

## A5. DEV-launcher effect analysis

- [x] A5.1 Replace the line-regex effect scan with an AST scan of the launcher's top level up to the guard and up to the short-circuit: aliases/destructuring, function expressions, IIFEs, `.call/.apply/Reflect.apply`, any `child_process` or `fs` binding (namespace, named, default), `globalThis.fetch`/network, dynamic import, and the region before `guardDevLane`; register all 12 R5-06 mutants and detect them (R5-06). — DONE (implemented; CI pending).

## A6. CLI correctness

- [x] A6.1 `nightwatch-agent` unknown commands exit 2; `phase22-dev explain <id>` works (declared positional) with a regression; remove/correct phantom or misleading flags; phase23-dev authorization class reflects DEV execution (R5-07). — DONE (implemented; CI pending).
- [x] A6.2 Shared-parser rule becomes behavioural (per-bin effect sweep under `--help`/`--print-metadata`/unknown flag in a sandbox, or AST gating of the dispatcher); bins enumerated from `git ls-files`; probes across ≥3 bins; restore launcher-side probes for migrated DEV launchers; `nightwatch.mjs --help` distinguishes LIBRARY_RETAINED from undeclared (R5-08). — DONE (implemented; CI pending).

## A7. CI record truth

- [x] A7.1 Fix the 36797226757→027367d9 entry (027367d9's run is 36790169165, with its jobId); record every red and repair run listed in R5-09 in run order; refresh the top level to the newest observed run on every push; staleness compares run order/creation time; `deriveCiObservationStatus` uses the newest observation per SHA; fix the typo (R5-09). — DONE (implemented; CI pending).

## A8. Small truths

- [x] A8.1 `captureFailureCounts` end-to-end test asserts a non-zero `BODY_READ_ACQUISITION_BOUND` in the recorded summary; fix the stale CURRENT_STATE live-CI prose; remove the archived review4 entry from the task-ID ledger (and auto-detect archived entries); the formatter-policy absent-Prettier branch emits a declared skip identity (R5-10). — DONE (implemented; CI pending).
- [x] A8.2 Redact the remaining session UUIDs by appended correction (archived tasks.md:96 prefix, phase-16a REPORT:13) and record in DECISIONS that full UUIDs remain in public git history (R5-18). — DONE (implemented; CI pending).

## A9. Process and continuity

- [x] A9.1 Add an append-only canonical claim journal (claim id, task, created, released, commits made under it); agent:check fails a canonical commit not covered by a journal entry from the claim era onward; record the 67eb3098/e5ec64ca/46c8b674 gaps (R5-11). — DONE (implemented; CI pending).
- [x] A9.2 Pre-push checklist enforced by a script (`npm run prepush` = hardening:check, agent:check, project:check, typecheck, typecheck:bin, affected focused suites) and referenced by every integrate step; record the four red runs it would have prevented (R5-11). — DONE (implemented; CI pending).
- [x] A9.3 Append corrections to the review-4 REPORT (declaredSessionWorktree, archive move not byte-identical, close-out commit substantive) and to parent 10.2/10.3 and review4 7.1/7.2 ticks ("ticked before CI; 10.3 first push red"); drop stale "CI pending" markers by annotation; record the split bootstrap and the post-deletion SHA record (R5-11). — DONE (implemented; CI pending).
- [x] A9.4 Sync parent ACTIVE_TASK/STATE/PLAN prose; ACTIVE_TASK `TASK_NEXT_ID` validated against the open set and STATE; extend the prose checker to all forms/counts; refresh the bin-typecheck note (R5-17). — DONE (implemented; CI pending).

## B1. Certification Producer Matrix (design before code)

- [x] B1.1 Fill the Producer Matrix in design.md for all 16 conditions and 11 lanes (producer, gate group, receipt kind/schema/subjects, verdict fields, persistence, clean-clone verifiability, binding route); record the persistence mechanism in D-152; strict-validate; any row that cannot be completed honestly → STOP for owner decision (R5-12, R5-13). — DONE (implemented; CI pending): the matrix is complete (27 rows, none EMPTY, no owner decision needed), the mechanism is recorded in D-152 (tracked `evidence/certification/<S>/<subject>.json`, documentary descendant, approved path + content guard), and `openspec validate --strict` passes.

## B2. Producers

- [ ] B2.1 Implement a producer (or a declared mapping from an existing executed gate group) for every condition and lane per the matrix; each emits a receipt with closed subjects, verdict, SHA, tree-clean and a `receipt:`-prefixed digest; end-to-end tests use REAL producer output, never hand-shaped receipts (R5-12).
- [ ] B2.2 Fix the UI receipt (prefix, verdict field) and prove `ui-error-taxonomy-rendering` verifies from producer output (R5-14).

## B3. Clean-clone verifiability

- [ ] B3.1 Implement the D-152 persistence mechanism so CI and gate:clean verify the same receipts the host does; receipt filenames are content-addressed or immutable (no `local-<head12>` overwrite); a test runs project:check in a fresh clone with the committed evidence and gets the same verdict as the host (R5-13).

## B4. Yield proof

- [ ] B4.1 The paid-run campaign emits a yield receipt the verifier accepts (closed subject `autonomous-yield-proof`, verdict, SHA, provider identity bound to the declared provider CLI digest and model, completed campaign, recorded provider calls); a fake or unrecorded print CLI cannot satisfy it; the receipt ties to the parent 12.3 authorization record (R5-15).

## B5. Topology verdict

- [ ] B5.1 Topology verdict verifies the receipt schema, its `topology-receipt:` digest, class/certifying consistency and gitHead; forged or inconsistent receipts never certify (R5-16).

## B6. Reachability proof

- [ ] B6.1 A fixture-repository end-to-end proof: produce every receipt at S via the real producers, commit the evidence in a documentary descendant, run project:check from a clean clone, and observe 16/16 MET; any condition that cannot reach MET is listed with its reason and triggers the exit rule (§1.4) (R5-12).

## C. Close-out

- [ ] C.1 Focused + gate:dev + gate:milestone (with the mutation harness: zero survivors) + hardening:rules PASS; commit.
- [ ] C.2 Full authoritative set (`npm run prepush` + gate:local + npm test + UI + openspec validate --all --strict); every command exit 0.
- [ ] C.3 Integrate; observe exact-head CI green; record the run; release; remove --delete-branch; gate:clean from canonical with no live session declared (record what the receipt shows).
- [ ] C.4 REPORT with a per-ID disposition table for R5-01..R5-18; archive with spec sync (the archive move itself must classify correctly under A1); route ACTIVE_TASK to the parent at M9 10.4.
