# Nightwatch Phase 8B.1-R1.1 — Project-Memory & Canonical-Source Truth Hardening

Status: IN_PROGRESS (living plan)
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

See SPEC.md — frozen intent.

## Starting State

- HEAD == origin/main == `a8ba972ae7b0723c6812f982bcf93acdb17d28a5` (CASE D).
- Worktree clean.
- R1 task COMPLETE; ACTIVE_TASK points to R1 (COMPLETE).
- Pre-state (2026-08-15, this session):
  - Catalog: count 1, raw digest `sha256:fa7b71d472ad4656aa9019a0ca35e264da31226c8af6612f3f649a397e9e4e7e`
  - Adopted case: `adopted-case:sha256:90248aaeaf06187038973b0a03f2baa27bdf6f270b4fc43338e1bded74b0e234`
  - Equivalent fingerprint: `sha256:6a322450978992f44698256b3371fbe8b13ca70ac4b489e77b6d2ef5bab27663`
  - sourceBundleDigest: `sha256:1bec27108f0268903de78451a83d5be15c67303f519587c7e1a8a39e3e508281`
  - contractDigest: `sha256:d8012faecd3d5bd4843e6257eb9edd7cec64b25c8928a0303d7d20525ed6beb7`
  - Fresh session `session:sha256:03707b57...` — VERIFIED_EXACT_BASE, replay PASS,
    passCount 1, selected EXPAND_THEN_COLLAPSE (B).
- Confirmed defects:
  - A: renderer header + module header in `adoptedCases.ts` describe the
    catalog target as sandbox-only ("never in this canonical checkout at
    runtime"); generated file carries the same false text.
  - B: CURRENT_STATE `Current Git topology` rows
    `LAST_VALIDATED_IMPLEMENTATION_SHA: 4602fac...` and
    `LAST_DOCUMENTATION_CHECKPOINT_SHA: 488b4e...` (Phase 8A.1-era) duplicate
    live authority owned by Git + continuity v2 and naturally drifted.

## Scope

See SPEC.md.

## Non-Goals

See SPEC.md.

## Safety Constraints

See SPEC.md.

## Architecture / Approach

### Project-state v1 authority model

- LIVE HEAD ← Git (no persisted current-head SHA anywhere).
- CURRENT IMPLEMENTATION CHECKPOINT ← `.agent/ACTIVE_TASK.md` + STATE under
  `nightwatch.agent-continuity.v2`.
- CURRENT PROJECT SNAPSHOT ← `docs/CURRENT_STATE.md` (snapshot, never its own
  authority; machine-checked block only for mechanically derivable facts).
- CANONICAL CATALOG CONTENT ← validated generated source + deterministic
  renderer (`renderAdoptedCatalogSource`).
- CATALOG MUTATION AUTHORITY ← Phase 8B sandbox mirror write (disposable
  private mirror only) OR Phase 8B.1 separately owner-gated canonical
  promotion (exact evidence/approval chain, development-session commit).
  No generic runtime mutation authority.
- CANDIDATE AVAILABILITY ≠ PROMOTION AUTHORITY.

### Structured block (CURRENT_STATE.md)

`## Project-state v1 (machine-checked truth block)` followed by a fenced
block of `KEY: value` lines:

```
PROJECT_STATE_PROTOCOL_VERSION: nightwatch.project-state.v1
LIVE_HEAD_AUTHORITY: GIT
CURRENT_TASK_AUTHORITY: .agent/ACTIVE_TASK.md
VALIDATED_IMPLEMENTATION_AUTHORITY: .agent/ACTIVE_TASK.md
CANONICAL_CATALOG_TARGET: src/core/selfDev/adoptedCaseCatalog.generated.ts
CANONICAL_CATALOG_ENTRY_COUNT: 1
CANONICAL_CATALOG_SHA256: <raw digest — updated after regeneration>
CANONICAL_CATALOG_STRATEGY: DECLARATIVE_REGRESSION_CATALOG_PROMOTION
PHASE_8_STATUS: IN_PROGRESS
PHASE_8B_1_STATUS: COMPLETE_VIA_SUCCESSFUL_RETRY_R1
NEXT_PORTFOLIO_MEMBER: AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY: NONE
```

No self-referential SHA; no generic `LAST_VALIDATED_IMPLEMENTATION_SHA` /
`LAST_DOCUMENTATION_CHECKPOINT_SHA` keys inside the block (rejected by the
checker as competing duplicate live authority). Historical phase-qualified
fields stay valid (e.g. `PHASE_8A_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA`).

### Checker (`bin/project-state-check.mjs`)

- Deterministic, local, read-only: fs reads only; git subprocesses strictly
  read-only (`status --porcelain`, `ls-files`); one `node bin/agent-state.mjs`
  subprocess for ACTIVE_TASK continuity; TypeScript loaded via the
  established `require.extensions` + `transpileModule` loader (same pattern
  as `bin/selfdev-catalog-integrity.mjs`).
- Checks (§16/§20-26 authorization):
  1. block present with exact supported protocol version
  2. LIVE_HEAD_AUTHORITY == GIT
  3. CURRENT_TASK_AUTHORITY == `.agent/ACTIVE_TASK.md`
  4. ACTIVE_TASK exists + `agent-state.mjs` exit 0 (continuity v2 passes)
  5. CANONICAL_CATALOG_TARGET == code constant `SELFDEV_ADOPTED_CATALOG_TARGET_PATH`
  6. target exists, regular file, tracked by git, not a symlink
  7. catalog validates via real `validateAdoptedCatalog`
  8. on-disk bytes == `renderAdoptedCatalogSource(validated)` (round-trip)
  9. entry count == real count
  10. digest == real `sha256:` raw-file digest
  11. strategy == `SELFDEV_ADOPTION_STRATEGY_CLASS`
  12. no generic duplicate live anchor keys in the block
  13. NEXT_PROMOTION_AUTHORITY == NONE exactly
  14. NEXT_PORTFOLIO_MEMBER agrees with real
      `selectNextSyntheticProposalVariant` projection (AVAILABLE_NOT_ADOPTED
      when a next variant exists; EXHAUSTED when null)
  15. PHASE_8_STATUS == IN_PROGRESS (whitelist)
  16. PHASE_8B_1_STATUS == COMPLETE_VIA_SUCCESSFUL_RETRY_R1, cross-checked
      against R1 task STATE `PHASE_8B_1_R1_STATUS: COMPLETE`
  17. checkout clean (mirrors catalog-integrity gate)
- No prose parsing; no second implementation of portfolio logic.
- Error codes: `PROJECT_STATE_*`. Output: JSON PASS record.

### Tests (`tests/unit/projectState.test.ts`)

Fixture harness modeled on `selfDevSourceFixture` + `agent-state.test.ts`:
temp git repo copying the authoritative source set + checker bins +
`.agent` records + a synthetic CURRENT_STATE with the v1 block. Matrix §42
(20 cases) plus false-positive cases §43.

### Renderer correction (M6/M7)

- New renderer header text (exact wording derived from CURRENT source) —
  four authority distinctions (sandbox mirror-only / owner-gated canonical
  promotion / no hand-editing — deterministic renderer / no generic
  self-modification). Module header in `adoptedCases.ts` updated to match.
- Regenerate the EXISTING one-entry catalog through the real renderer.
- Pre/post parsed-object deep equality: entry fields identical (adoptedCaseId,
  fixtureId, actionIds, assertionIds, equivalentFingerprint, coverageClasses,
  strategyClass, schemaVersion); only generated comment bytes differ.
- Raw digest changes `fa7b71d4...` → new; sourceBundleDigest changes;
  contractDigest must stay `d8012fae...`; if it changes: STOP + investigate.

### Currentness regression (M8)

Add a test (in `selfDevCanonicalPromotionFlow.test.ts`) modeling: full chain
verified + committed (COMMITTED_EXACT), then an authoritative-source comment
change (re-render via changed `adoptedCases.ts` or an equivalent source-edit
commit), then currentness must report the strict source mismatch status —
never a relaxed "semantically close" status. Do not alter currentness.ts.

## Milestones

- [x] M0 bootstrap/task creation/pre-state capture
- [x] M1 repository-wide live-truth audit
- [x] M2 project-state authority model design
- [x] M3 project-state v1 structured CURRENT_STATE block
- [x] M4 project:check implementation
- [x] M5 project:check tests
- [x] M6 catalog renderer/header authority correction
- [x] M7 one-entry catalog deterministic regeneration
- [x] M8 promotion-currentness strictness regression
- [x] M9 CURRENT_STATE / ROADMAP / ARCHITECTURE / DECISIONS / AGENTS corrections
- [ ] M10 focused validation
- [ ] M11 full regression
- [ ] M12 isolated checkout
- [ ] M13 source-bearing implementation commit + push + exact CI
- [ ] M14 fresh current-source selfDev continuation proof
- [ ] M15 v2 docs closure
- [ ] M16 final exact CI / project:check / agent:audit
- [ ] M17 STOP + report

## Validation Strategy

See SPEC.md. Exact CI runs recorded in STATE.

## Decision Log

- D-R1.1-1: project-state checker is a NEW bin, not an extension of
  hardening-check (clearer authority boundary per authorization §15).
- D-R1.1-2: checker reuses the established local TypeScript loader +
  real validator/renderer/portfolio selector — no regex/source-parsing truth.
- D-R1.1-3: `bin/project-state-check.mjs` is NOT added to
  SELFDEV_AUTHORITATIVE_PATHS: the manifest is the selfDev runtime source
  bundle; the checker is project-memory tooling (read-only) and would
  otherwise needlessly expand bundle digest inputs. Documented in
  provenanceManifest-adjacent reasoning in the final report.
- D-R1.1-4: the CURRENT_STATE generic anchors are REMOVED from the live
  topology table and their Phase 8A.1 provenance is preserved in explicitly
  historical phase-qualified rows (`PHASE_8A_1_HISTORICAL_*_SHA`), matching
  the established `PHASE_7B_1_HISTORICAL_*` convention.
- D-R1.1-5: phase-status fields ARE machine-checked (whitelist + R1 STATE
  cross-check) because both have deterministic sources; everything else stays
  narrative.

## Discoveries

- (pending)

## Deferred Work

- Variant B adoption (separate authorization); portfolio expansion.

## Completion Criteria

See SPEC.md.
