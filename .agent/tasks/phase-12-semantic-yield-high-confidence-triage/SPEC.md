# SPEC — Nightwatch Phase 12A — Semantic Yield & High-Confidence Triage Productivity Pack

Task ID: `phase-12-semantic-yield-high-confidence-triage`
Phase: `12A-SEMANTIC-YIELD-TRIAGE-LOCAL`
Title: Nightwatch Phase 12A — Semantic Yield & High-Confidence Triage Productivity Pack
Authorization class: `PHASE_12_SEMANTIC_TRIAGE_AND_COVERAGE_LOCAL_ONLY`
Continuity protocol: `nightwatch.agent-continuity.v2`

## 0. Authority and starting truth

Starting Nightwatch SHA before this task package:

`cc0ea71a64d06b84b73d396f1c01311513aefe2c`

Established predecessor truth:

- Phase 8: COMPLETE; catalog count 1; canonical digest unchanged; variant B AVAILABLE_NOT_ADOPTED; promotion authority NONE.
- Phase 9: COMPLETE.
- Phase 10: COMPLETE.
- Phase 11 collection semantics: locally validated, exact CI not verified because GitHub Actions is externally billing/spending-limit blocked.
- Phase 11A.4: source freshness VERIFIED and canonical/topology-correct isolated complete regressions VERIFIED locally.
- Phase 11B: NOT_AUTHORIZED and NOT_READY_EXTERNAL_CI.
- Current fresh `mobingilabs/ripple-api` master observed by Phase 11A.4: `e026c85522d201724033f024456da3efa17fe07a`; this is historical context only and MUST be rediscovered before any Phase 12 source-currentness claim.

Roadmap-selected next investments:

- `HIGH_CONFIDENCE_SEMANTIC_TRIAGE`
- `REAL_SEMANTIC_COVERAGE_EXPANSION`

Confirmed current triage gap:

`tests/manual/phase7-real-campaign.ts` currently supplies an `invalidReducedReplay()` callback to journey, exploration, and API candidates. Reduced replay therefore cannot become real minimization evidence.

## 1. Scope

Implement a coordinated LOCAL/SOURCE-ONLY Phase 12A capability across six workstreams:

A. replay/minimization;
B. semantic-aware confidence/dossiers;
C. clustering/contract identity;
D. current-source semantic coverage inventory/expansion;
E. deterministic yield backtest;
F. hardening/regression/continuity.

All workstreams are required. The task must not stop after the first successful subsystem.

## 2. Non-goals / prohibited authority

No DEV.
No Phase 11B.
No NEXT.
No production.
No real campaign execution.
No authenticated product browser/API run.
No product mutation.
No new route or target authority.
No database/data-plane work.
No DynamoDB/BigQuery/Spanner.
No GCP/GKE/Kubernetes/AWS IAM/runtime archaeology.
No Phase 6 revival.
No Alphaus repository writes.
No source annotations in Alphaus repos.
No external publication.
No Slack/email/Jira/team workflow.
No AI/model execution or AI oracle/controller authority.
No selfDev/promotion/catalog mutation/variant-B adoption.
No force push.

## 3. Source precedence

For this task:

current tests/runtime evidence > current Nightwatch implementation > current source snapshots > active task state > durable docs > assumptions.

If current source contradicts this spec, record the contradiction and either update the plan within authority or STOP on a structural blocker. Never silently reconcile.

## 4. Workstream A — real replay and minimization

Follow `WORKSTREAM_A_REAL_REPLAY_AND_MINIMIZATION.md`.

Required outcome:

- permanently reproduce the current always-invalid replay behavior before changing it;
- introduce an explicit, versioned, deterministic replay-plan representation for an already admitted anomaly;
- replay plans may contain only approved action IDs / semantic classes / route classes / contract/source identities and safe structural metadata;
- a candidate sequence must be an order-preserving subsequence of the original sequence;
- no replay plan can introduce a new selector, URL, parameter, raw response value, customer identity, credential, request body, mutation, or unknown action;
- invalid preconditions are classified before executor exposure whenever mechanically knowable;
- fresh exact replay and reduced-candidate replay remain separate phases;
- exact anomaly fingerprint equality is the only reproducing result;
- a different fingerprint is `DOES_NOT_REPRODUCE`, never close-enough;
- nonzero safety or privacy state makes the candidate invalid/unresolved;
- API single-action candidates can support fresh exact replay even when no non-empty reduction exists;
- the pure minimizer remains network/browser agnostic;
- any real-run adapter changes are wiring only and must not be executed in this task.

Do not loosen `REAL_DEV_MINIMIZATION_BUDGET` merely to improve synthetic metrics.

## 5. Workstream B — semantic-aware confidence and dossier evidence

Follow `WORKSTREAM_B_CONFIDENCE_AND_DOSSIER.md`.

Introduce a strictly validated safe semantic triage evidence model, repository-native versioning as needed.

At minimum carry safe categorical/bounded facts such as:

- expectationId;
- targetId;
- semantic finding fingerprint / invariant-definition identity;
- source repo/SHA and source evidence digest;
- source-currentness state;
- semantic outcome;
- collection coverage state when applicable;
- receipt version/outcome;
- exact-replay status;
- replay fingerprint-match result;
- minimization guarantee;
- bounded reproduction counts;
- missing-evidence codes.

Never carry raw customer/runtime scalar values.

Confidence rules must be categorical, deterministic, and conservative. HIGH confidence is prohibited when any of the following holds:

- semantic outcome is PARTIAL_COVERAGE or non-anomaly;
- expectation is stale/unavailable/unresolved;
- exact replay did not reproduce the same fingerprint;
- safety/privacy is nonzero;
- known Nightwatch false-positive mode is present;
- oracle reliability is unresolved;
- evidence required by the selected confidence rule is missing.

Browser/API agreement alone must never manufacture HIGH confidence.

Historical dossier/triage DTOs must remain readable or have an explicit compatibility boundary. Do not silently change the semantics of an immutable v1 schema.

## 6. Workstream C — clustering and semantic contract identity

Follow `WORKSTREAM_C_CLUSTERING_AND_CONTRACT_IDENTITY.md`.

Required properties:

- multiple rows violating the same semantic invariant definition cluster as one bug candidate;
- row ordinal, violating count, raw value, customer identity, timestamp, run path, and private filesystem path do not fragment cluster identity;
- semantically different invariant definitions remain distinguishable;
- source contract evolution is represented safely: unrelated source SHA movement with identical normalized evidence should not necessarily create a new semantic class, while changed source-evidence digest / derivation semantics must not be silently merged;
- historical protocol-only clustering remains compatible;
- semantic cluster/fingerprint material is deterministic and privacy-safe.

No probabilistic similarity / embeddings / model clustering.

## 7. Workstream D — real-source semantic coverage inventory and bounded expansion

Follow `WORKSTREAM_D_REAL_SOURCE_COVERAGE_EXPANSION.md`.

Before any coverage change:

1. discover current approved read-only target IDs from current Nightwatch source;
2. discover current real-source recipe/admitted expectation set;
3. resolve current `mobingilabs/ripple-api` remote `master` SHA fresh using a read-only remote metadata command;
4. build a disposable exact snapshot outside canonical siblings;
5. leave canonical Alphaus siblings untouched.

Produce a deterministic coverage inventory with, at minimum:

- approved target ID;
- observer compatibility class;
- current recipe presence/version;
- historical expectation ID;
- collection expectation ID where applicable;
- depth class (shape / type / collection / relational if already proven);
- source currentness;
- mechanically proven blocker/rejection reason when uncovered.

Coverage expansion rules:

- DO NOT add any new product target ID, route, endpoint selector, mutation authority, or DEV-reachable authority;
- additional semantic contracts are allowed only for targets already in the approved read-only set and only when current source mechanically proves them through existing or narrowly extended deterministic extractor vocabulary;
- first attempt safe depth uplift for currently shallow admitted targets using existing Phase 10 type-flow machinery where source supports it;
- assess currently approved but not admitted targets only if the existing observer can actually observe their response class;
- gRPC/non-JSON or otherwise unobservable targets remain rejected unless current Nightwatch already has a safe observer path; do not build a new transport in this task;
- ambiguous conditional/blob/runtime-computed shape remains fail-closed;
- no contract is added simply to hit a quota.

If no additional contract is mechanically admissible, the workstream still succeeds if it produces a source-current inventory plus precise blockers and no invented semantics.

## 8. Workstream E — measured synthetic bug-yield backtest

Follow `WORKSTREAM_E_YIELD_BACKTEST.md`.

Build a permanent Phase 12 corpus exercising at least these classes:

- later-row FIELD_PRESENT semantic defect;
- later-row TYPE_MATCH defect;
- TYPE_IN_SET defect;
- multiple violating rows same invariant;
- two distinct invariant definitions violated;
- partial coverage without observed violation;
- stale source expectation;
- source unavailable;
- exact replay same fingerprint;
- replay different fingerprint;
- reduced sequence reproduces;
- reduced sequence invalid precondition;
- candidate budget exhaustion;
- known Nightwatch false-positive case;
- protocol-only anomaly compatibility;
- source-contract digest change;
- benign full-pass collection;
- benign empty collection;
- benign >128 partial collection;
- safe API single-action anomaly;
- safe exploration/journey multi-action anomaly.

Measure current baseline versus Phase 12 for the SAME fixed corpus. Report raw integer counts, not marketing percentages.

At minimum:

- seededActionableDefects;
- baselineReproduced;
- phase12Reproduced;
- baselineMinimized;
- phase12Minimized;
- baselineHighConfidence;
- phase12HighConfidence;
- readyDossiers;
- uniqueClusters;
- falsePositiveCount;
- partialCoverageFalsePassCount;
- staleSourceFalsePassCount;
- privacyLeakCount;
- determinismMismatchCount.

Required direction:

`phase12Minimized > baselineMinimized`

for fixtures specifically exercising the existing invalid-replay gap.

False positives, privacy leaks, partial-coverage false passes, and stale-source false passes must all equal zero.

## 9. Workstream F — hardening, validation, CI truth

Follow `WORKSTREAM_F_HARDENING_AND_VALIDATION.md`.

Add a dedicated local/synthetic Phase 12 workflow matrix. CI must not contact DEV or live Alphaus sources.

The implementation must pass:

- `npm run typecheck`
- `npm run hardening:check`
- focused Phase 12 matrices
- Phase 9 / 9A.1 / 9B compatibility
- Phase 10 / 10B compatibility
- Phase 11 / 11A.1 / 11A.2 / 11A.3 compatibility
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- canonical catalog integrity
- `git diff --check`
- complete canonical `npx playwright test --project=nightwatch --workers=1`
- topology-correct isolated/source-equivalent complete Playwright regression with 0 failed.

Do not mislabel `npm run test:unit` as the full regression.

## 10. Replay-plan authority boundary

The replay plan is evidence/control data for Nightwatch, not permission to contact a product.

A future real executor may consume it only after the existing DEV/auth/containment/owner-policy gates pass. This task must prove the pure plan/executor boundary using synthetic executor doubles only.

No new owner-policy operation is necessary unless current code mechanically requires one. If a new operation class would widen authority, STOP and split the task.

## 11. Journey replay constraints

For declarative journey candidates:

- use only original step IDs;
- preserve original order;
- never synthesize a step;
- validate route/precondition dependency before exposing the executor;
- if the existing journey engine cannot safely execute a valid subset without changing contract semantics, implement a replay-plan representation and local adapter proof but STOP short of unsafe runtime wiring; classify the remaining runtime binding precisely.

Do not mutate frozen historical journey contracts.

## 12. Exploration replay constraints

For exploration candidates:

- every retained action must resolve to the existing approved Phase 4 safe-action catalog;
- semantic class must remain KNOWN_READ or LOCAL_ONLY;
- no server-state effect;
- route effect must remain UNCHANGED or APPROVED_ROUTE;
- original seed may be referenced only as an existing sanitized seed identifier if current policy permits it; do not invent new exploration during replay;
- minimization is replay reduction, never exploration.

## 13. API replay constraints

For API candidates:

- only the original approved Phase 5 operation ID may be represented;
- no new scenario generation semantics;
- no arbitrary method/path/host/parameter input;
- a one-action candidate may be `UNCHANGED` after successful exact replay;
- empty sequence is invalid/non-executable;
- no API network call is made in this task.

## 14. Source freshness for high confidence

Current real Phase 7 source correlation often reports `LOCAL_TRACKING_REF_ONLY`. Phase 12 may introduce a safe source-attestation DTO or equivalent only if it remains data-only and can be supplied by a future preflight without network authority inside the triage core.

A source-attestation representation must contain only repository/ref/SHA/currentness/evidence identity metadata.

Do not make the deterministic triage core invoke `git`, `gh`, network, filesystem, or child_process.

## 15. Semantic receipt truth

Phase 11A.1/11A.2 are permanent prerequisites:

- semantic PARTIAL_COVERAGE stays receipt PARTIAL_COVERAGE;
- acceptance rejects partial coverage;
- replay comparison cannot hide partial/full mismatch.

Phase 12 must add regression cases proving its confidence/dossier logic also preserves these facts.

## 16. Minimization honesty

Do not claim GLOBAL_MINIMAL.

Retain current honest vocabulary:

- `1-MINIMAL`
- `BOUNDED_MINIMAL`
- `NONE`

or introduce a versioned equivalent with no stronger claim.

Budget exhaustion, invalid candidates, and unreproduced exact replay must remain explicit.

## 17. Confidence model principles

No percentages.
No learned scoring.
No arbitrary numeric weights.

Confidence is a deterministic categorical state derived from independent evidence predicates.

The design must make the evidence predicates inspectable in tests and dossiers.

## 18. Dossier readiness

A dossier may be `READY` only when its schema-valid readiness predicate passes. At minimum, it must not be READY with:

- unresolved/stale semantic expectation;
- partial coverage used as pass evidence;
- exact replay missing or failed when replay is required;
- nonzero safety/privacy;
- known Nightwatch false positive;
- missing essential semantic contract identity.

Protocol-only historical dossier behavior must remain compatible.

## 19. Privacy contract

Allowed persisted semantic triage facts:

- IDs already safe by policy;
- categorical outcomes;
- bounded counts;
- source repo/path/symbol/SHA/evidence digest;
- action IDs;
- route classes already admitted by current triage policy;
- invariant kind / source-known field path;
- structural ordinals only if already allowed and proven non-identifying.

Forbidden:

- raw bodies;
- customer strings;
- account IDs from runtime values;
- email;
- currency/cost values;
- bearer/cookie/token data;
- DOM;
- screenshots/traces;
- raw unexpected scalar values;
- hashes/prefixes/suffixes of raw customer values.

Run adversarial sentinel tests across results, clusters, fingerprints, dossiers, briefs, AI-ready packages, exceptions, checkpoint serialization, and any new DTO.

## 20. Determinism

For identical safe input, repeated runs >=3 must produce byte-identical or canonical-equivalent:

- replay plan;
- candidate evaluation sequence;
- minimization result;
- confidence result;
- cluster identity;
- dossier deterministic fields;
- coverage inventory;
- backtest metrics.

Timestamps/private paths must not enter deterministic identity.

## 21. Coverage inventory determinism

Inventory order is canonical by target ID. Reject duplicate target IDs. Distinguish:

- APPROVED_AND_ADMITTED
- APPROVED_NOT_ADMITTED_AMBIGUOUS
- APPROVED_NOT_OBSERVABLE
- APPROVED_SOURCE_UNAVAILABLE
- APPROVED_SOURCE_STALE
- APPROVED_NO_MECHANICAL_CONTRACT

or an equivalent fixed vocabulary.

Never label an uncovered target a bug.

## 22. Coverage expansion compatibility

Historical real-source expectation IDs and Phase 11 collection IDs remain interpretable. Any upgraded/deeper expectation must use explicit identity/versioning so historical evidence is not silently reinterpreted.

Do not replace the old recipe in-place if that changes durable semantic meaning without version/identity separation.

## 23. Backtest baseline

The baseline must execute current behavior from the task's starting implementation semantics. Do not fake the baseline by constructing a deliberately weaker toy implementation.

It is acceptable to preserve a small baseline helper that represents the exact confirmed `invalidReducedReplay()` behavior, but the test must prove it matches the pre-fix real-candidate path.

## 24. Campaign integration

Phase 12 may update local/synthetic campaign integration so semantic candidates flow through the new triage evidence, clustering, minimization, and dossier path.

Do not change campaign scheduling/budget selection just to improve metrics.

Do not run `campaign:real`.

## 25. Change-intelligence integration

Existing deterministic source-change correlation may be reused and safely enriched with explicit currentness attestation. Do not claim deployment truth; deployment remains unresolved unless already proven by existing allowed evidence.

No infrastructure/deployment queries.

## 26. False-positive control

Preserve known Nightwatch-defect suppression. Add cases ensuring:

- known false-positive match cannot become HIGH confidence;
- identical semantic anomaly without the known false-positive signature remains eligible;
- suppression metadata contains no customer values.

## 27. Hardening boundaries

Pure core modules for replay plan, confidence, clustering, coverage inventory, and backtest scoring must not import:

- browser/page APIs;
- fs/path if not explicitly the existing source-access boundary;
- child_process;
- network transports;
- DB/infra;
- AI/model;
- selfDev/promotion;
- product executors.

Runtime wiring remains isolated at existing launcher/manual adapter boundaries.

## 28. Required permanent Phase 12 tests

At minimum add tests for:

1. pre-fix invalidReducedReplay reproduction;
2. replay plan strict schema;
3. replay plan unknown field rejection;
4. non-subsequence rejection;
5. action reorder rejection;
6. unknown action rejection;
7. unsafe semantic class rejection;
8. journey dependency/precondition rejection;
9. journey reducible replay success via synthetic executor;
10. exploration safe-action resolution;
11. exploration reducible replay success;
12. API exact replay success;
13. API empty reduction rejected;
14. same fingerprint reproduces;
15. different fingerprint does not reproduce;
16. safety nonzero invalidates replay;
17. fresh exact replay required before reduction;
18. 1-minimal proof case;
19. bounded-minimal budget case;
20. deterministic minimization repeat;
21. semantic partial coverage blocks confidence;
22. stale source blocks confidence;
23. source unavailable blocks confidence;
24. known false-positive blocks high confidence;
25. clean exact semantic replay can achieve high/medium per explicit rule;
26. browser/API parity alone cannot achieve high;
27. semantic cluster ignores row ordinal;
28. semantic cluster ignores violating count;
29. distinct invariant definitions remain distinct;
30. unchanged source evidence across unrelated SHA movement clusters compatibly;
31. changed evidence digest does not silently merge;
32. protocol-only historical cluster compatibility;
33. dossier v1 compatibility;
34. new dossier readiness validation;
35. missing required semantic identity blocks READY;
36. safe human reproduction recipe contains action IDs only;
37. coverage inventory current-source ordering;
38. duplicate inventory target rejected;
39. approved target sets unchanged;
40. current recipe inventory exact;
41. collection expectation inventory exact;
42. approved-unobservable target classified safely;
43. ambiguous target remains fail-closed;
44. mechanically proven coverage uplift if available;
45. no forced uplift if source proof absent;
46. baseline invalid replay count reproduced;
47. Phase 12 replay/minimization improves seeded cases;
48. benign corpus false positives zero;
49. partial false pass zero;
50. stale-source false pass zero;
51. privacy sentinel leaks zero;
52. deterministic backtest repeats;
53. campaign synthetic integration;
54. Phase 9/10/11 compatibility;
55. no endpoint authority expansion;
56. no catalog drift.

Add more as current implementation requires.

## 29. Current-source canary

Run owner-local/source-only after implementation:

- fresh remote SHA resolve;
- disposable source snapshot;
- coverage inventory;
- historical + collection derivation;
- any new candidate recipe derivation;
- resolver/currentness checks;
- no product call.

Durable report contains safe structural facts only.

## 30. Full validation

Run all commands named in Workstream F. Full canonical and topology-correct isolated Playwright regression are mandatory.

No new unexplained skips.

## 31. Git/checkpoint policy

Use validated direct-to-main checkpoints per D-34.

Recommended sequence:

1. implementation checkpoint after all local focused/full validations;
2. exact GitHub Actions re-check;
3. clean post-push source/currentness/backtest acceptance;
4. docs/continuity closure;
5. exact final Actions re-check.

Never force-push.

## 32. GitHub Actions external blocker

If Actions still refuses to start jobs due the documented billing/spending-limit condition:

- do not call it a code failure;
- do not claim CI success;
- continue all authorized local/source-only work;
- terminalize the task truthfully as local-validated but external-CI-blocked after all local completion criteria pass.

## 33. Phase 11B remains separate

This task does not change:

`PHASE_11B_STATUS: NOT_AUTHORIZED`

and does not grant DEV readiness while exact CI remains unavailable.

Phase 12 local completion cannot be used as an implicit Phase 11B authorization.

## 34. Decision record

At successful local implementation, append the next actual decision number discovered from `docs/DECISIONS.md` rather than assuming one. Record:

- why Phase 12 combines the two ROADMAP NEXT_AFTER investments;
- replay-plan architecture;
- exact reduced-replay safety model;
- semantic confidence rule;
- clustering identity rule;
- dossier versioning/readiness;
- coverage inventory/expansion result;
- backtest metrics;
- privacy/determinism result;
- CI external state;
- no DEV/Phase6/AI/selfDev authority expansion.

## 35. Terminal states

If all local/source gates pass and Actions remains externally blocked:

```text
PHASE_12_REAL_REPLAY: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12_HIGH_CONFIDENCE_TRIAGE: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12_REAL_SOURCE_COVERAGE: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12_YIELD_BACKTEST: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12A_STATUS: BLOCKED_EXTERNAL_CI
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Only if exact implementation and final CI execute and succeed may Phase 12A close as COMPLETE.

If a workstream exposes a structural blocker, do not mark the others incomplete by default: finish independent authorized workstreams, record per-workstream state, and terminalize the exact blocking dependency.

## 36. Stop conditions

Use precise blockers including:

- `PHASE_12A_STOPPED_SOURCE_ADVANCED`
- `PHASE_12A_BLOCKED_REPLAY_AUTHORITY_EXPANSION`
- `PHASE_12A_BLOCKED_JOURNEY_SUBSET_UNSAFE`
- `PHASE_12A_BLOCKED_REPLAY_FINGERPRINT_AMBIGUITY`
- `PHASE_12A_BLOCKED_CONFIDENCE_FALSE_POSITIVE`
- `PHASE_12A_BLOCKED_DOSSIER_COMPATIBILITY`
- `PHASE_12A_BLOCKED_CLUSTER_IDENTITY_AMBIGUITY`
- `PHASE_12A_BLOCKED_SOURCE_COVERAGE_AMBIGUITY`
- `PHASE_12A_BLOCKED_PRIVACY`
- `PHASE_12A_BLOCKED_DETERMINISM`
- `PHASE_12A_BLOCKED_FULL_REGRESSION`
- `PHASE_12A_BLOCKED_CATALOG_DRIFT`
- `PHASE_12A_BLOCKED_CONTINUITY`
- `PHASE_12A_BLOCKED_EXTERNAL_CI`

Do not weaken correctness to avoid a blocker.

## 37. Final principle

Phase 11 raised the chance that Nightwatch notices a real semantic defect.

Phase 12 must raise the chance that, once noticed, the defect becomes a small, reproducible, source-current, deduplicated, privacy-safe, evidence-rich bug candidate rather than a noisy anomaly.

The target pipeline is:

```text
SOURCE-BOUND SEMANTIC ANOMALY
  -> EXACT FRESH REPLAY
  -> SAFE REDUCED REPLAY
  -> HONEST MINIMALITY
  -> SOURCE/COVERAGE-AWARE CONFIDENCE
  -> STABLE SEMANTIC CLUSTER
  -> READY / UNRESOLVED DOSSIER
  -> MEASURED YIELD BACKTEST
```

while simultaneously expanding only mechanically proven semantics on already approved read-only surfaces.

Do a lot of useful work, but every change must either improve deterministic bug detection or deterministic bug actionability. No scope theater.
