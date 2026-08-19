# ACCEPTANCE MATRIX — Nightwatch Phase 13H

Every checked row requires shown evidence from the Phase 13H run. Implementation intent does not count.

## A. Bootstrap / authority

- [ ] A01 clean current Git fetched and fast-forwarded; HEAD == origin/main before edits.
- [ ] A02 owner token exactly `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY` recorded.
- [ ] A03 Phase 13H moved NONE -> IN_PROGRESS and became active task.
- [ ] A04 overnight C1/C2/C3 SHAs preserved as historical anchors.
- [ ] A05 no DEV/NEXT/production/real campaign.
- [ ] A06 Phase 6 frozen and Phase 13B NOT_AUTHORIZED.

## B. Pre-fix truth

- [ ] B01 F1 semantic campaign routing gap reproduced/refuted from live source.
- [ ] B02 F2 structural replay false-certification reproduced/refuted.
- [ ] B03 F3 replay-plan-v2 adapter bypass reproduced/refuted.
- [ ] B04 F4 bundle mapping coherence gap reproduced/refuted.
- [ ] B05 F5 stale-source regression classified from receipt truth table.
- [ ] B06 F6 continuity errors captured before repair.

## C. Replay validator / executor separation

- [ ] C01 plan validation cannot return reproduced anomaly.
- [ ] C02 exact replay requires executor callback invocation.
- [ ] C03 reduced replay requires executor callback invocation when supported.
- [ ] C04 executor not invoked on invalid plan.
- [ ] C05 executor exception fails closed.
- [ ] C06 different executor fingerprint cannot reproduce.
- [ ] C07 partial/stale/unsafe/private result cannot reproduce semantic anomaly.
- [ ] C08 exact fingerprint equality is load-bearing.
- [ ] C09 no synthetic `FAILURE` return remains in a real-adapter helper unless it is explicitly a synthetic-test executor.

## D. Replay v2 occurrence identity

- [ ] D01 duplicate action IDs have distinct deterministic occurrence identities.
- [ ] D02 retained second duplicate occurrence can be represented unambiguously.
- [ ] D03 wrong duplicate occurrence rejected.
- [ ] D04 reorder rejected.
- [ ] D05 invented occurrence rejected.
- [ ] D06 unknown ordinal rejected.
- [ ] D07 expectedActionId mismatch rejected.
- [ ] D08 plan ID changes on load-bearing occurrence change.
- [ ] D09 historical v1 safe parse remains compatible.
- [ ] D10 ambiguous v1 -> v2 conversion fails closed.

## E. Candidate-class replay support

- [ ] E01 exploration exact plan uses v2 occurrence identity.
- [ ] E02 exploration reduced plan uses v2 occurrence identity.
- [ ] E03 exploration planner cannot refill removed actions.
- [ ] E04 exploration catalog/route/precondition guards enforced before executor.
- [ ] E05 API original count exactly 1.
- [ ] E06 API retained count exactly 1.
- [ ] E07 API fixed operation identity exact.
- [ ] E08 API validation alone never reproduces.
- [ ] E09 journey exact requires actual full-journey executor.
- [ ] E10 journey reduced remains PRECONDITION_DIVERGENCE unless source proves safe subset executor.

## F. Semantic campaign bundle

- [ ] F01 strict version/unknown-field validation.
- [ ] F02 bundleId deterministic.
- [ ] F03 top-level target == mapping target enforced.
- [ ] F04 top-level expectation == mapping expectation enforced.
- [ ] F05 mapping journey/operation matches fixed approved mapping.
- [ ] F06 unsupported surface cannot gain semantic authority.
- [ ] F07 stale/unavailable resolver cannot become current by caller input.
- [ ] F08 deployment status remains unresolved.
- [ ] F09 bundle tamper rejected.
- [ ] F10 source SHA/evidence/derivation changes alter identity as designed.
- [ ] F11 no raw source/customer values persisted.

## G. Semantic candidate routing

- [ ] G01 semantic candidate classification derives from validated evidence, not caller boolean.
- [ ] G02 semantic candidates use semantic cluster identity.
- [ ] G03 protocol-only candidates still use historical protocol cluster identity.
- [ ] G04 same semantic evidence under irrelevant source SHA movement dedups according to current semantic cluster contract.
- [ ] G05 changed evidence digest splits semantic cluster.
- [ ] G06 changed derivation version splits semantic cluster.
- [ ] G07 row ordinal/count do not fragment semantic cluster unless current contract explicitly says otherwise.
- [ ] G08 semantic and protocol cluster IDs cannot silently collide across incompatible schemas.

## H. Semantic triage evidence

- [ ] H01 evidence is created from actual replay/minimization facts.
- [ ] H02 source identity comes from validated frozen bundle/resolver evidence.
- [ ] H03 caller cannot pre-certify REPRODUCED/current/safe.
- [ ] H04 PARTIAL tuple coherence enforced.
- [ ] H05 stale tuple coherence enforced.
- [ ] H06 unavailable tuple coherence enforced.
- [ ] H07 exactFingerprintMatch coherence enforced.
- [ ] H08 minimality/reproduction coherence enforced.
- [ ] H09 stale-source Phase 12 regression resolved without weakening truth.
- [ ] H10 privacy sentinels 0 leaks.

## I. Confidence / dossier / readiness

- [ ] I01 semantic confidence computed through current deterministic rule.
- [ ] I02 semantic HIGH positive case requires current/full/reproduced/safe/private evidence.
- [ ] I03 partial cannot HIGH.
- [ ] I04 stale/unavailable cannot HIGH.
- [ ] I05 known false positive cannot HIGH.
- [ ] I06 safety/privacy nonzero cannot HIGH.
- [ ] I07 dossier v2 created for semantic candidates.
- [ ] I08 READY derived through current readiness predicate.
- [ ] I09 caller cannot pre-certify READY.
- [ ] I10 unresolved semantic evidence remains UNRESOLVED/INCOMPLETE.
- [ ] I11 dossier v2 persistence/readback strict.
- [ ] I12 historical dossier v1 persistence/readback compatible for protocol-only candidates.
- [ ] I13 AI-ready confidence never stronger than semantic confidence.
- [ ] I14 AI-ready remains downstream/non-authoritative.

## J. Manifest / checkpoint / resume

- [ ] J01 all load-bearing Phase 13 contract versions participate in executable identity.
- [ ] J02 replay v2 version drift stops before executor.
- [ ] J03 semantic evidence version drift stops before executor.
- [ ] J04 dossier-v2 version drift stops before executor.
- [ ] J05 semantic cluster version drift stops before executor.
- [ ] J06 bundle version drift stops before executor.
- [ ] J07 receipt/expectation derivation drift stops before executor.
- [ ] J08 checkpoint/dossier-ledger schema evolution explicit if changed.
- [ ] J09 historical checkpoint ambiguity fails closed.
- [ ] J10 process resume cannot reinterpret overnight-era semantic evidence under new schema.

## K. Shadow campaign quality floors

- [ ] K01 permanent synthetic `corpus/phase13` exists.
- [ ] K02 exploration reducible anomaly actually executes synthetic replay callback.
- [ ] K03 duplicate occurrence retained correctly.
- [ ] K04 API one-operation behavior truthful.
- [ ] K05 journey exact executes synthetic full-journey callback.
- [ ] K06 journey reduced remains unsupported.
- [ ] K07 different fingerprint not reproduced.
- [ ] K08 partial not reproduced/READY.
- [ ] K09 stale not reproduced/READY.
- [ ] K10 unsafe/private not reproduced/READY.
- [ ] K11 semantic current/reproduced/minimized positive can become READY.
- [ ] K12 protocol-only positive remains compatible.
- [ ] K13 false reproduction = 0.
- [ ] K14 structural-validation-only reproduction = 0.
- [ ] K15 false READY = 0.
- [ ] K16 privacy leaks = 0.
- [ ] K17 version drift misses = 0.
- [ ] K18 duplicate ambiguity = 0.
- [ ] K19 >=3 complete repeats.
- [ ] K20 determinism mismatches = 0.

## L. Hardening / privacy / authority

- [ ] L01 hardening guards cover new pure replay/bundle/semantic modules.
- [ ] L02 pure modules have no browser/network/fs/child-process/DB/AI authority.
- [ ] L03 runtime/manual adapter has no new destination/action authority.
- [ ] L04 no Phase 6/data/infra import path added.
- [ ] L05 no AI/model execution path added.
- [ ] L06 no selfDev/promotion/catalog path added.
- [ ] L07 sentinel matrix covers plan/bundle/candidate/checkpoint/dossier/brief/AI-ready/errors.
- [ ] L08 raw values/credentials/tokens/DOM/screenshots/traces absent.

## M. Fresh source canary

- [ ] M01 current ripple-api master SHA freshly resolved.
- [ ] M02 disposable exact snapshot used.
- [ ] M03 required historical/collection expectations derived.
- [ ] M04 current mappings resolve at exact SHA.
- [ ] M05 wrong SHA fails stale/currentness check.
- [ ] M06 current semantic bundles validate.
- [ ] M07 canonical sibling task-caused writes = 0.
- [ ] M08 no DEV contact.

## N. Compatibility / full regression

- [ ] N01 typecheck PASS.
- [ ] N02 hardening:check PASS.
- [ ] N03 Phase 13 focused PASS.
- [ ] N04 original Phase 13 acceptance matrix completed.
- [ ] N05 Phase 12 focused compatibility PASS.
- [ ] N06 relevant Phase 11 PASS.
- [ ] N07 relevant Phase 10 PASS.
- [ ] N08 relevant Phase 9 PASS.
- [ ] N09 campaign:synthetic PASS.
- [ ] N10 owner-provenance PASS.
- [ ] N11 canonical complete Playwright 0 failed.
- [ ] N12 topology-correct isolated complete Playwright 0 failed.
- [ ] N13 no new skip hides regression.

## O. Continuity / project integrity

- [ ] O01 current PLAN headings repaired.
- [ ] O02 agent:check PASS 0 strict errors.
- [ ] O03 agent:audit 0 strict errors.
- [ ] O04 project:check PASS.
- [ ] O05 catalog integrity digest/count unchanged.
- [ ] O06 git diff --check PASS.
- [ ] O07 overnight implementation history preserved.

## P. Git / CI / closure

- [ ] P01 validated source checkpoint created after all local proof.
- [ ] P02 fast-forward push; HEAD == origin/main.
- [ ] P03 exact implementation Actions run inspected.
- [ ] P04 job-start truth recorded; no CI overclaim.
- [ ] P05 clean post-push acceptance.
- [ ] P06 next decision appended without rewriting historical decisions.
- [ ] P07 current-state/roadmap/design updated truthfully.
- [ ] P08 final docs closure pushed fast-forward.
- [ ] P09 exact final Actions run inspected.
- [ ] P10 final worktree clean.
- [ ] P11 Phase 13B NOT_AUTHORIZED.
- [ ] P12 prohibited safety vector all zero.

## Q. Terminal truth

Exactly one:

- [ ] Q01 local+CI COMPLETE;
- [ ] Q02 all local/source VERIFIED, exact CI BLOCKED_EXTERNAL_CI;
- [ ] Q03 correctness/safety/privacy BLOCKED with exact unresolved invariant.

NEXT ACTION: STOP.