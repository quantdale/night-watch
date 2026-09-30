# Audit — validation of `nightwatch-final-product-completion-v1` M0–M4 (partial)

Read-only on 2026-09-27 at HEAD = origin/main = `d595c7c8`. Three independent
validators (M0/M1 + ledger + M4, M2, M3) inspected committed content. The
coordinator spot-checked the highest-impact claims in source. Nothing was
modified. No gate, test suite or Playwright was run; a session was live.

## Re-verification at the live base (2026-09-28, `1d47e2ee`)

Task 1.3 (RESUME_PROMPT §3.2): every finding below was re-checked against
the current code (the parent landed 144 commits since `d595c7c8`, through
M9 task 10.2). Classification (CORRECTED 2026-09-30, see the Corrections section): 22 STILL_PRESENT, 6 CHANGED, 1
COMPLETED_LATER over 29 findings. Follow-on defects (later work built on a defective
surface) are recorded at the end.

| ID | Classification | Evidence at `1d47e2ee` |
|---|---|---|
| VB-01 | STILL_PRESENT | `bin/lib/validation-lane-state.mjs:83-87,117-121` still accepts a null `evidenceSha` as not-stale; `bin/project-state-check.mjs:1365` skips null |
| VB-02 | STILL_PRESENT | `bin/project-state-check.mjs:1366` still `cat-file -e <sha>^{commit}` (commit existence); no `artifactPaths` in `bin/lib/release-evidence.mjs` |
| VB-03 | STILL_PRESENT | `bin/lib/release-evidence.mjs:258-285` `isAppendOnlyCorrectionsChange` still admits an append without the matching archive-line removal |
| VB-04 | STILL_PRESENT at `1d47e2ee`, CLOSED by `add49919` | The TDZ was present at `1d47e2ee` (the earlier row read `certificationDemotionFor` parameterization at `a784e668` as the fix, but the lane-disagreement block still read `liveHeadSha` before its definition); `add49919` removed it. The lane-disagreement check is now the pure `evidenceLaneDisagreements` with a unit regression (corrections task 7.13) |
| VB-05 | STILL_PRESENT | `bin/lib/release-evidence.mjs:315-317` `isLegacyEvidenceValue` still accepts `/^HEAD$/i`; `legacyEvidenceSha` fallback at :350-365; schema-invalid entries still fall through |
| VB-06 | STILL_PRESENT | `bin/agent-continuity-protocol.mjs:1142` `DIFF_GUARDED_CHECKPOINT_PATHS` still exported and unused; `isApprovedCheckpointPath` (:1147) still approves guarded paths by path; no classifier unit tests or stub-guard probe |
| VB-07 | CHANGED | M9 10.1/10.2 added `config/operator-cli-surface.v1.json` (76 bins dispositioned; 59 declared) and the shared operator parser; `config/bin-typecheck.v1.json` is still `REPORTING` with 1 per-file ceiling (`run-shards.mjs:25`) and no total/stale-ceiling check |
| VC-01 | STILL_PRESENT | `tests/unit/devLoginSecurity.test.ts:37,44` and `tests/unit/storageState.test.ts:37,518` still skip on `chromium.executablePath()` while `playwright.config.ts:44` runs `channel: 'chrome'` |
| VC-02 | STILL_PRESENT | `bin/campaign-synthetic.mjs:168-185` still aggregates counts only; `bin/lib/semantic-skip-policy.mjs:44-51` still matches per-file + substring with blanket `""` entries; no undeclared-skip probe |
| VC-03 | STILL_PRESENT | `bin/gate-topology.mjs:782` still reports `PROVEN` when `findings.length === 0` regardless of degraded envelope (:708 `BWRAP_UNAVAILABLE_DEGRADED`); topology receipt not in the gate receipt/CI artifact |
| VC-04 | STILL_PRESENT | `bin/agent-state.mjs:155` still includes `COMPATIBILITY` in the D-04 relaxation |
| VC-05 | STILL_PRESENT | `package.json:28` `gate:ui` still runs `npm ci` without `--ignore-scripts` |
| VC-06 | CHANGED | clone `cleanBefore`/`cleanAfter` measurement exists (`bin/quality-gate-clean.mjs:208,239`); the sibling identity is still the empty stand-in (shallow manifest), early-exit receipts still omit `siblingMode`/versions, and a dirty root post-run still passes |
| VC-07 | CHANGED | the overflow loop is paced (`533eee97`); `tests/unit/observerSemanticLedger.test.ts:107,116` still carry the raised 20s poll bounds and the comment that contradicts `networkObserver.ts:1335-1364`; no tracked flake ledger |
| VC-08 | STILL_PRESENT | `config/hardening-rule-probes.v1.json:1753-1758` HC-147 still mutates only the indented form; compact/second-file/flow/quoted forms unprobed |
| VC-09 | STILL_PRESENT | `tests/unit/c04FrontendGraph.test.ts` twins still pass on an empty graph; `tests/unit/phase14FreshSourceAdmission.test.ts:264` still early-returns (0 assertions); c03 describe skips still generic |
| VC-10 | STILL_PRESENT | `bin/lib/topology-gate.mjs:371-427,~505` still drops declared literals and misses function-returned roots |
| VC-11 | STILL_PRESENT | `tests/workspaceIsolation.test.ts` orphan-branch test still does not assert `uniqueCommits`; `config/quality-gate.v1.json` still declares `NODE20_PLUS`; `tests/unit/syntheticCampaignShards.test.ts:84` still hard-codes `'/tmp/'.length`; HANDOFF classification still has no registry probe |
| VD-01 | STILL_PRESENT | `bin/project-state-check.mjs:584-824,1368` still runs every release probe on the live working tree; no `NOT_AT_CHECKPOINT` / certified-checkpoint binding |
| VD-02 | STILL_PRESENT | `probeUiErrorTaxonomy` (:734-758) still resolves MET from a baseline file + 5 literal strings in `contractRender.test.tsx`; no UI-harness execution receipt |
| VD-03 | STILL_PRESENT | `probeYieldCampaignResult` (:823-851) + `latestProductRunReceipt` (:798-820) still accept any `artifacts/nightwatch-*` run (`passed: boolean`, any 40-hex `nightwatchSha`) and keep the historical W13 aggregate load-bearing |
| VD-04 | CHANGED | G21/G19 now spawn the real rules (`:688,768`) but retain hard-coded MET details (:755) and exercise no pre-flight refusal of a synthetic non-VALID artefact |
| VD-05 | COMPLETED_LATER (partial) | the structural `checkReleaseImplementedHonesty` rule is live (`bin/lib/hardening/rules/validation-and-gates.mjs:480`) since `a784e668`; the includes-literal/pinned-detail test replacement is tracked with VD-04's CHANGED work |
| VA-01 | STILL_PRESENT | `openspec/changes/nightwatch-final-product-completion-v1/tasks.md` still lacks the 21 stable IDs (1.1-1.4, 2.1-2.3, 3.1-3.6, 4.1-4.7, 4.10) versus bootstrap `ec6010a2`; 4.9/4.11 DONE notes and the allowlist count claim need correction |
| VA-02 | CHANGED | ACTIVE_TASK/STATE/PLAN are current through M9 10.2 after the 2026-09-28 checkpoint; the STATE "Files Changed" table still lists only M1 and probe-count/commit-attribution details need the 5.6 sync pass |
| VA-03 | STILL_PRESENT | `LAST_VALIDATED_IMPLEMENTATION_SHA` is still `1f786a4e` in parent STATE/ACTIVE_TASK (M5-M9 validated later); no `TASK_AHEAD_OF_PROJECT_BASELINE` attention rule; no DECISIONS entry for the cross-guard resolution |
| VA-04 | STILL_PRESENT | `bin/lib/openspec-ledger.mjs:231` still warns (not errors) on `LEDGER_UNDISPOSITIONED_ITEM`; the token still matches anywhere |
| VA-05 | STILL_PRESENT | `bin/workspace-integrity.mjs:814` still emits `WORKSPACE_BASE_STALE` when the session base is behind the remote after integration (base `1f786a4e` vs HEAD `1d47e2ee`) |
| VE-01 | CHANGED (owner side complete) | the 16 canonical files were owner-dispositioned disposable (AST-equivalent to `df0a6d35`; only `let minedById`→`const` and one paren pair non-layout) and restored 2026-09-28; the harness formatter (pi-lens post-write pipeline) is disabled at global and project scope outside the repos; `workspace:check` PASS. The repository-side formatter policy is corrections task 6.1 |

### Follow-on defects (new findings)

| ID | Finding | Evidence | Fix task |
|---|---|---|---|
| CF-01 | Every M4 release-probe result since `d595c7c8` (G14/G17/G18/G19/G21/G12, G20) was measured by working-tree probes (VD-01 foundation): the results must be re-derived after 4.1 and any result whose evidence is not bound to S demoted to `NOT_AT_CHECKPOINT` | `bin/project-state-check.mjs:584-824` probes read the working tree; M4-M9 closeouts cite them | 4.1 + follow-on re-derivation |
| CF-02 | The G20 accessibility record carries `nightwatchSha` (`bin/lib/accessibility-record.mjs:49`) but the release probe must resolve `NOT_AT_CHECKPOINT` when HEAD != S (and the receipt's SHA must equal S) | `bin/lib/accessibility-record.mjs:49,91`; `bin/project-state-check.mjs` G20 probe | 4.1 |
| CF-03 | G12 accepts any `artifacts/nightwatch-*` run with `passed: boolean` and any 40-hex SHA and keeps the historical W13 aggregate load-bearing — the M5 product-run receipt and any post-M5 evidence inherit this weak binding | `bin/project-state-check.mjs:798-851` | 4.3 |
| CF-04 | Four `fs.existsSync` sibling-checkout-gated REAL-artifact tests (c08:110 ripple-ui host matrix, c08:238 ouchan build config, c09:301 blueapi spec, c09:314 blueinternal spec) skip only where the sibling Alphaus checkouts are ABSENT; their identities were never declared because the dev host HAS the checkouts, so exact-head CI (no siblings) failed SYNTHETIC_CAMPAIGN with UNDECLARED_SKIP 40/4 (run 36513017223 at `2b5d8178`, receipt `receipt:sha256:75d601ff140284f7cd78be38`) — the skip-identity policy is only as complete as the environments it was measured on | `tests/unit/c08DeploymentBinding.test.ts:110,238`; `tests/unit/c09SpecExpectations.test.ts:301,314`; exact-head CI receipt at `2b5d8178` | 3.12 (declarations + source-bound regression: one declaration per sibling-gated skip site, titles must be source literals) — CLOSED at `491b5ef9` (proven in CI run 36552500573 — group SYNTHETIC_CAMPAIGN skipPolicy PASS 40/0 and SEMANTIC_COMPATIBILITY PASS 14/0; run 36537649045 failed FLAKE-002 with SYNTHETIC_CAMPAIGN NOT_RUN and proves nothing about CF-04) |
| CF-05 | The parent's M8 (9.6) ledger-cap fixture paced its 550-fetch loop with a blind 10 ms sleep while the observer's 4-read acquisition gate REFUSES rather than queues — under full-suite load the burst crosses 4, reads refuse (BODY_READ_ACQUISITION_BOUND) and the ledger lands short of the 512 cap: CI-intermittent `observerSemanticLedger.test.ts:138` failure (red at `491b5ef9` run 36537649045 / 2162-of-2177; green at `2b5d8178`) | `tests/unit/observerSemanticLedger.test.ts:138` (pre-fix loop at :167-181); `src/browser/observers/networkObserver.ts:131-137,1193-1197`; run 36537649045 receipt `receipt:sha256:adda702092ea4febf9ab185d` | 3.12 (FLAKE-002/D-147: event-driven pacing on the observer's `activeRequests()` drain signal, ≤ 1 outstanding; gate source text byte-untouched) |

## State at validation

- Session `sess-0734f2070d08` on `session/nightwatch-final-product-complet-a891357d`:
  OWNED, integrationState INTEGRATED, live, HEAD `d595c7c8` = origin/main.
- Progress: 27/113 ticked (M0 4, M1 3, M2 7, M3 13). 5.1 landed in
  `2e38ab1e`/`d1638a15` but is unticked.
- Exact-head CI: GREEN. Runs 36243034942 (`aa78a014`), 36244721098
  (`78b23520`) and 36251410183 (`d595c7c8`) each ran all 15 groups to PASS.
- `project:check`: OPERATIONALLY_ACCEPTED, met 0/16, certificationRefused.
  It currently FAILs with CHECKOUT_DIRTY and ACTIVE_TASK_CONTINUITY because of
  VE-01.
- `openspec validate --strict` on the parent change: valid. Planning
  artifacts other than tasks.md are byte-identical to bootstrap `ec6010a2`.

## Verdicts by parent task

| Task | Verdict | Note |
|---|---|---|
| 1.1–1.4, 2.1–2.3 | VERIFIED | canonical record re-pointed; `1441cc8a` recorded and deleted; bootstrap commit atomic |
| 3.1 | VERIFIED | derived from ACTIVE_TASK; minor duplicate derivation |
| 3.2 | PARTIAL + REGRESSION | guard real; VB-01 null evidenceSha |
| 3.3 | PARTIAL | probes exercise the schema rule, not the substantive classifier |
| 3.4 | NOT_MET (artifact half) | checks only that the commit exists |
| 3.5 | PARTIAL | 1 of 63 bins ceilinged; total grew to 1571 |
| 3.6 | VERIFIED with caveats | warning only; token matched anywhere |
| 4.1 | VERIFIED | c03 describe-level skips still generic |
| 4.2 | VERIFIED | two c04 twins vacuous; phase14Fresh:264 vacuous |
| 4.3, 4.5 | VERIFIED | sun_path pin hard-codes `/tmp/` |
| 4.4 | PARTIAL | longer timeout, root-cause comment wrong, never reproduced, no flake ledger |
| 4.6 | PARTIAL | SYNTHETIC_CAMPAIGN and OWNER_PROVENANCE unenforced; per-file matching; blanket entries |
| 4.7 | PARTIAL | stand-in-only identity; dirty post-run checkout still PASS |
| 4.8 | PARTIAL | degraded mode still claims PROVEN |
| 4.9 | PARTIAL | `--ignore-scripts` missing |
| 4.10 | PARTIAL | COMPATIBILITY widening (760e90fc) |
| 4.11 | PARTIAL | probe misses compact / second-file forms |
| 4.12 | VERIFIED | weak assertions |
| 4.13 | VERIFIED | CI green; topology direct-observation claim has no CI artifact |
| 5.1 (landed, unticked) | PARTIAL | probes measure HEAD, not S; G18/G12 trivially MET |

## Findings

| ID | Sev | Finding | Evidence | Fix task |
|---|---|---|---|---|
| VB-01 | high (regression) | A null `evidenceSha` is accepted and treated as not stale, so a documentary (values-only) commit can flip STALE lanes to PROVEN and make condition 01 MET without re-execution | `bin/lib/validation-lane-state.mjs:83-87`, `:117`; `project-state-check.mjs:296-313`; values-only guard returns VALUES_ONLY for null | 2.1 |
| VB-02 | high | D-06 checks `git cat-file -e <sha>^{commit}` (commit existence), not artifact existence; it fails globally with a different code; lanes are unchecked; no test | `project-state-check.mjs:1297-1303` | 2.2 |
| VB-03 | medium | The corrections guard allows appending entries (not values-only), so a docs commit can exempt and rewrite archive lines | `release-evidence.mjs:258-285`; `documentation.mjs:720-760` | 2.3 |
| VB-04 | medium | TDZ: `liveHeadSha` is used before its `const` declaration | `project-state-check.mjs:1320-1321` vs `:1341` | 2.4 |
| VB-05 | medium | Legacy fallback ignores `loaded.ok`, still accepts literal `HEAD` (self-certifying), and project:check tolerates a missing bindings file | `release-evidence.mjs:315-317, 374-379`; `project-state-check.mjs:1334`; `releaseCertification/index.ts:188,434-437` | 2.5 |
| VB-06 | medium | Checkpoint-role classifier is untested and unprobed; `isApprovedCheckpointPath` still approves guarded paths by path alone; `DIFF_GUARDED_CHECKPOINT_PATHS` is dead; merges are invisible without `-m` | `checkpoint-role.mjs:31,46-77`; `agent-continuity-protocol.mjs:1142` | 2.6 |
| VB-07 | medium | The ratchet is not a ratchet: 1 ceiling for 63 non-conforming bins, no total, no stale-ceiling check; live 1571 diagnostics and 13/76 (worse than the audit's 1522 and 14/76); the run-shards drop came from `@param {any}` | `config/bin-typecheck.v1.json`; `bin/bin-typecheck.mjs` | 2.7 |
| VC-01 | high (regression) | Four security tests (DEV-login one-shot binding x3, storage-state cookie readability) always skip in CI: the skip checks Playwright's bundled Chromium while the project runs `channel: 'chrome'`; no twin; the real cause (sun_path) was fixed in 736e0e09 but the skips stayed | `tests/unit/devLoginSecurity.test.ts:37,44`; `tests/unit/storageState.test.ts:37,518` (988834e1, 58bf06f2) | 3.1 |
| VC-02 | high | Undeclared skips do not fail SYNTHETIC_CAMPAIGN or OWNER_PROVENANCE (44 CI skips never checked); matching is per file plus a substring; 5 blanket `""` entries; bare `test.skip()` in selfDevSandboxConfinement; no probe proves an undeclared skip fails | `bin/campaign-synthetic.mjs:170-185,278`; `semantic-skip-policy.mjs:44-51`; `config/semantic-compatibility.v1.json`; `selfDevSandboxConfinement.test.ts:147,160` | 3.2 |
| VC-03 | high | Degraded topology (bwrap absent) reports `runnerTopologyClass: PROVEN` while absences went unexercised; the label never reaches the gate receipt; the topology receipt is not kept in CI; availability checks fixed paths but spawns from PATH | `bin/gate-topology.mjs:557-640,708,782`; `topology-gate.mjs:127-129` | 3.3 |
| VC-04 | medium (regression) | 760e90fc adds COMPATIBILITY to the D-04 relaxation; `semantic-compat.mjs` forces that label, so local semantic-lane runs skip worktree liveness beyond spec (ci/clean only) | `bin/agent-state.mjs:154`; `bin/semantic-compat.mjs:103` | 3.4 |
| VC-05 | medium | `gate:ui` runs install scripts (esbuild has one); task 4.9 required `--ignore-scripts` | `package.json:28` | 3.5 |
| VC-06 | medium | gate:clean sibling identity measures only the empty stand-in with a shallow manifest; a dirty checkout after the run still PASSes; early-exit receipts omit siblingMode and versions | `bin/quality-gate-clean.mjs:85-105,184-219,277-279` | 3.6 |
| VC-07 | medium | Semantic flake "fix" raises a poll timeout (2s→20s); its comment contradicts source (no async gap); never reproduced; no flake ledger | `observerSemanticLedger.test.ts` (eccce619); `networkObserver.ts:1335-1364` | 3.7 |
| VC-08 | low | Workflow-pinning probe HC-147 only mutates the indented form already caught elsewhere; compact, second-file, flow and quoted forms are unprobed or unmatched | `hardening-rule-probes.v1.json:1699-1709`; `validation-and-gates.mjs:428-466` | 3.8 |
| VC-09 | low | Vacuous twins (`c04FrontendGraph.test.ts:236,254` pass on an empty graph); `phase14FreshSourceAdmission.test.ts:264` early return passes with 0 assertions; c03 describe skips ignore STALE | as cited | 3.9 |
| VC-10 | low | Topology measurement drops declared literals (LEGACY_HOST_PATH_SKIP suites measure 0) and misses function-returned roots | `topology-gate.mjs:~505,371-427` | 3.10 |
| VC-11 | low | Orphan-branch test never asserts `uniqueCommits`; count uses local `main`; UI group declares NODE20_PLUS under Node 22; sun_path pin hard-codes `'/tmp/'.length`; HANDOFF classification has no registry probe | `workspaceIsolation.test.ts:1726`; `workspace-integrity.mjs:568`; `quality-gate.v1.json`; `syntheticCampaignShards.test.ts:83-86` | 3.11 |
| VD-01 | high | All six M4 probes run against the live working tree and ignore `certifiedCheckpointSha`; an EXACT binding can credit S with a result measured at a dirty HEAD | `project-state-check.mjs:584-824,1368` | 4.1 |
| VD-02 | high | G18 is MET from a file-exists check plus 5 literal strings; no UI-harness execution | `project-state-check.mjs` (G18 probe) | 4.2 |
| VD-03 | high | G12 is MET from the historical W13 aggregate plus *any* local `artifacts/nightwatch-*` run (currently a 12-second local smoke), with no `passed`, SHA or age check; host-dependent despite being claimed environment-independent | `project-state-check.mjs` (G12 probe) | 4.3 |
| VD-04 | medium | G21 is a static rule with a hard-coded MET detail; G19 "printable" is `typeof fn === 'function'` | as cited | 4.4 |
| VD-05 | medium | Task 5.3 honesty rule is absent; the only guard is an includes-literal unit test | `tests/unit/projectState.test.ts` ("release probe wiring") | 4.5 |
| VA-01 | medium | 21 task IDs stripped from the parent tasks.md (1.1–1.4, 2.1–2.3, 3.1–3.6, 4.1–4.7, 4.10); 4.9/4.11 ticked with no DONE note; allowlist count claimed 45, actual 46 | parent `tasks.md` vs `git show ec6010a2:…/tasks.md` | 5.1 |
| VA-02 | medium | Continuity lags git: next action still "wire 5.1"; routing CURRENT STATUS says M1; PLAN M4 NOT_STARTED; Files Changed lists only M1; M3 credit to 981fb7f8 should be 4a1c2619; "seven" probes vs six | `.agent/ACTIVE_TASK.md`; parent STATE.md, PLAN.md:174 | 5.2 |
| VA-03 | high | `LAST_VALIDATED_IMPLEMENTATION_SHA` was advanced to `aa78a014`, then back-dated to the base `1f786a4e` (78b23520) to silence PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE. The field is now false (M2/M3 validated), there is no Decision Log entry, and it is a cross-guard conflict | `project-state-check.mjs:1108-1131`; STATE.md:62-67 | 5.3 |
| VA-04 | low | `LEDGER_UNDISPOSITIONED_ITEM` (50 changes / 530 items) is only a warning, with no task promoting it for closure; the token is matched anywhere in the entry | `bin/lib/openspec-ledger.mjs` | 5.4 |
| VA-05 | low | WORKSPACE_BASE_STALE after integration although HEAD == origin/main | session record baseSha `1f786a4e` | 5.5 |
| VE-01 | high (live) | Out-of-band formatter (double quotes, trailing commas, 80 cols; AST-equivalent) rewrote 3 committed test files in canonical at 2026-09-26 23:35 while the session was live, giving WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE (canonical FAIL); the repo has no formatter config | canonical `git status`; `tests/unit/{gateTopology,projectState,syntheticCampaignShards}.test.ts` | 1.2, 6.1 |

## Review 2 — independent validation of M1–M4 (2026-09-30, `88f8eaf7`)

Three independent read-only reviewers checked the child campaign's M1–M4
claims against source, probes and GitHub Actions; the coordinator
spot-checked the highest-impact claims. Owner decision recorded here: the
GitHub repository is **public temporarily** because GitHub Actions failed
while it was private; it returns to private when the campaigns close (7.14).

Verdicts: VB-04, VB-05, VB-07, VC-01 (by accounting inference), VC-02,
VC-04, VC-05, VC-08..VC-11 hold. VB-01, VB-02, VB-03, VB-06, VC-03, VC-06 and
VC-07 are PARTIAL. RV-01 (the red CI at `88f8eaf7`) was repaired at `bd8ce336`
on 2026-09-30 by the owner-directed hand-over.

| ID | Sev | Finding | Evidence | Task |
|---|---|---|---|---|
| RV-01 | high | Exact-head CI red at the M4 close-out `88f8eaf7` (run 36596242188, HARDENING_PROBES): HC-178 swapped a correction digest for the dated header's digest, which the header bump retired. FIXED at `bd8ce336` (stable title-line digest plus live-undated regression); duplicate `oldLineSha256` entries are still accepted | `config/hardening-rule-probes.v1.json` HC-178 | 7.1 |
| RV-02 | medium | VB-01 residual: `null→A` and `A→B` re-binds are values-only, and every binding's `receiptDigest`/`observedAt`/`executor` is null and unchecked, so a docs-only commit can re-point a lane or condition to a fresh SHA without re-execution | `bin/lib/release-evidence.mjs` values-only guard; `config/release-evidence.v1.json` | 7.2 |
| RV-03 | medium | VB-02 residual: lane `artifactPaths` are never checked (only condition IDs are consumed); 10/11 lanes declare `[]`; condition lists are the same three long-lived config files; no probe; no wiring test | `releaseCertification/index.ts:557-588,564`; `project-state-check.mjs:1374-1383` | 7.3 |
| RV-04 | medium | VB-03 residual: `checkpoint-role.mjs:147` hard-codes `docs/CURRENT_STATE.md` for every correction's pairing (false positive and false negative proven); the working-tree rule pairs over the unpushed range, not per commit (D-146); blank-line handling differs | `bin/lib/checkpoint-role.mjs:147`; `documentation.mjs:837` | 7.4 |
| RV-05 | medium | CORR-CORR-002 (`3f40e56d`) breaks the same-commit pairing rule (0 removed lines; its removal is in `e9ad3300`); the project's own classifier rates it substantive but it was committed as docs | `correctionPairingViolations(3f40e56d)` = `CORRECTION_APPEND_UNPAIRED` | 7.4 |
| RV-06 | medium | VB-06 residual: `checkCheckpointRoleGuardIntegrity` is a text-presence check; an early `return true` in the guard keeps every needle present | `bin/lib/hardening/rules/validation-and-gates.mjs:540-559` | 7.5 |
| RV-07 | low | VB-07 gaming gaps: `@ts-expect-error` is not a counted suppression; the annotation budget misses `{*}`, `{Object}`, `{?}`, `any[]`, `Record<string, any>`, `Promise<any>` and `any` in `.d.mts` | `bin/bin-typecheck.mjs:167`; `bin/lib/typecheck-ratchet.mjs:38` | 7.6 |
| RV-08 | low | VB-05 residual: `loadLaneState` and the hardening rule still overlay `?? lane.evidenceSha`; `loadDocumentRoleCorrections` falls back silently to the legacy inline array; `certifiedCheckpointSha` falls back to live HEAD when LAST_SUBSTANTIVE is not 40-hex | `validation-lane-state.mjs:54`; `documentation.mjs:1109`; `release-evidence.mjs:518-527`; `project-state-check.mjs:1453` | 7.6 |
| RV-09 | medium | VC-03 residual: PROVEN_DEGRADED is treated as non-certifying nowhere (gate passes it; no release condition reads topology); `githubExecutionProven:false` is a hard-coded literal; the artifact has no gitHead, the gate details omit the topology receipt digest, upload uses `if-no-files-found: warn`, 14-day retention; the embedded `ciBlockRecord` is stale static config | `quality-gate.mjs:125`; `gate-topology.mjs:806`; `.github/workflows/hardening.yml` | 7.7 |
| RV-10 | low | VC-06 residual: a missing real sibling root is reported as `SIBLING_IDENTITY_DRIFT`, so gate:clean cannot pass on a host without the owner's sibling checkouts | `bin/quality-gate-clean.mjs` `realSiblingIdentityUnchanged` | 7.8 |
| RV-11 | medium | CF-04 residual: `extractHostMatrix` and `extractBuildExclusions` run only inside sibling-gated tests, so no CI lane exercises them; the skip sites hard-code `/home/<user>/...` | `tests/unit/c08*.test.ts:110,238`; `c09*.test.ts:40` | 7.9 |
| RV-12 | medium | Body-read acquisition refuses instead of queuing (module-global cap 4, shared across pages and contexts). It fails closed, but loses oracle coverage in bursty SPAs silently outside journeys; no behavioural test drives more than 4 concurrent reads | `src/browser/observers/networkObserver.ts:131-137`; `bodyReadAcquisition.test.ts` | 7.10 |
| RV-13 | low | Flake ledger honesty: FLAKE-001 claims the 2 s bound is retained while 20 s shipped, and has no open/closed status (VC-07 ticked regardless); FLAKE-002's "residual risk: none known" omits the 5 s BODY_READ_TIMEOUT path | `docs/FLAKE-LEDGER.md` | 7.11 |
| RV-14 | low | HC-180 is an equivalent mutant (the branch-equality conjunct is implied by `errors.length === 0`); caught only by a source-text regex | `bin/agent-state.mjs:137,154` | 7.12 |
| RV-15 | low | Receipt counts mislead or go unchecked: UI "passed: 8" counts files, not 105 tests; no lane cross-checks skip-report count against list-reporter count; SEMANTIC does not parse "did not run"; no per-test proof that the VC-01 tests ran in CI | gate receipts; `bin/campaign-synthetic.mjs`; `bin/semantic-compat.mjs` | 7.12 |
| RV-16 | medium | Record errors: the VB-04 "COMPLETED_LATER @ `a784e668`" row is false (the TDZ was present at `1d47e2ee` and removed by `add49919`); CF-04's proof is attributed to run 36537649045, where SYNTHETIC was NOT_RUN (the proof is run 36552500573); `e9ad3300` named `6b19e428` validated although its gate:clean failed and it carried the VC-04 regression; counts are 29 findings / 6 CHANGED, not 31 / 5; the bootstrap was not "restored unchanged" (audit section added, task 2.7 reworded) | this file; child STATE; `3c9c1a06` message | 7.13 |
| RV-17 | medium | Tracking gaps: CF-01..CF-03 exist only in PLAN; 6.4's next action says "M4 task 5.2" while the true parent resume point is "M9 task 10.2 remainder"; 5.1's reopened list omits parent 5.2–5.7 (CF-01), the M5 product-run receipt (CF-03) and M8 9.6 (CF-05); parent STATE Exact Next Action/WIP/Branch are stale; child ACTIVE_TASK prose contradicts itself; the parent has an extra unticked `9.5b` line | child tasks.md; parent STATE.md; `.agent/ACTIVE_TASK.md` | 7.13 |
| RV-18 | medium | Grants and adopt semantics: the child SPEC re-grants the parent's single-use paid provider run and registry query (neither used); `claim --adopt` rebases baseSha to merge-base, shrinking the declared-deletion window; `isDevInvocation`'s help/metadata exemption relies on every DEV launcher short-circuiting, which is unenforced | child SPEC.md:79-81; `bin/nightwatch-session.mjs:505`; `0a436f12` | 7.13 |
| RV-19 | medium | Prettier is not neutralized (no `.prettierrc`/`.prettierignore`), and the VE-01 rewrite style matches Prettier's defaults; the formatter policy commit also added a live Biome binary as a devDependency | `171f3526` | 7.14 |
| RV-20 | medium (owner) | Repository visibility is public (owner decision: temporary, for GitHub Actions); AGENTS.md describes a private origin; ~100 tracked files carry `/home/<user>/...` paths; CI artifacts are public while this holds | `gh api repos/quantdale/night-watch` | 7.14 |

## Corrections (2026-09-30, review 2, corrections task 7.13)

Recorded as corrections rather than silent rewrites (RV-16). Where a row above
was edited, the edit is the correction named here.

1. **VB-04.** The row read `COMPLETED_LATER @ a784e668`. That was false: the TDZ
   (`liveHeadSha` read before its definition in the lane-disagreement block) was
   present at `1d47e2ee` and was removed by `add49919`. The row now reads
   STILL_PRESENT at `1d47e2ee`, CLOSED by `add49919`, and the check carries a
   unit regression (`evidenceLaneDisagreements`, task 7.13).
2. **Counts.** The re-verification table lists **29 findings** (VB 7, VC 11,
   VD 5, VA 5, VE 1), not 31: **22 STILL_PRESENT, 6 CHANGED** (VB-07, VC-06,
   VC-07, VD-04, VA-02, VE-01) and **1 COMPLETED_LATER** (VD-05, partially).
   The earlier "21 / 5 / 2 of 31" figure, repeated in task 1.3's DONE note and
   in `design.md`, is superseded by these counts. The five follow-on defects
   CF-01..CF-05 are additional and are not part of the 29.
3. **CF-04's proof.** Attributed to run 36537649045, where SYNTHETIC_CAMPAIGN was
   NOT_RUN (the run failed FLAKE-002 first). The proof is run **36552500573**,
   in which SYNTHETIC_CAMPAIGN passed with skipPolicy 40/0 and
   SEMANTIC_COMPATIBILITY with 14/0. The commit message of `3c9c1a06` carries the
   old attribution; history is not rewritten, this record governs.
4. **`6b19e428` was named "validated" too early.** `e9ad3300` recorded it as the
   validated implementation although its own `gate:clean` had failed (inner
   PROJECT_TRUTH: `PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE`) and the commit
   carried the VC-04 report-authorization regression that `9a1abf28` later fixed.
   The first commit whose full gate set passed is `9a1abf28`
   (gate:clean 15/15, receipt `clean-receipt:sha256:7ce5fa02f058a2c37ecc4a93`).
   `6b19e428` implemented VC-06; it was not a validated anchor.
5. **The bootstrap was not "restored unchanged".** M1 states the corrective
   change was restored unchanged. It was not: an "Review 2" section and the
   Re-verification table were added to this file, and task 2.7's wording was
   changed, after the staged copy. The change in the repository is the
   authoritative one and every edit to it is in git history.
6. **CORR-CORR-002** (`3f40e56d`) appended a correction entry whose matching
   archive-line removal landed one commit later in `e9ad3300`. That breaks the
   same-commit pairing rule (VB-03) and the project's own classifier rates the
   commit substantive although it was committed as documentation. History is
   not rewritten: the violation is recorded here and in D-149, it sits outside
   the unpushed range the per-commit rule inspects (RV-04), and the rule now
   reports any future split at its appending commit.

## Review 3 — independent validation of M5, group 5 and 7.1–7.14 (2026-09-30, `0f4b911b`)

| ID | Sev | Finding | Evidence | Task |
|---|---|---|---|---|
| R3-01 | high | Last `gate:dev` at `0f4b911b` failed 1/5824; the test was never identified; the 15 commits were never integrated or run in CI, yet group 5 and 7.1–7.14 are ticked and notes describe CI behaviour | implementer's final message; `git rev-list origin/main..0f4b911b` = 15 | 8.1 |
| R3-02 | high | Child ACTIVE_TASK/STATE/PLAN stale: "M4 COMPLETE / start M5", PLAN M5/M6 NOT_STARTED, mission "39 tasks" (now 57+); anchor back-dated to `3c9c1a06` although `b9306626` is validated and CI-green; 5.6 ticked while its note defers the sync; no checker compares ticked groups with STATE's milestone | `.agent/ACTIVE_TASK.md`; child STATE.md:283-294; PLAN | 8.2 |
| R3-03 | high | Certification is structurally unsatisfiable. The tree probes (G14/G17/G19/G21) are MET only when HEAD == S with a clean tree, but S is recorded in tracked files and a commit cannot contain its own SHA, so project:check always runs at a descendant of S | `bin/lib/probe-binding.mjs:48-87`; `bin/project-state-check.mjs:992-1025` | 8.3 |
| R3-04 | medium | Nine working-tree probes (ledger, operator-cli, doc-currency, workspace, dependency, cli-contract, rule-registry, ci-block, lane) are not checkpoint-bound; they report MET at HEAD≠S, and an EXACT binding with a receipt would credit S with a HEAD measurement. `DISCOVER_FROM_GIT` for LAST_SUBSTANTIVE still sets S = live HEAD and skips baseline-staleness checks | `project-state-check.mjs:1128,1521`; `releaseCertification/index.ts:625-631` | 8.3 |
| R3-05 | medium | Evidence re-binding accepts fabricated receipts: A→B with any well-formed `receiptDigest` is documentary; a future `observedAt`, an arbitrary `executor` and a non-existent SHA are accepted; adding a fabricated digest at the same SHA flips EVIDENCE_RECEIPT_ABSENT to MET. No digest is verified against a persisted receipt, and real `clean-receipt:sha256:` digests are rejected by `DIGEST_RE` | `bin/lib/release-evidence.mjs:33`; `releaseCertification/index.ts:628` | 8.4 |
| R3-06 | medium | G18 UI-harness and G12 yield receipts are forgeable: a hand-written JSON evaluates BOUND; no digest ties the receipt to harness content at S; `suiteTotals` not cross-checked; any vitest run writes the receipt. G12 `campaignKind` is inferred from env (any executable as `NIGHTWATCH_PRINT_CLI`); PAUSED, REASONER_FAILURE and BUDGET_EXHAUSTED runs evaluate BOUND (no completion or per-case-reason check); runs are sorted lexicographically, not by time. The G20 record has no tree-clean field | `bin/lib/ui-harness-receipt.mjs:155-212`; `ui/control-center/scripts/receipt-reporter.mjs`; `bin/nightwatch-agent.mjs:389`; `src/core/agentRuntime/productRunReceipt.ts:353`; `project-state-check.mjs:882`; `bin/lib/accessibility-record.mjs` | 8.5 |
| R3-07 | medium | The `implemented` honesty rule's D3 clause is text presence: mutants M1 (`headSha: substantiveSha, treeClean: true`), M2–M4 (relation-predicate inversions on G12/G20/G18) survive `hardening:check`. The real-tree test is vacuous (asserts condition state, which is EVIDENCE_ABSENT regardless); no test exercises the binding at probe or collector level | `validation-and-gates.mjs:694-737`; `tests/unit/projectState.test.ts:2530-2544` | 8.6 |
| R3-08 | medium | Lane artifact checks have no wiring test (stubbing `evidenceArtifactAtSha` in project-state-check, or disabling the lane artifact loop, survives hardening); declared artifacts are still long-lived tracked files; `autonomous-yield-proof`/`owner-manual` declare `[]`; a dead `binding?.evidenceSha ?? lane.evidenceSha` remains; `legacyEvidenceSha` exported unused | `project-state-check.mjs:315-327,318,~1451`; `config/release-evidence.v1.json` | 8.7 |
| R3-09 | medium | PROVEN_DEGRADED still counts: `certifying`/`topologyCertifying` are written but read by nothing; `quality-gate.mjs:125` passes degraded; every CI run is degraded (unexercised chrome); the gate does not compare `topologyGitHead` with its own HEAD | `bin/gate-topology.mjs`; `bin/quality-gate.mjs:125` | 8.8 |
| R3-10 | medium | Ledger guard gaps: an active change with no task-ID ledger entry passes; a non-existent `bootstrapSha` only warns; ID swap, renumbering, rewording under the same ID and striking an ID all pass; the legacy ceiling is not down-only against history; the A10 fixtures no longer pin that a non-IN_PROGRESS task with an in-history anchor fails | `bin/lib/openspec-ledger.mjs:219-246,285-290,422-445` | 8.9 |
| R3-11 | medium | Guard-integrity classifier dispatch is still textual: `&& false` on the guard call, or an early return before the guard loop in `checkpoint-role.mjs`, survives the rule and `hardening:check` | `validation-and-gates.mjs:600-610`; `checkpoint-role.mjs:162,191` | 8.10 |
| R3-12 | medium | DEV-launcher short-circuit rule mis-anchored for `phase23-dev` (matches `args.help` in `parseArgs`, not the dispatch); a top-level `spawnSync` before `help()` is not caught; the effect regex misses fs writes, `fork`, dynamic `import()` and local-function calls | `bin/lib/hardening/rules/*` (checkDevLauncherMetadataShortCircuit); `bin/phase23-dev.mjs:34,370` | 8.11 |
| R3-13 | medium | Skip identities are not published for SEMANTIC and OWNER_PROVENANCE (tmpdir, deleted); OWNER_PROVENANCE has no skip-count cross-check; the VC-01 pin is static, not a CI per-test observation; `bodyReadAcquisition.test.ts` runs in no CI lane; the observer refusal path (`BODY_READ_ACQUISITION_BOUND`, `captureIncomplete`) is still only text-pinned | `bin/semantic-compat.mjs:122,155`; `bin/quality-gate.mjs`; `networkObserver.ts:1199-1202` | 8.12 |
| R3-14 | medium | Prettier neutralisation depends on the working directory: `.prettierignore` is honoured only when Prettier runs from the repository root; run from the workspace root it rewrote a file. The positive control depends on `~/.pi-lens` and silently no-ops in CI | `.prettierignore`; `tests/unit/formatterPolicy.test.ts` | 8.13 |
| R3-15 | medium | D-149 Decision 4 misstates the owner's answer. The chosen option (transcript 2026-09-30T01:22:10Z) was "Keep refuse + global cap … Add the refusal count to the run summary"; D-149 says "no source change" and defers the count; the cited STATE deferral entry does not exist | `docs/DECISIONS.md` D-149; child STATE | 8.14 |
| R3-16 | low | Record errors: the false CF-04 attribution to run 36537649045 survives in child STATE:34-36/259-261/789-791, ACTIVE_TASK:25-27 and the 3.12 note; RV-11's pruning is credited to `3ef6183c` (actually `6c7d6f76`); 7.14's task text was reworded (forbidden); 7.14 was ticked before its owner step (revert to private); the 4.4 annotation still says 7.11 is open; the M5 DONE notes overstate ("every probe", "structural", "can never qualify") | as cited | 8.15 |
| R3-17 | low | Minor gaps: the duplicate-correction check does not normalise paths (`./docs/...` alias passes); the annotation counter still misses `{Array<*>}`, `{Object<string,*>}`, `{Function}`, `@satisfies/@enum/@yields {any}` and `.d.mts` `type X = any`, `& any`, `[any,`, `readonly any[]`, `keyof any`; the working-tree pairing range is empty in CI once pushed; `correctionPairingViolations` returns `[]` on an unparsable file; WORKSPACE_BASE_STALE fires when the remote is an ancestor of HEAD; gate:clean's SIBLING_IDENTITY_ABSENT is still non-PASS (intent unrecorded); the G21 exercise omits EXPIRED and WRONG_ENVIRONMENT | as cited | 8.16 |
