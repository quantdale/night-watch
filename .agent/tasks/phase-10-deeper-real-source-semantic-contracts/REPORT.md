# REPORT — Nightwatch Phase 10A — Deeper Real-Source Semantic Contracts

Task ID: phase-10-deeper-real-source-semantic-contracts
Phase: 10A-DEEPER-REAL-SOURCE-SEMANTICS
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

# NIGHTWATCH PHASE 10A — DEEPER REAL-SOURCE SEMANTIC CONTRACTS

1. **Starting Nightwatch SHA**: c3393ce54ef53d10451da2465d0327a0796bcf4f.
2. **Bootstrap classification**: CASE D — expected current source; no
   existing Phase 10 task; proceed.
3. **Authorization class**: PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY
   (owner-pasted prompt; LOCAL/SOURCE-ONLY/SYNTHETIC).
4. **Current ripple-api remote SHA**: 169df39d3cdf56c88f98d45d06eae6e48c3d8f6d
   (master; read-only git ls-remote, 2026-08-16; re-confirmed unchanged at
   the clean-checkout acceptance).
5. **Source snapshot used**: disposable read-only clone
   /tmp/nw-phase10-siblings/mobingilabs/ripple-api @ 169df39d.
6. **Sibling-repo integrity**: canonical mobingilabs/ripple-api checkout
   untouched at the Phase 5 pin 27bb007a (only rev-parse/status/ls-remote
   read-only metadata used against it).
7. **Common-exchange source evidence**: route
   `get:/exchange_rate/global/{vendor}` → `ExchangeRate::getCommonExchangeRate`
   (Routing.yaml:3537); rows `$res[] = ['month' => …, 'exchange_rate' =>
   $exchange_rate]`; `$exchange_rate = []` in both branches;
   `if (empty($exchange_rate)) { $exchange_rate = (object)$exchange_rate; }`
   — the EMPTY case casts to stdClass → `{}`.
8. **Payer-exchange source evidence**: route
   `get:/v2/payer/exchange_rate/{month}` → `getAccountExchangeForMonth`
   (Routing.yaml:3557); rows {id, vendor, name, exchange_rate};
   `$exchange_rate = []` in both branches; NO `(object)` cast anywhere;
   string-key subscripts only.
9. **Type-flow verdict (common)**: PROVEN — exchange_rate is ALWAYS a JSON
   OBJECT (empty → `(object)[]` → `{}`; non-empty → string-keyed object).
   D-58's "OBJECT when populated / ARRAY when empty" claim is REFUTED by
   the actual cast direction (the cast fires on EMPTY). ExchangeRate.php is
   byte-identical across 27bb007a and 169df39d, so the verdict holds for
   both pins.
10. **Exact allowed type set (common)**: ['OBJECT'] (single type ⇒ existing
    TYPE_MATCH OBJECT; no TYPE_IN_SET needed for common).
11. **Type-flow verdict (payer)**: PROVEN — exchange_rate is OBJECT-or-ARRAY
    (`[]` when no rates; keyed object otherwise); a genuine multi-type
    contract ⇒ new fixed invariant TYPE_IN_SET {OBJECT, ARRAY}.
12. **Finite-set source evidence**: `const CURRENCY_RANGE_VALIDATE =
    ['usd','jpy','sgd','myr','idr','inr' => ranges]` exists in current
    source (write-path validation only).
13. **Finite output-key flow proof**: NOT PROVEN — output keys are
    runtime-driven (`$user['meta']['support_currency'] ?? DEFAULT_CURRENCY`
    iterated with `usd` skipped; variable variables populated from
    data-derived sort-key segments); the constant is not load-bearing for
    read-path output keys ⇒ `SOURCE_ENUM_FLOW_UNPROVEN` for BOTH targets.
14. **Excluded-key treatment (usd)**: the `$v === 'usd'` skip is real but
    does not bound the key universe; no exclusion-based invariant admitted.
15. **Source claims rejected as ambiguous**: finite output-key sets for
    both targets; any key-set membership claim; the D-58 cast-direction
    reading (refuted); no constant-only → output-semantic leap.
16. **Pre-depth distribution**: L3+ = 0/4 (all four v1 expectations were
    root TYPE_MATCH ARRAY + FIELD_PRESENT).
17. **Recipe version decision**: `nightwatch.real-source-expectation-recipe.v2`
    for common-exchange + payer-exchange (v1 semantics +
    itemFieldTypeContracts + PHP_ITEM_FIELD_TYPE_FLOW extractor); v1 stays
    byte-meaning-stable for account-inventory + billing-group-exchange;
    retired v1 recipes archived data-only under corpus/phase10/historical/.
18. **Semantic expectation version decision**: stays
    `nightwatch.semantic-expectation.v1` — DTO envelope unchanged; the
    fixed invariant vocabulary gains ONE additive kind (TYPE_IN_SET),
    strictly validated; no cosmetic bump.
19. **Expectation identity decision**: new deep IDs
    `ripple.common-exchange.read.real-source-deep` /
    `ripple.payer-exchange.read.real-source-deep`; historical
    `...real-source-shape` IDs historical-only (archived v1 recipes);
    Phase 9B-R1 evidence truthful at its old checkpoint; derivation version
    v2 for v2 recipes.
20. **Extractor kinds added**: exactly ONE — PHP_ITEM_FIELD_TYPE_FLOW
    (patterns EMPTY_CAST_OBJECT ⇒ ['OBJECT']; EMPTY_ARRAY_OR_STRING_KEYS ⇒
    ['ARRAY','OBJECT']; anything else TYPE_FLOW_AMBIGUOUS). No
    PHP_CLASS_CONST_ARRAY_KEYS (not load-bearing).
21. **Extractor boundedness**: token-based lexical scan only; function-body
    bounded (400k chars), source bounded (2M chars, 500k tokens); fixed
    decision table; no PHP execution/eval/dynamic import/expression
    language/regex-as-data; detail strings fixed-vocabulary only.
22. **Extractor negative tests**: symbol missing; cast removed; unguarded
    cast; cast added (payer); scalar reassignment; row binding removed;
    subscript absent; source too large; wrong-pattern-on-source — all fail
    closed (TYPE_FLOW_AMBIGUOUS / FUNCTION_NOT_FOUND / SOURCE_TOO_LARGE).
23. **Deep contract DTO**: v2 `itemFieldTypeContracts`: {field, itemIndex,
    allowedTypes} (source row-key member; blueprint member; type set
    exactly matching the fixed pattern table; canonical sorted; 1..6 known
    ProjectionNodeType values).
24. **New invariant kinds**: exactly ONE — TYPE_IN_SET (missing path /
    empty-uninspected parent ⇒ NOT_APPLICABLE; observed ∈ set ⇒ PASS;
    outside ⇒ VIOLATED; validator 1..6 types, no duplicates, canonical
    sort). No OBJECT_KEYS_SUBSET_OF (no proven finite-key flow).
25. **Type-union semantics**: payer {OBJECT, ARRAY} — the valid empty-ARRAY
    representation PASSes the combined contract (dedicated §28 regression);
    never a type violation.
26. **Finite-key subset semantics**: NOT APPLICABLE — no finite-key
    invariant admitted (SOURCE_ENUM_FLOW_UNPROVEN); optionality is never
    converted into a false bug.
27. **Validator changes**: recipe validator v1|v2 dual schema
    (version-conditional unknown-field rejection; contract/extractor
    cross-checks; duplicate/empty/oversized/unknown type-set rejection);
    expectation validator TYPE_IN_SET case (bounds, dedupe, known types,
    canonical sort, unknown-field rejection).
28. **Common-exchange enriched expectation ID**:
    `ripple.common-exchange.read.real-source-deep`.
29. **Payer-exchange enriched expectation ID**:
    `ripple.payer-exchange.read.real-source-deep`.
30. **Evidence digests**: ev:sha256 over ALL canonical extractions incl.
    the type-flow record (e.g. common v2 digest ev:sha256:1447fe1342d804528a062b73
    on the current-source mirror); digest changes when deep evidence
    changes; canonical form fails closed on unknown kinds.
31. **Source currentness results**: A RESOLVED; B STALE + fresh
    re-derivation only; C deep-evidence change ⇒ STALE + re-derivation
    mismatch; D SOURCE_UNAVAILABLE; E unsupported pattern ⇒ derivation
    failure; no auto-rebinding.
32. **Source mutation-currentness tests**: cast removed/added, scalar
    reassignment, field unbound, route drift, row-key drift — all fail
    closed; shape-only evidence unchanged while deep evidence changes is
    still noticed (TYPE_FLOW_AMBIGUOUS); finite-enum constant mutation does
    NOT change the digest (constant not load-bearing — honest counterpart
    of digest scope).
33. **Post-depth distribution**: L3+ = 2/4 (common L3, payer L3,
    account-inventory L2, billing-group-exchange L2; depths [2,2,3,3]).
34. **L3+ target count**: 2 (≥2 acceptance met).
35. **Phase 10 corpus size**: 4 defects + 10 benign + 1 source-fixture set
    + 2 archived v1 recipes + README.
36. **Seeded deeper defect classes**: 4 — common STRING scalar; common
    uncast empty ARRAY; payer NUMBER scalar; payer STRING scalar
    (type-class only; finite-key class intentionally absent).
37. **Baseline detections**: 0/4 (historical shape-only v1 expectations).
38. **Phase 10 detections**: 4/4 (baselineDeepDefectDetections=0,
    phase10DeepDefectDetections=4; Phase10Detected > BaselineDetected).
39. **Benign corpus size**: 10.
40. **False positives**: 0.
41. **Derivation repeats**: 3.
42. **Derivation mismatches**: 0.
43. **Privacy sentinel count**: 8 privacy tests (projection boundary,
    finding/fingerprint/receipt, dossier evidence, extraction records,
    failure-path messages, corpus sweep, non-vacuous assertions).
44. **Privacy leaks**: 0.
45. **Unknown-key downstream leak test**: the sentinel-key probe body
    (exchange_rate with a sentinel key + sentinel scalar) produces NO
    anomaly and NO key/scalar text in any downstream artifact; the
    projection carries the key ONLY as documented safe field-name metadata.
46. **Synthetic campaign baseline**: paired shape-only run admits the same
    deep faults with ZERO semantic evidence (semanticDossiers 0,
    no TYPE_CONTRADICTED in checkpoints).
47. **Synthetic enriched campaign**: 4 deep defects admitted across two
    runs (one defect per target per run — same-class defects share finding
    fingerprints and the checkpoint rejects duplicates); dossiers carry
    semanticEvidence with TYPE_CONTRADICTED classes.
48. **Findings admitted**: 4 (one per seeded deep defect, two-run pattern).
49. **Dossiers produced**: ≥1 per run with semantic evidence; all 4 deep
    expectation IDs represented across the runs' dossiers.
50. **Dossier privacy result**: PASS (sentinel sweep over checkpoints,
    dossiers, briefs, artifacts: zero leaks; no absolute private paths).
51. **Phase 9 compatibility**: PASS (Phase 9 focused matrix unchanged;
    historical shape fixtures behave truthfully; full regression green).
52. **Phase 9A.1 compatibility**: PASS (real-source bridge tests unchanged
    and green; the v1 derivation constant kept; canary at the pinned
    sibling green).
53. **Phase 9B harness compatibility**: PASS (phase9bFreshness + phase9bHarness
    matrices green; Phase 9B-R1 evidence untouched; manual runner repoint
    to the deep ID recorded as a Phase 10B prerequisite).
54. **Real-minimization follow-up status**: preserved, NOT fixed —
    HIGH_CONFIDENCE_SEMANTIC_TRIAGE: NEXT_AFTER_PHASE_10.
55. **Hardening changes**: checkPhase10DeeperContractPurity +
    checkPhase10IntegrationSeams added; hardening:check PASS.
56. **Workflow changes**: hardening.yml "Phase 10 deeper real-source
    semantic contracts matrix" step (fixture-backed; existing steps
    unchanged).
57. **Source files changed**: src/oracles/expectations/{types,validator,
    admission,resolver}.ts, extract/{php,evidence}.ts,
    recipes/{types,validator,registry}.ts; src/oracles/invariants/evaluate.ts;
    src/oracles/semantic/oracle.ts; bin/hardening-check.mjs.
58. **Corpus files added**: corpus/phase10/** (README, source-fixture 2 ts,
    historical 1 ts, defects 8 files, benign 10 files).
59. **Tests added**: 10 files / 112 tests (phase10TypeFlowExtraction 14,
    phase10RecipeValidation 16, phase10Admission 16, phase10TypeInSetInvariant
    18, phase10CorpusPrecision 9, phase10Privacy 8, phase10Currentness 12,
    phase10Identity 7, phase10Campaign 3, phase10Canary 9).
60. **Typecheck**: PASS.
61. **Hardening**: PASS.
62. **Phase 9 matrix**: PASS (unchanged).
63. **Phase 9A.1 matrix**: PASS (unchanged).
64. **Phase 9B matrix**: PASS (unchanged).
65. **Phase 10 matrix**: PASS (112 tests; CI step green).
66. **Campaign synthetic**: 27 passed.
67. **Owner provenance**: 91 passed.
68. **Full Playwright counts**: working tree 1137 passed / 1 skipped
    (pre-existing environment-conditional) / 0 failed; isolated checkout
    1126 passed / 4 skipped (pre-existing workspace-conditional backtest
    class) / 0 failed.
69. **Isolated checkout**: /tmp/nw-phase10-acceptance/nightwatch @ 6cef0c45
    — typecheck/hardening/focused 342/campaign/owner-provenance/
    agent:check/audit/project:check/catalog integrity all PASS; git diff
    --check clean; owner-local current-source canary 2/2.
70. **agent:check**: PASS (0 strict errors; 2 expected warnings pre-commit
    only — STALE_IMPLEMENTATION_BASELINE + LEGACY v1 tasks).
71. **agent:audit**: strict_errors 0.
72. **project:check**: PASS at clean tree (CHECKOUT_DIRTY only pre-commit).
73. **Catalog integrity**: PASS (digest bd35b934..., count 1).
74. **git diff --check**: clean.
75. **Catalog pre digest**: sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968.
76. **Catalog post digest**: sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968 (byte-identical).
77. **Validated implementation SHA**: 6cef0c45b0733c3a7179789b360eeaba40ab931b.
78. **Substantive checkpoint SHA**: 6cef0c45b0733c3a7179789b360eeaba40ab931b.
79. **Exact implementation CI**: 31946005458 — completed, success, exact
    head SHA 6cef0c45, 32/32 steps green (incl. Phase 10 matrix).
80. **Clean post-CI acceptance**: PASS (see §68-69; current ripple-api
    remote re-confirmed 169df39d; recipes 4; derived 4; failures 0;
    pre-depth 0/4 L3+; post-depth 2/4 L3+; seeded defects 4; baseline
    detections 0; Phase 10 detections 4; benign 10; FP 0; privacy leaks 0;
    repeats 3; mismatches 0; campaign findings 4; dossiers produced).
81. **Phase 10B disposition**: PHASE_10B_DEV_ACCEPTANCE:
    RECOMMENDED_SEPARATE_AUTHORIZATION (ONE existing common-exchange
    journey pair with the enriched expectation only; no second/third
    canary automatically).
82. **Decision number**: D-59 (docs/DECISIONS.md).
83. **Docs closure SHA**: final docs commit (pushed fast-forward; exact
    final CI green — see STATE M11/M12).
84. **Final CI**: exact final CI green at the docs closure SHA (32/32
    steps incl. Phase 9/9A.1/9B/10, hardening, project:check, agent:check,
    agent:audit, catalog integrity, campaign synthetic).
85. **Final HEAD**: discovered from Git (HEAD == origin/main after the
    docs closure push).
86. **origin/main**: discovered from Git (== final HEAD).
87. **Worktree**: clean.
88. **DEV count**: 0.
89. **NEXT/production**: 0.
90. **Mutations**: 0 (product mutations 0; known mutations 0).
91. **DB/infra**: 0.
92. **AI/model**: 0.
93. **Alphaus writes**: 0 (canonical siblings untouched; disposable /tmp
    snapshot only).
94. **selfDev/promotion**: 0 (no selfDev commands; promotion intents 0;
    approvals 0; APPLY 0; catalog writes 0; variant-B adoption 0; runtime
    Git writes 0 — Nightwatch development commits only).
95. **Residual limitations**: L3+ only (2/4); no finite-key contracts
    (unproven flow); payer content rule (ARRAY⇒empty) not asserted; item-0
    inspection convention; synthetic precision ≠ production precision; no
    DEV validation (Phase 10B separately authorized).
96. **Phase 9 status**: COMPLETE (unchanged).
97. **Phase 10A status**: COMPLETE.
98. **Phase 10 status**: PHASE_10_DEEPER_SEMANTIC: COMPLETE —
    COMPLETE_LOCAL_SYNTHETIC; DEV validation: NOT_RUN.
99. **Final verdict**: PHASE_10_DEEPER_SEMANTIC: COMPLETE;
    PHASE_10A_STATUS: COMPLETE; PHASE_9_STATUS: COMPLETE;
    PHASE_10B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION;
    NEXT ACTION: STOP.

## Safety vector (Phase 10A)

DEV 0; NEXT 0; production 0; product mutations 0; DB 0; infra 0; AI/model
0; Alphaus writes 0; publication 0; selfDev 0; promotion intents 0;
approvals 0; APPLY 0; catalog writes 0; variant-B adoption 0; runtime Git
writes 0. Normal Nightwatch development commits only (6cef0c45 substantive
+ final docs closure).
