# PLAN — Nightwatch Phase 13H — Integrated Hardening & Runtime Completion

Task ID: `phase-13h-integrated-hardening-runtime-completion`
Phase: `13H-INTEGRATED-HARDENING-RUNTIME-COMPLETION`
Authority at publication: NOT_GRANTED.
Owner executor prompt grants: `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`.

## Purpose

Complete the integrated hardening and runtime completion for Phase 13H on top of the unverified overnight C1/C2/C3 input by reproducing known gaps, repairing runtime integration, and hardening the whole replay / semantic / protocol / drift / privacy surface to deterministic, fail-closed local-synthetic truth.

### Execution rule

Treat the overnight C1/C2/C3 implementation as unverified input. Reproduce the known gaps first, repair runtime integration where needed, then harden the whole surface. Do not accept predecessor status strings as evidence.

## Starting State

- Authority: NOT_GRANTED at publication; gated by `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`.
- Overnight C1/C2/C3 implementation exists but is treated as unverified input; predecessor status strings are not evidence.
- Overnight SHAs/history preserved for audit; clean `main` to be fetched/fast-forwarded at bootstrap.
- Phase 13H not yet IN_PROGRESS; active task not yet transitioned.
- Known gaps remain to be reproduced via focused reproductions F1–F6 (M0) before fixes.

## Scope

In scope (local synthetic only, no DEV/production/infra/data mutation):

- Bootstrap and evidence freeze (M0).
- Replay correctness and executor separation, including false-certification path (M1).
- Semantic bundle/currentness hardening and tamper/drift resistance (M2).
- Semantic campaign runtime completion: semantic candidates, cluster identity, triage evidence, confidence ranking, dossier v2 and readiness, protocol dossier-v1 compatibility, checkpoint/ledger versioning (M3).
- Semantic truth reconciliation for stale-source / receipt truth table and non-overclaim (M4).
- Shadow campaign and adversarial matrix via `corpus/phase13/**` with >=3 deterministic repeats (M5).
- Hardening and compatibility across Phase 13 matrix, Phase 12, and relevant Phase 9–11, plus `hardening:check` (M6).
- Fresh-source canary with disposable exact snapshot and re-derive/resolve/bundle verification (M7).
- Full regressions: canonical and topology-correct isolated clean clone (M8).
- Continuity and project integrity fixes (M9).
- Validated implementation checkpoint and final durable closure (M10–M11).

## Non-Goals

- No new product authority beyond `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`.
- No DEV, production, or real-environment campaigns or mutations.
- No infrastructure / data layer operations (GCP/GKE/Kubernetes/AWS/DynamoDB/BigQuery/Spanner/production SQL/datastore).
- No Alphaus repository writes and no annotation or modification of sibling sources.
- No raw customer value persistence across projection boundaries.
- No invented journey subset semantics, AI authority, or selfDev/promotion.
- Phase 13B remains NOT_AUTHORIZED and is not in scope.

### Stop conditions

Stop or block the affected stream if it requires new product authority, DEV, mutation, data/infra, Alphaus writes, raw-value persistence, invented journey subset semantics, AI authority, or selfDev/promotion. Continue independent local hardening work where safe.

## Safety Constraints

- Preserve existing fail-closed, read-only safety model; no credentials, auth state, bearer tokens, cookies, customer data, or other secrets may enter source, artifacts, or `.agent` files; tests use synthetic fake values only.
- Owner scope freeze enforced via `src/core/policy/ownerScope.ts` (`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`); unknown operation classes fail closed with `OWNER_POLICY_BLOCKED`.
- Semantic expectations remain additive, deterministic, and provenance-bound; raw customer values never cross projection boundary and never persist in findings/fingerprints/dossiers/error messages.
- No sibling-source access except read-only path-confined `src/core/source/siblingSource.ts` where applicable.
- Real findings, if any, belong in owner-only local store (`$HOME/.nightwatch/findings/`), never in shared connectors or remote repos.
- See also Stop conditions under Non-Goals: block any stream requiring prohibited authority or mutation.

## Architecture / Approach

Treat the overnight C1/C2/C3 implementation as unverified input. Reproduce the known gaps first, repair runtime integration where needed, then harden the whole surface. Do not accept predecessor status strings as evidence. Sequence is: bootstrap and evidence freeze → replay/executor and bundle/currentness hardening → semantic runtime completion and truth reconciliation → shadow/adversarial matrix and hardening/compatibility → fresh-source canary → full regressions → continuity/project integrity → validated checkpoint and durable closure. Verification is local-synthetic deterministic replay with privacy-contract enforcement throughout.

### Execution rule

Treat the overnight C1/C2/C3 implementation as unverified input. Reproduce the known gaps first, repair runtime integration where needed, then harden the whole surface. Do not accept predecessor status strings as evidence.

### Parallel work

If safe independent sub-agents are available, use read-only review paths before edits only:
1. replay/executor reviewer;
2. semantic bundle/currentness reviewer;
3. orchestrator/cluster/dossier reviewer;
4. hardening/shadow/continuity reviewer.

Do not parallel-edit overlapping files.

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

## Validation Strategy

Validation is strictly local-synthetic and deterministic, layered from focused reproductions to full regressions and CI truth. Order is enforced to fail fast on replay/semantic faults before broad matrices.

### Validation order

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

Additional gates: `hardening:check`, `agent:check`/`agent:audit` (0 strict errors), `project:check` with catalog/diff integrity, Playwright complete with workers=1 and 0 failed in both canonical and isolated clones, and exact GitHub Actions run/job-start inspection for each push. Semantic evaluations must yield safe receipts with no silent PASS on NO_EXPECTATION/SOURCE_STALE/SOURCE_UNAVAILABLE/NOT_APPLICABLE/INTERNAL_ERROR.

## Decision Log

No decisions recorded yet. Decisions will be appended here during execution with date, context, and outcome (e.g., replay identity contract, bundle/currentness semantics, dossier v2 schema).

## Discoveries

None yet. Discoveries during reproduction, hardening, and shadow campaigns will be recorded here (e.g., false-certification vectors, cross-field coherence gaps, truth-table reconciliations).

## Deferred Work

None yet. Items deferred beyond Phase 13H scope or requiring separate owner authorization will be listed here (e.g., Phase 13B, contained DEV acceptance).

## Completion Criteria

No `COMPLETE` unless every local acceptance row is proven and exact CI is green. If CI is externally blocked before jobs start, use `BLOCKED_EXTERNAL_CI` after local proof only.

All of the following are required for COMPLETE:

- M0–M11 milestones closed with evidence; no unresolved closure placeholders.
- Focused reproductions F1–F6 and targeted replay/bundle/semantic tests passing with permanent coverage added.
- Shadow campaign and adversarial matrix complete: `corpus/phase13/**` executed, >=3 deterministic repeats, all quality floors zero.
- `hardening:check` extended and passing; complete Phase 13 acceptance matrix plus Phase 13H additions passing; Phase 12 and relevant Phase 9–11 compatibility passing; campaign synthetic + owner provenance passing.
- Fresh-source canary passing with re-derive/resolve/bundle, stale wrong-SHA fail-closed, and 0 canonical sibling writes.
- Canonical complete Playwright (workers=1) 0 failed and isolated clean-clone full 0 failed; no new skips hiding failures.
- `agent:check`/`agent:audit` 0 strict errors and `project:check` + catalog integrity + diff check green.
- Source-bearing validated implementation checkpoint pushed fast-forward with exact Actions run and job-start truth inspected; clean post-push acceptance; final durable docs push with exact final Actions truth inspected.
- Phase 13B remains NOT_AUTHORIZED.

### Closure rule

No `COMPLETE` unless every local acceptance row is proven and exact CI is green. If CI is externally blocked before jobs start, use `BLOCKED_EXTERNAL_CI` after local proof only.
