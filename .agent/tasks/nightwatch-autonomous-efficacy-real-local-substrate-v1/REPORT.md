# REPORT — nightwatch-autonomous-efficacy-real-local-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: COMPLETE
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W8 — AUTONOMOUS EFFICACY ON THE REAL LOCAL SUBSTRATE

## Starting truth

Session base `4b3b183e07a9a348b8904f618a3bc35e4990df1c`; `origin/main` had already advanced to `97c6536daa31e49d0eb35fd96b9fc4578394cfcc` (a prior session's W8 planning commits), and the session worktree was reconciled onto it. Shared-contract freeze integrated at `87f0ded13e3d16b4130abeadfd95fa88aba04b61`. Final validated implementation checkpoint `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`, verified equal to `origin/main` after a fast-forward push. Live HEAD is always discovered from Git.

## Problem actually diagnosed

W7's live `NO_PROGRESS` was not primarily model wandering. Read from live code before any change:

1. `AgentRuntime.buildRequest()` emitted only phase, untrusted envelopes, an unlabelled `evidenceRefs` list, allowed tools/intents and the budget — no hypotheses, candidates, action history or target state.
2. `pendingUntrusted` is cleared after every request, so a bounded source index existed for exactly one turn. That is the mechanism behind repeated index requests.
3. The `(sourcePath, sourceEvidenceRef)` pair that `session.runReproduction` demands was **not derivable from any field of a `reasoner-turn-request.v1`**. A stateless reasoner literally could not reach verification, so zero candidates was structural, not stylistic.
4. `AgentHypothesis.status` was only ever written `'OPEN'`; "disproved" was unrepresentable.
5. `DEDUPED_REPEAT` discarded repeats silently, with no feedback to the reasoner.
6. `runOneInvestigation` created a fresh runtime and fresh tool session per investigation and never fed accumulators forward.

## Architecture introduced

- `src/core/investigationMemory/**` — `nightwatch.investigation-memory.v1` and `nightwatch.campaign-strategy-state.v1`: pure, per-turn-derived, bounded, deterministic, never persisted, no authority. Ledgers: inspected targets **with their grounding evidence refs**, exhausted targets, salient symbols, hypothesis progress, reproduction readiness, reproduction history, recent actions, repeated-action count, stagnation risk, and deterministic advisory directives.
- `reasoner-turn-request.v2` carrying `observation.memory` (honest version bump, fail-closed validation preserved).
- `AgentRuntime`: executor-confirmed target ledger (only a SUCCESSFUL source-surface result promotes an approved target — model arguments can never inject one), mechanical `SUPPORTED`/`DISPROVED` hypothesis lifecycle driven by observed reproduction verdicts, and `detectExhaustedAction`, which blocks any fingerprint that already failed in the session.
- `localCampaign`: campaign strategy accumulation, hand-off to each fresh investigation, `campaignStrategy` on `LocalCampaignResult`, and fail-closed restore on resume.
- `src/core/efficacy/**` + `bin/efficacy-corpus.mjs` — the before/after harness: one investigator policy, one corpus, one commit, differing only by the mechanical `projectRequestToW7` projection back to the frozen W7 field set.
- `bin/nightwatch-reasoner-print.mjs` — memory-aware provider-neutral prompt replacing one rigid scripted sequence, inside existing byte caps and untrusted-quoting rules.

## Efficacy: fixed corpus `nightwatch.efficacy-corpus.v2`

13 cases (11 positive incl. multi-file/multi-surface, 2 negative controls). Command: `node bin/efficacy-corpus.mjs compare`.

| Metric | W8 baseline | W8 final | Notes |
|---|---:|---:|---|
| Unique source paths inspected | 13 | 31 | +18 |
| Repeat source reads / repeat-target rate | 0 / 0 | 0 / 0 | no regression |
| Redundant index requests | 0 | 0 | |
| Grounded hypotheses | 0 | 17 | baseline could not ground any |
| Verification-ready hypotheses | 0 | 17 | |
| Hypotheses disproved | 0 | 6 | previously unrepresentable |
| Grounded reproduction attempts | 0 | 17 | 0 refused |
| Mechanical reproductions | 0 | 6 | |
| Candidates proposed / admitted | 0 / 0 | 6 / 6 | admission unchanged and mechanical |
| `VERIFIED_ROOT_CAUSE_REDISCOVERY` | 0 | 3 | additive tier |
| `EXACT_REDISCOVERY` | 0 | 0 | strict metric unchanged, nothing leaked to raise it |
| Negative-control false positives | 0 | 0 | did not worsen |
| Leaked cases | 0 | 0 | |
| Reasoner calls | 39 | 102 | **cost rose** |
| Tool actions | 26 | 67 | **cost rose** |
| Stagnation terminations | 0 | 1 (7.7%) | **got worse** — see below |
| Turns to first grounded hypothesis | n/a (never) | median 3, max 8 | |
| Turns to first reproduction | n/a (never) | median 8 | |
| Turns to first candidate | n/a (never) | median 10 | |

Outcome distribution: baseline 13x`MISS`; final 3 `PARTIAL_REDISCOVERY`, 5 `SAME_ROOT_CAUSE_ALTERNATE`, 5 `MISS`, 0 `FALSE_POSITIVE`.

Per-case (baseline -> final): `bench-billing-rounding-001` MISS -> PARTIAL/VERIFIED; `bench-frontend-cache-004` MISS -> PARTIAL/VERIFIED; `bench-regression-redirect-007` MISS -> PARTIAL/VERIFIED; `bench-api-pagination-002`, `bench-backend-retry-003`, `bench-data-timezone-005`, `bench-integration-webhook-006`, `bench-state-transition-008` MISS -> SAME_ROOT_CAUSE_ALTERNATE; `efficacy-billing-multifile-001`, `efficacy-frontend-multisurface-002`, `efficacy-auth-multisurface-003` MISS -> MISS but each now reaches a mechanical reproduction and one admitted candidate; negative controls `bench-negative-quiet-000` and `efficacy-negative-multisurface-000` stay MISS with zero candidates.

Honest reading of the cost columns: the baseline is cheap because it could not act — it read a file and stopped. The final investigator spends more calls because it grounds, verifies and reproduces. The single stagnation termination is the multi-surface negative control, which formed and then DISPROVED five hypotheses before terminating `NO_PROGRESS` with zero candidates; that is the desired behaviour on a no-defect case, but it is reported as a metric that moved the wrong way rather than excused.

## Live-provider evidence

Provider: `opencode-go/deepseek-v4-flash` through the existing print-mode CLI reasoner. Environment class LOCAL throughout.

**1. Leak-isolated historical proof** — `NIGHTWATCH_LIVE_PROVIDER_PROOF=1 NIGHTWATCH_PRINT_CLI=… NIGHTWATCH_PRINT_ARGS='["run","--pure","-m","opencode-go/deepseek-v4-flash","__PROMPT__"]' npx playwright test tests/unit/liveProviderEfficacyProof.test.ts --project=nightwatch --workers=1` — PASS, 7.5 min:

| Case | Termination | Calls | Grounded hyp | Mech. reproductions | Admitted | Outcome | Tier | Leaked |
|---|---|---:|---:|---:|---:|---|---|---|
| `bench-billing-rounding-001` | COMPLETE_WITH_FINDING | 7 | 1 | 1 | 1 | PARTIAL_REDISCOVERY | VERIFIED_ROOT_CAUSE_REDISCOVERY | [] |
| `bench-negative-quiet-000` (control) | COMPLETE_NO_FINDING | 3 | 0 | 0 | 0 | MISS | NOT_VERIFIED | [] |
| `efficacy-billing-multifile-001` | BUDGET_EXHAUSTED | 12 | 4 | 4 | 1 | PARTIAL_REDISCOVERY | VERIFIED_ROOT_CAUSE_REDISCOVERY | [] |

EXACT 0 on all three. The proof asserts only the invariants that must hold regardless of model quality (zero leakage, no minted reproduction credit, no false positive on the control); efficacy is reported, never asserted, so the test cannot be turned into a way of manufacturing success.

**2. Real owner-local campaigns** — `node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h --max-turns=12`:

| | `w8-owner-local-live` | `w8-owner-local-live-2` (after repeat-guard fix) |
|---|---|---|
| Investigations | 3 | 3 |
| Reasoner calls / tool actions | 31 / 24 | 28 / 23 |
| Provider failures | 0 | 0 |
| Wall time | 831.6s | 795.5s |
| Termination | BUDGET_EXHAUSTED (`outputBytes` 2,879,326 > 2,000,000) | BUDGET_EXHAUSTED (`outputBytes` 1,808,741) |
| Unique real source targets | 13 | 10 |
| Grounded hypotheses | 5 | 5 |
| Reproduction calls | 7 executed, all `TOOL_ERROR`, one digest executed 3x | 7 executed + 1 blocked `DEDUPED_REPEAT` |
| Candidates | 0 | 1 proposed |
| Admission | `dossierStatus=NONE` | REFUSED: `MISSING_REPRODUCTION`, `reproductionCount=0`, `dossierStatus=REFUSED_NO_REPRODUCTION` |

Both campaigns explored distinct real `alphauslabs/blue-sdk-go` surfaces (`admin/v1`, `billing/v1`, `cost/v1`, `cover/v1`, `flow/v1` clients and generated bindings) with grounded, evidence-referenced hypotheses instead of cycling one path to `NO_PROGRESS`. **No new Alphaus defect was discovered.** The one live candidate was mechanically refused because no reproduction receipt existed — the admission gate behaving exactly as designed. The second campaign is not a controlled A/B (a live model is nondeterministic); the only mechanically attributable delta is the blocked duplicate fingerprint.

## Regressions encountered and repaired

1. **Target ledger learned a candidate id as a source target** — the investigator tried to `INSPECT_SOURCE_SURFACE` a `REQUEST_FINDING_PROPOSAL` candidate id, looped `TOOL_ERROR`/`DEDUPED_REPEAT` and terminated `NO_PROGRESS` after already earning a reproduction. Cause: promotion accepted any executor-confirmed target. Fix: only successful source-surface tools promote. Found by reading the action log, not by a failing test.
2. **`extractSalientSymbols` truncated identifiers** (`lines.reduce` -> `lines.reduc`) because the file-extension pattern matched mid-identifier. Fixed with a non-letter lookahead.
3. **Harness investigator lost a turn per case** by enumerating new targets before admitting the current one. Fixed at `5dd8ee9`.
4. **Inherited W8 planning documents failed `npm run agent:check`** with 10 continuity errors (missing STATE headings, misplaced `PROJECT_VERDICT_EFFECT`, missing `CONTINUITY_PROTOCOL_VERSION`, non-SHA checkpoint fields, duplicate `Status`, missing routing `SESSION WORKTREE`). Repaired, not relabelled.
5. **Real runtime defect found by live-campaign forensics** — `detectRepeatedAction` only inspected a consecutive streak, so `w8-owner-local-live` executed one reproduction argument digest three times (turns 4, 6, 8) with productive reads in between, burning three real provider turns. Reproduced as a failing test first (`tests/unit/agentRuntime.test.ts`), then fixed with `detectExhaustedAction` at `3d624fb`. No synthetic fixture had exposed it.

No test was deleted, no assertion loosened, no EXACT scoring altered, no failure converted to a skip.

## Safety / leakage ledger

- Hidden-ground-truth leakage: 0 across the fixed corpus (13/13 `leaked=[]`), 0 on all three live historical cases, and `tests/unit/investigationMemoryLeakage.test.ts` proves the memory channel is live (approved canary present) while all six hidden strings are absent from every recorded request blob and from `observation.memory` alone.
- Minted credit: impossible — prose or unobserved-ref reproduction claims yield zero `reproductionCount`, zero admission, zero tier, zero mechanical memory credit.
- Secrets/audit bytes: `minedReplayAudit` stderr never reaches any request blob or memory.
- DEV/NEXT/production contacts: 0. External writes / Slack / Leslie / Pondr / Notion / issue or PR filing: 0. Credential acquisition or exposure: 0.
- Sibling repositories: read-only. `alphauslabs/blue-sdk-go` HEAD `8883ee3d…` unchanged (pre-existing untracked `AGENTS.md` only); the real historical proof asserts `mobingilabs/ouchan` unmutated.
- Force pushes / history rewrites / destructive recovery: 0. Integration was a verified fast-forward.
- Reasoner authority: unchanged. Memory grants no new tool, intent or environment.
- Safety events: three accidental `_edit` writes landed in the canonical checkout (relative-path cwd resolution); each was detected with `git status` and reverse-applied on that single self-authored path, leaving canonical clean with no commit ever created there.

## Certification

At `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`:

- 21 focused agent/memory/campaign/reasoner/benchmark/reproduction suites: 248 passed / 0 failed.
- Full `npm test`: 4429 passed / 0 failed / 15 skipped.
- `npm run typecheck`, `hardening:check`, `agent:check`, `project:check`, `workspace:check`, `session:check`: PASS (`agent:check` PASS with 4 expected warnings).
- `npm run gate:local`: FULL PASS 11/11, receipt `receipt:sha256:0d892de64df3e499898a8289`.
- `npm run gate:clean`: PASS on a fresh Node 20 clone, `installResult=PASS`, inner receipt `receipt:sha256:c6737eb5be31ce52f13647c4`.
- Opt-in real historical product-path proof: PASS in 2.0 min (W7 evidence unbroken by W8).

## Delegated lanes (orchestrator-verified)

| Lane | Worker SHA | Owned paths | Post-reconcile verdict |
|---|---|---|---|
| memory proof | `fe4033fa` | `tests/unit/investigationMemory*.test.ts` | ACCEPTED — 23 tests, zero source edits |
| campaign diversity | `c33535a` | `localCampaign.ts` (+8), `tests/unit/campaignStrategyMemory.test.ts` | ACCEPTED |
| print adapter | `20fbd08` | `bin/nightwatch-reasoner-print.mjs`, `tests/unit/reasonerPrint.test.ts` | ACCEPTED |
| efficacy depth | `e1b3c087` | `src/core/efficacy/**`, `tests/unit/efficacyCorpus.test.ts`, `package.json` | ACCEPTED |
| leakage proof | `9352bac5` | `tests/unit/investigationMemoryLeakage.test.ts` | ACCEPTED |

Every lane's acceptance suite was rerun by the orchestrator AFTER reconciliation; no worker success report was accepted as proof.

## Final truth table

| Claim | Verdict |
|---|---|
| Bounded turn working memory | PROVEN |
| Cross-investigation strategy memory | PROVEN |
| Target diversity improvement | PROVEN (13 -> 31 unique targets, repeat rate still 0) |
| Grounded hypothesis improvement | PROVEN (0 -> 17 grounded, 0 -> 6 disproved) |
| Reproduction-readiness correctness | PROVEN (17/17 grounded attempts, 0 refused) |
| Fixed-corpus efficacy improvement | PROVEN (with honest cost/stagnation regressions reported) |
| Wasteful-repetition reduction | PROVEN (live repeated failed fingerprint now blocked; regression test) |
| Live-provider historical verified root-cause rediscovery | PROVEN (2 of 3 cases) |
| Live real-local diversified progress | PROVEN |
| False-positive non-regression | PROVEN (0 -> 0) |
| Zero hidden-ground-truth leakage | PROVEN |
| Mechanical finding admission preserved | PROVEN (live candidate refused for missing reproduction) |
| W7 safety boundaries preserved | PROVEN |
| Regression + clean-clone certification | PROVEN |
| Strict `EXACT_REDISCOVERY` | NOT_PROVEN — still 0, deliberately unchanged |
| Previously unknown Alphaus bug | NOT_PROVEN |
| Full HOUR_1 live wall-clock endurance | NOT_PROVEN — both runs hit the `outputBytes` ceiling first |
| DEV/NEXT/production | NOT_AUTHORIZED |
| Organizational approval | NOT_AUTHORIZED |
| Parent programme completion | NOT_PROVEN — separate terminal criteria |

## Programme verdict

`IN_PROGRESS` — W8 is COMPLETE; the parent autonomous programme keeps its own open terminal criteria (previously unknown bug yield, EXACT, DEV/NEXT).
