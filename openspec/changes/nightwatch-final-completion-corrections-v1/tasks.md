## 1. Preconditions (owner + parent session)

- [x] 1.1 The parent session `sess-0734f2070d08` records its STATE at a committed checkpoint (M4 5.1 landed), confirms HEAD == origin/main, and releases. Record the parent's resume point (M4 task 5.2) in its STATE. — DONE (RESUME_PROMPT §3 supersedes the M4-5.2 resume point): the parent checkpointed at `32180001`/`1d47e2ee` (M9 10.2, 59/76 declared) with exact-head CI run 36366426608 green at `32180001`, recorded resume point "M9 task 10.2 (remainder: 59/76 declared)", proved branch reachability and released + removed `sess-0734f2070d08` on 2026-09-28.
- [x] 1.2 Owner: discard the three formatter-only edits in canonical (`tests/unit/{gateTopology,projectState,syntheticCampaignShards}.test.ts`; AST-equivalent to HEAD). Identify and disable the tool that produced them. Confirm `workspace:check` PASS (VE-01). — DONE (RESUME_PROMPT §1 supersedes the three-file case with the 2026-09-28 16-file instance): the owner dispositioned the 16 rewritten files as behaviour-neutral disposable output and authorized `git checkout -- <the 16 files>` (executed 2026-09-28); the producing tool is the agent harness's pi-lens post-write format/autofix pipeline (its own logs recorded the autofix), disabled at global and project scope outside the repositories; `npm run workspace:check` PASS (`canonicalSafe=true`).
- [x] 1.3 Re-verify every audit.md finding at the live base before editing. Record any finding already closed as COMPLETED_LATER with its SHA. — DONE 2026-09-28 at `1d47e2ee`: 21 STILL_PRESENT, 5 CHANGED (VB-07, VC-06, VC-07, VD-04, VE-01/VA-02 residuals), 2 COMPLETED_LATER (VB-04 TDZ parameterized @ `a784e668`; VD-05's `checkReleaseImplementedHonesty` rule @ `a784e668`) with file:line evidence in `audit.md`'s re-verification table; follow-on defects CF-01..CF-03 recorded where M5-M9 work built on the VD-01/VD-03 foundations.

## 2. Certification anchor corrections

- [ ] 2.1 Require a 40-hex `evidenceSha` for PROVEN lanes; value → null or class change is substantive; regression plus probe (VB-01).
- [ ] 2.2 Add `artifactPaths` to the bindings schema; D-06 checks `git cat-file -e <sha>:<path>` for conditions and lanes; a miss is per-condition not MET with `EVIDENCE_ARTIFACT_ABSENT_AT_SHA`; positive and negative tests plus a probe (VB-02).
- [ ] 2.3 Corrections guard: an appended entry is admissible only with the matching archive-line removal in the same commit. Add a DECISIONS entry (VB-03).
- [ ] 2.4 Fix the `liveHeadSha` TDZ, with a legacy-token regression (VB-04).
- [ ] 2.5 Close the compatibility window: project:check requires the bindings file and schema; no fallthrough on schema-invalid entries; `HEAD` invalid everywhere (VB-05).
- [ ] 2.6 Checkpoint-role classifier: unit tests (values-only, append-only, rename, add-key, null, merge via `-m`); stub-guard mutation probe; exclude guarded paths from `isApprovedCheckpointPath`; remove the dead constant (VB-06).
- [ ] 2.7 Real ratchet: per-file ceilings at measured counts for all non-conforming bins, a total ceiling, stale-ceiling failure, `run-shards` at its measured value; record baseline 1571 / 13 of 76; forbid new `@param {any}` added only to lower counts (VB-07).
- [ ] 2.8 Focused suites + `gate:dev` + `gate:milestone` PASS; commit.

## 3. Validation spine corrections

- [ ] 3.1 Browser-capability skips resolve the configured channel executable, or are removed. The 4 DEV-login and storage-state security tests execute in CI, confirmed with `gh` (VC-01).
- [ ] 3.2 Attach the skip-identity reporter to SYNTHETIC_CAMPAIGN and OWNER_PROVENANCE; match by file plus title path with a reason; remove blanket entries; give the selfDev skips reasons; add probes proving that an undeclared skip and a missing report fail (VC-02).
- [ ] 3.3 Topology: PROVEN_DEGRADED/NOT_PROVEN on any unexercised absence or degraded envelope; details carried into the gate receipt; topology receipt uploaded as a SHA-pinned CI artifact; availability resolved from PATH; unit pin (VC-03).
- [ ] 3.4 D-04: drop COMPATIBILITY from the relaxation; `semantic-compat` forwards the parent label; negative test for COMPATIBILITY under LOCAL; hardening probe dropping the branch-equality conjunct (VC-04).
- [ ] 3.5 `gate:ui` with `--ignore-scripts`; verify the esbuild build, or record a declared exception; hardening assertion on the script text (VC-05).
- [ ] 3.6 gate:clean: fail on a dirty post-run checkout; measure the real sibling root read-only; siblingMode and versions in early-exit receipts (VC-06).
- [ ] 3.7 Reproduce the observerSemanticLedger flake at the 2 s bound under load; correct the root-cause comment; create a tracked flake ledger (VC-07).
- [ ] 3.8 Workflow-pinning probes for compact, second-file, flow and quoted forms; widen the regex (VC-08).
- [ ] 3.9 Twins assert non-empty graphs; phase14Fresh early return becomes a declared skip; c03 describe skips use `classifyLiveSourceTestState` (VC-09).
- [ ] 3.10 Topology measurement counts declared dependencies separately, and handles or documents function-returned roots (VC-10).
- [ ] 3.11 Assert `uniqueCommits` and count against the canonical remote ref; UI group Node declaration to 22; compute the sun_path budget from the actual TMPDIR; register a HANDOFF classification probe (VC-11).
- [ ] 3.12 Focused + `gate:milestone` PASS; commit; integrate; observe exact-head CI green with the restored tests executing.

## 4. Release-probe corrections (parent M4 5.1)

- [ ] 4.1 Probe-at-checkpoint: every probe resolves MET only when HEAD == certified checkpoint with a clean tree, or from a receipt bound to it; otherwise `NOT_AT_CHECKPOINT` (VD-01).
- [ ] 4.2 G18 consumes a UI-harness execution receipt emitted by the UI_CONTROL_CENTER group (VD-02).
- [ ] 4.3 G12 consumes a yield-campaign receipt (`passed: true`, `nightwatchSha == S`, campaign kind); W13 is historical only; correct the environment-independence claim (VD-03).
- [ ] 4.4 G21 exercises the pre-flight refusal of a synthetic non-VALID artefact; G19 renders the effective configuration and validates every declared variable (VD-04).
- [ ] 4.5 Structural `implemented` honesty rule plus mutation probe; replace the includes-literal and pinned-detail tests (VD-05; parent 5.3).
- [ ] 4.6 Focused + `gate:milestone` PASS; commit.

## 5. Ledger and continuity truth

- [ ] 5.1 Restore the 21 stripped task IDs in the parent tasks.md, keeping the DONE notes; add DONE notes to 4.9 and 4.11; tick 5.1 citing `2e38ab1e`/`d1638a15`; correct the allowlist count claim. Annotate parent tasks 3.3, 3.4, 3.5, 4.4, 4.6–4.11 and 5.1 as reopened-and-closed by this change, with SHAs (VA-01).
- [ ] 5.2 Add the stable-task-ID ledger check against the bootstrap commit, with a negative test (VA-01).
- [ ] 5.3 `TASK_AHEAD_OF_PROJECT_BASELINE` ATTENTION (IN_PROGRESS + ancestor-of-HEAD only; non-ancestor fails); set the parent anchors to the true validated SHA; DECISIONS entry for the cross-guard resolution (VA-03).
- [ ] 5.4 `LEDGER_UNDISPOSITIONED_ITEM` is an error at a terminal phase; a token counts only as a trailing marker (VA-04).
- [ ] 5.5 INTEGRATED_CURRENT instead of WORKSPACE_BASE_STALE when session HEAD == remote after integration (VA-05).
- [ ] 5.6 Sync the parent ACTIVE_TASK/STATE/PLAN with git: routing CURRENT STATUS, milestone, next action, Files Changed, commit attribution (`4a1c2619`), probe count (VA-02).

## 6. Hygiene and close-out

- [x] 6.1 Add a repository formatter policy (`biome.json` with formatter and organize-imports disabled, plus `.editorconfig`); test that a formatter run changes no tracked file (VE-01). — DONE (landed FIRST per RESUME_PROMPT §2): `biome.json` pins the Biome formatter + organize-imports off (and the linter, whose autofix produced the `let`→`const` class); `.editorconfig` pins `trim_trailing_whitespace=false` / `insert_final_newline=false` and declares only the corpus byte invariants that hold (3381 tracked text files, UTF-8, LF); `tests/unit/formatterPolicy.test.ts` 5/5 proves the policy text, a POSITIVE CONTROL where the same tool with the formatter enabled rewrites the probe (so the no-op cannot be an absent tool), `check --write`/`format --write` byte-identity on the probe (format refuses with `No files were processed` — the stronger proof), and a whole-tracked-corpus `check --write` no-op over a disposable `git ls-files` copy with before/after hashes. The pinned `@biomejs/biome@2.5.14` was installed offline (cache-only, 0 registry contact), the disposable `npm ci --offline` lockfile verification was re-executed (10 packages, lockfile byte-identical), and `config/dependency-currency.v1.json` + `docs/HOST-CAPABILITY-MATRIX.md` carry the honest non-clean-claim scope (the 2026-09-12 advisory query predates the tool; parent task 15.4's single authorized query covers the closure). Focused suites green: formatterPolicy 5/5, nw14/nw08/validationExecutionClasses/nw07/c16 149/149 with the known clean-tree `projectState:2316` exception, hardening:check PASS, handoff:check PASS, agent:check PASS, typecheck clean, validation-universe consistent (578 discovered, 0 unclassified).
- [ ] 6.2 Full set: typecheck, typecheck:bin (ratchet), UI typecheck/test/build, schema:check, hardening:check, hardening:rules (after committing guards), validation:universe, agent:check, agent:audit, project:check, workspace:check, session:check, campaign:synthetic, gate:local, npm test, `openspec validate --all --strict`.
- [ ] 6.3 Integrate, observe exact-head CI green, release, and remove the session. Run gate:clean from canonical with no live session.
- [ ] 6.4 Route ACTIVE_TASK back to `nightwatch-final-product-completion-v1` IN_PROGRESS, with Next action "M4 task 5.2". Archive this change with `--skip-specs` (its requirements are enforcement of the parent specs), and record every finding's disposition in REPORT.
