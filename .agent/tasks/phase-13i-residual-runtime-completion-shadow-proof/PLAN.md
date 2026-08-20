# PLAN — Nightwatch Phase 13I — Residual Runtime Completion & Integrated Shadow Proof

Task ID: `phase-13i-residual-runtime-completion-shadow-proof`
Phase: `13I-RESIDUAL-RUNTIME-COMPLETION-SHADOW-PROOF`
Authority at publication: NOT_GRANTED.
Owner executor prompt grants: `PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`.

## Purpose

Close the exact residual local runtime gaps left by Phase 13H, then prove the resulting architecture through an integrated synthetic shadow campaign and the full local regression stack.

## Starting State

- Source anchor: `a7abfee678bc752f705cf910e98fa1f114042e74`.
- Phase 13H historical status: BLOCKED.
- Phase 13H validated implementation anchor: `d672b626f7e131bb1fc6cd97e33d92fe69fcd637`.
- External Actions billing/spending-limit block remains possible and does not prevent local/source work.
- Phase 13B remains NOT_AUTHORIZED.

## Scope

Included:

- semantic-vs-protocol campaign promotion routing;
- strict semantic campaign candidate/control evidence if required;
- semantic contract clustering and dossier-v2 promotion;
- occurrence-bound replay-plan-v2 consumption at the real-adapter source boundary with injected executors;
- corpus/phase13 integrated shadow campaign;
- exhaustive manifest/checkpoint/version drift proof;
- ledger/readback/morning-brief semantic-v2 compatibility;
- privacy/hardening/currentness/full regressions/continuity.

## Non-Goals

No DEV, real campaign, Phase 13B, NEXT, production, product mutation, DB/data-plane, infrastructure/Phase 6, Alphaus writes, new endpoint/target/network authority, AI/model authority, selfDev/promotion/catalog mutation, or publication.

## Safety Constraints

Existing owner scope, egress, mutation, privacy, and private-artifact policies remain stronger than this task. No raw product response/value may cross semantic projection into campaign evidence. Any design that requires guessing source semantics, journey subset behavior, or runtime deployment state blocks that branch.

## Architecture / Approach

Maintain two explicit promotion paths. Protocol-only candidates continue through historical protocol cluster + dossier-v1 behavior. Semantic candidates with complete mechanically derived semantic control evidence use semantic contract clustering, exact replay/minimization, strict semantic triage evidence, semantic confidence, and dossier-v2 readiness. Structural replay validation is separate from replay execution. V2 occurrence plans become the actual replay control object at the real-adapter source boundary.

## Milestones

### M0 — Bootstrap, authority, reproduce residuals
Status: NOT_STARTED

- fetch/fast-forward clean main;
- record exact owner token;
- transition Phase 13I to IN_PROGRESS and active;
- preserve Phase 13H historical BLOCKED truth;
- reproduce R1–R5 before fixing;
- reconcile stale Phase 13H live-HEAD recovery wording if touched.

### M1 — Semantic candidate evidence and routing
Status: NOT_STARTED

- define/reuse strict safe semantic candidate evidence;
- make semantic/protocol routing explicit;
- semantic candidates cluster by semantic contract identity;
- protocol candidates retain historical cluster behavior;
- add focused routing/identity/privacy tests.

### M2 — Semantic promotion pipeline
Status: NOT_STARTED

- bind exact representative semantic cluster to replay/minimization;
- create SemanticTriageEvidence from actual replay/source/receipt facts;
- rankSemanticConfidence;
- create/read BugDossierV2 and derive READY/UNRESOLVED;
- prevent unresolved semantic dossier from entering bugCandidates/top findings as READY;
- keep protocol dossier-v1 compatible.

### M3 — Replay-plan-v2 real-adapter binding
Status: NOT_STARTED

- remove all structural-only FAILURE certification in the Phase-7 real adapter;
- build/validate TriageReplayPlanV2 for exploration/API/journey exact paths;
- delegate reproduction to injected executor callbacks through executeReplayPlanV2;
- duplicate occurrence identity load-bearing;
- API exactly one fixed operation;
- journey reduced unsupported;
- permanent focused tests.

### M4 — Ledger, checkpoint, brief and version drift
Status: NOT_STARTED

- evolve strict checkpoint/dossier ledger only if needed for semantic-v2 evidence;
- v1 historical readback compatibility explicit;
- semantic-v2 readback validation explicit;
- one-at-a-time version drift matrix stops before executor;
- source-bundle freeze/source movement cannot auto-rebind;
- morning brief never overstates unresolved semantic evidence.

### M5 — Permanent Phase-13 corpus and shadow campaign
Status: NOT_STARTED

- create `corpus/phase13/**` synthetic fixtures;
- integrated shadow harness uses actual routing/replay/promotion modules and synthetic executors;
- cover replay occurrence, semantic truth, protocol compatibility, drift, privacy, currentness;
- run >=3 complete repeats;
- quality-floor counters all zero.

### M6 — Hardening and compatibility
Status: NOT_STARTED

- extend/run hardening guards;
- Phase 13I focused + applicable Phase 13/H matrices;
- Phase 12 and relevant Phase 9–11 compatibility;
- campaign:synthetic + owner-provenance;
- zero regressions.

### M7 — Fresh current-source canary
Status: NOT_STARTED

- fresh resolve current ripple-api remote SHA;
- disposable exact snapshot;
- current historical + collection derivation/resolution for approved mappings;
- stale wrong-SHA fail-closed;
- canonical sibling writes 0;
- no product contact.

### M8 — Full canonical and isolated regressions
Status: NOT_STARTED

- canonical full Playwright workers=1, 0 failed;
- topology-correct isolated clean clone + npm ci + full Playwright, 0 failed;
- no hidden/new skips.

### M9 — Continuity / project integrity
Status: NOT_STARTED

- agent:check PASS;
- agent:audit strict errors 0;
- project:check PASS;
- catalog digest/count unchanged;
- git diff --check PASS;
- live-head fields use Git authority, not predicted/stale SHA text.

### M10 — Validated source checkpoint
Status: NOT_STARTED

- commit only after all local source proof green;
- push fast-forward and verify HEAD==origin/main clean;
- inspect exact Actions run/job-start truth;
- rerun decisive post-push local checks.

### M11 — Durable closure
Status: NOT_STARTED

- append next live decision number discovered from ledger;
- update design/current state/roadmap/task state/report;
- final docs push fast-forward;
- inspect exact final Actions truth;
- Phase 13B NOT_AUTHORIZED;
- STOP.

## Validation Strategy

Order validation from narrow to broad: pre-fix reproducers → focused semantic/replay/ledger tests → integrated shadow campaign ×3 → hardening/compatibility → fresh-source canary → canonical full → isolated full → continuity/project/catalog → validated checkpoint → exact CI truth → docs closure.

## Decision Log

Populate during execution. Never rewrite earlier D-entries; append a new decision only if implementation establishes a durable architectural choice.

## Discoveries

Populate from live source/test evidence. Predecessor report claims are starting hypotheses, not automatic facts.

## Deferred Work

- Phase 13B contained DEV acceptance: separate authorization only after Phase 13I is locally complete and exact CI green.
- Phase 11B: still separate.
- Phase 6/data/infra: frozen/out of scope.

## Completion Criteria

All M0–M11 local gates must be terminal and green before local runtime completion may be claimed. If exact Actions remains billing-blocked before jobs start, terminalize `BLOCKED_EXTERNAL_CI` only after every local/source row is proven. Any local residual means `BLOCKED`, not locally verified.
