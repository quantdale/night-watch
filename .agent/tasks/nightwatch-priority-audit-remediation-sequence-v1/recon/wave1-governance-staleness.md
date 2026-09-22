# Governance / OpenSpec / Continuity / Test-Health Staleness Inventory

Repo scanned (read-only): `/home/dalepalaca/.nightwatch/worktrees/nightwatch-priority-audit-remedi-0e17af9c`
Branch `session/nightwatch-priority-audit-remedi-0e17af9c`, HEAD `24098097`, `origin/main` `4a3df8cd` (7 commits ahead, unpushed mid-campaign M3).
No file was modified by this reconnaissance. NOTE: a concurrent writing session was observed live in this worktree — `git status` was clean at scan start and showed in-flight NW-AUD-019 edits by scan end (`src/core/policy/privateScreening.ts`, `src/controlCenter/authorities/findingsAuthority.ts`, untracked `bin/lib/privateConsumerCensus.mjs`). All findings below are anchored to HEAD `24098097`.

Validator baselines actually run (all read-only, all PASS): `node bin/validation-universe.mjs` rc=0, `node bin/agent-state.mjs` rc=0 (35 warnings), `node bin/project-state-check.mjs` rc=0, `npx tsc --noEmit` rc=0, `node bin/test-timings.mjs` rc=0.

---

## P1 — Continuity / project-truth drift (successor must reconcile)

1. **Prose anchor table in `docs/CURRENT_STATE.md` contradicts the machine truth block on all five rows.**
   - Evidence: `docs/CURRENT_STATE.md:809-811` prose table "Current value" = `68d834b` (LAST_SUBSTANTIVE_IMPLEMENTATION_SHA), `c18db55` (LAST_LOCALLY_VALIDATED_SHA), `c18db55` (LAST_CLEAN_VALIDATED_SHA), `27bfe44` (CI_OBSERVED_SHA), `4e0bfc1` (CI_EXECUTED_SHA) — vs machine block `docs/CURRENT_STATE.md:869-876` = `c13544a1`, `10ccbe64`, `25f94c37`, `NONE`, `NONE`. The doc itself admits at `docs/CURRENT_STATE.md:858` "The validator does not read this table, so both drifts are invisible to it".
   - Why it matters: the R-12 reconciliation narrative claims the table was repaired cell-by-cell, yet the current cells are still W12/W1-era values. `project:check` passes because it only reads the machine block; a reader of the prose gets five wrong "current" anchors.
   - Campaign framing: docs-truth reconciliation task — re-derive the five prose cells from the machine block (or demote the table to explicitly-labeled history), guarded by a check that diffs prose cells against the block.

2. **"Exact-head CI state (current live CI state)" prose is anchored to a retired baseline.**
   - Evidence: `docs/CURRENT_STATE.md:940` — "At the W1 substantive baseline `53152cff` no CI run has been observed"; billing-block evidence cited only through `2026-09-09` (`docs/CURRENT_STATE.md:946-948`), while today is 2026-09-22 and HEAD moved `4a3df8cd → 24098097`. `53152cff` appears nowhere else in the live doc.
   - Why it matters: heading claims "current"; content is ~2 weeks and many checkpoints stale, including the owner-action billing-block observation window.
   - Campaign framing: CI-lane freshness pass — restate the section against the live campaign base or explicitly archive it as history (mirroring how the block already carries `CI_STATUS: NOT_OBSERVED`).

3. **Active-task structured SHA fields lag the narrative checkpoint.**
   - Evidence: `.agent/ACTIVE_TASK.md` (`Last validated implementation SHA: 4a3df8cd`, `LAST_VALIDATED_IMPLEMENTATION_SHA: 4a3df8cd`, `LAST_SUBSTANTIVE_CHECKPOINT_SHA: 4a3df8cd`) vs same file `Last checkpoint: M2 COMPLETE at ff62ff0b — gate:dev PASS; gate:milestone PASS`; same pattern in `.agent/tasks/nightwatch-priority-audit-remediation-sequence-v1/STATE.md:10-13,24-26`. HEAD is `24098097` (three more commits past `ff62ff0b`).
   - Why it matters: continuity v2 says the structured fields name the validated implementation/closure anchor; the narrative claims a validated M2 checkpoint the fields do not carry. `agent:check` still PASSes — the checker does not compare narrative "Last checkpoint" text against the structured SHA fields, so this drift is unchecked.
   - Campaign framing: continuity-hardening candidate — either advance the fields at M2-close or add an agent:check rule binding `Last checkpoint: ... at \`<sha>\`` to `LAST_SUBSTANTIVE_CHECKPOINT_SHA`.

4. **Machine-block rows verified non-dangling (no action):** all block SHAs (`2576c575`, `c13544a1`, `10ccbe64`, `25f94c37`) resolve in git; `LIVE_HEAD_SHA`/`FINAL_DOCUMENTATION_SHA` are `DISCOVER_FROM_GIT`; `LIVE_STATE` block correctly names the active campaign/IN_PROGRESS (`docs/CURRENT_STATE.md:918-931`); `project:check` rc=0.

## P2 — OpenSpec state (`openspec/changes/`)

5. **Scale:** 58 active changes, 56 archived (aggregate only, as instructed). Active-change creation dates: oldest `nightwatch-production-observability-system-map-master-plan-v1` 2026-09-01; the bulk 2026-09-19..22 (audit campaign). Nothing else "very long" open.

6. **7 fully-complete changes still active (archive candidates):**
   - `nightwatch-certification-closure-and-validation-integrity-v1` (36/36), `nightwatch-continuity-live-waypoint-binding-v1` (14/14), `nightwatch-provider-resilient-current-yield-w13-v1` (53/53), `nightwatch-published-spec-baseline-integrity-v1` (12/12), `nightwatch-session-mutation-authority-binding-v1` (30/30), `nightwatch-test-infrastructure-performance-v1` (30/30), `nightwatch-validation-classification-and-skip-truth-v1` (18/18) — all `openspec/changes/<name>/tasks.md` with zero open boxes.
   - Framing: hygiene/archive sweep (archive with dated prefix per existing convention).

7. **42 zero-done active changes** = the planning-only audit proposal backlog (NW-AUD findings; `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/tasks.md` maps 45 findings → 45 changes). Every one carries the blanket header "…planning-only audit campaign… none has been performed" with all tasks struck. These are not defects; they are the queue the priority-audit remediation campaign will consume/supersede one-by-one (NW-AUD-010 ✓ done, 014 ✓ done, 019 in flight).
   - Framing: backlog-consumption tracking — retire/rewrite each proposal change as its remediation lands, or explicitly mark superseded-by-remediation to stop re-reading 42 dead queues.

8. **Stale tasks.md headers contradicted by live source (real OpenSpec truth defects):**
   - `openspec/changes/nightwatch-child-process-boundary-totality-v1/tasks.md:1-2` header says "none has been performed", but 6/16 boxes are `[x]`, and the census it claims exists at `bin/lib/childProcessCensus.mjs` (also registered `config/hardening-rule-probes.v1.json:20`, `config/validation-universe.v1.json:214`).
   - `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/tasks.md:1-3` same header; 18/23 boxes `[x]`, including HC-099..HC-105 probes that exist.
   - `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/tasks.md:1` same header while 7/14 `[x]` (this is the *current* M3 phase change).
   - Framing: OpenSpec truth repair — replace the blanket header with a per-section status once a remediation campaign touches the change.

9. **Current phase change strikes work the campaign mission requires.** `nightwatch-private-payload-screening-structural-integrity-v1/tasks.md` §4.1–4.3 (adversarial/mutation proof) and §5.1–5.2 (acceptance/handoff) are struck `- [ ] ~~…~~` as out-of-scope, and §2.2/§3.3 are `[PARTIAL]` deferred — yet `.agent/ACTIVE_TASK.md` mission mandates "adversarial/mutation proof" for *each* remediation. Same pattern was used to close M1 (`release-evidence` §7.1/7.2 struck) and M2 (`child-process` §3–5 struck).
   - Why it matters: proof obligations are being recorded as "not in scope" in the very change that claims them done — the exact class of truth defect this campaign exists to fix.
   - Framing: include in NW-AUD-019 closeout — un-strike and complete (or re-scope with explicit owner text) proof/acceptance sections before archiving.

10. **Genuinely-open, non-struck tasks exist in only 4 active changes:** `nightwatch-priority-audit-remediation-sequence-v1` (11, current campaign), `nightwatch-production-completion-programme-v1` (47), `nightwatch-autonomous-bug-hunting-programme-v1` (18), `nightwatch-production-observability-system-map-master-plan-v1` (10, oldest change, created 2026-09-01).
    - Framing: the last three are long-tail planning queues that overlap the audit backlog; a successor campaign should either adopt or explicitly park them.

11. **`nightwatch-control-center-design-system-v1` (47/50):** remaining `tasks.md:56,74,157` are struck style items (`--surface-muted` colors, review-chip tokens, focus-indicator measurement) — deferred design polish, not defects.

## P3 — `.agent/tasks/` inventory

12. **Scale/status:** 207 task dirs; 182 `Status: COMPLETE` (all COMPLETE tasks have `REPORT.md` — no missing-report gaps found); non-COMPLETE: 6 IN_PROGRESS + 13 BLOCKED (planning-only) —
    - IN_PROGRESS not owned by the current campaign: `nightwatch-production-completion-programme-v1`, `nightwatch-production-observability-system-map-master-plan-v1`, `nightwatch-autonomous-bug-hunting-programme-v1`, `nightwatch-autonomous-yield-proof-w11-v1` (26/29, last checkpoint "M0 preflight"), `phase-13-real-campaign-semantic-runtime-integration`.
    - BLOCKED planning-only STATEs supersedeable by audit remediations: `phase-11a-1..4`, `phase-12`, `phase-13h`, `phase-13i`, `phase-14`, `phase-15h`, `phase-22`, `phase-8b-1-owner-gated-canonical-promotion`, `phase-9b-contained-dev-semantic-acceptance`, `nightwatch-final-assurance-release-readiness-hardening-v1`.
    - Framing: continuity-ledger retirement pass (mark superseded, don't mass-migrate per AGENTS rule).

13. **No truly dangling OpenSpec refs in COMPLETE task records.** Every `openspec/changes/<name>` reference from `STATE.md`/`REPORT.md` resolves to an active dir or an archived `YYYY-MM-DD-<name>` dir, except `openspec/changes/add-reserveshield-export-report` in `.agent/tasks/phase-2a-controlled-observation/STATE.md:153` — verified to be a historical observation about the *sibling ripple-ui repo's* local deletions, not a Nightwatch change (false positive; no action).

14. **`agent:check` warnings (informational):** PASS with 35 warnings — `LEDGER_TASK_WITHOUT_CHANGE`: 31 legacy v2 orphans (e.g. `phase-11a-4`, `phase-12`, `phase-13*`, `phase-14`, `phase-15*`, `phase-16*`) + 31 legacy v1 dirs with no matching OpenSpec change. Ties into item 12's retirement pass.

## P4 — Test infrastructure health

15. **Validation universe: PASS but every lane's evidence is stale.** `node bin/validation-universe.mjs`: `discovered=518 authoritativeGate=258 classified=260 unclassified=0`, digest `sha256:3a763aaf1dd9d7cb8c66b1c9`; **lane-state: `proven=0 stale=10 unavailable=1`** — `root-compile`, `bin-parse`, `structural-invariants`, `authoritative-gate`, `full-regression`, `clean-checkpoint`, `ui`, `browser-workflow`, `exact-checkpoint-ci`, `dependency-advisory` all `PROVEN (STALE_EVIDENCE)`; `owner-manual` `UNAVAILABLE_CAPABILITY revisit=2026-10-11`.
    - Why it matters: classification is complete, but no lane's provenance is fresh — gate claims rest on old receipts.
    - Framing: "lane-evidence refresh" campaign segment: re-run the cheap lanes and re-record receipts.

16. **Shard weights missing for both new campaign unit tests.** `config/shard-weights.v1.json` (`weights` = 386 entries, `weightDigest: sha256:41c47b98655a5acfaff8ada3`) has **no entry** for `tests/unit/privateStructuralScreening.test.ts` (new, in universe at `config/validation-universe.v1.json:80`) or `tests/unit/childProcessCensus.test.ts` (new, universe line 32). Missing files fall back to unit cost 1 in `src/core/validation/shardPlan.ts:124` (`input.weights?.[file] ?? 1`), so shards run but balance on stale weights for these.
    - The 16 other weight-less files (`tests/browser/*`, `tests/manual/*`) are by design — not shard-lane.
    - Framing: regenerate `shard-weights` + `weightDigest` at the next M3/M4 checkpoint (`test:timings` telemetry is fresh: 112 timing docs, all 2026-09-22).

17. **`tests/unit/sessionMutationAuthority.test.ts` not in `validation-universe` — by design, not a defect.** It is gate-selected (`config/synthetic-campaign.v1.json:121`, weight present `config/shard-weights.v1.json:392`: 145 ms, exec class at `config/validation-execution-classes.v1.json:1723`); `AUTHORITATIVE_GATE` is derived and non-declarable (`bin/validation-universe.mjs:80-88`, asserted by `tests/unit/nw08ValidationUniverse.test.ts:162-164`). Reported to close the question raised in the task brief.

18. **`config/validation-execution-classes.v1.json`: healthy** — covers all 388 sharded files including both new tests (`:338`, `:1344`); unknown files fail closed to `SERIAL_REQUIRED` per its note. No staleness found.

## P5 — TODO/FIXME in `src/`

19. **No real defect-marker clusters.** Exactly one `TODO|FIXME|XXX` match in all of `src/` and it is an explanatory comment: `src/browser/fixtures/storageState.ts:59` (describes a historical `/tmp` clean-gate incident). `tests/` matches are fixture literals (`HACK_THE_PLANET`, `/tmp/nightwatch-quality-gate-clean-XXXX`). Nothing actionable.

## P6 — Control Center

20. **No TODO/FIXME/known-defect markers** in `src/controlCenter/` or `ui/control-center/src/`. The word "defect" appears only in comments describing *already-fixed* defects found by browser workflow (`src/controlCenter/server/sse.ts:196`, `src/controlCenter/server/defaultCollector.ts:266-272`) and in design vocabulary (`reviewerAuthority.ts` defect-class grouping). `UNKNOWN` states in `ui/control-center/src/api.ts:410-431`, `views/ReviewerView.tsx:38-203` are first-class epistemic design, not incompleteness.

21. **Compile/run risk: UI dependencies not installed in this worktree.** `ui/control-center/node_modules` ABSENT; root scripts `control-center:ui:typecheck|test|build|browser` (`package.json:71-74`) will fail until `npm --prefix ui/control-center install` (forbidden in this read-only pass). Root `npx tsc --noEmit` PASSES (rc=0; root `tsconfig.json` `include` = src/tests/scenarios/config/corpus/playwright*.config — excludes `ui/`). Recent HEAD commits `1b338d20`/`24098097` (aud019 local-tsc path-root repairs) are consistent with typecheck now green.
    - Framing: prerequisite note for any campaign running the Control Center browser lane (`playwright.control-center.config.ts`): budget an install step or verify CI-side UI lane.

---

## Suggested successor-campaign framings (prioritized)

1. **Continuity/truth reconciliation** (P1 items 1-3): prose-table ↔ machine-block cell reconciliation, CI-prose freshness, narrative-vs-structured-SHA checker rule.
2. **OpenSpec hygiene + proof-obligation truth** (P2 items 6, 8, 9): archive 7 completed changes, fix 3 stale "none performed" headers, un-strike/complete proof+acceptance sections of in-flight remediation changes.
3. **Ledger retirement** (P3 items 12, 14): supersede 13 BLOCKED planning tasks + 5 overlapping IN_PROGRESS tasks; consume the 35 `LEDGER_TASK_WITHOUT_CHANGE` warnings.
4. **Lane-evidence refresh + weights regen** (P4 items 15, 16): re-record 10 stale lane receipts; regenerate `shard-weights.v1.json` including the two new unit tests.
5. **Control Center UI lane readiness** (P6 item 21): install/build/typecheck the UI workspace before the next browser-lane claim.