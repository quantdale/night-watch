# SPEC — Phase 16C Portfolio Runtime Binding & Real Approved Universe

Task ID: `phase-16c-portfolio-runtime-binding-real-universe`
Required authorization: `PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY`

## 1. Ground truth

Predecessor Phase 16B established mechanically that:

- `buildDevHandoffPackage()` and `CampaignPlanManifest` have no runtime consumer outside portfolio/tooling/tests;
- `bin/phase7-real.mjs` accepts no portfolio plan/handoff input;
- `tests/manual/phase7-real-campaign.ts` composes its own fixed bounded manifest and existing `prepareCampaign` / `resumeCampaign` flow;
- the handoff token literal has no runtime consumer;
- default Phase-16A fixture plans may select synthetic-only target IDs;
- abstract portfolio units have no current mapping into runtime campaign budget dimensions.

Do not reframe those as test failures. They are the architectural blocker this task fixes.

## 2. Authority

This task is LOCAL/SOURCE/SYNTHETIC only. It may modify Nightwatch source/tests/bin/corpus/docs needed for the safe seam. It may read Alphaus sibling source only where necessary to preserve existing approved identities, never write siblings.

No DEV/NEXT/production execution is authorized.

## 3. Architectural rule: one executor, one prepare/resume path

The portfolio layer MUST NOT create a second campaign executor or bypass the existing real-campaign orchestration. The new seam must terminate in the existing campaign `prepareCampaign` / `resumeCampaign` / orchestrator path and existing owner-policy/executor gates.

Existing non-portfolio Phase-7 behavior must remain backward compatible when no portfolio input is supplied.

## 4. W1 — Real approved universe builder

Implement a deterministic builder whose members come only from **current existing runtime-capable, already-approved read-only Nightwatch identities**.

Requirements:

- derive from canonical current runtime registries/catalogs/definitions rather than duplicating IDs by hand where possible;
- every member must resolve mechanically to an existing runtime work-item kind/identity;
- synthetic fixture-only identities are forbidden from the real universe;
- no new endpoint, route, operation, target, or mutation authority;
- owner-policy/currentness/frozen-phase blockers remain load-bearing;
- stable deterministic ordering/identity;
- explicit representation of members that are approved but temporarily unrunnable, rather than silently dropping them;
- strict parser/validator for any durable real-universe snapshot if one is introduced.

The Phase-16A synthetic/demo builder remains available only for local tests/demo and must be clearly separated from the real-runtime builder.

## 5. W2 — Handoff + plan admission contract

Implement a strict admission object/API that consumes:

- the hardened `DevHandoffPackage`;
- the referenced strict `CampaignPlanManifest`;
- the real approved universe snapshot;
- an explicitly supplied authorization value through the repository's existing owner-authorization pattern;
- current runtime/version/currentness context.

Admission must verify at least:

- handoff version and strict schema;
- `executable === false` remains true;
- exact required authorization token match;
- environment restriction remains DEV-only/never-production;
- plan ID, manifest digest, portfolio digest, selected member IDs and total units cohere exactly across handoff/manifest;
- every selected member exists in the real approved universe;
- no selected synthetic-only identity;
- every selected member maps to an existing runtime work item;
- no blocked/frozen/unauthorized member;
- currentness/version/fingerprint requirements;
- duplicate/ambiguous mapping rejection.

Authorization permits consumption only; it MUST NOT rewrite plan identity, selected members, budgets, target universe, or safety policy.

Return categorical fail-closed reason codes. Never echo secrets, raw paths, credentials, customer values, or arbitrary source payloads.

## 6. W3 — Portfolio units -> runtime budget mapping

Implement one explicit versioned deterministic mapping policy from portfolio allocation to the existing campaign runtime budget dimensions.

Hard constraints:

- mapping is **monotone-restrictive**: a portfolio plan can restrict existing runtime capability/budget but can never expand it;
- every mapped runtime budget dimension is upper-bounded by the currently approved fixed Phase-7 runtime profile;
- total plan units cannot cause more runtime work than the current bounded campaign profile allows;
- zero units => no execution for that member;
- blocked/unmapped member => zero execution;
- no fractional/NaN/Infinity/negative values;
- deterministic for identical inputs;
- budget mapping version participates in plan/runtime fingerprinting;
- mapping is mechanically auditable in tests and operator output.

Do not invent permission from a numeric unit. Units are scheduling/budget data only.

## 7. W4 — Runtime work-item binding

Create the minimal binding from admitted selected portfolio members to the existing campaign work-item representation.

Requirements:

- one selected portfolio member maps to one unambiguous current runtime identity or fails closed;
- mapping preserves existing journey/exploration/API operation semantics;
- no target ID rewriting to make a match;
- no hidden fallback to fixture targets;
- no cross-kind coercion;
- deterministic order follows the admitted plan;
- existing campaign work-item validation still runs after binding.

## 8. W5 — Prepare/resume integration

Integrate the binding into the existing prepare/resume architecture, not around it.

Prepare requirements:

- strict plan/handoff admission happens before any executor-capable state is produced;
- admitted plan/binding/budget fingerprints are frozen into campaign manifest/checkpoint state;
- existing prepare-only safety semantics remain intact;
- no browser/network/product execution during preparation.

Resume requirements:

- re-check required runtime authorization before executor use;
- checkpoint must match frozen portfolio plan/handoff/binding/budget-mapping fingerprints;
- source/currentness/version drift follows existing fail-closed semantics;
- mismatch stops before executor invocation;
- no silent replan during resume;
- changing the portfolio requires a new prepare, not mutation of an existing campaign.

Historical checkpoints/manifests without portfolio binding must remain readable/executable according to their existing authorized path; do not retroactively require portfolio metadata for legacy Phase-7 campaigns.

## 9. W6 — Launcher/tooling input path

Extend the existing real campaign launcher with the smallest explicit opt-in input needed to supply the portfolio handoff/plan to **prepare** and to prove authorization again on **resume**.

Derive the exact CLI/env shape from current repository patterns; do not add multiple competing paths.

Safety requirements:

- absolute external file/path validation if file input is used;
- never print file contents or auth-state contents;
- reject duplicate options/unknown flags;
- categorical sanitized errors;
- portfolio mode must be explicit; ordinary legacy Phase-7 invocation stays unchanged;
- no direct curl/fetch/browser shortcut;
- launcher still ends in the existing Playwright/manual campaign adapter.

## 10. W7 — Runtime fingerprint/version integration

Add only the minimum version/fingerprint fields required to prove:

- portfolio schema/version;
- campaign-plan manifest version + digest;
- handoff version + digest;
- real-universe builder/version or digest;
- runtime binding version;
- budget mapping version.

Any load-bearing change must trigger prepare/resume incompatibility before executor use. Do not use source SHA alone as semantic identity.

## 11. W8 — Local synthetic end-to-end proof

Build local deterministic fixtures that exercise the complete seam without DEV/network/browser/auth:

real-universe builder -> portfolio plan -> handoff -> authorization admission -> budget mapping -> work-item binding -> prepare -> checkpoint -> resume -> injected synthetic executor.

Include at least:

- valid journey member;
- valid exploration member if currently runtime-capable and approved;
- valid API member if currently runtime-capable and approved;
- synthetic-only target rejection;
- unknown target rejection;
- authorization missing/wrong;
- handoff/manifest digest tamper;
- member-list mismatch;
- total-unit mismatch;
- duplicate mapping;
- blocked/frozen member;
- stale/unavailable evidence;
- zero budget;
- oversubscribed plan;
- mapping-version drift;
- binding-version drift;
- plan-version drift;
- checkpoint mismatch;
- resume without authorization;
- legacy non-portfolio campaign compatibility;
- exact deterministic repeats >=3.

No local test may accidentally contact DEV.

## 12. Validation cadence

Implementation-first but not unvalidated. For each coherent workstream run focused permanent tests and typecheck. Final moderate pack must include:

- `npm run typecheck`;
- `npm run hardening:check`;
- new Phase-16C suites;
- directly affected Phase 7/12/13/15/16 compatibility suites;
- `npm run campaign:synthetic`;
- `npm run test:owner-provenance` when touched;
- `npm run agent:check`;
- `npm run project:check`;
- `git diff --check`;
- >=3 byte/digest deterministic seam repeats;
- static proof that no second executor/runtime path was introduced.

Complete canonical+isolated full regressions are deferred to a future hardening task unless a broad failure requires them for diagnosis.

## 13. Quality floors

All must be zero:

- unauthorizedAdmissionCount;
- syntheticTargetAdmittedCount;
- unmappedSelectedMemberCount;
- budgetExpansionCount;
- executorBeforeAdmissionCount;
- executorBeforeOwnerPolicyCount;
- resumeFingerprintEscapeCount;
- legacyCampaignRegressionCount;
- privacyLeakCount;
- determinismMismatchCount.

## 14. Permanent boundaries

Phase 6 `FROZEN_BY_OWNER`. Phase 11B/13B `NOT_AUTHORIZED`.

NO DEV/NEXT/production, real campaign, authenticated browser, DB/data-plane/infra, sibling writes, new targets/endpoints, mutation authority, AI/model oracle authority, selfDev/promotion/catalog mutation, external publication.

## 15. Terminal truth

Preferred:

`PHASE_16C_STATUS: IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING`
`PHASE_16C_RUNTIME_BINDING: IMPLEMENTED_NOT_DEV_EXECUTED`
`PHASE_16D_DEV_RETRY: REQUIRES_SEPARATE_OWNER_AUTHORIZATION`

If the existing runtime cannot safely accept such a seam without structural redesign, use `PHASE_16C_STATUS: BLOCKED_ARCHITECTURAL_CONFLICT` with exact evidence rather than creating a second executor.
