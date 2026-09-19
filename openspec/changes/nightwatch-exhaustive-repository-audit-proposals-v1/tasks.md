## 1. Freeze the audit universe and evidence model

- [x] 1.1 Record the starting Git SHA, deterministic tracked-file inventory, subsystem classification rules, and exact count reconciliation for all tracked paths.
- [ ] 1.2 Define the coverage-row schema for path classes, trust boundaries, inspection methods, source/test counts, evidence references, candidate IDs, existing-change references, and final disposition.
- [ ] 1.3 Define the candidate lifecycle and evidence schema for stable ID, failure mode, reachability, consequence, mitigation, evidence, confidence, severity dimensions, ownership, and disposition.
- [ ] 1.4 Build an index of published specs, active/complete changes, continuity tasks, relevant decisions, and current tests for deduplication.
- [ ] 1.5 Add non-vacuity checks proving every tracked path is classified and no coverage class, evidence set, or candidate/proposal denominator can be silently empty.

## 2. Audit repository topology, dependencies, configuration, and tooling

- [ ] 2.1 Inspect package manifests, lockfile, TypeScript/Playwright configuration, environment configuration, dependency posture, and build/test script composition for correctness, unsafe defaults, drift, and missing validation.
- [ ] 2.2 Inspect all `bin/`, `scripts/`, generator, checker, gate, workspace/session, and release/checkpoint surfaces for argument handling, path confinement, race, cleanup, idempotency, false-pass, and failure-classification issues.
- [ ] 2.3 Inspect generated and governed artifacts for deterministic rendering, stale-source detection, schema lifecycle, and bidirectional validator coverage.
- [ ] 2.4 Record every candidate with decisive evidence or a terminal non-issue/deferred disposition and cross-reference existing planned work.

## 3. Audit safety, containment, environment, proxy, and authentication

- [ ] 3.1 Trace every environment/host/protocol/action authorization path and negative boundary from configuration through policy decision and executor side effect.
- [ ] 3.2 Inspect HTTP, CONNECT, WebSocket, DNS/address, redirect, proxy lifecycle, port lease, and exact-binding behavior for normalization gaps, TOCTOU, bypass, denial, and cleanup defects.
- [ ] 3.3 Inspect L6 process/network containment, relay budgets, namespace/control-channel lifecycle, parent-death handling, and capability freshness for escape or false-ready states.
- [ ] 3.4 Inspect credential/storage-state validation, auth readability, expiry, direct-runner startup ordering, trace policy, secret redaction, and evidence boundaries.
- [ ] 3.5 Run the narrowest existing deterministic safety tests needed to substantiate or disprove candidates and capture results in the ledger.

## 4. Audit browser, API, journey, evidence, persistence, and replay layers

- [ ] 4.1 Inspect browser context creation, CDP/route/WebSocket guards, workers, downloads, popups, observer ordering, stability, cancellation, timeout, and resource cleanup behavior.
- [ ] 4.2 Inspect API relay/direct/OOPS request construction, hydration, streaming, deadline, cancellation, schema validation, and partial-response classification.
- [ ] 4.3 Inspect evidence recording, redaction, atomicity, bounds, path/symlink confinement, fingerprints, dossier/admission separation, and privacy failure escalation.
- [ ] 4.4 Inspect replay, minimization, reproduction, retry/backoff, deterministic comparison, and partial/incomplete evidence behavior.
- [ ] 4.5 Map every candidate to focused current tests or record the exact missing validation.

## 5. Audit source intelligence and semantic contracts

- [ ] 5.1 Inspect source topology, sibling-source confinement, snapshot/currentness, bounded enumeration, truncation, provenance, and stale/unavailable behavior.
- [ ] 5.2 Inspect recipe/extractor/admission/resolver flows, evidence digest canonicalization, schema versioning, migration, unknown-kind refusal, and real-vs-synthetic authority.
- [ ] 5.3 Inspect projections, expectations, invariants, semantic matrix/hooks, receipt aggregation, privacy boundaries, and no-expectation/not-applicable/internal-error truth.
- [ ] 5.4 Inspect coverage inventory, source-contract movement, expectation lifecycle, generated registries, and mutation/non-vacuity tests for unsound pass conditions.
- [ ] 5.5 Substantiate or reject candidates with focused semantic/source tests without reading or mutating sibling repositories beyond existing repository-owned fixtures.

## 6. Audit campaign, autonomous runtime, reproduction, and findings

- [ ] 6.1 Inspect campaign registry/profile/scheduling, budgets, provider selection, retry/timeout, checkpoint/resume, scope fingerprints, and partial-result aggregation.
- [ ] 6.2 Inspect agent runtime tool authorization, argument parsing, output bounds, source/action accounting, continuation, failure classification, and anti-fabrication boundaries.
- [ ] 6.3 Inspect current-source investigation, reproduction providers, admission validation, novelty, Bug Atlas, triage, handoff, and local findings persistence.
- [ ] 6.4 Inspect concurrency, atomicity, crash recovery, cleanup, determinism, and adversarial/mutation coverage across campaign and findings state machines.
- [ ] 6.5 Record evidence-backed candidates and distinguish provider/environment blockers from product defects or zero-yield claims.

## 7. Audit Control Center and reviewer/operator surfaces

- [ ] 7.1 Inspect server routing, request parsing, static delivery, security headers, SSE lifecycle, review write authority, persistence adapters, schema/version negotiation, and error handling.
- [ ] 7.2 Inspect UI rendering, stale/unknown/fact/recommendation semantics, review workflows, click behavior, accessibility, keyboard/focus behavior, responsive layout, and browser compatibility.
- [ ] 7.3 Inspect large-corpus, endurance, memory, event-stream, pagination/filtering, and refresh/reconnect behavior for correctness and boundedness.
- [ ] 7.4 Trace every displayed claim back to its authority and verify that unavailable or stale data cannot appear as a live fact or decision.
- [ ] 7.5 Record missing unit, contract, browser, accessibility, mutation, or end-to-end validation as candidates with consequence and reachability.

## 8. Audit continuity, workspace isolation, validation, tests, and documentation truth

- [ ] 8.1 Inspect C-00 session start/claim/reconcile/integrate/release/remove state transitions, ownership liveness, prospective admission, rollback, and cross-worktree invariants.
- [ ] 8.2 Inspect active-task/continuity/project/handoff/OpenSpec validators for parser ambiguity, duplicate authority, false pass/fail, vacuity, stale-state, and unbounded-input behavior.
- [ ] 8.3 Inspect hardening registry/rule parity, gate definitions, skip classification, timeout handling, zero-step external evidence, and clean-check semantics.
- [ ] 8.4 Analyze test topology, skipped/conditional tests, fixture fidelity, assertion strength, mutation/concurrency coverage, flake controls, and gaps between test names and actual authority.
- [ ] 8.5 Reconcile current implementation and tests against architecture, safety, decisions, roadmap, README, and task/OpenSpec claims; record stale durable truth as a candidate rather than silently correcting it.

## 9. Adjudicate and partition findings

- [ ] 9.1 Reproduce or decisively substantiate every OBSERVED candidate using current implementation evidence and the narrowest authorized deterministic validation.
- [ ] 9.2 Assign lifecycle disposition, severity dimensions, confidence, blast radius, mitigation analysis, and owner boundary to every candidate.
- [ ] 9.3 Deduplicate every MATERIAL finding against published specs, current changes, task state, decisions, and tests using exact failure-mode coverage.
- [ ] 9.4 Partition non-duplicate MATERIAL findings by root cause and atomic validation boundary; record cross-change prerequisites and rollout order.
- [ ] 9.5 Produce a severity-ranked finding index and bidirectional finding-to-change mapping.

## 10. Generate implementation-ready remediation changes

- [ ] 10.1 Create each remediation change through `openspec new change` and follow its resolved artifact dependency order.
- [ ] 10.2 Write proposals that identify evidence IDs, why-now, precise scope, capabilities, impact, and existing-work relationship.
- [ ] 10.3 Write designs with decisions, alternatives, safety/privacy consequences, compatibility, migration/rollback, and cross-change dependencies.
- [ ] 10.4 Write normative delta specs with positive, adversarial negative, regression, concurrency/cleanup/privacy/boundedness scenarios where relevant.
- [ ] 10.5 Write ordered implementation and validation tasks small enough for one session and explicit enough to avoid audit rediscovery.
- [ ] 10.6 Run `openspec validate <change> --strict` and confirm apply-ready status for every created change.

## 11. Prove completeness and close the planning campaign

- [ ] 11.1 Reconcile the final tracked-file inventory with the coverage matrix and prove every row has evidence and a terminal disposition.
- [ ] 11.2 Prove every MATERIAL finding has exactly one owning remediation change or an explicit external blocker, and every remediation change maps to substantiated findings.
- [ ] 11.3 Detect and reconcile any `origin/main` drift since the starting snapshot before making an exhaustive coverage claim.
- [ ] 11.4 Inspect the complete diff and prove only continuity and OpenSpec planning artifacts changed; scan for secrets, customer data, raw evidence, and machine-specific paths.
- [ ] 11.5 Run continuity, workspace, project, handoff, strict OpenSpec, and planning-artifact validation required by repository policy.
- [ ] 11.6 Finalize the report with coverage metrics, severity-ranked findings, proposal map, validation evidence, residual uncertainties, and implementation explicitly deferred.
- [ ] 11.7 Commit and integrate the validated planning checkpoint through the C-00 fast-forward workflow, verify local `HEAD == origin/main`, then release and remove the owned session.
