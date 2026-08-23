# PLAN — Phase 16C Portfolio Runtime Binding & Real Approved Universe

Task ID: `phase-16c-portfolio-runtime-binding-real-universe`
Authorization at publication: NOT_GRANTED
Required execution token: `PHASE_16C_PORTFOLIO_RUNTIME_BINDING_LOCAL_ONLY`

## Purpose

Remove the exact blocker proven by Phase 16B without contacting DEV: build a real-approved-universe portfolio and safely bind the hardened portfolio handoff into the one existing Phase-7 prepare/resume runtime.

## Starting State

Clean fetch fast-forwarded local main to the Phase-16C publication package
`18d030d2e9003b778d28ac8a94350f66c7c572ac` (HEAD == origin/main at activation).
Phase 16A portfolio layer locally verified; Phase 16H hardening earned
`1d6d8759bbba0145962fa0e65810d6f32fa41445`; Phase 16B terminal
BLOCKED_RUNTIME_BINDING_MISSING with zero DEV contact.

## Scope

Local/source/synthetic only: Nightwatch source, tests, bin tooling, corpus,
and docs needed for the safe seam. Canonical registries may be read; Alphaus
sibling repositories are never modified. One opt-in launcher input path.
Schema-optional manifest binding with load-bearing fingerprints.

## Non-Goals

No DEV/NEXT/production execution, real campaign, authenticated browser, auth
state loading, product API execution, real replay/exploration. No second
executor or alternate runtime path. No new endpoint/target/operation authority.
No data-plane/DB/infra/cloud work. No AI/model oracle authority. No selfDev/
promotion/catalog mutation. No Phase 6 expansion, no Phase 11B/13B. No Alphaus
sibling writes. No publication of findings.

## Safety Constraints

Handoff remains `executable:false`; authorization is checked independently at
admission and again before resume/executor use and never rewrites plan
identity, members, budgets, order, or safety policy. Budget mapping is
monotone-restrictive against INITIAL_REAL_CAMPAIGN_BUDGET. All failures use
bounded categorical reason codes; no secrets, raw paths, credentials, customer
values, or arbitrary payloads in outputs or errors.

## Architecture / Approach

Canonical linkage module (`src/core/campaign/runtimeProfile.ts`) -> pure
universe builder + strict parsers + admission + versioned restrictive budget
mapping (`src/core/portfolio/runtimeBinding.ts`) -> registry assembly
(`src/core/portfolio/realUniverse.ts`) -> schema-OPTIONAL
`portfolioBinding` on CampaignManifest/CampaignInput included in campaignId +
manifestFingerprint via conditional spread -> binding-driven selection in
`selection.ts` -> prepare freezes ordinal-zero checkpoint without executor ->
resume re-verifies frozen fingerprints + fresh authorization BEFORE executor
construction -> existing orchestrator owner-policy gate -> existing executor.
Launcher: single opt-in `--portfolio-plan=` + `--portfolio-authorization=`
pair through `bin/phase7-real.mjs` env passthrough.

## Milestones

### M0 — Bootstrap / source truth
Status: COMPLETE
- clean fetch/ff main to `18d030d…` (HEAD == origin/main);
- authorization recorded before mutation;
- Phase 16A/16H/16B terminal evidence read;
- Phase-16B blocker reproduced against current source (five claims reconfirmed);
- starting SHA frozen: `18d030d2e9003b778d28ac8a94350f66c7c572ac`.

### M1 — Real approved universe
Status: COMPLETE
- canonical runtime-profile linkage module; deterministic builder over
  canonical registries; fixture/demo universe separated; every member
  mechanically binds to an existing runtime identity.

### M2 — Admission contract
Status: COMPLETE
- strict handoff + plan + universe + authorization admission with bounded
  categorical reasons; handoff remains executable:false; no plan mutation.

### M3 — Budget mapping + work-item binding
Status: COMPLETE
- versioned monotone-restrictive mapping into current campaign budget dims;
  unambiguous selected-member -> work-item binding; expansion impossible.

### M4 — Prepare integration
Status: COMPLETE
- admission before any executor-capable state; fingerprints frozen into
  campaign manifest/checkpoint; zero browser/network/product activity.

### M5 — Resume integration + launcher
Status: COMPLETE
- fresh authorization + frozen-fingerprint verification before executor;
- one minimal opt-in launcher input path; legacy behavior preserved.

### M6 — Local synthetic seam rehearsal
Status: COMPLETE
- full local chain incl. adversarial matrix; >=3 deterministic repeats;
  all quality floors zero.

### M7 — Compatibility / moderate pack
Status: COMPLETE
- typecheck, hardening, focused suites, affected Phase 12–16 compatibility,
  campaign:synthetic, owner-provenance, continuity/project/diff checks,
  single-executor static surface preserved.

### M8 — Source checkpoint / closure
Status: COMPLETE
- closure records finalized; ONE validated source commit; push ff; Actions
  inspected once if triggered, never retry-looping the billing block;
  ACTIVE_TASK routed to terminal.

## Validation Strategy

Focused permanent suites per workstream; typecheck after contract changes;
moderate final pack per SPEC §12 (typecheck, hardening:check, new Phase-16C
suites, affected Phase 12–16 compatibility, campaign:synthetic,
owner-provenance, agent:check, project:check, git diff --check, >=3 byte-
deterministic seam repeats). Full canonical/isolated regressions deferred to
the successor Phase-16CH hardening task unless a broad failure forces them.

## Decision Log

- D-16C-1 canonical runtime-profile convergence module.
- D-16C-2 schema-optional binding in identity via conditional spread; version
  fingerprint shape untouched.
- D-16C-3 mapping v1 elementwise min(); time dims unchanged; three-API plans
  honestly infeasible under reserve arithmetic (fail closed).
- D-16C-4 campaign kind grouping retained; plan order preserved within
  journeys; both frozen for drift detection.
- D-16C-5 exploration members represented explicitly as runtime-restricted;
  selection fails MEMBER_RUNTIME_RESTRICTED.
- D-16C-6 universe member ids reuse the canonical portfolio member id
  derivation; evidence digests derive from in-repo recipes only.
- D-16C-7 resume re-verification in the adapter before executor construction;
  drift enforcement remains inside manifest/checkpoint validation.

## Discoveries

- DevHandoffPackage member ids are in PLAN order (not sorted); parser enforces
  format+uniqueness only.
- Orchestrator converts runtime version drift into a structured
  PARTIAL_RUNTIME_INFRA_FAILURE stop BEFORE executor use.
- Bounded-profile API reserve arithmetic admits at most TWO linked APIs under
  monotone restriction; a three-API plan fails feasibility closed.
- npm cannot run from UNC working directories on the Windows host; repo
  commands run inside WSL bash (node v22).

## Deferred Work

- Phase-16CH exhaustive hardening (canonical + topology-isolated regressions).
- Phase-16D contained DEV acceptance (separate owner authorization).
- GitHub Actions single inspection per relevant pushed SOURCE checkpoint.

## Completion Criteria

- W1–W8 implemented and focused-green; moderate pack green with raw counts.
- All ten Phase-16C quality floors zero.
- Handoff inert everywhere; authorization non-mutating; legacy campaigns
  compatible.
- One validated source checkpoint pushed fast-forward; HEAD == origin/main;
  working tree clean; terminal tokens recorded; DEV NOT executed.
