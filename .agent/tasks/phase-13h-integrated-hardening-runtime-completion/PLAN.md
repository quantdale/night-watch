# PLAN — Nightwatch Phase 13H — Integrated Hardening & Runtime Completion

Task ID: `phase-13h-integrated-hardening-runtime-completion`
Phase: `13H-INTEGRATED-HARDENING-RUNTIME-COMPLETION`
Authority at publication: NOT_GRANTED.
Owner executor prompt grants: `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`.

## Execution rule

Treat the overnight C1/C2/C3 implementation as unverified input. Reproduce the known gaps first, repair runtime integration where needed, then harden the whole surface. Do not accept predecessor status strings as evidence.

## Milestones

### M0 — Bootstrap and evidence freeze
Status: NOT_STARTED
- fetch/fast-forward clean main;
- record owner token;
- transition Phase 13H to IN_PROGRESS and make active;
- preserve overnight SHAs/history;
- run pre-fix focused reproductions F1–F6.

### M1 — Replay correctness and executor separation
Status: NOT_STARTED
- prove/fix false-certification path;
- make v2 occurrence identity load-bearing at real adapter boundary;
- require executor result for reproduction;
- preserve journey reduced unsupported semantics;
- add permanent replay-focused tests.

### M2 — Semantic bundle/currentness hardening
Status: NOT_STARTED
- prove/fix mapping cross-field coherence;
- harden fixed mapping/currentness/fail-closed semantics;
- add bundle tamper/drift tests.

### M3 — Semantic campaign runtime completion
Status: NOT_STARTED
- branch semantic candidates from protocol-only candidates;
- use semantic cluster identity;
- create semantic triage evidence from actual replay/minimization/source facts;
- rank semantic confidence;
- create/read dossier v2 and derive readiness;
- keep protocol dossier-v1 compatibility;
- version checkpoint/ledger schema if necessary.

### M4 — Semantic truth reconciliation
Status: NOT_STARTED
- resolve stale-source Phase 12 fixture vs validator from current receipt truth table;
- verify PARTIAL/stale/unavailable/invalid states cannot overclaim;
- AI-ready non-overclaim tests.

### M5 — Shadow campaign and adversarial matrix
Status: NOT_STARTED
- complete `corpus/phase13/**`;
- execute integrated synthetic shadow campaign across replay/semantic/protocol/drift/privacy classes;
- >=3 deterministic repeats;
- all quality floors zero.

### M6 — Hardening and compatibility
Status: NOT_STARTED
- extend/run `hardening:check`;
- run complete original Phase 13 acceptance matrix plus Phase 13H additions;
- run Phase 12 and relevant Phase 9–11 compatibility;
- campaign synthetic + owner provenance.

### M7 — Fresh-source canary
Status: NOT_STARTED
- fresh remote ripple-api SHA;
- disposable exact snapshot;
- rederive/resolve/bundle current approved semantic mappings;
- stale wrong-SHA fail-closed;
- canonical sibling writes 0.

### M8 — Full regressions
Status: NOT_STARTED
- canonical complete Playwright workers=1, 0 failed;
- topology-correct isolated clean clone + npm ci + complete Playwright, 0 failed;
- no new skip hiding failures.

### M9 — Continuity and project integrity
Status: NOT_STARTED
- fix PLAN heading/current task issues;
- agent:check/audit 0 strict errors;
- project:check, catalog integrity, diff check green.

### M10 — Validated implementation checkpoint
Status: NOT_STARTED
- source-bearing checkpoint after all local proof;
- push fast-forward;
- inspect exact Actions run and job-start truth;
- clean post-push acceptance.

### M11 — Durable closure
Status: NOT_STARTED
- append next decision;
- update architecture/current state/roadmap/task report;
- final docs push;
- inspect exact final Actions truth;
- Phase 13B remains NOT_AUTHORIZED;
- STOP.

## Parallel work

If safe independent sub-agents are available, use read-only review paths before edits only:
1. replay/executor reviewer;
2. semantic bundle/currentness reviewer;
3. orchestrator/cluster/dossier reviewer;
4. hardening/shadow/continuity reviewer.

Do not parallel-edit overlapping files.

## Validation order

1. focused pre-fix reproductions;
2. focused replay/bundle/semantic routing tests;
3. shadow campaign/adversarial matrix;
4. hardening;
5. Phase 9–13 compatibility;
6. campaign synthetic + provenance;
7. source canary;
8. canonical full;
9. isolated full;
10. continuity/project/catalog;
11. checkpoint + exact Actions truth;
12. docs closure.

## Stop conditions

Stop or block the affected stream if it requires new product authority, DEV, mutation, data/infra, Alphaus writes, raw-value persistence, invented journey subset semantics, AI authority, or selfDev/promotion. Continue independent local hardening work where safe.

## Closure rule

No `COMPLETE` unless every local acceptance row is proven and exact CI is green. If CI is externally blocked before jobs start, use `BLOCKED_EXTERNAL_CI` after local proof only.