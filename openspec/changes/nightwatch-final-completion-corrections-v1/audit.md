# Audit — validation of `nightwatch-final-product-completion-v1` M0–M4 (partial)

Read-only on 2026-09-27 at HEAD = origin/main = `d595c7c8`. Three independent
validators (M0/M1 + ledger + M4, M2, M3) inspected committed content. The
coordinator spot-checked the highest-impact claims in source. Nothing was
modified. No gate, test suite or Playwright was run; a session was live.

## Re-verification at the live base (2026-09-28, `1d47e2ee`)

Task 1.3 (RESUME_PROMPT §3.2): every finding below was re-checked against
the current code (the parent landed 144 commits since `d595c7c8`, through
M9 task 10.2). Classification: 21 STILL_PRESENT, 5 CHANGED, 2
COMPLETED_LATER. Follow-on defects (later work built on a defective
surface) are recorded at the end.

| ID | Classification | Evidence at `1d47e2ee` |
|---|---|---|
| VB-01 | STILL_PRESENT | `bin/lib/validation-lane-state.mjs:83-87,117-121` still accepts a null `evidenceSha` as not-stale; `bin/project-state-check.mjs:1365` skips null |
| VB-02 | STILL_PRESENT | `bin/project-state-check.mjs:1366` still `cat-file -e <sha>^{commit}` (commit existence); no `artifactPaths` in `bin/lib/release-evidence.mjs` |
| VB-03 | STILL_PRESENT | `bin/lib/release-evidence.mjs:258-285` `isAppendOnlyCorrectionsChange` still admits an append without the matching archive-line removal |
| VB-04 | COMPLETED_LATER | `certificationDemotionFor` is parameterized (`bin/project-state-check.mjs:869`), `liveHeadSha` computed at :1407 before use at :1505; fixed in `a784e668` |
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
| CF-04 | Four `fs.existsSync` sibling-checkout-gated REAL-artifact tests (c08:110 ripple-ui host matrix, c08:238 ouchan build config, c09:301 blueapi spec, c09:314 blueinternal spec) skip only where the sibling Alphaus checkouts are ABSENT; their identities were never declared because the dev host HAS the checkouts, so exact-head CI (no siblings) failed SYNTHETIC_CAMPAIGN with UNDECLARED_SKIP 40/4 (run 36513017223 at `2b5d8178`, receipt `receipt:sha256:75d601ff140284f7cd78be38`) — the skip-identity policy is only as complete as the environments it was measured on | `tests/unit/c08DeploymentBinding.test.ts:110,238`; `tests/unit/c09SpecExpectations.test.ts:301,314`; exact-head CI receipt at `2b5d8178` | 3.12 (declarations + source-bound regression: one declaration per sibling-gated skip site, titles must be source literals) — CLOSED at `491b5ef9` (proven in CI run 36537649045: skipPolicy PASS 14/0) |
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
