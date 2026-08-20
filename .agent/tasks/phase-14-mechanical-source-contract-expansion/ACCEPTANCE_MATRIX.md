# ACCEPTANCE MATRIX — Phase 14A Mechanical Source Contract Expansion

Every row must be backed by shown command/test evidence in the final REPORT. `PASS` means mechanically demonstrated, not asserted.

## A — Bootstrap / authority / source freshness

| ID | Gate |
|---|---|
| A01 | clean fetch/fast-forward; HEAD == origin/main before edits |
| A02 | exact owner token recorded |
| A03 | task NONE -> IN_PROGRESS and active before implementation |
| A04 | current remote source SHA resolved fresh |
| A05 | disposable snapshot HEAD exactly equals remote SHA |
| A06 | canonical sibling before/after HEAD/status/content unchanged |
| A07 | no DEV/NEXT/production/DB/infra/AI/selfDev authority exercised |

## B — Historical blocker reproduction/current drift

| ID | Gate |
|---|---|
| B01 | account-inventory historical TYPE_FLOW_AMBIGUOUS reproduced or current drift classified |
| B02 | billing-group-exchange historical TYPE_FLOW_AMBIGUOUS reproduced or current drift classified |
| B03 | legacy conditional-blob blocker reproduced or current drift classified |
| B04 | gRPC/chunked no-mechanical-contract blocker reproduced or current drift classified |
| B05 | wrong-SHA currentness fails closed |

## C — Analyzer contract integrity

| ID | Gate |
|---|---|
| C01 | analyzer has explicit version participating in evidence/derivation identity |
| C02 | bounded traversal; no eval/exec/runtime source mutation |
| C03 | deterministic canonical evidence digest |
| C04 | exact repo/SHA/path/symbol provenance retained |
| C05 | unknown fields/syntax fail closed |
| C06 | partial proof cannot claim full contract |
| C07 | comments/names alone cannot establish semantics |
| C08 | runtime/database value types rejected absent explicit source normalization |
| C09 | dynamic keys/reflection/eval rejected |
| C10 | privacy sentinels never reach safe derived evidence |

## D — Positive synthetic proof classes

| ID | Gate |
|---|---|
| D01 | finite literal row/object field set proven |
| D02 | finite scalar type from literal/cast assignments proven |
| D03 | bounded alias flow proven |
| D04 | finite all-branch union proven |
| D05 | empty/non-empty bifurcation proven |
| D06 | guaranteed return-envelope field across all branches proven |
| D07 | generated/proto/interface finite shape proven where fixture supplies authoritative schema |
| D08 | bounded chunk/item metadata proven where fixture mechanically encodes it |

## E — Negative synthetic proof classes

| ID | Gate |
|---|---|
| E01 | dynamic property/index rejected |
| E02 | runtime DB-return type rejected |
| E03 | incomplete branch enumeration rejected |
| E04 | nested/runtime conditional blob rejected |
| E05 | comment-only transport assertion rejected |
| E06 | missing generated/interface schema rejected |
| E07 | cross-service unsupported assumption rejected |
| E08 | stale source rejected |
| E09 | source unavailable rejected |
| E10 | changed evidence causes distinct derivation identity where appropriate |

## F — Existing approved target inventory

| ID | Gate |
|---|---|
| F01 | approved target count equals live registry, no new targets |
| F02 | before/after inventory emitted in deterministic target order |
| F03 | account-inventory exact fresh-source disposition recorded |
| F04 | billing-group-exchange exact fresh-source disposition recorded |
| F05 | legacy billing-groups exact fresh-source disposition recorded |
| F06 | gRPC/chunked billing-groups exact fresh-source disposition recorded |
| F07 | each uplift has exact source proof/evidence digest |
| F08 | each non-uplift has precise blocker code |
| F09 | zero-uplift result accepted if evidence-backed |
| F10 | observer class remains truthful; no transport authority invented |

## G — Admission / identity / currentness

| ID | Gate |
|---|---|
| G01 | historical expectation IDs unchanged |
| G02 | any stronger contract uses additive ID/version; no silent strengthening |
| G03 | collection semantics remain explicit/versioned |
| G04 | resolver resolves fresh correct source |
| G05 | resolver returns stale/unavailable on wrong/missing source |
| G06 | campaign semantic bundle mapping coherent for any new contract |
| G07 | source-SHA-only movement with identical evidence does not fragment semantic identity |
| G08 | changed normalized evidence/derivation does not silently merge |
| G09 | registry unchanged when no uplift is proven |

## H — Corpus / backtest metrics

| ID | Gate |
|---|---|
| H01 | `corpus/phase14/**` exists with >=30 deterministic fixtures |
| H02 | positive and rejection fixtures both represented |
| H03 | >=3 deterministic repeats |
| H04 | determinism mismatch count = 0 |
| H05 | false-admission count = 0 |
| H06 | privacy leak count = 0 |
| H07 | stale-source false-current count = 0 |
| H08 | unsupported syntax/transport false-proof count = 0 |
| H09 | raw before/after coverage counts reported |
| H10 | analyzer capability gains distinguished from actual product uplift |

## I — Compatibility / regression

| ID | Gate |
|---|---|
| I01 | typecheck PASS |
| I02 | hardening:check PASS |
| I03 | Phase-14 focused matrix PASS |
| I04 | Phase 9/9A.1/10/10B expectation/resolver suites PASS |
| I05 | Phase 11/11A.3 collection/admission suites PASS |
| I06 | Phase 12 coverage/triage/yield suites PASS |
| I07 | Phase 13 semantic promotion/shadow suites PASS |
| I08 | campaign:synthetic PASS |
| I09 | owner-provenance PASS |
| I10 | fresh-source canary PASS with zero sibling writes |
| I11 | canonical complete Playwright workers=1, 0 failed |
| I12 | topology-correct isolated complete Playwright workers=1, 0 failed |
| I13 | no new skip used to hide a regression |

## J — Continuity / project integrity / CI truth

| ID | Gate |
|---|---|
| J01 | agent:check PASS / 0 strict errors |
| J02 | agent:audit strict errors = 0 |
| J03 | project:check PASS |
| J04 | canonical catalog count/digest unchanged; promotion authority NONE |
| J05 | git diff --check PASS |
| J06 | substantive implementation checkpoint pushed fast-forward |
| J07 | HEAD == origin/main and clean after implementation push |
| J08 | exact implementation Actions run inspected; job-start truth recorded |
| J09 | decisive post-push local acceptance clean |
| J10 | durable docs closure pushed fast-forward |
| J11 | exact final Actions run inspected; no CI-green claim unless steps executed successfully |
| J12 | Phase 11B and Phase 13B remain NOT_AUTHORIZED |

## Required final metrics

Report exact integer values for:

`approvedTargetCount`, `previousHistoricalCount`, `previousCollectionCount`, `previousDeepTypeCount`, `mechanicalUpliftCount`, `newContractsAdded`, `strongerVersionsAdmitted`, `ambiguousBlockerCount`, `unsupportedTransportBlockerCount`, `staleUnavailableCount`, `syntheticPositiveCount`, `syntheticRejectionCount`, `falseAdmissionCount`, `privacyLeakCount`, `staleSourceFalseCurrentCount`, `unsupportedFalseProofCount`, `determinismMismatchCount`.
