# Workstream F — Hardening, Regression, Source Canary & Durable Closure

Parent task: `phase-13-real-campaign-semantic-runtime-integration`
Authority: local/source only. No DEV.

## F1. Goal

Make Phase 13 integration mechanically difficult to misuse and prove that the broader integration does not regress historical Nightwatch behavior.

## F2. Hardening — pure cores

Enforce that deterministic/core modules for:

- replay plans;
- semantic source-bundle validation;
- semantic triage evidence/confidence;
- semantic clustering;
- dossier readiness;
- shadow backtest

have no imports/capabilities for browser, network, filesystem, child process, DB, infrastructure, AI/model execution, selfDev, promotion, or publication.

A source-discovery producer may use read-only Git/GitHub/fs outside the pure-core boundary; keep that separation explicit.

## F3. Hardening — real runtime entrypoint containment

The new real replay and semantic observer execution wiring must be reachable only from explicit manual real-campaign code/launcher paths.

Ordinary `npm test`, focused matrices, synthetic campaign, and shadow campaign must not contact DEV.

Add structural/call-graph guards where repository conventions support them.

## F4. Hardening — authority freeze

Prove Phase 13 changes do not add:

- host;
- route;
- HTTP method;
- API operation;
- journey;
- exploration action;
- mutation class;
- source target

outside the pre-existing approved runtime sets.

Snapshot authority sets before/after in tests/hardening.

## F5. Hardening — semantic currentness

No caller field may directly turn STALE/UNKNOWN/UNAVAILABLE into CURRENT.

Currentness used by runtime semantic authority must come from validated frozen source bundle/resolver facts.

## F6. Hardening — replay authority

No reduced replay can:

- add an occurrence;
- reorder occurrences;
- invoke planner to refill removed actions;
- cross candidate kind;
- change route/operation authority;
- change source/contract identity;
- execute if version/currentness guard fails.

## F7. Hardening — confidence/AI

When semantic evidence exists:

`AI-ready confidence <= deterministic semantic confidence`

under the categorical ordering HIGH > MEDIUM > LOW > UNRESOLVED only where such ordering is used. Safer implementation may simply expose semantic confidence directly.

No AI result feeds back into oracle, safety, cluster, replay, or dossier READY.

## F8. Phase 13 CI step

Add:

`Phase 13 real campaign semantic runtime integration matrix`

It runs local/synthetic tests only.

It must not require auth, browser product contact, external source network, or runtime secrets.

Use fixtures/fakes for external-currentness matrix; current-source canary remains owner/local acceptance evidence, not CI network dependency.

## F9. Focused compatibility

Run:

- Phase 13 focused matrix;
- Phase 12 focused matrices;
- Phase 11 collection/admission/receipt closeouts;
- Phase 10/10B harness matrices;
- Phase 9/9A.1/9B matrices;
- campaign:synthetic;
- owner-provenance.

Report raw pass/skip/fail counts where available.

## F10. Complete canonical regression

Run exactly the repository's complete canonical Playwright command:

`npx playwright test --project=nightwatch --workers=1`

Require 0 failed and no new skip used to hide Phase 13 failures.

Do not label `npm run test:unit` as the full regression.

## F11. Topology-correct isolated regression

Use a fresh isolated clone/checkpoint with the workspace/sibling topology required by Nightwatch storage-state/source tests.

Install dependencies deterministically and run the complete Playwright suite.

Require 0 failed.

If `/tmp` topology is invalid, do not count its failures as product regressions and do not substitute it for the required topology-correct proof.

## F12. Current-source canary

Fresh-resolve the current remote source SHA rather than reusing the Phase 12 historical `e026c855...` as current by assumption.

Use a disposable snapshot and derive the Phase 13 semantic campaign bundle.

Report:

- discovered remote SHA;
- previous SHA relation;
- relevant contract drift;
- derivation counts/failures;
- resolver status;
- supported mapping count;
- canonical sibling before/after HEAD/status;
- task-caused writes 0.

## F13. Continuity/project/catalog

Run:

- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- `npm run selfdev:catalog-integrity`
- `git diff --check`

Require strict continuity errors 0 and catalog digest/count unchanged.

## F14. Validated checkpoint

Before implementation checkpoint:

- focused tests green;
- shadow campaign green;
- canonical full green;
- isolated full green;
- source canary resolved;
- privacy/safety zero;
- diff reviewed.

Commit/push fast-forward to `main`, then verify `HEAD == origin/main`.

## F15. Actions truth

Inspect exact Actions run on implementation SHA.

If the known billing/spending-limit block remains:

- record run ID;
- record exact head SHA;
- verify job did not start/steps absent;
- do not call it a code failure;
- do not call it CI success;
- continue clean post-push acceptance and docs closure.

If Actions runs, require all expected steps green.

## F16. Clean post-push acceptance

On the pushed source-bearing checkpoint rerun at minimum:

- typecheck;
- hardening;
- Phase 13 focused/shadow;
- Phase 12 focused;
- campaign synthetic;
- critical historical semantic matrices;
- source bundle canary or exact-currentness check;
- canonical/isolated full if task continuity requires post-push repetition.

Record exact results.

## F17. Decision/docs closure

Append the next actual decision number after D-62; likely D-63, but discover ledger first.

Update:

- `docs/DECISIONS.md`
- `docs/CURRENT_STATE.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md` if warranted
- `docs/design/PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION.md`
- task PLAN/STATE/REPORT
- `.agent/ACTIVE_TASK.md`

Historical Phase 12 state remains truthful.

## F18. Phase 13B disposition

If exact CI is still externally blocked:

- `PHASE_13B_DEV_READINESS: NOT_READY_EXTERNAL_CI`
- `PHASE_13B_STATUS: NOT_AUTHORIZED`

If exact CI is restored and green and every local criterion passes:

- `PHASE_13B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`
- still do NOT run DEV.

## F19. Safety vector

Final report requires zeros for:

- DEV product contacts;
- NEXT contacts;
- production attempts;
- mutations;
- unknown destination/approval actions;
- DB queries;
- infra queries;
- screenshots/auth traces/raw product body persistence;
- AI/model calls;
- Alphaus writes;
- publication;
- selfDev/promotion/catalog writes/B adoption.

Normal Nightwatch development Git commits are expected.

## F20. Acceptance

Workstream F is VERIFIED only after every authorized local/source workstream has completed, both complete regressions are 0 failed, source freshness is freshly established, continuity/catalog are clean, and CI truth is recorded without overclaim.
