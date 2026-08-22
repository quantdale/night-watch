# SPEC — Phase 16B Contained DEV Portfolio Campaign Acceptance

Task ID: `phase-16b-contained-dev-portfolio-campaign-acceptance`
Status: NONE
Execution token required: `PHASE_16B_CONTAINED_DEV_PORTFOLIO_CAMPAIGN_ACCEPTANCE`
Manifest gate token to satisfy when required by current source: `PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED`

## 1. Source of truth

Bootstrap from live Git. Read AGENTS.md, current project state, Phase 16A terminal STATE/REPORT, Phase 16H terminal STATE/REPORT, and the actual current portfolio/campaign/owner-policy/containment source before deriving any runtime command. Never invent a runner, flag, route, target, or token-handling mechanism.

## 2. Environment and authority

Only canonical Ripple DEV is eligible: `https://appdev.alphaus.cloud/ripple/` and already-allowlisted DEV dependencies accepted by the existing Nightwatch outbound policy. NEXT and production are forbidden. Production/unknown destination attempts are fatal.

Execution must remain read-only. Any planned action classified as mutation, unknown, or requiring broader authority is rejected before browser/API execution. No database access. Alphaus sibling repos are read-only source references.

## 3. Handoff admission

Generate/read the Phase-16A DEV handoff using the current hardened implementation. Before runtime, independently validate that it is:

- versioned and parser-valid;
- `executable:false` as stored data;
- DEV-only / never-production;
- limited to approved targets;
- owner-policy compatible;
- source/currentness valid;
- deterministic for identical inputs;
- free of credentials/customer/raw authenticated data;
- bound to the current campaign/portfolio fingerprints;
- gated by the separately granted execution authorization.

If current source has no safe mechanism that converts an authorized inert handoff into the existing bounded campaign runner without weakening a guard, STOP as BLOCKED_RUNTIME_BINDING_MISSING. Do not add a bypass merely to execute the campaign.

## 4. Preflight containment

Before any authenticated DEV request, prove the existing Nightwatch containment prerequisites from current source/config and local checks: L0-L5 policy stack, loopback proxy, production/unknown fail-closed behavior, workers blocked, QUIC/HTTP3 disabled, non-proxied WebRTC disabled, trace-off with auth, secret-safe storage-state loading, and owner-policy-before-executor ordering.

Use the existing external auth-state path only through Nightwatch's sanctioned loader. Never print/cat/jq/grep/copy/summarize its contents.

## 5. Campaign scope

Execute one bounded portfolio plan only. Use the planner's selected approved members and its total budget/caps; do not increase budget during execution. No speculative extra targets.

Allowed runtime behavior is read-only observation, read-only API/browser actions already admitted by Nightwatch, deterministic replay of read-only observations, bounded minimization of read-only action sequences, semantic/protocol evaluation, clustering/confidence, checkpoint/resume, and private local dossier generation.

No new target discovery may become execution authority in this task. Newly observed routes/actions may be recorded as sanitized observations only.

## 6. Safety stop conditions

Immediately stop the affected campaign on any of:

- production/NEXT/unknown destination attempt;
- mutation or unknown action classification;
- containment/proxy/owner-policy bypass;
- source/currentness invalidation;
- checkpoint fingerprint/version mismatch;
- auth-state handling violation;
- raw sensitive/customer value persistence;
- runtime command requiring ungranted authority.

Do not continue by weakening policy.

## 7. Evidence and findings

Persist only the existing private-safe Nightwatch artifacts permitted by current source. Authenticated traces remain off. Do not add screenshots, response bodies, DOM dumps, credentials, identity data, or customer financial data merely for debugging.

A DEV anomaly is not automatically a bug. Require the existing campaign ladder: deterministic reproduction where supported, semantic/protocol evidence, minimization truth, clustering/deduplication, confidence gating, and dossier readiness. Transient/invalid/precondition-divergent outcomes remain distinct.

No findings are published or shared.

## 8. Acceptance

Success requires:

1. preflight safety/authority green;
2. portfolio handoff admitted without bypass;
3. exactly one bounded DEV portfolio campaign executed;
4. production/NEXT attempts = 0;
5. mutations = 0;
6. ownerPolicyEscapeCount = 0;
7. containmentViolationCount = 0;
8. privacyLeakCount = 0;
9. checkpoint/resume integrity green;
10. campaign budget respected;
11. planner-selected vs executed-member reconciliation exact or explicitly blocked before execution;
12. every candidate given a truthful terminal disposition;
13. deterministic replay/minimization used only where supported;
14. private report records raw counts and exact runtime source SHA/fingerprint.

The campaign may legitimately produce zero dossier-ready anomalies. Zero findings is not failure if the campaign executed truthfully and completely.

## 9. Terminal states

- `PHASE_16B_STATUS: DEV_ACCEPTANCE_COMPLETE` — all local/runtime gates green; campaign finished truthfully.
- `PHASE_16B_STATUS: BLOCKED_RUNTIME_BINDING_MISSING` — no safe current runner binding exists.
- `PHASE_16B_STATUS: BLOCKED_SAFETY_OR_AUTHORITY` — containment/owner/currentness/auth prerequisite fails.
- `PHASE_16B_STATUS: BLOCKED_RUNTIME_DEFECT` — an actual Nightwatch runtime defect prevents completion; record exact reproducer and corrective next task.

CI state is reported separately and never determines whether the DEV campaign itself executed safely.
