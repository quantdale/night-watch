# Tasks: Source-Proof Soundness + Static Discovery Hardening

Execution target: approximately 12 productive hours.

The hour ranges are a work budget, not permission to idle. Do not stop after the first green patch. If required work completes early, use remaining useful time for adversarial review, current-source differential analysis, hidden-coupling inspection, test strengthening, and documentation inside scope. Do not invent unsafe scope merely to fill time.

## H0–H1.5 — bootstrap, exhaustive local audit, baseline

- [ ] Pull/reconcile exact main head and read AGENTS.md, .agent/PLANNER_HANDOFF.md, .agent/EXECUTION_PROMPT.md, current durable docs, current terminal ACTIVE_TASK, and this OpenSpec change.
- [ ] Create fresh continuity-v2 task .agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/{SPEC,PLAN,STATE,REPORT}.md.
- [ ] Route .agent/ACTIVE_TASK.md to the fresh task as ACTIVE; never modify the completed prior task files except historical references.
- [ ] Generate an authoritative NUL-safe git ls-files manifest.
- [ ] Account for every tracked path. The final all-file audit ledger must have reviewed count == tracked count with no unexplained omissions.
- [ ] Classify files by runtime/source authority, tests, gates/tooling, UI, config, corpus/fixtures, durable docs/history, generated/lock metadata, and agent continuity.
- [ ] Deep-read every current code/gate/config file; historical/fixture/generated files still require role/coupling review.
- [ ] Search TODO/FIXME/HACK/XXX, skipped/only tests, ts-ignore/expect-error, unsafe eval/shelling, duplicate parser/authority paths, stale docs/comments, and secret/privacy hazards. A zero-result search is evidence only for that query.
- [ ] Record baseline Git SHA, Node/npm versions, test enumeration, source-census digests/counts, eligibility/readonly counts, timings/RSS, and local gate state.
- [ ] Capture safe baseline projections for later differential comparison.

Gate: no implementation before the tracked-file audit and baseline are recorded in STATE.md.

## H1.5–H3 — reproduce or falsify soundness probes

- [ ] Add focused synthetic reproduction for PHP implicit fall-through:
  - if (...) return literal array; no else and no terminal fallback.
  - verify whether PHP_RETURN_ROOT_TYPE / PHP_RETURN_OBJECT_FIELDS becomes mechanically provable.
  - verify whether public source discovery can convert that observation into responseProof/semanticProof PROVEN when joins are otherwise exact.
- [ ] Add near-neighbor controls: unconditional return; early return + terminal fallback; complete if/else; incomplete nested branch.
- [ ] Reproduce TS/JS/Go comment/string route-text cases through the public source-discovery path.
- [ ] Reproduce PHP comment/string fake declaration effects on route-handler join counts.
- [ ] Classify each planner finding as REPRODUCED_DEFECT, SAFE_BY_EXISTING_GATE, or FALSE_HYPOTHESIS with executable evidence.
- [ ] Update task SPEC/PLAN if evidence changes the implementation sequence.

Gate: no coverage expansion until all P0 soundness probes have an evidence-backed disposition.

## H3–H5.5 — control-flow-complete PHP response proof

If the fall-through defect reproduces:

- [ ] Implement the smallest bounded reachability/completeness mechanism that removes the false proof while preserving established safe forms.
- [ ] Keep direct, alias, and branch proof-family responsibilities explicit.
- [ ] Ensure missing else/fallback, unsupported nested flow, loops, try/catch/finally, generator/yield-like behavior and unknown exits fail closed unless mechanically covered.
- [ ] Preserve early conditional return + unconditional terminal fallback when all paths are exact.
- [ ] Add adversarial tests from design.md.
- [ ] Version the real-source response analyzer identity when correctness semantics change.
- [ ] Prove cache/analyzer-set/currentness invalidation follows the version change.
- [ ] Compare known-good pre/post observations and downstream IDs; classify every intentional delta.

If falsified:

- [ ] Keep the reproduction as a regression test where useful.
- [ ] Document which existing mechanism establishes completeness.
- [ ] Spend this workstream on the next reproduced source-proof soundness defect from the exhaustive audit, not speculative feature work.

## H5–H7 — lexical-safe route and declaration discovery

For each reproduced lexical defect:

- [ ] Introduce or reuse a bounded lexical scanner/tokenizer that excludes comment/string bodies before authority matching.
- [ ] Harden TypeScript/JavaScript static route extraction.
- [ ] Harden Go static route extraction.
- [ ] Harden PHP exact handler declaration counting.
- [ ] Preserve deterministic route order, duplicate handling, safe path/method/handler normalization, operation caps and fail-closed malformed-source behavior.
- [ ] Add adversarial comment/string/template/raw-string/escape/malformed fixtures.
- [ ] Test real + fake adjacent constructs and duplicate-real declarations.
- [ ] Ensure code-like source text never appears in returned DTOs or task artifacts.

Do not execute source code or introduce framework/runtime parsing.

## H7–H8.5 — downstream proof-chain reconciliation

- [ ] Rerun source scan, source gaps, eligibility census, readonly census, surfaces/review projections and Phase-24 synthetic integration.
- [ ] Reconcile operation/surface/join/response/semantic/digest changes.
- [ ] Confirm any lost proof is tied to a reproduced old false admission.
- [ ] Confirm no new route/handler/response/semantic proof appears solely because a rejection was hidden.
- [ ] Validate source currentness, cache keys, invalidation, gap taxonomy and Control Center source projection.
- [ ] Add migration/version notes if a public/internal versioned DTO identity changes.
- [ ] Run privacy sentinel sweep over generated safe projections/task artifacts.

## H8.5–H10 — adversarial depth + conditional exact coverage work

- [ ] Expand mutation/adversarial corpus around all repaired boundaries.
- [ ] Stress budgets: source bytes, token count, declaration index, route count, return sites, fan-out/depth, analyzer output count.
- [ ] Add deterministic repeat/cold-warm tests.
- [ ] Review large source authority modules for hidden parallel parsing logic or bypasses.
- [ ] If and only if the hardened fresh census exposes one repeated exact static proof family that meets design.md admission criteria, implement that single family through existing authority paths.
- [ ] If no family clears the bar, explicitly record NO_SAFE_NEW_FAMILY and use remaining time for soundness tests/helper decomposition/differential tooling rather than forcing coverage.
- [ ] Do not generalize dynamic dispatch, runtime binding, GET read-only semantics, or fuzzy symbol inference.

## H10–H11 — full acceptance and clean-checkout proof

Run/fix all applicable gates, including at minimum:

- [ ] npm run typecheck
- [ ] npm run hardening:check
- [ ] npm run quality-gate:spec
- [ ] npm run gate:inventory
- [ ] focused Phase 25/26/27/28 source/analyzer/response-flow tests
- [ ] tests for real-source extraction/currentness/admission and sourceAnalysisParity
- [ ] npm run campaign:synthetic
- [ ] npm run campaign:source-gaps
- [ ] npm run campaign:eligibility-census
- [ ] npm run campaign:readonly-census
- [ ] npm run test:semantic-compat
- [ ] npm run test:owner-provenance
- [ ] npm run gate:local
- [ ] npm run gate:clean
- [ ] npm run agent:check
- [ ] npm run agent:audit
- [ ] npm run project:check
- [ ] git diff --check

Also:

- [ ] Run canonical complete Playwright enumeration and preserve/explain exact skip changes.
- [ ] Reproduce final acceptance in a fresh disposable checkout/topology where prior campaigns require it.
- [ ] Record wall time and peak RSS for representative source-census commands before/after.
- [ ] No test deletion, skip addition, assertion weakening or snapshot laundering.

## H11–H12 — closure, report, Git, exact-head CI observation

- [ ] Update STATE.md after final validated implementation checkpoint.
- [ ] Write REPORT.md with executive summary, exhaustive audit manifest/count, defect reproductions, root causes, implementation, intentional proof-identity deltas, fresh census, adversarial matrix, validation ledger, performance/RSS, regressions, rejected candidates, remaining risks and safety statement.
- [ ] Update durable CURRENT_STATE/ROADMAP/DECISIONS/ARCHITECTURE only where facts changed.
- [ ] Mark continuity task COMPLETE only after terminal acceptance.
- [ ] Commit coherent validated checkpoints; never force-push.
- [ ] Push final head to main according to repository policy.
- [ ] Observe exact-head GitHub Actions once. steps: [] is external non-evidence and must be recorded truthfully.
- [ ] End with exact final commit SHA and STOP.

## Completion criteria

The campaign is terminal only when:

1. Every tracked file is accounted for by the local audit ledger.
2. Every planner soundness probe has an executable disposition.
3. Confirmed false-proof / false-discovery paths are fixed fail-closed.
4. Known-good proof behavior is preserved except documented correctness/version deltas.
5. Currentness, privacy, cache/invalidation and Phase-24 boundaries remain intact.
6. A fresh census is recorded; lower proof counts are accepted when they remove unsound authority.
7. No new proof family is admitted unless it clears the explicit exact-family bar.
8. Focused, semantic, synthetic, provenance, local and clean acceptance are green locally.
9. Continuity and durable docs match the validated Git head.
10. No forbidden product/auth/data/infra/source-write/publication/runtime-AI authority was used.
