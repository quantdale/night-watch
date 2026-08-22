# REPORT — Phase 16H Campaign Yield & Portfolio Hardening

Status: COMPLETE (BLOCKED_EXTERNAL_CI)

## 1. Bootstrap / live Git / authorization token

- Execution token: `PHASE_16H_CAMPAIGN_YIELD_PORTFOLIO_HARDENING_LOCAL_ONLY`
  (exactly as granted by the owner prompt; no other authority granted).
- Bootstrap: clean fetch --prune fast-forwarded local main
  `192ff75d1e264190fc06da27362a04f91046d233` ->
  `1e6a0445b5db6396a64491530f751dafe7646707`; HEAD == origin/main at task
  activation (the Phase 16H publication package); worktree clean before
  mutation. Read: AGENTS.md, docs/CURRENT_STATE.md, Phase 16A STATE/REPORT,
  the complete Phase 16H package, and the design doc, before any edit.
- Environment: Node v22.22.1 / npm 10.9.4 via nvm inside WSL Ubuntu
  (matches the predecessor validation environment).

## 2. Phase 16A predecessor truth and exact SHAs

- Implementation anchor: `1737e30afb64a1aed722f61182d87a4f2f6e3bb4`.
- Closure descendant: `192ff75d1e264190fc06da27362a04f91046d233`.
- Terminal predecessor disposition:
  IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING (focused evidence only;
  complete canonical + isolated regressions were explicitly deferred here).

## 3. Initial typecheck/static results (pre-fix baseline)

- `npm run typecheck`: PASS (tsc --noEmit, zero errors).
- `npm run hardening:check`: PASS (offline structural invariants hold).
- No compiler or static failures existed pre-hardening; all defects below
  were behavioral, exposed exclusively by the new adversarial corpus.

## 4. DEFECT_LEDGER summary (full detail in DEFECT_LEDGER.md)

| ID | Class | Root cause (one line) | Disposition |
|---|---|---|---|
| DEF-01 | Simulator metric coherence | baseline starvedEligibleMembers used vacuous `>= 0` instead of the policy threshold | source fixed; regression pinned |
| DEF-02 | Replan fail-closed gap | unselected-member CONTRACT/DERIVATION movement skipped entirely -> PLAN_REUSABLE with stale ranking inputs; affected-set pollution | source fixed; matrix rows pinned |
| DEF-03 | Manifest strictness gap | compare-plan consumed arbitrary JSON without strict parsing/digest recomputation | strict parseCampaignPlanManifestDocument added; wired into core + CLI |
| DEF-04 | CLI error privacy | raw error.message echoes (file-content/path fragments) reached stderr | bounded sanitizer + categorical read failures |
| DEF-05 | Simulator input validation | malformed yield models fabricated garbage metrics (negative usefulCandidates) | validateMemberYieldModel fail-closed |
| DEF-06 | Parser error contract (self-caught) | my own parser threw bare strings so error.message was undefined | all 26 throw sites now Error objects |

Test-authoring corrections TA-01..TA-06 are recorded separately in the ledger;
none were source defects. Hypotheses HYP-01/02/04/05/08 refuted with green
adversarial evidence; HYP-06/07 confirmed; HYP-09/10 discharged by M7/M8.

## 5. Portfolio model/parser hardening results

- 40-case parser-rejection matrix (PARSER_REJECTION_CASES): every case fails
  closed with `PORTFOLIO_*` categorical errors; forbidden-shape/raw-literal
  echo checks pass.
- Approved-target membership enforced (foreign target ->
  ERR_PORTFOLIO_UNAUTHORIZED_TARGET), duplicate approved ids rejected,
  duplicate member identity rejected, sentinel text rejected at every field,
  numeric fields reject NaN/Infinity/fractionals/negatives/over-bounds.
- Stored duplicatePressure is derived data: rebuild recomputes it and the
  digest binds the recomputed form (tamper-with-stale-pressure rejected via
  digest mismatch).

## 6. Scoring invariant matrix (raw counts)

- Component bounds grid: 6 depth classes x 3 cost classes x 4 yield levels
  x 3 starvation ages = 216 combinations; every component within source
  bounds; total integer within [-34, 75].
- Duplicate-pressure ladder (pressure 0..6 penalties monotone) plus five
  shared-scope fixtures (pressure 1..5): focal score monotonically
  non-increasing.
- SHA-only movement: movementClass=SHA_ONLY_NO_EVIDENCE_CHANGE contributes 0;
  totals identical with/without history (digests differ only through the
  explainability basis string, pinned deliberately).
- Stale/unavailable/not-evaluated members never enter ranking regardless of
  maximal positive factors (gated before scoring).
- Equal-score ties break deterministically by memberId ascending across
  repeats and permutations.

## 7. Allocation/starvation/reserve invariant matrix (raw counts)

- C-matrix sweep over ALL 89 fixtures x 2 policy variants (base +
  exploration-reserve): sum(allocated) <= totalUnits; blocked members exactly
  zero; per-entry ceiling respected; partition selected/zeroBudget/
  unfundedEligible covers every member exactly once; retry ceilings carried
  verbatim; quality floors zero in every cell (712 allocation cells).
- Edge portfolios proven deterministic: zero-total, one-unit-solo, exact-fit
  trio, oversubscribed quintet, tiny-ceiling pair, all-blocked/all-stale/
  all-unavailable/all-not-evaluated (starved), reserve==total without and
  with explorer (reserve is reachable ONLY by EXPLORATION members; ceiling
  still binds first), starvation threshold boundary (at/below).

## 8. Yield-accounting arithmetic/privacy matrix

- Zero denominators -> explicit nulls (never fake zeros); maxed counters
  (100k each) accounted integrally; invalid-heavy rate = 1000 permille maps
  to the -8 score penalty; duplicate-heavy coherent; overflow addition fails
  closed; NaN/Infinity/negative/fractional counters rejected.
- Privacy scan: string VALUES of portfolio/allocation/manifest/accounting/
  simulation/handoff artifacts over the whole corpus x3 repeats contain no
  sentinel/secret-shaped text (privacyLeakCount = 0).

## 9. Manifest/version/identity hardening

- New strict parser `parseCampaignPlanManifestDocument`: exact keys, pinned
  manifestVersion/scoreVersion/allocationVersion/createdAtBasis, digest
  format checks, canonical member ordering, budget coherence
  (sum(selected)=totalAllocatedUnits), checkpoint policy pinned true x3,
  owner scope pinned FROZEN_BY_OWNER/INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_
  SCOPE/SEPARATE_OWNER_TOKEN_REQUIRED/NONE, and RECOMPUTATION of both planId
  and manifestDigest — any tampered byte fails closed.
- All 10 MANIFEST_TAMPER_CASES rejected (unknown top-level field, version
  drift, valid-format-but-wrong planId/digest, budget tamper, createdAtBasis
  drift, weakened owner scope, weakened checkpoint policy, unknown member
  field, reordered unselected list).

## 10. Exhaustive replan transition matrix (SPEC H6, all 14 rows)

unchanged->REUSABLE; sha-only-selected->REUSABLE (no false novelty);
EVIDENCE_CHANGED selected/unselected->REPRIORITIZE; CONTRACT_CHANGED /
DERIVATION_CHANGED selected->INVALIDATED; contract/derivation change on
UNSELECTED members->REPRIORITIZE (fail-closed, post-DEF-02); AUTHORITY_CHANGE
snapshot->INVALIDATED; INCOMPATIBLE->INVALIDATED; stale/unavailable currentness
on selected targets->REPRIORITIZE with exclusion reasons; registry removal
via unavailability->REPRIORITIZE, via authority event->INVALIDATED; mixed
signals->authority dominates (INVALIDATED). Row set asserted equal to
REPLAN_MATRIX_ROW_IDS. Unselected movements never appear in
affectedSelectedMemberIds.

## 11. Simulator determinism/purity and synthetic-claim boundary

- Byte-identical output across >=3 repeats for EVERY fixture pipeline;
  yieldModels insertion order cannot alter bytes (canonical serialization);
  missing models fail closed (PORTFOLIO_SIM_MODEL_MISSING); malformed models
  fail closed (PORTFOLIO_SIM_MODEL_INVALID, 8 edges).
- Every simulation record pins interpretation=
  PLANNER_PROPERTY_EVIDENCE_NOT_REAL_WORLD_YIELD and
  realWorldBugYieldClaim=false; renderers print the marker verbatim.

## 12. Operator CLI all-command matrix (bin/portfolio.mjs)

- inspect / explain-score / plan / compare-plan / shadow-simulate /
  dev-handoff: exit 0, byte-stable stdout across repeats; plan digests match
  the Phase 16A recorded values (`plan:sha256:cd118eaa856a031a6445f588`,
  `plan:sha256:1473366e34732d5bc5a26508`) proving byte-determinism survived
  the repairs.
- Failure paths: unknown subcommand -> usage + exit 1; unreadable file ->
  categorical `cannot read …` (no path echo); malformed JSON -> bounded
  sanitized detail; tampered manifest -> `PLAN_MANIFEST_INVALID:*` + exit 1;
  hostile sentinel-bearing input -> sanitized stderr (<300 chars), stdout
  empty. compare-plan now parses both documents strictly before comparing.
- No persistence/network/product authority exercised (read-only tool; spawns
  only tsc for its own self-contained compile into `.tmp-nightwatch/`).

## 13. DEV-handoff safety proof (NOT executed)

Mechanically pinned (unit + CLI): handoffVersion
nightwatch.dev-campaign-handoff.v1; `executable:false`;
environmentRestriction DEV_ONLY_NEVER_PRODUCTION; requiredAuthorizationToken
PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED (endswith
SEPARATE_TOKEN_REQUIRED); runtimeObligations exactly [OWNER_POLICY_GATE_
REQUIRED, CONTAINMENT_STACK_REQUIRED, CHECKPOINT_RESUME_REQUIRED,
NO_PRODUCTION_CONTACT, FINDINGS_OWNER_LOCAL_ONLY]; serialized payload
contains no credential/JWT/AKIA shapes; deterministic digest. Nothing in this
task executed it; DEV execution remains NOT_AUTHORIZED.

## 14. Adversarial corpus count and >=3 deterministic repeat evidence

- Scenario fixtures: 89 total (50 inherited Phase-16A + 39 new Phase-16H)
  across 31 categories — floor >= 80 met (J01).
- Additional negative catalogs: ~40 parser-rejection cases, 10 manifest
  tamper cases, 8 policy-invalid cases, 8 simulator model edges, 14 replan
  transition rows.
- Determinism: x3 repeats over every fixture pipeline x both policies with
  six digests compared per fixture per repeat (portfolio, allocation,
  manifest, accounting, simulation, handoff) — determinismMismatchCount = 0.

## 15. Quality-floor raw counts (J02–J10)

All zero over the full corpus x3-repeat runner:
determinismMismatchCount=0; privacyLeakCount=0; falseCurrentCount=0;
authorityEscapeCount=0; blockedMemberBudgetCount=0; budgetOverflowCount=0;
falseNoveltyIncreaseCount=0; invalidReplanReuseCount=0;
realYieldClaimCount=0; executableHandoffCount=0.

## 16. Phase 12–16 compatibility counts

All tests/unit/phase12*, phase13*, phase14*, phase15*, phase16* suites
(46 files incl. the new Phase-16H suites): **836 passed / 0 failed**
(3.8 min, workers=1).

## 17. campaign:synthetic / owner-provenance counts

- npm run campaign:synthetic: 27 passed / 0 failed.
- npm run test:owner-provenance: 91 passed / 0 failed.

## 18. Complete canonical regression raw counts + skip inventory

`npx playwright test --project=nightwatch --workers=1` (twice, consistent):
**2161 passed / 0 failed / 4 skipped** (~7.5 min, exit 0).
Skip inventory (environment-conditional, identical both runs):
1. tests/unit/phase5Api.test.ts:195 — current-source OOPS subprocess relay path
2. tests/unit/phase5Api.test.ts:244 — restricted OOPS assertion classification
3. tests/unit/phase5Api.test.ts:278 — Phase 5 KNOWN_READ template loopback
4. tests/unit/selfDevSandboxConfinement.test.ts:143 — other-uid sandbox base

## 19. Topology-correct isolated complete regression + comparison

- Fresh clone of main @1e6a044 into sibling
  `REPOSITORIES/nightwatch-isolated-16h` (natural ../alphauslabs +
  ../mobingilabs topology); the exact hardening delta copied in and verified
  byte-identical (cmp) against the working tree; deterministic `npm ci`;
  distinct `NIGHTWATCH_PROXY_PORT=18991`.
- Identical command: **2161 passed / 0 failed / 4 skipped** (~7.6 min,
  exit 0). Counts AND per-test skip inventory exactly equal to canonical
  (L03 parity: no differences to explain).

## 20. Privacy/authority/frozen-phase proof

No DEV/NEXT/production contact; no real campaign; no database/data-plane/
cloud/infrastructure operations; Phase 6 untouched (FROZEN_BY_OWNER);
Phase 11B/13B untouched (NOT_AUTHORIZED); Alphaus siblings read-only
untouched; no new endpoint/target authority; no AI/model oracle authority;
no selfDev/promotion/catalog mutation (catalog count 1 and digest unchanged;
promotion authority NONE); no credentials/customer values anywhere in source,
artifacts, or .agent files; owner-provenance suite green.

## 21. Closure gate results

typecheck PASS; hardening:check PASS; campaign:synthetic 27/0;
owner-provenance 91/0; agent:check PASS (warnings: LEGACY_CONTINUITY
inference; standing LEGACY v1 notes; pre-commit STALE baseline warning
resolved by commit A); agent:audit strict errors = 0 (32 strict_v2 tasks,
24 legacy warnings only); project:check PASS on the clean post-commit tree;
catalog integrity `node bin/selfdev-catalog-integrity.mjs`: count/digest
unchanged, promotion authority NONE; `git diff --check` CLEAN.

## 22. Validated hardening implementation SHA

`1d6d8759bbba0145962fa0e65810d6f32fa41445`
("Phase 16H: campaign yield & portfolio hardening (DEF-01..DEF-06 repaired,
89-case adversarial corpus)"; 9 files, +3463/-25; src/tests/corpus/bin paths
only). Landed as a fast-forward descendant of
`1e6a0445b5db6396a64491530f751dafe7646707` == origin/main at landing.

## 23. Exact Actions run/job/step truth (inspected once)

- Run id 32596866942 ("Nightwatch hardening"), head_sha
  1d6d8759bbba0145962fa0e65810d6f32fa41445, attempt 1, status completed,
  conclusion failure.
- Job 97089137598 "Local hardening checks": started 2026-08-22T20:30:21Z,
  completed 20:30:23Z, conclusion failure, **steps_count 0** — the standing
  external billing/spending-limit block prevented any step execution
  (same condition as Phase 15H run 32554139535). Inspected exactly once;
  not retried.

## 24. Final continuity/docs closure SHA and Git cleanliness

Documentation closure (this record set + CURRENT_STATE/ACTIVE_TASK updates)
landed as a documentation-only descendant of the validated implementation
SHA; live HEAD discovered from Git; HEAD == origin/main; worktree clean at
closure (verified after the final push).

## 25. Residual limitations and separately gated DEV execution

- GitHub Actions remains externally billing/spending-blocked before step
  execution: local verification is exhaustive but CI-unverified for this
  checkpoint; local green is never upgraded to a CI-green claim.
- Synthetic/shadow improvements remain planner-property evidence only; they
  are NOT real-world bug-yield proof. Any real-yield claim requires the
  separately authorized contained DEV campaign.
- Contained DEV execution of the handoff manifest requires its own fresh
  owner token (`PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED`)
  plus containment/currentness/checkpoint obligations; nothing was executed.

## 26. Terminal tokens

```text
PHASE_16H_STATUS: BLOCKED_EXTERNAL_CI
PHASE_16A_PORTFOLIO: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_16A_DEV_CAMPAIGN: NOT_AUTHORIZED
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Synthetic/backtest improvement must never be upgraded into real bug-yield
proof without a separately authorized real campaign.
