# ACCEPTANCE MATRIX — Phase 15H Whole-System Integrated Hardening

`PASS` requires shown command/output evidence from this hardening session. Historical pre-mass green results do not prove the mass-bulk changes.

## A — Bootstrap / continuity truth
| ID | Gate |
|---|---|
| A01 | clean fetch/fast-forward; HEAD == origin/main before edits |
| A02 | exact owner token recorded before hardening source edits |
| A03 | Phase 15H NONE -> IN_PROGRESS and active |
| A04 | starting head and mass implementation anchor recorded |
| A05 | 105-file mass changed cone reproduced from Git |
| A06 | stale Phase-15P `IMPLEMENTED_FOCUSED_GREEN` labels reconciled without erasing earlier focused-green history |
| A07 | Phase 6 FROZEN_BY_OWNER and 11B/13B NOT_AUTHORIZED preserved |

## B — Compiler / static integrity
| ID | Gate |
|---|---|
| B01 | initial post-mass `npm run typecheck` result recorded before fixes |
| B02 | final typecheck PASS |
| B03 | hardening:check PASS |
| B04 | no unresolved import/export errors from A15 deletions |
| B05 | no accidental import cycles in new dtoFramework/adversarialCorpus/registration seams |
| B06 | git diff --check PASS |

## C — Lifecycle / vocabulary / DTO framework
| ID | Gate |
|---|---|
| C01 | contract lifecycle resolution-view strict/coherent |
| C02 | historical expectation/recipe IDs remain compatible |
| C03 | replay-status vocabulary strict parser |
| C04 | guard/rejection vocabulary strict parser |
| C05 | dossier-readiness vocabulary strict parser |
| C06 | provenance registry current values/count represented by source truth, not stale pins |
| C07 | dtoFramework rejects unknown kind/version/fields as designed |
| C08 | builtin validator dispatch preserves historical validators |
| C09 | no silent reinterpretation of old durable DTO versions |

## D — Currentness / source drift
| ID | Gate |
|---|---|
| D01 | SHA-only identical evidence => compatible movement |
| D02 | changed normalized evidence => semantic change/split |
| D03 | changed derivation version => derivation change/split |
| D04 | stale source never certifies CURRENT |
| D05 | unavailable source never certifies CURRENT |
| D06 | source movement and semantic identity remain coherent with Phase 14 behavior |

## E — Campaign lifecycle / replay / minimality
| ID | Gate |
|---|---|
| E01 | CLUSTERED included in all lifecycle totality/open-state maps |
| E02 | persisted direct MINIMIZED->TRIAGED compatibility behaves intentionally |
| E03 | ReplayResultEnvelope parser/constructor coherence |
| E04 | replay kind capability table covers exploration/API/journey correctly |
| E05 | occurrence-aware duplicate action behavior |
| E06 | structural validation cannot certify replay failure without executor result |
| E07 | exact vs reduced replay separated |
| E08 | MinimalityEvidence cannot prove minimal with zero genuine reductions |
| E09 | INVALID / PRECONDITION_DIVERGENCE / UNSUPPORTED / NOT_REDUCED remain distinct |
| E10 | replay budget accounting bounded/deterministic |

## F — Checkpoint / resume / retry
| ID | Gate |
|---|---|
| F01 | interrupted-work bookkeeping round-trips |
| F02 | attempts 1-4 allowed according to policy |
| F03 | 5th attempt blocked with exact reason |
| F04 | reservation/idempotence semantics deterministic |
| F05 | incompatible campaign/version drift refuses before executor callback |
| F06 | resume-refusal envelope strict/coherent |
| F07 | CLUSTERED checkpoint transition paths total |

## G — Triage / readiness / artifacts / snapshots
| ID | Gate |
|---|---|
| G01 | semantic and protocol cluster namespaces remain distinct |
| G02 | equivalent semantics ignore ordinal/count/timestamp/SHA noise where designed |
| G03 | evidence/derivation/target/expectation/invariant changes split semantic cluster identity |
| G04 | PARTIAL/STALE/UNAVAILABLE cannot reach HIGH/READY |
| G05 | dossier v2 readiness remains bounded by deterministic semantic confidence |
| G06 | readiness optional movement input absent => stable legacy representation |
| G07 | readiness movement present => deterministic categorical output |
| G08 | all artifact validator kinds register exactly once and in safe order |
| G09 | malformed candidate/replay/minimization/project-health artifacts fail closed |
| G10 | old project snapshots remain readable or explicit migration/version policy added |
| G11 | new snapshot slots participate correctly in comparison identity |

## H — Privacy / authority
| ID | Gate |
|---|---|
| H01 | shared private screen rejects secret-like/sentinel/labeled raw values |
| H02 | duplicate screening paths reconciled or compatibility differences documented/tested |
| H03 | durable errors contain categorical/digest-safe data only |
| H04 | owner-policy check occurs before executor callbacks on gated paths |
| H05 | pure-core dependency boundaries exclude browser/network/fs/child-process where prohibited |
| H06 | Phase 6 remains unreachable for new autonomous capability |
| H07 | AI/model outputs remain non-oracle/non-authoritative |
| H08 | selfDev/promotion/catalog authority unchanged |

## I — Adversarial corpus
| ID | Gate |
|---|---|
| I01 | all 66 Phase-15P definitions enumerated deterministically |
| I02 | each executable class bound to builder/executor; marker-only frozen/gated classes assert blocking |
| I03 | >=3 complete deterministic repeats |
| I04 | determinismMismatchCount = 0 |
| I05 | privacyLeakCount = 0 |
| I06 | falseCurrentCount = 0 |
| I07 | falseAdmissionCount = 0 |
| I08 | falseMinimalityCertificationCount = 0 |
| I09 | versionDriftExecutorEscapeCount = 0 |
| I10 | ownerPolicyEscapeCount = 0 |
| I11 | malformedArtifactFalseAcceptCount = 0 |

## J — Legacy/deletion/version convergence
| ID | Gate |
|---|---|
| J01 | all 17 A15 removed files proven caller-safe after compilation/full suite |
| J02 | all 137 de-exports proven caller-safe or restored deliberately |
| J03 | dynamic import/string path search finds no missed removed surface |
| J04 | seven converged version constants have one canonical owner each |
| J05 | no circular compatibility indirection created |
| J06 | compatibility wrappers retained where historical durable data requires them |

## K — All-phase compatibility
| ID | Gate |
|---|---|
| K01 | Phase 1/1.1/1.2/1.3 local safety/continuity compatibility green |
| K02 | Phase 2A/2B/2C observation/journey/replay compatibility green |
| K03 | Phase 3 source-change intelligence compatibility green |
| K04 | Phase 4 exploration synthetic compatibility green |
| K05 | Phase 5 API synthetic compatibility green |
| K06 | Phase 6 frozen-owner-policy compatibility green without execution |
| K07 | Phase 7 campaign/minimization/triage compatibility green |
| K08 | Phase 7B local AI quarantine/owner-review synthetic compatibility green |
| K09 | Phase 8/8A/8B selfDev/adoption/promotion guard compatibility green without promotion |
| K10 | Phase 9/9A semantic oracle/admission/currentness compatibility green |
| K11 | Phase 9B local synthetic harness compatibility green; no DEV |
| K12 | Phase 10/10B deep semantic/local harness compatibility green; no DEV |
| K13 | Phase 11/11A collection/partial coverage compatibility green |
| K14 | Phase 11B remains NOT_AUTHORIZED |
| K15 | Phase 12 yield/triage/coverage compatibility green |
| K16 | Phase 13/13H/13I semantic campaign/replay/shadow compatibility green |
| K17 | Phase 13B remains NOT_AUTHORIZED |
| K18 | Phase 14 analyzer/static schema/inventory/drift/reporting compatibility green |
| K19 | Phase 15/15P all focused suites green |

## L — Campaign/provenance/full regression
| ID | Gate |
|---|---|
| L01 | campaign:synthetic PASS |
| L02 | owner-provenance PASS |
| L03 | canonical complete Playwright workers=1: 0 failed |
| L04 | topology-correct isolated complete Playwright workers=1: 0 failed |
| L05 | no new skip hides a regression |
| L06 | any count difference between canonical/isolated explained by shown topology evidence |

## M — Continuity/project/catalog/CI
| ID | Gate |
|---|---|
| M01 | agent:check PASS / 0 strict errors |
| M02 | agent:audit 0 strict historical errors attributable to current changes |
| M03 | project:check PASS |
| M04 | selfDev catalog count/digest unchanged unless an independently authorized historical fact says otherwise; promotion authority NONE |
| M05 | Phase-15P historical and mass-round continuity wording truthful after hardening |
| M06 | validated hardening implementation checkpoint pushed fast-forward |
| M07 | HEAD == origin/main / clean after push |
| M08 | exact Actions run/job/steps inspected |
| M09 | CI green claimed only if steps actually execute and pass |
| M10 | durable docs closure pushed fast-forward and final CI truth recorded |

## Required final metrics

Report integer/raw counts for:
- initialTypeErrorCount;
- compilerFixCount;
- hardeningDefectCount;
- permanentRegressionTestsAdded;
- phase15pFocusedPassed/Failed/Skipped;
- historicalCompatibilityPassed/Failed/Skipped;
- adversarialScenarioCount;
- adversarialRepeatCount;
- all quality-floor counts I04-I11;
- canonicalPassed/Skipped/Failed;
- isolatedPassed/Skipped/Failed;
- filesRestoredAfterA15 (if any);
- deExportsRestoredAfterA15 (if any);
- finalChangedFileCount from Phase-15P mass anchor to hardening implementation;
- exact implementation and docs SHAs;
- exact Actions run IDs/statuses.
