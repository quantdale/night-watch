# PLAN — Nightwatch Phase 12A — Semantic Yield & High-Confidence Triage Productivity Pack

Task ID: phase-12-semantic-yield-high-confidence-triage
Phase: 12A-SEMANTIC-YIELD-TRIAGE-LOCAL
Authorization class: PHASE_12_SEMANTIC_TRIAGE_AND_COVERAGE_LOCAL_ONLY
Continuity protocol: nightwatch.agent-continuity.v2

## Purpose

Use the post-Phase-11 window productively by implementing both ROADMAP `NEXT_AFTER` investments that can be completed without DEV: high-confidence semantic triage and bounded real-source semantic coverage expansion. The task is intentionally broad but cohesive: every workstream must measurably improve deterministic bug detection or bug actionability.

## Starting State

- Starting Nightwatch source: cc0ea71a64d06b84b73d396f1c01311513aefe2c.
- Phase 11A.4 locally verified fresh source + canonical/isolated full regression.
- GitHub Actions remains externally billing/spending-limit blocked before job execution.
- Phase 11B remains NOT_AUTHORIZED / NOT_READY_EXTERNAL_CI.
- The deterministic minimizer exists and is bounded/safe.
- The real Phase 7 adapter still uses `invalidReducedReplay()` for journey/exploration/API anomaly candidates.
- Phase 11 collection expectations and receipt/acceptance truth are locally validated.
- Roadmap NEXT_AFTER: HIGH_CONFIDENCE_SEMANTIC_TRIAGE and REAL_SEMANTIC_COVERAGE_EXPANSION.

## Scope

Execute Workstreams A–F from the task SPEC and workstream documents. This includes source/tests/hardening/CI matrix/docs/continuity changes inside Nightwatch and read-only current-source analysis using disposable Alphaus snapshots.

## Non-Goals

- DEV/NEXT/production execution.
- Phase 11B.
- Real campaign execution.
- Product mutation or new endpoint authority.
- Alphaus writes.
- DB/infra/Phase 6.
- AI/model authority.
- selfDev/promotion/catalog mutation.
- publication/team workflows.

## Safety Constraints

- Replay is reduction over already approved actions, never exploration.
- The pure minimizer and triage core remain network/browser independent.
- Source expansion is mechanically derived and restricted to existing approved read-only targets.
- Partial coverage/stale source/nonzero safety/privacy never become positive evidence.
- No raw runtime values cross into triage artifacts.
- Historical Phase 9/10/11 evidence semantics remain interpretable.
- Canonical Alphaus siblings are read-only and unchanged.

## Architecture / Approach

### A. Replay/minimization

Create a strict data-only replay-plan layer and safe adapters around the existing minimizer. Reproduce the real runner's always-invalid stub before replacing it. Keep executor exposure behind local validation and existing future runtime gates.

### B. Confidence/dossier

Make high-confidence triage explicitly semantic/source/replay aware. Add versioned DTOs only where immutable schema meaning would otherwise change. Keep protocol-only compatibility.

### C. Clustering

Normalize semantic anomaly identity around source-known contract semantics, not row position or raw values. Preserve protocol-only clustering.

### D. Coverage expansion

Fresh-source inventory all approved read-only targets, current recipes, observer compatibility, collection/depth status, and blockers. Add semantic contracts only where current source mechanically proves them under existing authority.

### E. Backtest

Build one fixed permanent Phase 12 corpus and compare starting-baseline behavior against Phase 12 behavior with raw counts. The backtest is the productivity acceptance gate.

### F. Hardening/regression

Add dedicated CI matrix, run focused/historical/full/isolated suites, verify catalog/continuity/privacy, and truthfully record the external CI state.

## Milestones

- M0 — `IN_PROGRESS`: bootstrap from clean current Git, read task package/current source, reproduce `invalidReducedReplay()` baseline and establish fixed backtest corpus.
- M1 — `NOT_STARTED`: implement replay-plan schema, validation, exact/subsequence/precondition rules, synthetic executor contract.
- M2 — `NOT_STARTED`: wire local/synthetic journey/exploration/API replay adapters; integrate with minimizer; preserve real runtime authority boundaries.
- M3 — `NOT_STARTED`: implement semantic-aware confidence and versioned dossier/readiness evidence.
- M4 — `NOT_STARTED`: implement semantic clustering/contract-identity hardening and dedup regressions.
- M5 — `NOT_STARTED`: fresh current-source coverage inventory; assess approved target/depth expansion; implement only mechanically proven additions.
- M6 — `NOT_STARTED`: complete Phase 12 fixed backtest; measure baseline vs new yield; privacy/determinism checks.
- M7 — `NOT_STARTED`: hardening guards + Phase 12 CI matrix + focused compatibility.
- M8 — `NOT_STARTED`: canonical complete Playwright + topology-correct isolated complete Playwright + continuity/catalog/project checks.
- M9 — `NOT_STARTED`: validated implementation checkpoint push, Actions re-check, clean post-push current-source/backtest acceptance.
- M10 — `NOT_STARTED`: durable decision/design/current-state/roadmap/task closure; final push and exact Actions truth.

## Validation Strategy

Validation is layered:

1. **Baseline proof** — current real candidate replay is always invalid.
2. **Pure contract tests** — replay-plan strictness, confidence truth, cluster identity, DTO validation.
3. **Subsystem synthetic tests** — journey/exploration/API replay reducers with executor doubles.
4. **End-to-end synthetic triage tests** — semantic anomaly -> replay -> minimization -> confidence -> cluster -> dossier.
5. **Current-source tests** — fresh disposable ripple-api snapshot -> inventory/derivation/coverage decisions.
6. **Backtest** — fixed corpus baseline vs Phase 12 raw-count comparison.
7. **Compatibility** — Phase 9/10/11 and campaign synthetic matrices.
8. **Repository regression** — canonical + topology-correct isolated complete Playwright.
9. **Remote CI truth** — exact head run if Actions can execute; otherwise external blocker only.

## Decision Log

- 2026-08-19 — Owner requested the next spec-driven task do substantially more work per execution session. Selected a cohesive Phase 12A productivity program rather than unrelated tasks.
- 2026-08-19 — Use both ROADMAP NEXT_AFTER investments together because they share the same sanitized semantic evidence pipeline and both are LOCAL/SOURCE-ONLY feasible.
- 2026-08-19 — CI billing block does not authorize DEV and does not prevent local/source implementation; final CI verification remains truthful and separate.

## Discoveries

- `tests/manual/phase7-real-campaign.ts` currently defines `invalidReducedReplay()` and supplies it to journey, exploration, and API candidates, so current real reduced replay cannot succeed.
- `src/core/triage/minimizer.ts` already contains bounded ddmin + one-deletion proof logic and exact fingerprint matching; replacing the minimizer is not the goal.
- Current `rankConfidence()` is generic and does not natively require semantic receipt/source-currentness facts; Phase 12 must integrate those facts without breaking protocol-only compatibility.
- The roadmap explicitly states the invalid reduced replay gap remains current and names semantic triage + real semantic coverage as NEXT_AFTER Phase 11.

## Deferred Work

- Any DEV validation of Phase 12 replay/triage wiring.
- Phase 11B contained DEV semantic acceptance.
- Browser/API semantic differential expansion.
- Semantic campaign yield scheduling/budget intelligence beyond deterministic backtest.
- Deeper relational semantics not already mechanically supported.
- Multi-product expansion.
- Phase 6/data/infra work.
- AI/model decision authority.

## Completion Criteria

Phase 12A is locally source-complete only when:

1. every Workstream A–F acceptance gate passes or has an explicit independent structural blocker;
2. the real-candidate invalid-replay baseline is permanently reproduced;
3. replay/minimization improves fixed seeded cases without authority expansion;
4. semantic confidence/dossier logic cannot false-pass partial/stale/unsafe cases;
5. cluster identity is stable/privacy-safe;
6. current-source coverage inventory is fresh and deterministic;
7. any coverage addition is mechanically source-proven and does not add target authority;
8. backtest shows `phase12Minimized > baselineMinimized` on the replay-gap corpus;
9. benign false positives, privacy leaks, partial false passes, stale-source false passes, determinism mismatches are all zero;
10. canonical and topology-correct isolated complete Playwright regressions have zero failures;
11. agent/project/catalog/whitespace checks pass;
12. implementation + closure checkpoints are pushed fast-forward to main;
13. Actions state is recorded truthfully; if jobs still cannot start, terminal state is BLOCKED_EXTERNAL_CI rather than CI success;
14. Phase 11B remains NOT_AUTHORIZED.
