# Phase 10 — Deeper Real-Source Semantic Contracts (implementation & acceptance record)

> Repository-native design document (`docs/design/*.md` approved checkpoint
> path). Authoring task:
> `phase-10-deeper-real-source-semantic-contracts` (Phase
> `10A-DEEPER-REAL-SOURCE-SEMANTICS`, authorization
> `PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`, 2026-08-16, starting SHA
> `c3393ce54ef53d10451da2465d0327a0796bcf4f`, substantive implementation
> `6cef0c45b0733c3a7179789b360eeaba40ab931b`). Decision D-59. This record
> describes what Phase 10A implemented and proved; the frozen task intent is
> the task SPEC under `.agent/tasks/phase-10-deeper-real-source-semantic-contracts/`.

## 1. Status

```
PHASE_10_DEEPER_SEMANTIC: COMPLETE
PHASE_10A_STATUS: COMPLETE
PHASE_9_STATUS: COMPLETE (unchanged)
PHASE_10B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
DEV validation: NOT_RUN
```

Phase 10A is LOCAL / SOURCE-ONLY / SYNTHETIC ONLY. Deeper contracts are
implemented and synthetically proven; they are NOT DEV-validated.

## 2. Current-source re-verification (2026-08-16, read-only)

- Remote master of mobingilabs/ripple-api (git ls-remote):
  `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`.
- Canonical sibling checkout: untouched at the Phase 5 pin
  `27bb007ad0c798800b6bd3b29760c966422966e7`; current-source derivation used
  a disposable /tmp snapshot at 169df39d.
- `src/App/Handler/ExchangeRate.php` is byte-identical across the two SHAs
  (git diff 0 lines); the 169df39d drift is confined to Invoices.php /
  ChildBillingGroupTrait.php / User.php + tests.

## 3. Source evidence verdicts (mechanical, current source)

| target | route → handler | row keys | exchange_rate JSON type | finite keys |
|---|---|---|---|---|
| ripple.common-exchange.read | PROVEN (`get:/exchange_rate/global/{vendor}` → `ExchangeRate::getCommonExchangeRate`) | {month, exchange_rate} | **OBJECT (PROVEN)** — empty case `(object)`-cast to `{}`; non-empty string-keyed object | **NOT ADMITTED** (`SOURCE_ENUM_FLOW_UNPROVEN`) |
| ripple.payer-exchange.read | PROVEN (`get:/v2/payer/exchange_rate/{month}` → `getAccountExchangeForMonth`) | {id, vendor, name, exchange_rate} | **{OBJECT, ARRAY} (PROVEN)** — `[]` when no rates; no cast | **NOT ADMITTED** (`SOURCE_ENUM_FLOW_UNPROVEN`) |
| ripple.account-inventory.read | PROVEN (v1 unchanged) | 15 keys | no type proof | not applicable |
| ripple.billing-group-exchange.read | PROVEN (v1 unchanged) | 4 keys | no type proof | not applicable |

Key corrections to the D-58 historical reading:

- D-58 §7 claimed `$exchange_rate = (object)$exchange_rate` "when
  non-empty, `[]` when empty ⇒ OBJECT-or-ARRAY". The CURRENT (and pinned)
  source casts when EMPTY (`if (empty($exchange_rate)) { $exchange_rate =
  (object)$exchange_rate; }`), so the empty case serializes `{}` — the JSON
  type is ALWAYS OBJECT for common-exchange. The "ARRAY when empty"
  alternative is refuted by the actual cast direction.
- D-58 §7's finite-enum contract was NOT admitted: output keys are
  runtime-driven (`support_currency` metadata + data-derived variable
  variables); `CURRENCY_RANGE_VALIDATE` is write-path validation only and
  is not load-bearing for read-path output keys ⇒
  `SOURCE_ENUM_FLOW_UNPROVEN` (§15 of the Phase 10A spec). No
  `PHP_CLASS_CONST_ARRAY_KEYS` extractor and no `OBJECT_KEYS_SUBSET_OF`
  invariant were implemented (nothing is admitted beyond mechanically
  proven source flow).
- Residual (documented, not a contract): a JSON-ARRAY `exchange_rate`
  would require non-string `support_currency` entries PLUS data rows whose
  currency segment is a numeric string — a double product-config/data
  defect, not a legitimate representation; the source's own vocabulary
  (DEFAULT_CURRENCY, CURRENCY_RANGE_VALIDATE keys, `$v === 'usd'` string
  comparison) treats currencies as strings.

## 4. Versioning and identity decisions

- **Recipe schema**: `nightwatch.real-source-expectation-recipe.v2` for the
  two enriched targets (v1 semantics + `itemFieldTypeContracts`); v1 stays
  byte-meaning-stable for account-inventory + billing-group-exchange (the
  v1 validator contract is unchanged and rejects any deep-contract field);
  the retired v1 recipes for common/payer are archived data-only under
  `corpus/phase10/historical/archivedV1Recipes.ts`. The active registry
  holds 4 recipes (2 v2 + 2 v1); approved read-only target list and
  DEV-reachable list unchanged.
- **Derivation version**: v2 recipes derive with
  `nightwatch.real-source-expectation-derivation.v2`; v1 keeps
  `...derivation.v1` (the Phase 9A.1 test that pins the v1 constant stays
  valid).
- **Expectation identity**: new deep IDs
  `ripple.common-exchange.read.real-source-deep` and
  `ripple.payer-exchange.read.real-source-deep`. The historical
  `...real-source-shape` IDs remain historical-only (Phase 9B-R1's PASS
  stays truthful at its old checkpoint; findings/fingerprints/receipts use
  the deep identity for current contracts; no collisions).
- **Semantic expectation schema**: stays `nightwatch.semantic-expectation.v1`
  — the DTO envelope/field contract is unchanged; the fixed invariant
  vocabulary gains ONE additive kind (`TYPE_IN_SET`), strictly validated,
  unused by any pre-existing expectation. No cosmetic version bump.
- **New invariant `TYPE_IN_SET`**: fixed, deterministic — missing path or
  ambiguity from an empty/uninspected parent array ⇒ NOT_APPLICABLE;
  observed type ∈ allowed set ⇒ PASS; outside ⇒ VIOLATED. Validation:
  1..6 known ProjectionNodeType values, no duplicates, canonical sorted
  form. Common-exchange uses the EXISTING `TYPE_MATCH OBJECT` (single
  proven type); payer-exchange uses `TYPE_IN_SET {OBJECT, ARRAY}`.

## 5. New extractor: PHP_ITEM_FIELD_TYPE_FLOW

Fixed bounded syntax-aware extraction (tokens only, no execution):

- Params: symbol, fieldVariable, pattern ∈ {EMPTY_CAST_OBJECT,
  EMPTY_ARRAY_OR_STRING_KEYS}.
- Mechanical facts: arrayInitSites, emptyGuardedCastSites (`if
  (empty($var)) { $var = (object)$var; }`), subscriptAssignments
  (`$var[...] =`), otherAssignments, rowFieldBinding (`'<field>' =>
  $<var>`).
- Fixed decision table (fail-closed): EMPTY_CAST_OBJECT ⇒ ['OBJECT'];
  EMPTY_ARRAY_OR_STRING_KEYS ⇒ ['ARRAY','OBJECT']; any other assignment
  pattern ⇒ `TYPE_FLOW_AMBIGUOUS` (admission never weakened to fit the
  source). The pattern is a contract: asking for the wrong pattern on the
  same source fails closed.
- The normalized extraction participates in the existing ev:sha256 evidence
  digest; `canonicalExtraction` has an explicit branch and throws on
  unknown kinds; both extraction loops (admission `runExtractions` and
  resolver `reExtractEvidence`) fail closed on unknown extractor kinds
  (previously silent-skip hazard fixed).

## 6. Deep contract DTO and admission

v2 recipe `itemFieldTypeContracts`: {field, itemIndex, allowedTypes}
(source row-key member; blueprint item-field member; type set exactly
matching the fixed pattern decision table — weaker/stronger claims rejected
at validation). Admission builds, in order: root TYPE_MATCH ARRAY;
FIELD_PRESENT per blueprint item field; per contract TYPE_MATCH (single
type) or TYPE_IN_SET (multi type) at [itemIndex, field]; strict expectation
validation is the admission gate. Contract reproduction is mechanical:
extracted allowed types must EQUAL the recipe-declared set or the derivation
fails (`TYPE_FLOW_CONTRACT_MISMATCH`).

## 7. Corpus and proof (synthetic)

- `corpus/phase10/source-fixture/` — current-source mirror
  (ExchangeRate.php patterns + Routing.yaml) + validated fixture recipes
  (2 v2 + 2 v1) + in-memory map source (CI-safe).
- `corpus/phase10/historical/` — archived v1 recipes (baseline + identity
  history).
- `corpus/phase10/defects/` — 4 seeded deep defects: common STRING scalar;
  common uncast empty ARRAY; payer NUMBER scalar; payer STRING scalar.
- `corpus/phase10/benign/` — 10 benign cases (empty top-level array; common
  {} / single-key / multi-key / reordered keys; payer [] / {} / multi-key /
  mixed rows; payer empty top-level).
- **Baseline-vs-deep (load-bearing)**: the historical shape-only v1
  expectations detect 0/4 seeded deep defects; the enriched v2 expectations
  detect 4/4 (`baselineDeepDefectDetections=0`,
  `phase10DeepDefectDetections=4`).
- **Benign**: 10/10, 0 false positives; the payer valid empty-ARRAY
  representation (the §28 union regression) is PASS under the combined
  contract — never a type violation.
- **Privacy**: sentinel sweep over projection serialization/digests/
  findings/fingerprints/receipts/dossier evidence/campaign artifacts: 0
  leaks; the unknown-key probe proves unexpected object-key text is never
  echoed downstream (no key-set invariant admitted; the projection's
  documented safe field-name surface is the only place field names appear).
- **Determinism**: derivation repeated 3×, 0 mismatches (identical
  extraction, digest, expectation bytes).
- **Currentness**: matrix A–E (current / SHA-advanced / deep-evidence
  changed / unavailable / unsupported pattern) all fail closed; no
  auto-rebinding; §44 mutation canaries (cast removed/added, scalar
  reassignment, field unbound, route drift, row-key drift) all fail closed;
  shape-only evidence unchanged while deep evidence changes is still
  noticed by the deep digest/extraction.
- **Campaign integration**: enriched expectation → TYPE_CONTRADICTED
  finding → existing orchestrator → triage → dossier with
  `semanticEvidence`; the paired baseline run (shape-only) admits the same
  deep faults with ZERO semantic evidence. Two-run pattern (one defect per
  target per run) because same-class defects on one target legitimately
  share a finding fingerprint and the checkpoint rejects duplicates.
- **Owner-local canary** (current snapshot 169df39d): total recipes 4,
  derived 4, failures 0, L1 0, L2 2, L3+ 2 (depth distribution [2,2,3,3]).

## 8. Hardening and CI

- `bin/hardening-check.mjs`: `checkPhase10DeeperContractPurity` (the v2
  recipe/extractor/admission/resolver/invariant surfaces must not import
  fs/network/process/AI/selfDev/Phase6/campaign/persistence modules or
  expose eval/exec/spawn/write capability) and `checkPhase10IntegrationSeams`
  (v2 schema + type-flow extractor + TYPE_IN_SET vocabulary/evaluation/class
  mapping + digest fail-closed + admission/resolver fail-closed +
  corpus/historical presence). `npm run hardening:check` PASS.
- `.github/workflows/hardening.yml`: new step "Phase 10 deeper real-source
  semantic contracts matrix" (fixture-backed; CI never requires private
  Alphaus sibling repos). Existing steps unchanged.

## 9. Validation ledger

- typecheck PASS; hardening:check PASS; focused Phase 9+9A.1+9B+10 matrix
  342 passed / 0 failed; campaign:synthetic 27; test:owner-provenance 91;
  agent:check PASS (2 expected pre-commit warnings); agent:audit
  strict_errors 0; project:check PASS at clean tree; catalog integrity
  PASS (digest bd35b934..., count 1 — byte-identical before and after);
  git diff --check clean; full Playwright working tree 1137 passed / 1
  skipped (pre-existing environment-conditional) / 0 failed; isolated
  full-history checkout at 6cef0c45: typecheck/hardening PASS, focused
  matrix 342, campaign 27, owner-provenance 91, agent:check/audit PASS,
  project:check PASS (checkoutClean true), catalog integrity PASS, full
  Playwright 1126 passed / 4 skipped (pre-existing workspace-conditional
  backtest class) / 0 failed, git diff --check clean; owner-local
  current-source canary (NIGHTWATCH_SIBLING_ROOT → disposable 169df39d
  snapshot) 2/2.
- Exact implementation CI 31946005458 at
  `6cef0c45b0733c3a7179789b360eeaba40ab931b`: completed, success, exact
  head SHA, 32/32 steps green incl. the Phase 10 matrix step, Project-memory
  truth check, Agent-state check, Completed-task continuity audit, catalog
  integrity, Synthetic campaign, whitespace.

## 10. Boundaries preserved

- NO DEV/NEXT/production; no new endpoints/journeys; no recipe re-targeting;
  no campaign/triage/changeIntelligence/selfDev/ownerScope/journey changes;
  no projection schema change; no Phase 6; no AI authority; no selfDev/
  promotion/catalog/B adoption; no publication; no Alphaus writes (canonical
  sibling checkouts untouched; only disposable /tmp snapshots used).
- Phase 9 remains COMPLETE; Phase 9A.1 remains COMPLETE; Phase 9B-R1
  remains COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED (historical shape-only
  evidence unchanged); Phase 8 catalog digest byte-identical
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`
  (count 1); variant B AVAILABLE_NOT_ADOPTED; promotion authority NONE.
- The real-minimization false-1-MINIMAL follow-up finding (#1,
  POST_PHASE_9_NEXT_ARCHITECTURE.md Appendix F) is preserved and NOT fixed
  (owner: HIGH_CONFIDENCE_SEMANTIC_TRIAGE, NEXT_AFTER).

## 11. Phase 10B disposition

`PHASE_10B_DEV_ACCEPTANCE: COMPLETE` (D-60, 2026-08-17) — the authorized
contained DEV run against the enriched common-exchange expectation was
executed and exercised the DIFFERENT invariant class (L3 typed contract)
and privacy boundary than Phase 9B-R1, as new architectural evidence. Full
record: `docs/design/PHASE_10B_DEV_ACCEPTANCE.md`. Result:
COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED / PASS / VERIFIED /
NONE_OBSERVED; PHASE_10_STATUS COMPLETE; NEXT ACTION STOP. Harness seam
decision (differs from the Phase 10A report's "repoint" suggestion, which
the Phase 10B authorization explicitly left open): the historical Phase 9B
harness stays byte-identical, and a narrow self-contained Phase 10B runner
(`tests/manual/phase10b-contained-dev-deep-semantic.ts`,
`playwright.phase10b.config.ts`, `bin/phase10b-real.mjs`,
`src/core/phase10b/deepAcceptance.ts`) carries the fixed deep identity. No
second/third canary.

## 12. Residual limitations (honest)

- Depth distribution is 2/4 at L3+ (type contracts only). No L4
  (identity/cardinality) and no L5 (transition/cross-surface) invariant is
  provable on the approved surface.
- Finite-key / object-key-set contracts remain NOT admitted
  (SOURCE_ENUM_FLOW_UNPROVEN on current source).
- The payer `exchange_rate` content rule "ARRAY ⇒ empty; OBJECT ⇒ ≥1 field"
  is mechanically constructible but NOT asserted (smallest-contract
  principle); non-empty ARRAY would pass TYPE_IN_SET.
- Item checks inspect item 0 (the blueprint convention); defects isolated
  to rows > 0 are not flagged.
- Synthetic corpus precision is not production precision. Phase 10B
  contained DEV acceptance (D-60) verified the ONE current deep
  common-exchange contract (incl. the L3 item type invariant) against the
  DEV product with zero anomalies; it does not prove all exchange-rate
  semantics and retains no payload values.
