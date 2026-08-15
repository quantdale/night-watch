# Nightwatch Phase 8 Final Closure & Phase 9 Roadmap Selection

## Task purpose

Perform the owner-authorized Phase 8 final closure and Phase 9 roadmap
selection: mechanically transition Phase 8 from `IN_PROGRESS` to `COMPLETE`
(project-state pin + machine-checked truth block + tests + hardening +
docs), extend the continuity documentation-checkpoint allowlist narrowly so
repository-native files under `docs/design/*.md` can be legitimate
documentation-only descendants (with negative tests proving the extension
cannot classify arbitrary source/nested files as documentation), freeze the
canonical-promotion research boundary, reconstruct Nightwatch's current
bug-hunting pipeline from source/tests/history, select exactly ONE
evidence-backed Phase 9 primary investment, produce an implementation-ready
future-task specification, and close under `nightwatch.agent-continuity.v2`.

This task performs NO Phase 9 implementation, NO variant-B adoption, NO
promotion prepare/approve/APPLY, NO catalog mutation, NO owner-policy
change, NO product/DEV/NEXT/production execution, NO DB/infrastructure
work, NO AI/model execution, NO Alphaus writes, NO publication.

## Authorization

- Authorization class: `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`
- Phase: `8-CLOSURE` (not 8C, not Phase 9)
- Protocol: `CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2`

## Established starting state

- Task ID: `phase-8-final-closure-phase-9-roadmap-selection`
- Starting SHA: `27cc5a2c81d40a6afcee1d1a791e6c9b09cdafa2`
  (HEAD == origin/main == expected authorization SHA; worktree clean)
- Active task at start: `phase-8-next-architecture-design-review` COMPLETE
  (recommendation `PHASE_8_NEXT_ARCHITECTURE: CLOSE_PHASE_8`; D-52).
- Phase statuses: 8 = IN_PROGRESS; 8A/8A.1/8A.1.1/8B/8B.0.1/8B.1.0/
  8B.1.0.1/8B.1.0.2 = COMPLETE; 8B.1 = COMPLETE_VIA_SUCCESSFUL_RETRY_R1
  (original attempt BLOCKED/CLOSED historical record; R1 approval consumed
  exactly once); 8B.1-R1.1 = COMPLETE; 8B.1-R1.1.1 = COMPLETE.
- Canonical catalog: count 1 (variant A / EXPAND_SUMMARY); raw digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`;
  adoptedCaseId `adopted-case:sha256:90248aae...`; fingerprint
  `sha256:6a322450...`; strategy `DECLARATIVE_REGRESSION_CATALOG_PROMOTION`.
  The catalog MUST remain byte-identical through this task.
- Variant B (EXPAND_THEN_COLLAPSE): `AVAILABLE_NOT_ADOPTED`.
- Promotion authority: `NEXT_PROMOTION_AUTHORITY: NONE` (machine-enforced).
- Project-state protocol: `nightwatch.project-state.v1` (protocol version
  stays v1; the status-token transition is a normal value change under the
  same schema/authority contract).
- D-52's four Phase-8 completion criteria: reconfirmed PASS from current
  source/docs/evidence (live promotion at `24fc437`; continuation proven;
  current-source truth hardened via continuity v2 + project-state v1 +
  catalog integrity + authority wording; no unresolved safety blocker).

## Required deliverables

1. Strict-v2 task records (`SPEC/PLAN/STATE/REPORT.md`) +
   `.agent/ACTIVE_TASK.md`, status IN_PROGRESS during the task, COMPLETE at
   closure with terminal fields; no self-referential future SHA/CI
   placeholders.
2. Pre-fix reproduction of the project-state pin: synthetic fixture with
   `PHASE_8_STATUS: COMPLETE` while all other fields remain correct must
   fail with `PROJECT_STATE_PHASE_8_STATUS_MISMATCH` — the intentional
   pre-closure pin (TRUE_POSITIVE_DESIGN_BLOCKER, not a bug).
3. Pre-fix reproduction of the checkpoint-path limitation: a documentation
   descendant containing `docs/design/example.md` is not an approved
   checkpoint path; documentation checkpoint/range cannot be classified
   docs-only. Record the exact diagnostic.
4. Project-state transition: `PHASE_8_STATUS` pin flips to `COMPLETE` in
   `bin/project-state-check.mjs` (check + output payload) and in the
   `docs/CURRENT_STATE.md` machine-checked truth block. Keep
   `PHASE_8B_1_STATUS: COMPLETE_VIA_SUCCESSFUL_RETRY_R1`,
   `CANONICAL_CATALOG_ENTRY_COUNT: 1`,
   `NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED`,
   `NEXT_PROMOTION_AUTHORITY: NONE`. No invented Phase-8C status.
5. Project-state regression matrix update (tests):
   A. COMPLETE passes; B. IN_PROGRESS fails; C. arbitrary value fails;
   D. 8B.1 status unchanged enforcement; E. promotion authority NONE
   mandatory; F. B available valid; G. catalog count 1 valid;
   H. catalog count/digest/renderer integrity unaffected.
6. `docs/design` approved checkpoint extension in `bin/agent-state.mjs`
   `APPROVED_CHECKPOINT_PATHS`: narrow `/^docs\/design\/[^/]+\.md$/`.
   NOT `docs/**`, NOT `docs/design/**`, NOT nested dirs, NOT non-Markdown,
   NOT source/executable files.
7. Allowlist negative tests: reject `docs/design/nested/foo.md`,
   `docs/design/foo.ts`, `docs/design/foo.js`, `docs/design/foo.json`,
   `docs/design/../src/x.ts`, `docs/random.md`, `src/design/foo.md`;
   allow `docs/design/PHASE_9_ROADMAP.md`; a commit changing
   `docs/design/PHASE_9_ROADMAP.md` PLUS a source file is IMPLEMENTATION.
8. Existing approved paths must not regress (`AGENTS.md`, `.agent/**`,
   `docs/ARCHITECTURE.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/CI_HARDENING.md`); existing
   task-continuity tests remain green.
9. Hardening updates (`bin/hardening-check.mjs`): update direct closure
   assumptions (Phase 8 COMPLETE requirement; project-state/checkpoint
   classification explicit); narrow assertions only, no brittle whole-doc
   grep logic.
10. Closure safety invariant regression: `PHASE_8_STATUS COMPLETE`
    coexists with `NEXT_PROMOTION_AUTHORITY NONE` — closing the research
    phase grants NO promotion authority.
11. `docs/design/PHASE_9_ROADMAP.md` design document (16 required sections;
    the real file itself proves the allowlist extension).
12. Phase 9 selection: evidence-backed primary bottleneck, option matrix
    (P9-A..P9-G evaluated on the fixed criteria), one primary direction,
    secondary/later classifications, completion criteria (4-7 measurable),
    synthetic/local success metric, implementation-ready future spec,
    `PHASE_9_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`.
13. Docs transitions: D-53 in DECISIONS; ROADMAP (Phase 8 COMPLETE, closure
    COMPLETE, Phase 9 DESIGNED/NOT_STARTED/NOT_AUTHORIZED); CURRENT_STATE
    machine block + narrative; ARCHITECTURE (research boundary COMPLETE,
    machinery retained, no standing authority, Phase 9 selected-architecture-
    only); AGENTS.md / SAFETY_MODEL only if a permanent rule needs stating.
14. Canonical-promotion research boundary record: mechanism retained, no
    standing authority, future use requires concrete candidate + fresh
    owner authorization + fresh evidence + fresh one-shot approval + one
    bounded APPLY. No global "Phase 8 frozen" execution block (Phase 8 is
    COMPLETE, not FROZEN; future explicit authorization may reuse the
    machinery).
15. Validation: typecheck, hardening, project-state matrix, agent-state
    matrix, agent:check, agent:audit, project:check (Phase 8 COMPLETE),
    catalog integrity, Phase 8 lineages, owner provenance, campaign
    synthetic, full clean Playwright (0 failed), isolated full-history
    checkout, git diff --check.
16. Exact CI verification on the implementation checkpoint and the final
    docs closure checkpoint; final HEAD == origin/main, clean worktree.

## Allowed files

- `bin/project-state-check.mjs` (status pin + output payload)
- `bin/agent-state.mjs` (docs/design checkpoint allowlist)
- `bin/hardening-check.mjs` (direct closure assumptions)
- `tests/unit/projectState.test.ts`, `tests/unit/agent-state.test.ts`
  (and a focused hardening test if the current structure requires it)
- `docs/**`, `.agent/**`

## Forbidden

- Any change to `src/core/selfDev/**`, `src/core/selfDevSandbox/**`,
  `src/core/selfDevPromotion/**`, `src/core/policy/ownerScope.ts`, campaign
  implementation, triage implementation, oracle implementation, product
  code.
- Variant-B adoption, sandbox adoption, promotion prepare/approve/APPLY,
  promotion intents, approvals, catalog writes, owner-policy changes.
- Product/DEV/NEXT/production execution; DB/infra queries; AI/model calls;
  Alphaus writes; publication.
- Phase 9 implementation of any kind.

## Stop conditions

- `PHASE_8_FINAL_CLOSURE_STOPPED_SOURCE_ADVANCED` — starting source
  advanced (no reset/rebase/overwrite).
- `PHASE_8_FINAL_CLOSURE_BLOCKED_COMPLETION_CRITERION` — any D-52 criterion
  fails (do not flip the status).
- `PHASE_8_FINAL_CLOSURE_BLOCKED_PROJECT_STATE_TRANSITION` /
  `_BLOCKED_CHECKPOINT_ALLOWLIST` / `_BLOCKED_PHASE9_SELECTION` /
  `_BLOCKED_FULL_REGRESSION` / `_BLOCKED_CATALOG_DRIFT` /
  `_BLOCKED_IMPLEMENTATION_CI` / `_BLOCKED_FINAL_CONTINUITY` — gates are
  never weakened to force closure.
- Any need to mutate the catalog/portfolio/contract/promotion machinery →
  STOP and re-design.
