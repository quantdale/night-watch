# Wave 1 implementation report

Task ID: nightwatch-historical-wave1-v1
Phase: HISTORICAL_WAVE1_V1
Session branch: session/nightwatch-historical-wave1-v1-15ad976d
Base revision: aaf093420ab503039256ec283226f2d09185e152
Authorization: owner-approved Wave 1 (C6 first, then C4 Phase 1a report-only)
Status: COMPLETE

## Scope executed

- NW-HIST-008 RELEASE_BRANCH_FRESHNESS (C6) — implemented end to end.
- NW-HIST-005 CACHE_KEY_CONTRACT Phase 1a — schema, validator, extractors,
  grammar, matcher, digests, orchestration, driver, fixtures. Report only.
- No other detector, no Phase 1b finding integration, no universe change, no
  network/fetch/CI/cloud/database access, no product-code execution.

## Owner decisions applied

- OQ-1: Nightwatch never fetches; missing release refs stay `REF_UNAVAILABLE`.
  The real run confirms the expected fail-closed result.
- OQ-2: one real C6 row, for the historically affected service family only
  (`ALPH-DEFECT-000003` / ouchan #6585 lineage), with exact fix paths proven
  from pinned local history (`services/sapphired/trueunblended/fees.go`,
  `services/sapphired/trueunblended/fees_test.go`).
- OQ-3: the bounded C4 exact-symbol resolution was performed. The invalidator
  side is mechanically proven (`clearRippleUserCache` constructing
  `"%s:ripple-api:user:%s*"` via `fmt.Sprintf`, with the declared
  `prod -> production` environment mapping). The consumer side could NOT be
  mechanically tied to its `/user` namespace inside the approved bounded forms:
  the literal namespace segment lives at call sites (`User.php:67/128/134`)
  outside the declared builder (`Cache.php` `getUserHash`/`setUserHash`,
  whose namespace segment is a function parameter). Resolving it would require
  call-argument flow analysis, which is not an approved Wave 1 extraction form;
  adding it merely to make the pair pass is forbidden. Therefore
  `C4_REAL_PAIR_STATUS: UNRESOLVED_EXACT_SYMBOLS`, no real contract is
  declared, and real-pair execution stays disabled.
- OQ-4: Phase 1b is NOT implemented. The C4 report surface emits no finding and
  imports no semantic-oracle module.
- OQ-9: sanitized reports are written under `artifacts/`
  (`artifacts/release-freshness/current.json`,
  `artifacts/cache-key-contract/current.json`), matching the change-intelligence
  precedent. No customer identifiers, runtime key values, or secrets.

## Deliverables

| Path | Role |
| ---- | ---- |
| `config/release-refs.v1.json` | owner-declared C6 inventory (one real row) |
| `src/core/changeIntelligence/releaseFreshnessInventory.ts` | strict C6 inventory validator (`nightwatch.release-refs.v1`) |
| `src/core/changeIntelligence/releaseFreshness.ts` | pure C6 classifier + report digest (`nightwatch.release-freshness-report.v1`) |
| `bin/release-freshness.mjs` | read-only fixed-argv Git driver |
| `config/cache-key-contracts.v1.json` | C4 registry (deliberately empty: no real pair) |
| `src/core/source/cacheKeyShapes.ts` | closed shape grammar, bounded extractors, matcher, `cks:`/`ckp:` digests |
| `src/core/source/cacheKeyContractValidation.ts` | strict C4 declaration validator |
| `src/core/source/cacheKeyContract.ts` | orchestration over injected sibling-source access; `ckr:` report digest |
| `bin/cache-key-contract.mjs` | report-only C4 driver |
| `tests/unit/releaseFreshness.test.ts` | C6 truth table + local Git fixture integration (11 tests) |
| `tests/unit/cacheKeyContract.test.ts` | C4 matcher/extraction/orchestration/driver matrix (27 tests) |
| `tests/unit/frontierDeterminismProbe.ts` | extended with both cores' identities |
| `config/validation-universe.v1.json`, `src/core/schemaLifecycle/declarations.ts` | registrations |

## Results

- C6 real-ref run (bounded read-only, owner-declared row, no fetch):
  `integrationRef refs/remotes/origin/master` → `CONTAINED`; release refs
  `refs/remotes/origin/next` / `refs/remotes/origin/production` → not locally
  observable → row verdict `REF_UNAVAILABLE`; report
  `freshness LOCAL_TRACKING_REF_ONLY`, `deploymentClaim NONE`, exit 0.
- C4 real-pair run: NOT executed (no real contract declared, per OQ-3).
- Fixture verdicts: C6 — FRESH, STALE (+`MISSING_FROM_RELEASE_REF`),
  NOT_APPLICABLE_DECLARED (both declared modes), REF_UNAVAILABLE,
  PIN_UNAVAILABLE, FIX_NOT_ON_INTEGRATION, SERVICE_PATH_MISSING,
  INVENTORY_INVALID with zero observation calls, repeat-run identity.
  C4 — NOT_COVERED (`DELIMITER_MISMATCH`), COVERED (declared env mapping +
  wildcard), NOT_COVERED (`MISSING_WILDCARD`) near miss,
  EXCLUDED_BY_DECLARATION (digest-matched), ambiguity fail-closed, SOURCE_STALE,
  SOURCE_UNAVAILABLE, DECLARATION_INVALID, privacy sentinel absence, stable
  `cks:`/`ckp:`/`ckr:` digests.
- Cross-process determinism: `frontier:determinism` PASS — one semantic digest
  across 20 fresh processes with varied TZ/LC_ALL, both cores included.
- Repaired pre-existing drift: two stale refusal-message expectations in
  `tests/unit/cliImplementationContract.test.ts` (introduced by the observe-CLI
  migration at `b14f9d74`, invisible because no required gate group runs that
  suite). The repair updates only the expected message patterns; the
  refusal-before-side-effects assertions are unchanged.

## Gate receipts

- `npm run typecheck` — PASS.
- Focused suites — C6 11/11, C4 27/27, repaired launcher suite 40/40.
- `npm run schema:check` — PASS (393 families discovered / 370 declared).
- `npm run validation:universe` — PASS (recomputed digest recorded).
- `npm run hardening:check` — PASS.
- `npm run test:semantic-compat` — PASS (2120 total / 2107 passed / 13 skipped
  / 0 failed; skip policy PASS).
- `npm run test:unit` — 5130 passed / 18 skipped / 2 failed (the two repaired
  expectations above; focused re-run green afterwards).
- `npm run frontier:determinism` — PASS.
- `npm run gate:inventory` — PASS (report emitted).
- `npm run contract:health` — requires `--inventory=<file>` or
  `--snapshot=<dir> --sha=<sha>`; no such inventory/snapshot exists in this
  session, so it reports its usage error and is recorded as not applicable
  rather than satisfied by a fabricated input.
- `npm run gate:local` — PASS, 11/11 required groups (GATE_DEFINITION, STATIC,
  HARDENING, HANDOFF_TRUTH, PROJECT_TRUTH, AGENT_CONTINUITY,
  SEMANTIC_COMPATIBILITY, OWNER_PROVENANCE, SYNTHETIC_CAMPAIGN,
  PATCH_INTEGRITY, WORKSPACE_INTEGRITY) at
  `0fb23a1aa6a172a55070e98e7882cd3e954af38d`; receipt
  `receipt:sha256:38b46ece948a41528805f50a`. SEMANTIC_COMPATIBILITY counts:
  2120 total / 2107 passed / 13 skipped / 0 failed. SYNTHETIC_CAMPAIGN:
  1880/1880, deep containment lane PROVEN. OWNER_PROVENANCE: 91 passed.
- Environmental note: the first full gate attempt failed only because the local
  `mobingilabs/ripple-api` checkout had advanced to `4e3e200d` while the suite
  pins `27bb007a`. Under the owner's explicit decision, the checkout was
  temporarily detached at the pin (no fetch), the three affected suites
  re-passed 33/33, the full gate passed, and the sibling was restored to
  `master` at `4e3e200d` with its pre-existing untracked `AGENTS.md` preserved.
  No Nightwatch expectation was weakened and no source pin was advanced.
- Classification: `WAVE1_GATE_STATUS: PASS`; `REQUIRED_SIBLING_PIN:
  27bb007ad0c798800b6bd3b29760c966422966e7`; `ENVIRONMENTAL_BLOCKER:
  RESOLVED_BY_TEMPORARY_OWNER_PIN_ALIGNMENT`; `NIGHTWATCH_PIN_ADVANCE:
  NOT_PERFORMED`; `RIPPLE_API_SOURCE_MODIFIED: NO`.

## Phase 1b

NOT IMPLEMENTED. No `SemanticOracleFinding`, no KEY_COVERAGE invariant, no
source-observation pathway, no new finding category, no semantic-pipeline
change.

## Source repositories modified

NONE. Sibling repositories were read read-only (`mobingilabs/ouchan`,
`mobingilabs/ripple-api`); nothing was written, fetched, or checked out.

## Production / cloud / database / CI queries

NONE. No network, no fetch, no Slack, no GitHub API, no cloud or database
access.

## Remaining limitations

- C6 judged only the owner-declared row; the release refs are not locally
  observable, so no `RELEASE_BRANCH_FRESH`/`STALE` verdict exists for it.
  Making them observable is an owner action outside Nightwatch (OQ-1).
- C4's real pair remains `UNRESOLVED_EXACT_SYMBOLS`; the shipped C4 registry is
  empty. Fixture-level engineering acceptance is complete; a real-pair Phase 1a
  report requires either an owner-refreshed/checked-out snapshot set and a
  declarable pair within the approved extraction forms, or a separately
  authorized grammar extension (call-site argument binding) that Wave 1 must
  not add.
- C4 extraction intentionally supports `implode` (PHP) and `fmt.Sprintf` (Go)
  constructions only; other forms are either not extracted or (when they are
  recognised construction calls) fail closed as `EXTRACTION_AMBIGUOUS`.

## Owner review required

1. C6: accept `REF_UNAVAILABLE` as the honest current-clone result, and decide
   the ref-availability action (OQ-1).
2. C4: review the `UNRESOLVED_EXACT_SYMBOLS` finding and the empty registry;
   decide whether a future authorized change implements call-site binding or
   re-declares the pair on a refreshed, pinned snapshot.
3. Confirm the repaired launcher-contract expectations are acceptable.

Do NOT begin Wave 2 or C4 Phase 1b automatically.
