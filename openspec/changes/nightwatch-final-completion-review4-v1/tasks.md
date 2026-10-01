## 1. Certification soundness (OD-5, OD-6)

- [ ] 1.1 Wire the production receipt verifier into every `checkpointRoleViolations` call (project-state-check ranges/commits, agent-state, hardening rules); remove the `() => true` shortcuts outside test fixtures; update the test that pins BINDING_RECEIPT_UNVERIFIED for real receipts; prove a binding commit at a descendant of S with a verified receipt leaves the range DOCUMENTARY (R4-01).
- [ ] 1.2 `--no-renames` on every `git diff`/`diff-tree` name listing used for checkpoint/range classification; regression: `git mv src/... .agent/...` in a "docs:" commit is SUBSTANTIVE (R4-02).
- [ ] 1.3 `verifyPersistedReceipt` requires subject→receipt-kind mapping, schema, SHA, PASS verdict field(s) for that kind, clean emit and content digest; caller passes `subject`; FAIL/mismatched-kind/mismatched-subject receipts never verify (R4-03).
- [ ] 1.4 Topology consumer: no receipt → NOT MET; certifying requires a local Bubblewrap PROVEN receipt at S AND CI EXECUTED_PASS at S; CI degraded topology recorded as non-certifying evidence; messages no longer attribute topology class to CI (R4-04, OD-6b).
- [ ] 1.5 `autonomous-yield-proof` certifying only from the 12.3 paid-run yield receipt (completed campaign at S, provider calls recorded); NOT MET until then; never removed from the required set (R4-05, OD-6a).
- [ ] 1.6 Derive the real-tree test's expectation from `classifyCheckpointRange` (EXACT or DOCUMENTARY_DESCENDANT + clean ⇒ MET allowed) so it no longer contradicts certification (R4-06).
- [ ] 1.7 Persist gate/clean receipts where the verifier reads (an ignored `artifacts/receipts/` written by `gate:local`/`gate:clean`/UI gate at S), or point the verifier at the gate's real directory; tests never write receipts into the real checkout (use a fixture root) (R4-07).
- [ ] 1.8 Record OD-5/OD-6 as D-150; state the tamper-evident (not tamper-proof) receipt limit in SAFETY_MODEL, DECISIONS and the release-evidence module header; remove any "forgery-proof/unforgeable" wording (OD-5).

## 2. Guard robustness

- [ ] 2.1 For each guard in R4-08, add a mutant family (§5) to the probe registry and kill every member (behavioural fixtures for `kind:'range'` as well as `kind:'commit'`; tests asserting state for the G12/G18/G20 receipt variants; wiring tests for `evidenceArtifactAtSha`, `artifactDemoted`, `evidenceCertifying`, correction pairing, merge parents) (R4-08).
- [ ] 2.2 DEV-launcher rule analyses statements inside top-level `try`/`if`/blocks, assignments of local calls, and the full fs mutation vocabulary (unlink, symlink, rename, rm, mkdir, write*, append*, copy*); mutant family including the four R4-09 survivors (R4-09).

## 3. CI truth

- [ ] 3.1 Pass `NIGHTWATCH_PUSH_BEFORE` explicitly to the HARDENING child (declared in environment-surface); wiring test proves `resolveArchiveDiffBase` receives it under `gate:ci` (R4-10).
- [ ] 3.2 Derive the `CI_STATUS` status word from the project-state block / ci-block-record instead of a literal; restore truthful CURRENT_STATE CI fields (observed run, executed SHA, EXECUTED_PASS) at the correct anchor (R4-11).
- [ ] 3.3 Record red runs 36596242188 (88f8eaf7), 36537649045 (491b5ef9), 36787018515 (673e2ddb), 36806004712 (a408d31b) and their repair runs in `config/ci-block-record.v1.json` history and STATE; refresh its top-level run; add a check that its observed run is not older than the last pushed head's observed run (R4-12).
- [ ] 3.4 Close-out procedure: `hardening:check` + `agent:check` + `project:check` must pass before any close-out push; canonical commits only under a live MAINTENANCE claim (record the a408d31b/e97b38aa breach); approve `openspec/changes/archive/<dated>/**` moves as documentary only when byte-identical to the archived source; remove the archived child from `config/task-id-ledger.v1.json` (R4-13).

## 4. Product correctness

- [ ] 4.1 Carry `captureFailureCounts` (including BODY_READ_ACQUISITION_BOUND) into the main-path journey evidence, its manifest entry and journey event, and the auth-invalid manifest entry; test the recorded summary, not the observer (R4-14).
- [ ] 4.2 Proxy liveness tolerates transient misses: require N consecutive failures or a bounded deadline (declared constants, DECISIONS entry) before `PROXY_LIVENESS_FAILED`; deterministic tests for a single missed probe (no fatal) and a sustained outage (fatal within the deadline); correct FLAKE-003's mechanism and "no surface touched" statement; ensure held body-read slots are always released (test isolation of `bodyReadsInFlight`); re-run the FLAKE-003 identities under load and close or keep the entry with evidence (R4-15).
- [ ] 4.3 VC-01 required list includes the storage-state live cookie-readability test (and the three devLoginSecurity tests); CI per-test proof covers all four (R4-16).
- [ ] 4.4 Formatter policy: the parent-cwd test runs Prettier itself; `resolvePrettierBinary` finds the available binary or the lane declares absence; put the suite in a CI lane; fix the `.prettierignore` comment (R4-17).
- [ ] 4.5 `ai-local-canary`: accurate help (required flags, the accepted flag form) or make the parser accept `=`; remove dead `usage()`/`parsed.help` (R4-18).

## 5. Ledger and records

- [ ] 5.1 `TASK_GROUP_TASK_RE` accepts suffixed IDs; regression with an open `9.5b`; declare `TASK_GROUP_DEFERRED: 9` (carried by 14.1/14.2) or drop 9 from COMPLETE in the parent (R4-19).
- [ ] 5.2 Records: rewrite the corrections-v1 REPORT header (29 findings 22/6/1) and add a per-ID disposition table for all 71 IDs (VB/VC/VD/VA/VE/CF/RV/R3); annotate 8.2–8.16 and 7.15 "ticked before integration; first push 673e2ddb red; CI-observed at 027367d9 (36790169165)"; add 6.4's DONE note; correct the a408d31b CI-run pairing and the STATE:673-676 CF-04 line by annotation; record the CORR-PERF-001 re-encode. Archived files are corrected only by appended dated annotations, never rewritten (R4-20).

## 6. Hygiene and continuity

- [ ] 6.1 Delete the merged corrections session branch (ancestry proven; SHA recorded); gate:clean receipts record source worktree path class, live-session count and declared SESSION WORKTREE; record every release/remove with timestamp and output in STATE (R4-22).
- [ ] 6.2 Sync parent ACTIVE_TASK/STATE/PLAN prose (live session, 60/76, stray fragment, prose anchor, Exact Next Action, PLAN M9); extend the task-group checker to compare declared counts/session in prose with structured fields (R4-23).

## 7. Close-out

- [ ] 7.1 Focused suites + `gate:dev` + `gate:milestone` + `hardening:rules` PASS (with every §5 mutant family DETECTED); commit.
- [ ] 7.2 Full authoritative set (see prompt §2.5); every command exit 0.
- [ ] 7.3 Integrate; observe exact-head CI green; record the run; release; remove with `--delete-branch`; gate:clean from canonical with no live session.
- [ ] 7.4 REPORT with a per-ID disposition table for R4-01..R4-24; archive with spec sync; route ACTIVE_TASK back to the parent ("M9 10.2 remainder").
- [ ] 7.5 Replace the Claude session UUID/transcript path in DECISIONS with a non-identifying provenance reference (date, question text, answer text) via an appended correction, and record that CI artifacts are public while the repository is (R4-24).
- [ ] 7.6 Add an active parent task line under group 15: "Owner reverts the GitHub repository to private and confirms GitHub Actions still executes; record the run" (R4-21).
