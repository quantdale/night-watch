# Workstream F — Hardening, Compatibility, Full Regression & CI Truth

Parent task: `phase-12-semantic-yield-high-confidence-triage`
Authority: LOCAL/SOURCE-ONLY only.

## F1. Hardening objective

Make the new replay/triage/coverage cores demonstrably incapable of widening authority.

## F2. Pure-core restrictions

Replay-plan, semantic-confidence, semantic-cluster, coverage-inventory, and backtest-metric core modules must not import or directly invoke:

- Playwright/browser/page;
- auth providers;
- network transports;
- API relays;
- filesystem persistence except through already approved narrow source/private-artifact boundaries where explicitly necessary;
- child_process;
- DB/infra;
- AI/model;
- selfDev/promotion;
- external publication.

The hardening checker should enforce the load-bearing boundaries, not merely comments.

## F3. Real runtime wiring boundary

If `tests/manual/phase7-real-campaign.ts` or an equivalent real adapter is changed, prove:

- no new destination/endpoint authority;
- no new mutation/unknown operations;
- no product call at import/test time;
- real replay callbacks are exposed only through existing campaign runtime flow;
- existing preflight/auth/containment gates remain before any future executor call;
- no Phase 12 test invokes the real launcher.

## F4. Approved sets

Mechanically snapshot/compare before and after:

- approved read-only target IDs;
- DEV-reachable target IDs;
- safe-action catalog authority;
- Phase 5 operation IDs;
- production deny rules where appropriate;
- owner-scope policy;
- canonical selfdev catalog digest/count.

Any unintended authority change is a blocker.

## F5. Dedicated CI matrix

Add workflow step:

`Phase 12 semantic yield and high-confidence triage matrix`

It should run only repository-owned synthetic/source-fixture tests.

It MUST NOT:

- contact DEV;
- fetch live Alphaus repositories;
- access credentials;
- upload raw artifacts.

If useful, split into two named local steps:

- Phase 12 replay/triage matrix;
- Phase 12 coverage/backtest matrix.

But do not duplicate large suites unnecessarily.

## F6. Focused compatibility

Run current matrices for:

- Phase 9 semantic oracle depth;
- Phase 9A.1 real-source admission;
- Phase 9B harness;
- Phase 10 deeper contracts;
- Phase 10B harness;
- Phase 11 collection semantics;
- Phase 11A.1 receipt truth;
- Phase 11A.2 acceptance truth;
- Phase 11A.3 collection admission.

Historical Phase 11A.4 is verification/docs focused and must remain truthful.

## F7. Campaign compatibility

Run:

`npm run campaign:synthetic`

and add focused tests proving Phase 12 triage integration does not change campaign scheduling/budget feasibility simply to improve the backtest.

Real campaign is prohibited.

## F8. Owner/provenance compatibility

Run:

`npm run test:owner-provenance`

No new public/private artifact write authority.

## F9. Continuity/project/catalog

Run:

- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- canonical selfdev catalog-integrity command/test
- `git diff --check`

Strict errors 0.

Catalog count/digest unchanged unless an unrelated current source contradiction is discovered, in which case STOP rather than repair under Phase 12.

## F10. Canonical full regression

Run exactly:

`npx playwright test --project=nightwatch --workers=1`

Report passed/skipped/failed counts.

Do not label `npm run test:unit` as full regression.

Require 0 failed.

## F11. Isolated topology-correct full regression

Create a clean source-equivalent Nightwatch checkout under the workspace topology required by the repository's containment/storage-state tests, not an invalid arbitrary `/tmp` topology.

Install with:

`npm ci --ignore-scripts`

Run typecheck, hardening, and complete Playwright:

`npx playwright test --project=nightwatch --workers=1`

Require 0 failed and only documented environment-conditional skips.

If an intentionally wrong topology is tested as a canary, classify it as invalid topology, not product/test failure.

## F12. Source-current canary

After implementation and before terminalization:

- rediscover current remote ripple-api SHA;
- disposable exact snapshot;
- run Workstream D inventory/derivation;
- run safe Phase 12 source-bound backtest canaries if applicable;
- preserve canonical sibling byte/status state.

No product call.

## F13. Git checkpoints

Use validated direct-to-main commits only.

Implementation checkpoint must include source/tests/hardening/workflow and truthful IN_PROGRESS task state.

After push:

- fetch origin;
- verify HEAD == origin/main;
- require clean worktree;
- inspect exact Actions run.

Then clean post-push acceptance before docs closure.

## F14. GitHub Actions truth

Current known external condition: jobs are refused before execution because recent account payments failed or spending limit needs increase.

For every Phase 12 push:

- inspect exact run head SHA;
- distinguish job-started/test-failed from job-never-started billing block;
- if 0-step billing block persists, record BLOCKED_EXTERNAL_CI;
- never claim CI green;
- do not repeatedly rerun a billing-blocked job as if retries are testing source.

## F15. Docs closure

At local completion update:

- task PLAN/STATE/REPORT;
- `.agent/ACTIVE_TASK.md`;
- `docs/CURRENT_STATE.md`;
- `docs/ROADMAP.md`;
- `docs/ARCHITECTURE.md` if architecture changed;
- `docs/DECISIONS.md` with next actual D-number;
- `docs/SAFETY_MODEL.md` only for durable safety architecture changes;
- `docs/design/PHASE_12_SEMANTIC_YIELD_AND_TRIAGE.md` implementation evidence.

Do not rewrite historical decisions.

## F16. Terminal truth

If local/source work is complete and Actions remains billing-blocked, active task Status is BLOCKED with exact external blocker, while per-workstream local states may be VERIFIED_LOCAL_NOT_CI_VERIFIED.

Phase 11B stays NOT_AUTHORIZED.

## F17. Acceptance

This workstream succeeds locally only if the repository is clean, canonical + isolated complete regressions have 0 failed, historical matrices remain green, authority/catalog/privacy checks are clean, and external CI truth is recorded exactly.
