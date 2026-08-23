# SPEC — Phase 16CH Portfolio Runtime Binding Hardening

Task ID: `phase-16ch-portfolio-runtime-binding-hardening`
Phase: `16CH-PORTFOLIO-RUNTIME-BINDING-HARDENING`
Required execution token: `PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY`

## 1. Starting truth

Phase 16C earned implementation checkpoint `8e8684dcf93bb01b3fe52e56355b2aa59f13567e` and closure descendant `122ff7dc7ea21b88d9af80fee473222a3ef9cfc6`.

Recorded focused evidence: typecheck/hardening PASS; Phase-16C suites 33/0; portfolio+campaign 125/0; affected Phase 12–15 compatibility 145/0; campaign:synthetic 27/0; owner-provenance 91/0; deterministic local seam and CLI repeats; all ten Phase-16C floors zero; DEV not executed.

These are predecessor claims. Complete canonical and topology-correct isolated regressions were explicitly deferred and must be earned here.

## 2. Objective

Prove the Phase-16C runtime binding is fail-closed, deterministic, authority-safe, privacy-safe, backwards-compatible, resume-safe, topology-safe and regression-safe across the complete local Nightwatch codebase.

## 3. Failure discipline

Every observed failure must be reproduced, root-caused, classified, repaired if it is a real Nightwatch defect, permanently regressed, narrowly rechecked and broadly rechecked. Do not weaken assertions, add regression-hiding skips, silently regenerate identities, or loosen authority to obtain green.

## 4. Hardening surfaces

### H1 — Real approved universe

Adversarially prove canonical linkage and universe derivation. Cover missing/duplicate/cross-lineage registry entries, target/kind ambiguity, deterministic ordering/digest, synthetic/demo exclusion, runtime-restricted exploration, recipe/depth/currentness movement, registry input permutation and version drift. Every admitted member must map mechanically to one current approved runtime identity.

### H2 — Inert handoff and admission

Fuzz/validate the combined runtime-plan document, manifest and handoff. Cover every categorical reason code plus malformed/unknown/duplicate fields, digest tamper, member order/list drift, wrong versions, wrong environment, executable marker drift, missing/wrong authorization, unapproved/synthetic targets, stale/unavailable evidence, lineage gaps and blocked/frozen members. Authorization must permit consumption only and never mutate plan identity, order, members, budgets or policy.

### H3 — Budget mapping

Exhaustively prove `nightwatch.portfolio-budget-mapping.v1` is monotone-restrictive against the current bounded Phase-7 profile. Cover each mapped dimension independently and jointly, zero/one/exact-fit/oversubscribed inputs, API reserve arithmetic, exploration restriction, invalid integers/fractions/NaN/Infinity/overflow, retry/cap interactions, all mapped dimensions at boundaries and attempted expansion. No mapped value may exceed the canonical runtime profile.

### H4 — Work-item binding

Prove exact-one selected-member binding across journey/API/exploration identities; wrong kind, duplicate identity, ambiguous linkage, missing anchor journey, target rewriting, plan-order drift, workItemId drift and fixture fallback must fail closed. Bound manifests must still pass canonical campaign validation.

### H5 — Campaign identity / fingerprint compatibility

Adversarially mutate every `portfolioBinding` load-bearing field one at a time and in combinations: planId/version/digest, portfolio digest, handoff version/digest, real-universe version/digest, budget mapping version, authorization class, environment restriction, executableAtRest, members, work-item IDs/order, budget caps. Require campaignId/manifestFingerprint/checkpoint mismatch before executor. Prove schema-optional legacy manifests remain byte/digest compatible when binding is absent.

### H6 — Prepare / checkpoint / resume ordering

Use counting/throwing synthetic executors to prove prepare invokes zero executor callbacks; resume requires fresh authorization and frozen-binding equality before executor construction/use; version drift and checkpoint tamper stop before executor; owner policy remains before executor. Exercise interrupted/resume bookkeeping and repeat-resume edge cases without creating a second runtime.

### H7 — Launcher/file boundary

Adversarially test the single `--portfolio-plan=` + `--portfolio-authorization=` route: missing pair member, duplicate options, unknown options, relative path, symlink, directory, absent file, malformed JSON, CRLF/LF/no-final-newline, oversized/unsafe document where existing limits apply, hostile path/error strings, sentinel-like contents and categorical sanitized errors. No contents, credentials or arbitrary raw path detail may leak.

### H8 — Single executor / static authority

Statically and dynamically prove portfolio mode still terminates in `bin/phase7-real.mjs -> tests/manual/phase7-real-campaign.ts -> existing campaign prepare/resume/orchestrator/executor`. No new `spawn`, browser/API shortcut, fetch/curl path, second real runner or alternate executor may exist in the Phase-16C cone. Owner-policy-before-executor must remain load-bearing.

### H9 — Cross-version matrix

Exercise legacy/no-binding manifests plus current binding, unknown/future binding version, unknown/future universe/mapping/runtime-plan versions, and checkpoint/manifests created before/after binding introduction. Historical non-portfolio campaigns must stay readable/replayable according to existing contracts; incompatible portfolio state fails before executor.

### H10 — Corpus / determinism / privacy

Build/extend a Phase-16CH adversarial corpus with at least 100 deterministic cases. Run complete binding-seam rehearsal >=3 times. Persist only synthetic/categorical/digest values. All hardening quality floors must be zero.

## 5. Required quality floors

`unauthorizedAdmissionCount=0`
`syntheticTargetAdmittedCount=0`
`unmappedSelectedMemberCount=0`
`ambiguousBindingAcceptedCount=0`
`budgetExpansionCount=0`
`executorBeforeAdmissionCount=0`
`executorBeforeOwnerPolicyCount=0`
`resumeFingerprintEscapeCount=0`
`legacyCampaignRegressionCount=0`
`launcherRawLeakCount=0`
`privacyLeakCount=0`
`determinismMismatchCount=0`
`singleExecutorViolationCount=0`

## 6. Compatibility and full regressions

After focused/adversarial green: run directly affected Phase 7/12/13/15/16 compatibility, campaign:synthetic and owner-provenance. Then run complete canonical Playwright `--project=nightwatch --workers=1`. After canonical zero failures, create a fresh topology-correct isolated checkout, deterministic `npm ci`, read-only sibling topology, distinct proxy port if needed, and run the exact same complete suite. Canonical and isolated test enumeration/counts/skips must match or differences must be fully evidenced and repaired if real.

## 7. Closure gates

Run final typecheck, hardening:check, campaign:synthetic, owner-provenance, agent:check, agent:audit, project:check, catalog integrity and git diff --check. Require strict errors zero, unchanged catalog digest/count and promotion authority NONE.

## 8. Git / CI truth

Only a fully local-green substantive tree earns the validated Phase-16CH implementation SHA. Push fast-forward, require clean HEAD==origin/main, inspect the exact Actions run once. If zero steps execute under the standing billing/spending block, terminalize `BLOCKED_EXTERNAL_CI`; never retry-loop and never call CI green.

## 9. Permanent boundaries

No DEV, NEXT, production, real campaign, authenticated product execution, DB/data-plane/cloud/infra, Phase-6 expansion, Alphaus sibling writes, new endpoint/target authority, AI/model oracle authority, selfDev/promotion/catalog mutation, Phase 11B or Phase 13B.

## 10. Successor gate

Phase 16D DEV retry remains NOT_AUTHORIZED during this task. It may be proposed only after complete Phase-16CH local hardening evidence.