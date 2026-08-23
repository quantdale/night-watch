# WORKSTREAMS — Phase 16C Portfolio Runtime Binding & Real Approved Universe

## W1 — Real approved universe
Own canonical runtime-capable approved member discovery and deterministic portfolio construction. No hand-maintained shadow registry unless mechanically generated from current canonical registries.

## W2 — Admission and authorization
Own strict handoff/plan/universe coherence, exact authorization-token consumption, categorical fail-closed reasons, and proof that authorization cannot mutate plan or authority.

## W3 — Budget translation
Own the versioned portfolio-unit -> runtime-budget mapping. It must only restrict the existing bounded Phase-7 profile and never expand capability/budget.

## W4 — Runtime work-item binding
Own deterministic selected-member -> existing campaign-work-item mapping. Unknown/ambiguous/cross-kind/synthetic-only members fail closed.

## W5 — Prepare/resume integration
Own the seam inside the existing campaign prepare/checkpoint/resume path. Freeze binding fingerprints at prepare; reject drift before executor at resume; preserve legacy non-portfolio campaigns.

## W6 — Launcher/operator path
Own one minimal opt-in input path through `bin/phase7-real.mjs` and the existing manual adapter. Strict external input validation; no direct executor/network shortcut; sanitized errors.

## W7 — Version/fingerprint compatibility
Own only the load-bearing binding/budget/universe/plan/handoff fingerprint additions required for safe resume and historical compatibility.

## W8 — Synthetic proof / compatibility
Own deterministic local fixtures and seam rehearsal, including negative matrices and quality floors. No DEV/browser/network/auth execution.

## Integration order

1. W1 + W2 foundation.
2. W3 + W4 mapping.
3. W5 + W7 runtime integration.
4. W6 launcher.
5. W8 end-to-end rehearsal and compatibility.

If the harness supports sub-agents, independent read-only/design/test-review lanes are encouraged. Source mutation must remain isolated; the parent is the sole canonical integrator.
