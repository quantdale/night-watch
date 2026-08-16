# SPEC — Nightwatch Phase 10A — Deeper Real-Source Semantic Contracts

Task ID: phase-10-deeper-real-source-semantic-contracts
Phase: 10A-DEEPER-REAL-SOURCE-SEMANTICS
Title: Nightwatch Phase 10A — Deeper Real-Source Semantic Contracts
Authorization class: PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## 0. Frozen intent

This SPEC is frozen intent. The owner pasted this task prompt as the
separate owner authorization for the LOCAL / SYNTHETIC Phase 10A
implementation (`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`). Phase 10B
(contained DEV validation) is NOT authorized.

## 1. Objective

Extend the real-source admission bridge so deeper L3 invariants (item-level
JSON type contracts) are mechanically derived from the CURRENT approved
read-only Ripple source for the existing admitted targets, prove detection
on an extended synthetic corpus (baseline shape-only vs enriched), preserve
every Phase 8/9/9A.1/9B boundary, integrate through the existing
campaign/triage/dossier chain, close under continuity v2. LOCAL / SOURCE-ONLY
/ SYNTHETIC ONLY. NO DEV, NO NEXT, NO production, NO Phase 6, NO AI, NO
selfDev/promotion/catalog.

## 2. Authorized

- Read Nightwatch source/tests/docs/history.
- Read Alphaus sibling repositories strictly READ-ONLY (read-only remote Git
  metadata; disposable source snapshots under /tmp; NO pull/reset/checkout/
  merge/rebase/clean/commit in sibling checkouts).
- Extend the deterministic real-source recipe/extractor/admission machinery.
- Add the smallest fixed deterministic invariant vocabulary extension
  genuinely required by CURRENT proven source (TYPE_IN_SET).
- Create a bounded Phase 10 synthetic corpus (conforming + mutated + benign +
  historical v1 archive + current-source fixture mirror).
- Run source-backed conforming and mutated synthetic evaluations.
- Integrate enriched expectations through the existing semantic/campaign/
  dossier synthetic path.
- Add hardening guards + the Phase 10 CI matrix step.
- Update Nightwatch docs + continuity state; commit/push validated
  implementation and docs; verify exact CI.

## 3. NOT authorized

DEV browser/API execution; NEXT; production; product mutations; new
endpoint/journey authority; database queries (DynamoDB/BigQuery/Spanner);
infrastructure; GCP/GKE/Kubernetes; AWS runtime/IAM discovery; deployment
binding; Phase 6; external/local AI model execution; AI oracle authority;
Alphaus repository writes; annotations on Alphaus source; campaign/triage
core redesign; fixing the recorded real-minimization false-1-MINIMAL issue;
browser/API differential work; source-change campaign redesign; selfDev;
promotion; canonical catalog mutation; variant-B adoption; publication.

## 4. Current-source evidence baseline (re-verified 2026-08-16)

- Current remote master of mobingilabs/ripple-api:
  `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d` (git ls-remote, read-only).
- Local canonical sibling checkout: `27bb007ad0c798800b6bd3b29760c966422966e7`
  (Phase 5 pin) — canonical sibling NOT modified; current-source work uses a
  disposable /tmp snapshot at 169df39d.
- `src/App/Handler/ExchangeRate.php` is byte-identical between 27bb007a and
  169df39d (git diff 0 lines); drift is limited to Invoices.php,
  ChildBillingGroupTrait.php, User.php and tests.
- getCommonExchangeRate (route `get:/exchange_rate/global/{vendor}` →
  `App\Handler\ExchangeRate::getCommonExchangeRate`, Routing.yaml:3537):
  - `$res[] = ['month' => $month, 'exchange_rate' => $exchange_rate]` rows;
  - `$exchange_rate = []` initialized in both branches;
  - `if (empty($exchange_rate)) { $exchange_rate = (object)$exchange_rate; }`
    — the EMPTY case is cast to stdClass → JSON `{}`;
  - non-empty case: `$exchange_rate[$v] = ${$v}[$month]` (string-key
    subscript, `$v` iterates `support_currency ?? DEFAULT_CURRENCY`, `usd`
    explicitly skipped);
  - => JSON type of `exchange_rate` is ALWAYS OBJECT ({} or keyed object).
    D-58's historical "OBJECT when populated / ARRAY when empty" claim is
    REFUTED by current source (cast direction is empty→object).
  - Finite output-key set: NOT mechanically provable — output keys are
    runtime-driven (`support_currency` metadata + data-derived variable
    variables); CURRENCY_RANGE_VALIDATE is write-path validation only, not
    load-bearing for read-path output keys ⇒ SOURCE_ENUM_FLOW_UNPROVEN.
- getAccountExchangeForMonth (route `get:/v2/payer/exchange_rate/{month}` →
  `App\Handler\ExchangeRate::getAccountExchangeForMonth`, Routing.yaml:3557):
  - `$res[] = ['id' => ..., 'vendor' => ..., 'name' => ..., 'exchange_rate'
    => $exchange_rate]` rows;
  - `$exchange_rate = []` in both branches; NO `(object)` cast; string-key
    subscripts `$exchange_rate[$vc] = ...` (usd skipped);
  - => JSON type of `exchange_rate` is OBJECT-or-ARRAY ([] when no rate,
    keyed object otherwise) — a genuine multi-type contract.
  - Finite output-key set: same verdict — SOURCE_ENUM_FLOW_UNPROVEN.

## 5. Deeper contracts admitted (mechanically proven only)

| target | route→handler proof | row keys | exchange_rate type | finite keys |
|---|---|---|---|---|
| ripple.common-exchange.read | PROVEN | {month, exchange_rate} | OBJECT (PROVEN; empty→cast→{}) | NOT ADMITTED (SOURCE_ENUM_FLOW_UNPROVEN) |
| ripple.payer-exchange.read | PROVEN | {id, vendor, name, exchange_rate} | {OBJECT, ARRAY} (PROVEN) | NOT ADMITTED (SOURCE_ENUM_FLOW_UNPROVEN) |
| ripple.account-inventory.read | PROVEN (v1 unchanged) | 15 keys | no type proof (nullable) | not applicable |
| ripple.billing-group-exchange.read | PROVEN (v1 unchanged) | 4 keys | no type proof | not applicable |

L3+ target count: 2/4 (common-exchange, payer-exchange) after Phase 10.

No OBJECT_KEYS_SUBSET_OF invariant is admitted (no mechanically provable
finite output-key flow). No PHP_CLASS_CONST_ARRAY_KEYS extractor is
implemented (the class constant exists but is not load-bearing for any
admitted contract).

## 6. Versioning and identity decisions (frozen)

1. Recipe schema: `nightwatch.real-source-expectation-recipe.v2` for the two
   enriched targets; the existing v1 schema stays byte-meaning-stable for
   account-inventory + billing-group-exchange. The active registry holds 4
   recipes (2 v2 + 2 v1). The retired v1 recipes for common/payer are
   archived (data-only) under `corpus/phase10/historical/` for baseline and
   history tests. The v1 validator contract is unchanged; v2 adds
   `itemFieldTypeContracts` + the `PHP_ITEM_FIELD_TYPE_FLOW` extractor and
   forbids them under v1 (no silent v1 semantic expansion).
2. Derivation version: v2 recipes derive with
   `nightwatch.real-source-expectation-derivation.v2`; v1 keeps
   `...derivation.v1`.
3. Expectation IDs: NEW deep IDs
   `ripple.common-exchange.read.real-source-deep` and
   `ripple.payer-exchange.read.real-source-deep`. The historical
   `...real-source-shape` IDs remain historical-only (never reused with
   different semantics; Phase 9B-R1 evidence stays truthful at its old
   checkpoint).
4. Semantic expectation schema stays `nightwatch.semantic-expectation.v1`:
   the DTO envelope/field contract is unchanged; the fixed invariant
   vocabulary gains one additive kind (TYPE_IN_SET), strictly validated,
   unused by existing expectations.
5. New invariant kind: `TYPE_IN_SET` (fixed, deterministic):
   - missing path → NOT_APPLICABLE; ambiguity caused by empty/uninspected
     parent array → NOT_APPLICABLE; observed type ∈ allowed set → PASS;
     observed type outside allowed set → VIOLATED.
   - validation: 1..6 types, no duplicates, known ProjectionNodeType only,
     sorted canonical form.
   - common-exchange uses the EXISTING `TYPE_MATCH OBJECT` (single type);
     payer-exchange uses `TYPE_IN_SET {OBJECT, ARRAY}`.

## 7. New extractor: PHP_ITEM_FIELD_TYPE_FLOW

Fixed bounded syntax-aware extractor (tokens only, no execution):

Params: symbol, fieldVariable, expectedPattern ∈
{EMPTY_CAST_OBJECT, EMPTY_ARRAY_OR_STRING_KEYS}.

Mechanical facts: arrayInitSites, emptyGuardedCastSites (pattern
`if (empty($var)) { $var = (object)$var; }`), subscriptAssignments
(`$var[...] =`), otherAssignments (any other `$var =` RHS), rowFieldBinding
(`'<field>' => $<var>` inside the function).

Fixed decision table (fail-closed):
- EMPTY_CAST_OBJECT requires arrayInitSites ≥ 1, emptyGuardedCastSites ≥ 1,
  otherAssignments == 0, rowFieldBinding → allowedJsonTypes ['OBJECT'].
- EMPTY_ARRAY_OR_STRING_KEYS requires arrayInitSites ≥ 1,
  emptyGuardedCastSites == 0, subscriptAssignments ≥ 1,
  otherAssignments == 0, rowFieldBinding → allowedJsonTypes
  ['OBJECT','ARRAY'].
- Anything else → TYPE_FLOW_AMBIGUOUS (no admission).

The normalized extraction participates in the existing ev:sha256 evidence
digest; any load-bearing deep-evidence change changes the digest or fails
the derivation.

## 8. Derivation → expectation mapping

v2 derivation builds, in order: root TYPE_MATCH ARRAY; FIELD_PRESENT per
blueprint item field; for each itemFieldTypeContract: TYPE_MATCH (single
allowed type) or TYPE_IN_SET (multi) at [itemIndex, field]. All invariants
must pass strict validation or the derivation fails closed.

## 9. Corpus (bounded)

- `corpus/phase10/source-fixture/` — current-source mirror (ExchangeRate
  fixture with empty-guarded cast + payer []/subscript pattern + Routing
  fixture) + v2 fixture recipes + v1 fixture recipes (account/billing).
- `corpus/phase10/historical/` — archived v1 recipes for common/payer
  (baseline shape-only derivation).
- `corpus/phase10/defects/` — 4 seeded deep defects: common STRING scalar;
  common uncast empty ARRAY; payer NUMBER scalar; payer STRING scalar.
- `corpus/phase10/benign/` — ≥8 benign cases (empty top-level array; common
  {} / single-key / multi-key; payer [] / {} / multi-key; mixed rows;
  reordered keys).

## 10. Acceptance gates (Phase 10A)

1. Extraction/admission: v2 derivation of common + payer on the current
   source mirror; 3 repeats / 0 digest mismatches; every extractor negative
   case fails closed.
2. Depth: 2 existing admitted real targets at L3+ (2/4 distribution).
3. Precision: seeded deep defects N=4; shape-only baseline detects B=0;
   Phase 10 detects 4; benign FP = 0; payer empty-ARRAY (the §28 union
   regression) is PASS/N-A, never a type violation.
4. Privacy: sentinel sweep incl. new extraction records and unknown-key
   fixture: 0 leaks; unexpected key text never echoed downstream.
5. Currentness: source-currentness matrix (A–E) + deep-evidence mutation
   canaries (cast removed/added, other assignment, field unbound, row-key
   change, route drift) all fail closed.
6. Identity: old shape IDs historical-only; deep IDs stable; no collision.
7. Pipeline: enriched expectation → safe finding → existing campaign
   admission → existing triage → dossier with semanticEvidence; baseline
   admits none of the deep defects.
8. Regression: typecheck, hardening:check, campaign:synthetic,
   test:owner-provenance, agent:check, agent:audit (0 strict errors),
   project:check, selfdev catalog integrity, git diff --check, full
   Playwright 0 failed; Phase 9 / 9A.1 / 9B matrices still green.
9. Checkpoints: substantive implementation commit + push fast-forward +
   exact CI (incl. the new Phase 10 matrix step); docs closure + exact final
   CI; clean-checkout acceptance.
10. Boundaries: PHASE_8 catalog digest bd35b934... count 1, variant B
    AVAILABLE_NOT_ADOPTED, promotion authority NONE — byte-identical before
    and after; Phase 9 / 9A.1 / 9B statuses unchanged; no campaign/triage/
    changeIntelligence/selfDev/ownerScope/journey changes.

## 11. Stop conditions

PHASE_10A_STOPPED_SOURCE_ADVANCED (remote master advanced past 169df39d
before/at checkpoint); PHASE_10A_BLOCKED_SOURCE_DEPTH_EVIDENCE_DRIFT (<2
targets with meaningful L3+ evidence); PHASE_10A_BLOCKED_TYPE_FLOW_AMBIGUOUS;
PHASE_10A_BLOCKED_FALSE_POSITIVE; PHASE_10A_BLOCKED_PRIVACY;
PHASE_10A_BLOCKED_DERIVATION_NONDETERMINISM; PHASE_10A_BLOCKED_FULL_REGRESSION;
PHASE_10A_BLOCKED_CATALOG_DRIFT; PHASE_10A_BLOCKED_CI;
PHASE_10A_BLOCKED_CONTINUITY. Semantic assertions are never weakened to
clear a blocker.

## 12. Non-goals (explicit)

No DEV/NEXT/production; no new endpoints/journeys; no recipe re-targeting;
no finite-key invariant (unproven flow); no PHP_CLASS_CONST_ARRAY_KEYS
extractor (not load-bearing); no OBJECT_KEYS_SUBSET_OF invariant; no
projection schema change; no campaign/triage core change; no
real-minimization fix; no Phase 10B claim; no expectation-count inflation.

## 13. Success tokens

```
PHASE_10_DEEPER_SEMANTIC: COMPLETE
PHASE_10A_STATUS: COMPLETE
PHASE_9_STATUS: COMPLETE
PHASE_10B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
   (or NOT_NEEDED_FOR_PHASE_10_COMPLETION, decided at closure)
NEXT ACTION: STOP
```
