# REPORT — Phase 16A Campaign Yield & Portfolio Optimization

Status: COMPLETE (IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING)

## 1. Bootstrap / authorization / live Git

- Execution token: `PHASE_16A_CAMPAIGN_YIELD_PORTFOLIO_LOCAL_ONLY` (exactly as
  granted; local/source/synthetic only).
- Task activation: clean fetch --prune fast-forwarded local main
  `1553253ffb89907aa519b55ff6c0dd28849a90fe` -> `7ef8968f905cb16f1c3c7631be396eb9945a351c`
  (HEAD == origin/main at activation; the Phase 16A publication package).
- Implementation was produced by the context-free implementation session
  (pi session `01a028ae-0325-7d95-b228-f8e079f2c7ab`, 2026-08-22) and fully
  revalidated + closed by the follow-up continuity/closure session.

## 2. Portfolio universe and authority proof

- Portfolio members are built ONLY from already-approved targets of the
  existing Nightwatch registries; the builder rejects foreign/unapproved
  target ids and duplicate pressure inputs (tested in
  phase16aPortfolioModel).
- Fixture universe: 6 synthetic approved members (`ripple.*.read` journeys +
  `phase16a.synthetic-extra.*` API/exploration members). No Phase-6 member is
  selectable (`FROZEN_BY_OWNER`), Phase 11B/13B remain NOT_AUTHORIZED.
- Plan output asserts `ownerScope=FROZEN_BY_OWNER`,
  `runtimeAuthority=NONE`; unknown operation classes fail closed through
  decideOwnerScope semantics.

## 3. New/changed DTOs, versions, APIs

- New module seam `src/core/portfolio/index.ts` over:
  `types.ts` (versioned portfolio DTO + strict parser), `scoring.ts`,
  `allocation.ts`, `yield.ts`, `manifest.ts`, `replan.ts`, `simulator.ts`,
  `report.ts`.
- Versions: `nightwatch.portfolio-priority.v1` (score),
  `nightwatch.portfolio-allocation.v1`, `nightwatch.campaign-plan-manifest.v1`,
  `nightwatch.dev-campaign-handoff.v1`.
- Identity/digests reuse the canonical campaign/identity stable JSON helpers;
  currentness reuses LocalReadinessCurrentness; depth reuses DepthClass.
- Operator CLI `bin/portfolio.mjs` subcommands: `inspect`, `explain-score`,
  `plan`, `compare-plan`, `shadow-simulate`, `dev-handoff` (+ `--demo`
  fixture mode). Sanitized JSON on stdout only; no persistence.

## 4. Scoring formula/components and invariants

- Bounded explainable score over categorical/mechanical factors only (source
  relevance, semantic contract depth, coverage gap, prior yield metadata,
  duplicate suppression, replayability, starvation age, execution cost,
  freshness); per-member component contributions exposed; deterministic score
  version + digest. No model/AI score.
- Observed ranking on the fixture universe: scores 29/28/23/20/15 with the
  starvation floor visibly applied (`STARVATION_FLOOR_APPLIED`) where due.
- Invariants tested: stale/unavailable source never improves rank or
  certifies readiness; duplicate pressure never raises novelty; safety/
  owner-policy blockers dominate ranking.

## 5. Budget allocator behavior and proofs

- Deterministic bounded allocation for identical inputs; explicit total
  budget, per-member ceiling/floor, starvation prevention, duplicate
  suppression, retry ceiling (`maxRetries<=1` observed), reserved exploration
  budget (one EXPLORATION-class member selected with replay
  `REPLAY_ON_ANOMALY`).
- Fail-closed on stale/unavailable required evidence (tested).
- Fixture result: totalBudget 24 units fully allocated across 5 selected
  members (6+6+6+3+3); unallocated=0; 1 member left unselected with reason
  `BUDGET_EXHAUSTED_OR_RESERVE_CONSTRAINT`.

## 6. Yield-accounting inputs and privacy proof

- Sanitized local-only accounting over synthetic/historical evidence:
  admitted/reproduced/minimized counts, distinct semantic cluster count,
  dossier-ready count, duplicate rate, invalid/transient rate,
  cost-per-useful-candidate.
- Privacy: raw customer/product values never enter portfolio records,
  manifests, digests, reports, or error messages (hardening-guarded; focused
  tests assert sanitized shapes; owner-provenance suite green).

## 7. Campaign-plan manifest and replan semantics

- Manifest: versioned, byte-deterministic, embeds order, budgets, reasons,
  expected oracle/semantic coverage, replay/minimization policy, checkpoint
  policy (checkpoint after every work item; resume requires fingerprint
  match), and owner-scope requirements. It is executable ONLY by a separately
  authorized runtime campaign.
- Digests (fixture run): planId `plan:sha256:cd118eaa856a031a6445f588`,
  manifestDigest `plan:sha256:1473366e34732d5bc5a26508`,
  portfolioDigest `pf:sha256:70d9d060f32f985cabb85121`,
  allocationDigest `palloc:sha256:d5d9c8bec83e0d24195d0974`.
- Change-aware replan deterministically classifies a prior plan reusable /
  reprioritize / invalid from existing source-movement/currentness APIs;
  SHA-only movement with unchanged normalized evidence creates no false
  novelty; changed contract/derivation/authority invalidates or replans.

## 8. Shadow simulation/backtest metrics

- Pure local synthetic backtest comparing baseline vs portfolio allocation on
  useful-yield proxies; output digest stable at `ac911849c847a341` (trailing
  line, sha256 prefix).
- Explicitly synthetic-only: no real-world improvement claim is made or
  implied anywhere in code, tests, or docs.

## 9. Fixture/corpus counts and deterministic repeats

- `corpus/phase16a/portfolioFixtures.ts`: deterministic builders covering the
  6-member fixture universe used by all suites and the CLI demo mode.
- Determinism: `node bin/portfolio.mjs plan` x3 -> byte-identical outputs
  (trailing-line sha256 prefix `bf4bde06eb2414fd`);
  `dev-handoff` x2 byte-identical (`ff5daabed1052068`);
  `compare-plan` reports zero drift between repeated plans.

## 10. Focused/compatibility test commands and raw counts

Revalidation session (authoritative; Node v22.22.1):

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS (offline structural invariants hold).
- Six phase16a suites (`playwright test tests/unit/phase16a*.test.ts
  --project=nightwatch`): 59 passed / 0 failed.
- Affected Phase 12–15 compatibility (candidateLifecycle, phase12YieldBacktest,
  phase13Shadow, phase15pCompatConvergence, phase15pPrivacyAuthority,
  phase15CheckpointCompat, phase15CampaignIntegratedProof,
  phase15CampaignTriageIntegration; workers=1): 115 passed / 0 failed.
- `npm run campaign:synthetic`: 27 passed / 0 failed.
- `npm run test:owner-provenance`: 91 passed / 0 failed.
- `git diff --check`: PASS.

Prior implementation session rows (typecheck/hardening/suites/determinism)
were consistent with these and are superseded by the revalidation ledger in
STATE.md.

## 11. Quality-floor counts

No quality-floor regression surface was touched by this task (portfolio layer
is additive): privacyLeakCount 0; falseCurrentCount 0;
falseAdmissionCount 0; falseMinimalityCertificationCount 0;
ownerPolicyEscapeCount 0 — as asserted by hardening:check, campaign:synthetic,
and the compatibility packs above. Exhaustive whole-system floor measurement
remains owned by the next hardening campaign.

## 12. Operator tooling surfaces

- `bin/portfolio.mjs inspect | explain-score | plan | compare-plan |
  shadow-simulate | dev-handoff`, all read-only local surfaces emitting
  sanitized JSON; documented usage strings built in.

## 13. Separately gated DEV handoff contents (not executed)

- dev-handoff v1 manifest: `executable:false`,
  `environmentRestriction:"DEV_ONLY_NEVER_PRODUCTION"`,
  requiredAuthorizationToken
  `PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED`,
  runtimeObligations: OWNER_POLICY_GATE_REQUIRED,
  CONTAINMENT_STACK_REQUIRED, CHECKPOINT_RESUME_REQUIRED,
  NO_PRODUCTION_CONTACT, FINDINGS_OWNER_LOCAL_ONLY.
- Nothing was executed against DEV/NEXT/production by this task.

## 14. Source/checkpoint SHAs and exact Actions truth

- Starting SHA: `1553253ffb89907aa519b55ff6c0dd28849a90fe`.
- Publication base: `7ef8968f905cb16f1c3c7631be396eb9945a351c` (== origin/main
  at activation).
- Earned implementation checkpoint:
  `1737e30afb64a1aed722f61182d87a4f2f6e3bb4` ("Phase 16A: campaign yield &
  portfolio implementation (W1-W8)", 17 files, +5134).
- Closure documentation checkpoint: this record set (documentation-only
  descendant; live HEAD always discovered from Git).
- GitHub Actions truth for live HEAD: discovered from Git/GitHub once per
  relevant push; known standing external billing/spending-limit block before
  job execution is recorded when observed and never retried in a loop. Local
  green runs are never upgraded to CI-verified claims.

## 15. Deferred exhaustive hardening/full regression

- Complete canonical Playwright, topology-correct isolated complete Playwright,
  exhaustive Phase 1–15 compatibility, repository-wide adversarial fuzz, and
  complete historical migration matrix remain deferred to the next dedicated
  owner-authorized hardening campaign (per SPEC Testing cadence).
- Contained DEV acceptance of the portfolio layer requires separate owner
  authorization and is not granted here.

## 16. Terminal tokens and next action

```text
PHASE_16A_STATUS: COMPLETE (IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING)
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Never upgrade synthetic/backtest improvement into real bug-yield proof without
a separately authorized real campaign.
