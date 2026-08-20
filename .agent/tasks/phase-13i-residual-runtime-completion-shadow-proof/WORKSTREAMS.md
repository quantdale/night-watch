# WORKSTREAMS — Nightwatch Phase 13I

Parent task: `phase-13i-residual-runtime-completion-shadow-proof`
Authority when executed: `PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`
No DEV.

## Workstream A — Semantic campaign routing and identity

Goal: close R1 without changing protocol-only historical behavior.

Required implementation:

- identify semantic candidates only when complete safe semantic control evidence exists;
- add/reuse a strict versioned semantic campaign candidate evidence DTO if `semanticFindings` alone is insufficient;
- derive target/expectation/source/contract identity mechanically from frozen bundle/resolved expectation/finding facts;
- route semantic candidates through semantic contract clustering;
- keep protocol-only candidates on historical `clusterAnomalies()`;
- prevent row ordinal/count/timestamp/source-SHA-only movement from fragmenting semantic identity;
- split on evidence digest/derivation/target/expectation/invariant changes;
- strict persistence validator for any new candidate fields;
- zero sentinel/raw-value leakage.

## Workstream B — Semantic promotion and dossier-v2

Goal: make Phase-12 semantic confidence/readiness the actual campaign authority for semantic findings.

Required implementation:

- create semantic triage evidence only after real/synthetic executor-backed exact replay/minimization;
- bind evidence to the representative semantic cluster/contract;
- use currentness and receipt/coverage truth from validated semantic runtime evidence, not caller flags;
- call `rankSemanticConfidence` and `createBugDossierV2`;
- semantic unresolved states never enter READY bugCandidates/top findings;
- semantic READY requires exact-fingerprint reproduction + required minimization/currentness/safety/privacy/oracle conditions;
- semantic dossier-v2 readback uses v2 validator; protocol dossier-v1 readback remains supported;
- morning brief shows only sanitized v2 truth and never stronger generic confidence.

## Workstream C — Replay-plan-v2 real-adapter binding

Goal: close R2/R3.

Required implementation:

- remove direct structural-return `FAILURE` certification from Phase-7 real-adapter replay helpers;
- make `TriageReplayPlanV2` the load-bearing replay control object;
- occurrence selection must be unambiguous, especially duplicate IDs;
- exploration exact/reduced uses validated V2 plan + injected executor;
- API exact/reduced uses exactly one approved operation + injected executor;
- journey exact uses full occurrence plan + injected executor;
- journey reduced remains PRECONDITION_DIVERGENCE;
- different fingerprint => not reproduced;
- executor throw/error => fail closed;
- safety/privacy nonzero cannot reproduce;
- no actual product execution in this task.

## Workstream D — Campaign persistence, drift and resume

Goal: prove semantic-v2 campaign state cannot be silently resumed under incompatible executable contracts.

Required implementation/proof:

- version candidate/cluster/dossier ledger schema if new semantic state is persisted;
- checkpoint validators reject unknown/impossible semantic state;
- historical checkpoints either parse under historical schema or fail closed explicitly;
- mutate every load-bearing version field one at a time and prove stop before executor;
- source bundle movement after manifest freeze never auto-rebinds;
- semantic dossier-v2 ledger state matches dossier readiness;
- unresolved semantic dossier never persisted as READY;
- live-head continuity uses Git authority.

## Workstream E — Integrated Phase-13 shadow campaign

Goal: create permanent end-to-end proof using actual integration modules with synthetic executors.

Required:

- `corpus/phase13/**` synthetic-only;
- >=40 meaningful fixtures/classes across replay, semantic truth, protocol compatibility, drift, privacy;
- at least 3 complete identical-input repeats;
- deterministic output mismatch count 0;
- quality floors all 0: false reproduction, structural-only certification, false READY/HIGH, partial/stale/unsafe/private false promotion, cluster fragmentation, cross-contract merge, drift miss, privacy leaks, authority expansion;
- positive semantic case reaches HIGH + dossier-v2 READY only after executor-backed exact replay/minimization;
- protocol-only positive remains compatible.

## Workstream F — Hardening, source freshness and full regression

Goal: close the local phase completely.

Required:

- typecheck;
- hardening guards for every new pure/runtime boundary;
- Phase 13I focused matrix;
- applicable Phase 13/H + Phase 12 + relevant Phase 9–11 compatibility;
- campaign:synthetic;
- owner-provenance;
- fresh current ripple-api remote SHA + disposable exact snapshot derivation/resolution canary, canonical sibling writes 0;
- canonical complete Playwright workers=1, 0 failed;
- topology-correct isolated clean clone + npm ci + full Playwright, 0 failed;
- agent:check/audit/project/catalog/diff all green;
- validated checkpoint and exact Actions truth;
- docs closure and exact final Actions truth.

Do not stop after one workstream if another independent authorized stream remains safe. If one stream requires prohibited authority, record a blocker for that stream and continue the others.
