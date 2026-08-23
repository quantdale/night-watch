# RUNTIME BINDING HANDOFF — Phase 16C

Status: EXECUTED_LOCAL_GREEN_NOT_DEV_EXECUTED

Durable handoff to the successor hardening (Phase 16CH) and DEV-acceptance
(Phase 16D, separately authorized) tasks. All values below are actual
Phase-16C execution evidence. DEV WAS NOT EXECUTED.

## Identity

- Starting SHA: `18d030d2e9003b778d28ac8a94350f66c7c572ac`
  (== origin/main at activation; publication package fast-forwarded from
  `8e99ce72cbabf451df26d7260811630b3d50ba76`).
- Validated implementation checkpoint:
  `8e8684dcf93bb01b3fe52e56355b2aa59f13567e` (single Phase-16C source
  checkpoint; pushed fast-forward; HEAD == origin/main verified post-push).
  Live HEAD remains Git-discovered authority.
- Authorization class: `PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY`
  (LOCAL/SOURCE/SYNTHETIC only).

## Changed dependency cone

New:
- `src/core/campaign/runtimeProfile.ts` (`nightwatch.campaign-runtime-profile.v1`)
- `src/core/portfolio/runtimeBinding.ts`
  (`REAL_UNIVERSE_VERSION=nightwatch.portfolio-real-universe.v1`,
  `PORTFOLIO_BUDGET_MAPPING_VERSION=nightwatch.portfolio-budget-mapping.v1`,
  binding schema `CAMPAIGN_PORTFOLIO_RUNTIME_BINDING_VERSION=
  nightwatch.campaign-portfolio-runtime-binding.v1`,
  combined document `nightwatch.portfolio-runtime-plan-document.v1`)
- `src/core/portfolio/realUniverse.ts`
- `corpus/phase16c/runtimeBindingFixtures.ts`
- `tests/unit/phase16cRealUniverse|AdmissionBinding|SeamRehearsal|Launcher.test.ts`

Modified:
- `src/core/campaign/types.ts` (schema-OPTIONAL `portfolioBinding`),
- `src/core/campaign/identity.ts` (strict shape validation; conditional
  campaignId/manifestFingerprint inclusion; binding-vs-workItems lineage),
- `src/core/campaign/selection.ts` (profile-derived linkage tables;
  binding-driven exact membership; input-boundary monotone-restriction proof),
- `src/core/portfolio/index.ts`, `bin/portfolio.mjs` (`runtime-plan`),
- `bin/phase7-real.mjs` (opt-in portfolio flags), 
- `tests/manual/phase7-real-campaign.ts` (prepare/resume seam).

## Real approved universe

- API: `buildCurrentRealApprovedUniverse()` (assembly) over pure
  `buildRealApprovedUniverse(descriptor)`; deterministic digest
  `pf:sha256:<24>` over version + registry versions + members.
- Version/digest at validation time: universe version
  `nightwatch.portfolio-real-universe.v1`; digest recomputed on every build
  (x3 byte-identical in-suite; CLI runtime-plan x3 sha256 `43a4d64b683b6df6…`).
- Canonical registries supplying members:
  - linkage: `REAL_RUNTIME_LINKAGE` (runtime profile) mirroring
    `RIPPLE_JOURNEY_IDS`, `RIPPLE_PHASE4_ENVELOPES` (anchorJourney),
    Phase-5 catalog safety properties, recipe registry DEV-reachable targets;
  - semantic contract evidence: `getRealSourceRecipe()` (recipe v2 deep =>
    TYPE_COLLECTION + derivation v2; recipe v1 shape => SHAPE_COLLECTION +
    derivation v1; no recipe => NONE/nulls);
  - runtime restriction: `INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts === 0`
    marks EXPLORATION members `runtimeAdmissible:false`.
- Members: 3 canonical targets x {JOURNEY, API, EXPLORATION} =
  `ripple.payer-exchange.read`, `ripple.common-exchange.read`,
  `ripple.account-inventory.read`; work-item identities
  `journey:<journeyId>`, `api:<op>`, `explore:<envelope>:<seed>`.
- Excluded fixture/synthetic identities (proven rejected):
  `phase16a.synthetic-extra.one/two/three.read`.

## Admission API and reason vocabulary

- Documents: `parsePortfolioRuntimePlanDocument` ->
  `parseDevHandoffPackageDocument` (digest recomputation; executable:false,
  token class, environment pinned) + existing strict
  `parseCampaignPlanManifestDocument`.
- Gate: `admitPortfolioRuntimePlan({handoff, plan, universe, authorizationToken})`
  -> `CampaignPortfolioRuntimeBinding` or throws
  `PORTFOLIO_ADMISSION_REJECTED:<REASON>` with reasons: AUTHORIZATION_MISSING,
  AUTHORIZATION_MISMATCH, HANDOFF_NOT_INERT, HANDOFF_TOKEN_CLASS_MISMATCH,
  HANDOFF_ENVIRONMENT_INVALID, PLAN_VERSION_MISMATCH, PLAN_ID_MISMATCH,
  MANIFEST_DIGEST_MISMATCH, PORTFOLIO_DIGEST_MISMATCH, MEMBER_LIST_MISMATCH,
  TOTAL_UNITS_MISMATCH, TARGET_UNKNOWN, SYNTHETIC_TARGET_REJECTED,
  DUPLICATE_TARGET_MAPPING, MEMBER_BLOCKED, MEMBER_EVIDENCE_STALE,
  MEMBER_EVIDENCE_UNAVAILABLE, MEMBER_RUNTIME_RESTRICTED,
  MEMBER_LINEAGE_INCOMPLETE, WORK_ITEM_MAPPING_AMBIGUOUS,
  PLAN_EMPTY_SELECTION, BUDGET_OVERSUBSCRIBED, UNIVERSE_EMPTY.
- Exact authorization-consumption point: FIRST check inside
  `admitPortfolioRuntimePlan` (prepare) and inside
  `verifyFrozenPortfolioOnResume` -> `admitPortfolioForPrepare` (resume),
  i.e. BEFORE any manifest creation on prepare and BEFORE executor object
  construction on resume. The consumed value is the separately supplied owner
  token equal to `DEV_HANDOFF_REQUIRED_AUTHORIZATION`
  (`PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED`); it appears in
  outputs only as the recorded CLASS marker, never mutating plan identity,
  members, budgets, order, or safety policy. Handoff remains `executable:false`.

## Budget mapping

- Version: `nightwatch.portfolio-budget-mapping.v1`.
- Policy: elementwise min(initial, derived) over maxTotalBrowserContexts,
  maxJourneyContexts, maxExplorationContexts, maxApiExecutions,
  maxTotalActions; derived caps = journeys/explorations counts (+promoted
  reserve 1), 2*API count + reserve, max(totalUnits, mandatory-action floor);
  replays/minimization/runtime/evidence dimensions unchanged. Expansion
  attempts are detected (`expansionViolations`) and clamped; invalid numerics
  (negative/fractional/NaN/Infinity) throw PORTFOLIO_BUDGET_MAPPING_INVALID.
  Feasibility guard mirrors analyzeCampaignBudgetFeasibility arithmetic;
  oversubscription fails BUDGET_OVERSUBSCRIBED. Consequence: under the current
  bounded profile at most TWO linked APIs fit; a three-API plan fails closed.

## Work-item mapping semantics

One selected member binds exactly once via canonical linkage to an existing
identity (`journey:` / `api:` / `explore:`); frozen fields per member:
memberId, targetId, kind, planOrder, allocatedUnits, maxRetries, journeyId,
envelopeId, apiOperationId, seed, workItemId. No target rewriting, no fixture
fallback, no cross-kind coercion; campaign kind-group ordering retained with
plan order preserved within journeys. Existing campaign work-item validation
runs unchanged (validateCampaignManifest green).

## Prepare integration point

`tests/manual/phase7-real-campaign.ts` prepare path: admission runs BEFORE
`createCampaignManifest`/preflight/ensureAuth/`prepareCampaign`;
`portfolioCampaignInput` passes mapped budget policy + optional binding into
the EXISTING `createCampaignManifest`; ordinal-zero checkpoint freezes the
manifest whose fingerprint covers the binding. ZERO executor callbacks during
prepare (suite-proven).

## Resume reauthorization

Resume path: read stored manifest -> if `portfolioBinding` present require BOTH
launcher inputs; re-run admission against the SAME plan/handoff/universe and
compare every frozen field (plan/handoff/universe digests, mapping/binding
versions, member JSON, budget caps) BEFORE constructing the executor; mismatch
=> `PHASE7_PORTFOLIO_FROZEN_BINDING_MISMATCH`. Missing authorization on a
bound manifest => `PHASE7_PORTFOLIO_RESUME_AUTHORIZATION_REQUIRED`. Portfolio
input on a legacy manifest => `PHASE7_PORTFOLIO_INPUT_ON_NON_PORTFOLIO_RESUME`.
Orchestrator-level drift still stops structured
(PARTIAL_RUNTIME_INFRA_FAILURE / CAMPAIGN_VERSION_DRIFT) before executor use.

## Frozen fingerprint fields

schemaVersion, planId, planManifestVersion, planManifestDigest,
portfolioDigest, handoffVersion, handoffDigest, realUniverseVersion,
realUniverseDigest, budgetMappingVersion, requiredAuthorizationClass,
environmentRestriction, executableAtRest=false, members[], budgetCaps[] — all
inside `portfolioBinding`, included in campaignId + manifestFingerprint via
conditional spread. Load-bearing drift invalidates resume through existing
manifest/checkpoint identity recomputation before executor use. Legacy
Phase-7 manifests (no binding) recompute byte-identically (no retroactive
invalidation); CampaignVersionFingerprint shape unchanged.

## Launcher input mechanism

Single opt-in pair on `bin/phase7-real.mjs`:
`--portfolio-plan=/absolute/runtime-plan.json` (lstat regular file, symlink/
directory refused) + `--portfolio-authorization=<token>` (together-only);
duplicate/unknown option rejection preserved; env passthrough
NIGHTWATCH_PHASE_7_PORTFOLIO_PLAN / NIGHTWATCH_PHASE_7_PORTFOLIO_AUTHORIZATION;
contents never echoed. Producer: `node bin/portfolio.mjs runtime-plan`
(combined inert document; handoff digest at validation `fcc58e79be98305dd44e8325`
for the demo fixture universe). No curl/fetch/browser shortcut exists; the
launcher still terminates in the existing Playwright/manual adapter.

## Legacy Phase-7 compatibility

No portfolio input => byte-identical legacy behavior (arg surface, selection,
manifests, checkpoints). Portfolio metadata never required retroactively.
Legacy LOCAL_SYNTHETIC/BASELINE_HEALTH campaigns prepare/resume green in the
rehearsal suite; 125 portfolio-suite + 145 compatibility cases green.

## Deterministic rehearsal counts

- Full seam (universe->plan->handoff->admission->budget->binding->prepare->
  checkpoint->resume->synthetic executor): x3 identical bindings/manifests.
- CLI runtime-plan: x3 byte-identical (sha256 `43a4d64b683b6df6…`).
- Phase-16H adversarial corpus x3 all floors zero (unchanged behavior).

## Quality floors

All ten ZERO: unauthorizedAdmissionCount, syntheticTargetAdmittedCount,
unmappedSelectedMemberCount, budgetExpansionCount,
executorBeforeAdmissionCount, executorBeforeOwnerPolicyCount,
resumeFingerprintEscapeCount, legacyCampaignRegressionCount, privacyLeakCount,
determinismMismatchCount (raw evidence in task STATE Validation Ledger /
REPORT §13).

## Focused/moderate test counts

33 (new Phase-16C suites) + 125 (Phase-16A/16H portfolio incl. campaign.test)
+ 145 (affected Phase 12–15 compatibility) + 27 (campaign:synthetic) +
91 (owner-provenance); typecheck PASS; hardening:check PASS; agent:check PASS
(expected pre-commit warnings); project:check + git diff --check clean at
closure. NOT RUN here: canonical whole-repo regression, topology-isolated full
regression, repository-wide fuzz — owned by Phase-16CH.

## CI truth

GitHub Actions inspected ONCE after the pushed source checkpoint if the run
materialized; the standing external billing/spending block (historically zero
steps, e.g. run 32596866942) is recorded when observed and never retried.
Local green is never upgraded to CI-green. See REPORT §18 for the exact
observed truth of this task.

## Residual risks

- Runtime acceptance against real DEV remains UNPROVEN (by design; Phase 16D
  requires separate authorization after Phase-16CH exhaustive hardening).
- Budget-mapping v1 intentionally forbids three-API plans (reserve
  arithmetic); relaxing requires a NEW mapping version + fresh proof.
- Exploration members are admitted-planning-ineligible today (bounded profile);
  a future exploration-capable profile must flip the restriction mechanically
  via INITIAL_REAL_CAMPAIGN_BUDGET and re-run the mirror tests.
- GitHub Actions may remain externally blocked; local-only evidence stands.

## Successor bootstrap (Phase-16CH hardening)

1. Read AGENTS.md, docs/CURRENT_STATE.md, .agent/ACTIVE_TASK.md, this task's
   STATE/REPORT/RUNTIME_BINDING_HANDOFF, SPEC/ACCEPTANCE_MATRIX.
2. Discover live HEAD from Git; fetch/ff to origin/main; record fresh owner
   authorization for exhaustive hardening (LOCAL only).
3. Run canonical complete Playwright regression + topology-correct isolated
   complete regression; require exact parity; extend the adversarial corpus to
   the binding seam (fingerprint tamper matrix, launcher arg fuzz, CRLF/EOL
   robustness of plan files, cross-version resume matrix).
4. Prove single-executor surface statically (no new spawn/executors outside
   bin/phase7-real.mjs -> tests/manual adapter path).
5. Close under continuity v2; only then may a separately authorized Phase 16D
   contained DEV acceptance consume the seam.

## DEV statement

DEV WAS NOT EXECUTED. Zero browser/network/auth-state/product contact occurred
in this task; all execution was local Node/Playwright unit machinery with
injected synthetic executors and temp directories.
