# SPEC — Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring

Task ID: `phase-11a-3-real-source-collection-admission-wiring`
Phase: `11A.3-REAL-SOURCE-COLLECTION-ADMISSION`
Title: Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Continuity protocol: `nightwatch.agent-continuity.v2`

## 0. Authority and scope

This is a corrective continuation of the already owner-authorized Phase 11A LOCAL/SOURCE-ONLY/SYNTHETIC implementation scope.

Starting durable source before this task package:

`5669146332d357b09a49b29404a603e3fa1e828e`

Current validated source checkpoints:

- Phase 11 collection evaluator: `5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`
- Phase 11A.1 receipt correction: `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`
- Phase 11A.2 acceptance-gate correction: `f763f3c42447c0c566f536ce6bdb38f2673ededc`

GitHub Actions is currently externally blocked before job execution by the known account billing/spending-limit condition. Exact CI success must not be claimed while that remains true.

Phase 11B remains NOT_AUTHORIZED.

## 1. Confirmed integration defect

Current source proves all of the following simultaneously:

1. `COLLECTION_ITEM_CONTRACT` exists and is evaluated collection-wide.
2. Phase 11 permanent tests create `...real-source-collection` expectations through `corpus/phase11/source-fixture/phase11Fixtures.ts` helpers.
3. `deriveRealSourceExpectation()` still generates positional item invariants using `recipe.blueprint.itemIndex`.
4. The current fixed recipe registry still uses `itemIndex: 0` and historical `...real-source-deep` / `...real-source-shape` expectation IDs.
5. Phase 11 implementation did not modify real-source admission, recipes, or resolver production wiring.
6. Therefore `deriveRealSourceExpectations()` still returns the historical positional expectations, not current collection-wide expectations.

Classification:

`CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`

This means the Phase 11 evaluator is implemented and locally proven, but a future real-source runtime path has no mechanically admitted collection expectation to resolve.

## 2. Objective

Add a deterministic, additive, Nightwatch-owned collection-admission layer that converts an already mechanically derived positional real-source expectation into a distinct collection-wide expectation without changing the source contract itself.

The resulting collection expectation must be suitable for the existing atomic resolver and for a future separately-authorized Phase 11B contained DEV canary.

## 3. Non-negotiable historical compatibility

Do NOT change the meaning or current derivation behavior of historical IDs:

- `ripple.common-exchange.read.real-source-deep`
- `ripple.payer-exchange.read.real-source-deep`
- `ripple.account-inventory.read.real-source-shape`
- `ripple.billing-group-exchange.read.real-source-shape`

Existing `deriveRealSourceExpectation()` and `deriveRealSourceExpectations()` must remain available with their historical positional semantics unless a compatibility-preserving overload is proven cleaner.

Historical Phase 9B and Phase 10B evidence must remain interpretable and their matrices must remain green.

Do not rewrite the registry blueprint IDs merely to obtain collection behavior.

## 4. Required current collection identities

Use the Phase 11 normative identities unless current source proves a conflict:

- `ripple.common-exchange.read.real-source-collection`
- `ripple.payer-exchange.read.real-source-collection`
- `ripple.account-inventory.read.real-source-collection`
- `ripple.billing-group-exchange.read.real-source-collection`

The mapping must be explicit, deterministic, bounded, and Nightwatch-owned.

Do not derive the ID by arbitrary user input or runtime free-form string replacement.

A fixed target-to-current-collection-ID table or an equivalent closed mapping is preferred.

If any target cannot be mapped unambiguously, fail closed.

## 5. Source semantics must not change

The collection bridge must reuse the exact source proof already produced by the existing real-source derivation:

- same recipe;
- same repoId;
- same current SHA;
- same source path/symbol;
- same source-evidence digest;
- same extracted required item keys;
- same deep allowed type set for v2 recipes.

No new Alphaus source rule is introduced.

No source annotation is introduced.

No source application code is executed.

A collection expectation changes evaluation breadth, not product semantic authority.

## 6. Collection derivation identity

The collection expectation must be distinguishable in provenance from the historical positional representation.

Preferred provenance derivation version:

`nightwatch.real-source-collection-expectation-derivation.v1`

or a repository-native equivalent with the same semantic meaning.

The source evidence digest may remain the same because it binds the same source structure, but the derivation version must identify that the positional source contract was mechanically converted into explicit collection scope.

Never claim that changing only the expectation ID creates new source authority.

## 7. Allowed positional-to-collection transform

The transform operates only on an already validated real-source expectation plus its originating validated recipe.

Root invariants that are not item-position contracts remain unchanged and evaluate once. In the current recipes this includes the root `TYPE_MATCH [] ARRAY` contract.

Supported item transform classes:

### FIELD_PRESENT
Historical:

`FIELD_PRESENT path [String(itemIndex), ...relative]`

Collection:

`COLLECTION_ITEM_CONTRACT`
- `collectionPath: []`
- `itemInvariantKind: FIELD_PRESENT`
- `itemRelativePath: relative`
- preserve `expected`

### FIELD_ABSENT
If encountered:

- same exact item-index prefix requirement;
- `itemInvariantKind: FIELD_ABSENT`;
- preserve relative path.

### TYPE_MATCH
Historical:

`TYPE_MATCH path [String(itemIndex), ...relative]`

Collection:

- `itemInvariantKind: TYPE_MATCH`
- preserve exact expected JSON type.

### TYPE_IN_SET
Historical:

`TYPE_IN_SET path [String(itemIndex), ...relative]`

Collection:

- `itemInvariantKind: TYPE_IN_SET`
- preserve exact canonical allowed type set.

## 8. Fail-closed transform rules

A positional invariant may be collection-promoted only when all of the following hold:

1. the originating recipe is a validated current real-source recipe;
2. the historical expectation target matches the recipe target;
3. source provenance/evidence is present and mechanically derived;
4. the positional path begins with exactly `String(recipe.blueprint.itemIndex)`;
5. the remaining item-relative path is non-empty and passes SafePath validation;
6. the invariant kind is one of the fixed supported item classes;
7. the expected metadata is valid under existing expectation validation;
8. the transformed expectation passes strict `validateExpectation()`.

Any unsupported positional invariant, mismatched index, missing source evidence, duplicate target, duplicate current collection ID, or ambiguous transform must fail closed.

Suggested failure vocabulary:

- `COLLECTION_ADMISSION_PROOF_MISSING`
- `COLLECTION_ADMISSION_TARGET_MISMATCH`
- `COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH`
- `COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT`
- `COLLECTION_ADMISSION_INVALID`

Do not silently leave an item-0 invariant inside a collection expectation.

## 9. Required API shape

Prefer an additive API such as:

- `deriveCollectionWideRealSourceExpectation(...)`
- `deriveCollectionWideRealSourceExpectations(...)`

or an equivalent narrow module.

The batch result must provide explicit derived and failure collections, analogous to the existing derivation report.

Do not modify `deriveRealSourceExpectations()` to silently change historical output.

## 10. Resolver compatibility

The existing resolver maps one supplied expectation per target. This is sufficient if the future caller supplies the collection-wide expectation set.

Phase 11A.3 should therefore prove:

- a resolver created with the historical set resolves the historical ID;
- a resolver created with the collection set resolves the collection ID;
- both use the same recipe currentness/evidence re-check;
- current-source drift fails closed identically;
- the resolver never chooses between multiple expectations for the same target implicitly.

Do NOT make the resolver select a semantic generation by hidden priority.

The caller chooses the explicit expectation set.

## 11. Real-source fixture proof

Permanent tests must NOT prove Phase 11A.3 only through `createCollectionExpectation()` fixture helpers.

At least one load-bearing test must run:

```text
validated real-source-style recipe
  -> existing mechanical derivation
  -> collection admission transform
  -> strict collection expectation
  -> resolver
  -> semantic evaluator / hook / receipt / acceptance gate
```

Use synthetic source text/reader fixtures in CI, but use the actual production derivation functions.

## 12. Current-source owner-local canary

Outside CI, run a read-only current-source canary against a disposable current snapshot of `mobingilabs/ripple-api`.

Rules:

- discover current remote SHA fresh;
- disposable read-only clone/snapshot only;
- do not modify canonical sibling repositories;
- do not execute sibling application code;
- derive the four historical expectations through the existing bridge;
- derive collection expectations through the new collection admission layer;
- report collection derivation count/failures/IDs/target IDs/source SHAs/evidence digests only;
- no raw source content in durable report beyond repository-relative paths/symbols already considered safe.

Required readiness target:

`REAL_SOURCE_COLLECTION_EXPECTATION_COUNT >= 1`

Preferred:

`REAL_SOURCE_COLLECTION_EXPECTATION_COUNT == 4`

Any recipe that cannot be mechanically transformed must be reported as a blocker or explicit unsupported case, never guessed.

## 13. Common-exchange load-bearing canary

The common-exchange target is mandatory because it is both:

- current v2/L3 source-backed semantics;
- existing contained-DEV reachable `KNOWN_READ` target.

Required collection expectation ID:

`ripple.common-exchange.read.real-source-collection`

It must contain:

- root ARRAY contract exactly once;
- collection FIELD_PRESENT for `month`;
- collection FIELD_PRESENT for `exchange_rate`;
- collection TYPE_MATCH for `exchange_rate` OBJECT.

No positional item-0 versions of those item contracts may remain inside this collection expectation.

## 14. Payer canary

For `ripple.payer-exchange.read.real-source-collection` prove:

- root ARRAY once;
- collection required-field contracts for the recipe-required fields;
- collection TYPE_IN_SET for `exchange_rate` preserving exactly `ARRAY | OBJECT`.

This validates collection transformation of the Phase 10 polymorphic type contract without any DEV run.

## 15. v1 recipe canaries

For account-inventory and billing-group-exchange prove their existing v1 source shape semantics transform mechanically into collection FIELD_PRESENT contracts while preserving historical positional derivation output separately.

Do not invent deeper types for v1 recipes.

## 16. Later-row detection proof using real-source-derived collection expectation

For common-exchange:

1. derive the historical positional expectation through the existing real-source admission function;
2. derive the collection expectation through the new bridge;
3. evaluate the same synthetic multi-row response where row 0 conforms and row 1 or row 57 violates a source-backed field/type contract.

Required:

- historical positional expectation: zero semantic finding for the later-row-only mutation;
- collection expectation: `ANOMALY` with collection coverage `VIOLATION`;
- safe finding count bounded by invariant definition, not row count.

This is the acceptance proof that the real-source path now opts into Phase 11.

## 17. Partial-coverage proof through full safe path

Using a real-source-derived collection expectation and >128 synthetic conforming rows:

- semantic outcome: `PARTIAL_COVERAGE`;
- receipt outcome: `PARTIAL_COVERAGE`;
- coverage state: `PARTIAL_COVERAGE_NO_VIOLATION`;
- shared Phase 9B acceptance gate: FAIL;
- composed Phase 10B acceptance helper, when applied to a compatible synthetic summary: FAIL due the shared partial-coverage rejection.

No full PASS may be claimed.

## 18. Currentness / stale proof

Collection expectations must remain fail-closed under source drift.

Required matrix:

A. same SHA + same evidence => RESOLVED
B. current SHA changed => SOURCE_STALE
C. source unavailable => SOURCE_UNAVAILABLE
D. same SHA but evidence digest re-extraction changes => SOURCE_STALE
E. unrelated source change with unchanged evidence => behavior consistent with existing resolver/currentness semantics

Do not add a second currentness implementation if existing resolver already supplies this behavior.

## 19. No authority expansion

The collection bridge must not:

- add target IDs;
- add route IDs;
- add endpoint selectors;
- alter `APPROVED_READ_ONLY_TARGET_IDS` except if a current inconsistency is independently proven;
- alter `DEV_REACHABLE_RECIPE_TARGET_IDS` except if a current inconsistency is independently proven;
- make UNKNOWN or mutation operations eligible;
- introduce URL substring selection;
- execute any network/product operation.

Expectations do not grant endpoint authority.

## 20. Privacy

Collection admission operates on expectation metadata and source-derived structural proof only.

No raw product response value is introduced.

Synthetic later-row response tests must run existing sentinel-leak checks through:

- semantic result;
- finding;
- fingerprint;
- receipt;
- normalized Phase 9B summary;
- dossier path if exercised.

Leak count: 0.

## 21. Hardening

If a new collection-admission module is added, harden it as a pure module:

- no fs;
- no network transports;
- no child_process;
- no browser/page APIs;
- no DB/infra;
- no AI/model;
- no selfDev/promotion;
- no persistence;
- no raw product body.

It may consume only validated recipes and already mechanically derived semantic expectations.

## 22. Required permanent tests

Add a dedicated Phase 11A.3 matrix proving at minimum:

1. pre-fix current real-source derivation remains positional item-0;
2. no current collection expectation is produced by the historical API;
3. collection bridge derives common-exchange collection ID;
4. payer collection ID;
5. account-inventory collection ID;
6. billing-group-exchange collection ID;
7. historical IDs unchanged;
8. root ARRAY preserved exactly once;
9. all transformable item invariants become COLLECTION_ITEM_CONTRACT;
10. no positional item-0 item invariant remains in a collection expectation;
11. common deep OBJECT type preserved;
12. payer ARRAY|OBJECT type set preserved;
13. source SHA preserved;
14. evidence digest preserved;
15. collection derivation version distinct;
16. wrong recipe/expectation target rejected;
17. wrong item index rejected;
18. unsupported invariant rejected;
19. missing evidence digest rejected;
20. strict expectation validation enforced;
21. historical resolver resolves historical ID;
22. collection resolver resolves collection ID;
23. source stale fails closed;
24. source unavailable fails closed;
25. common later-row historical baseline misses;
26. common later-row collection detects;
27. payer later-row collection detects invalid type;
28. >128 real-source-derived collection evaluation becomes PARTIAL_COVERAGE;
29. partial receipt remains non-pass;
30. Phase 9B acceptance rejects partial;
31. replay comparison detects partial/full mismatch;
32. repeated derivation deterministic;
33. privacy sentinel leaks zero;
34. approved target set unchanged;
35. DEV-reachable target set unchanged;
36. historical Phase 9/10/11 tests remain green.

Add more where required by actual architecture.

## 23. CI matrix

Add a local/synthetic workflow step:

`Phase 11A.3 real-source collection admission matrix`

CI must not contact Alphaus DEV or live sibling repositories.

The CI matrix uses repository-owned synthetic source/reader fixtures.

## 24. Full validation

Run at minimum:

- `npm run typecheck`
- `npm run hardening:check`
- Phase 9 matrix
- Phase 9A.1 matrix
- Phase 9B matrix
- Phase 10 matrix
- Phase 10B matrix
- Phase 11 matrix
- Phase 11A.1 matrix
- Phase 11A.2 matrix
- Phase 11A.3 matrix
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- canonical selfdev catalog-integrity check
- `git diff --check`
- complete Playwright regression, 0 failed
- isolated/source-equivalent regression per repository convention

No new skips.

## 25. Current-source canary acceptance

After local fixture validation and before terminalization, run the owner-local current-source canary described in §12.

Report only safe structural facts:

- current ripple-api SHA;
- historical derivation count/failure count;
- collection derivation count/failure count;
- expectation IDs;
- target IDs;
- evidence digests;
- resolver result per DEV-reachable target;
- collection invariant kinds/counts.

No DEV contact.

## 26. Phase 11B readiness gate

Phase 11B must remain NOT_READY until all of the following are true:

1. common-exchange current real-source collection expectation derives successfully;
2. its resolver result is RESOLVED at current source;
3. it maps to the existing approved/DEV-reachable `ripple.common-exchange.read` target;
4. it contains at least one collection item invariant in addition to the root invariant;
5. later-row synthetic mutation is detected using that real-source-derived expectation;
6. partial coverage remains non-pass through receipt and acceptance layers;
7. source freshness/currentness is fail-closed;
8. privacy leak count is 0;
9. no endpoint/network authority expanded;
10. full local regression is green;
11. exact CI is green.

Because GitHub Actions is currently externally blocked, this task may reach source/local correctness while Phase 11B readiness remains blocked on CI.

Only after exact CI can run successfully may durable state say:

`PHASE_11B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION`

Otherwise:

`PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI`

## 27. GitHub Actions truth

After substantive implementation push:

- re-check Actions;
- if jobs execute, require exact completed/success at the implementation SHA;
- if GitHub refuses to start the job for the same billing/spending-limit condition, record `BLOCKED_EXTERNAL_CI` and do not claim CI verification;
- do not label a code/test failure as billing-related.

The final docs checkpoint is subject to the same rule.

## 28. Allowed files

Expected source areas:

- `src/oracles/expectations/**`
- focused helper/types only when mechanically required
- focused unit tests
- hardening guard if needed
- `.github/workflows/hardening.yml`
- `.agent/**`
- `docs/**`

Do not modify browser/network/product selection logic unless a structural blocker proves it unavoidable; if so STOP instead of widening scope.

## 29. Not authorized

No DEV.
No NEXT.
No production.
No product mutation.
No real campaign.
No database/data-plane work.
No infrastructure/Phase 6.
No Alphaus writes.
No source annotations.
No campaign/minimization redesign.
No browser/API differential.
No AI/model execution or oracle authority.
No selfDev/promotion/catalog mutation/variant-B adoption.
No publication.

## 30. Stop conditions

Use truthful exact blockers, including:

- `PHASE_11A_3_STOPPED_SOURCE_ADVANCED`
- `PHASE_11A_3_BLOCKED_COLLECTION_TRANSFORM_AMBIGUOUS`
- `PHASE_11A_3_BLOCKED_HISTORICAL_COMPATIBILITY`
- `PHASE_11A_3_BLOCKED_REAL_SOURCE_PROOF`
- `PHASE_11A_3_BLOCKED_RESOLVER_COMPATIBILITY`
- `PHASE_11A_3_BLOCKED_LATER_ROW_REAL_SOURCE_PROOF`
- `PHASE_11A_3_BLOCKED_PARTIAL_COVERAGE_TRUTH`
- `PHASE_11A_3_BLOCKED_PRIVACY`
- `PHASE_11A_3_BLOCKED_AUTHORITY_EXPANSION`
- `PHASE_11A_3_BLOCKED_FULL_REGRESSION`
- `PHASE_11A_3_BLOCKED_CATALOG_DRIFT`
- `PHASE_11A_3_BLOCKED_CONTINUITY`
- `PHASE_11A_3_BLOCKED_EXTERNAL_CI`

Do not weaken correctness to avoid a blocker.

## 31. Completion state

If all local/source gates pass but Actions remains externally unavailable:

```text
PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_11A_3_STATUS: BLOCKED_EXTERNAL_CI
PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED
PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Only when exact implementation and final CI are green may the task close as:

```text
PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION: VERIFIED
PHASE_11A_3_STATUS: COMPLETE
PHASE_11A_STATUS: COMPLETE
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE
PHASE_11B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

## 32. Final principle

Phase 11 is not operationally complete merely because a collection evaluator exists.

The real source authority chain must be:

```text
CURRENT REAL SOURCE
  -> MECHANICAL RECIPE DERIVATION
  -> SOURCE-EVIDENCE-BOUND HISTORICAL CONTRACT
  -> DETERMINISTIC COLLECTION ADMISSION
  -> DISTINCT COLLECTION EXPECTATION ID
  -> ATOMIC CURRENTNESS RESOLUTION
  -> BOUNDED COLLECTION EVALUATION
  -> HONEST RECEIPT / ACCEPTANCE STATE
```

A synthetic helper-created collection expectation proves the evaluator, not real-source runtime admission.

Close that gap locally and deterministically before any Phase 11B DEV authorization is eligible.
