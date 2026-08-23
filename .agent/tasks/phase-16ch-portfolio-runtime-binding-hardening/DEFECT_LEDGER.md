# DEFECT LEDGER — Phase 16CH

Populate only from observed hardening failures. Hypotheses are not defects until reproduced.

| ID | Gate | Reproducer | Observed failure | Root cause | Source fix | Permanent regression | Narrow recheck | Broad recheck | Status |
|---|---|---|---|---|---|---|---|---|---|
| DEF-01 | W3 budget mapping / prepare seam | `tests/unit/phase16chDef01Probe.test.ts` (one-API binding through `assertPortfolioBudgetFeasible`) | `PORTFOLIO_ADMISSION_REJECTED:BUDGET_OVERSUBSCRIBED:<redacted-detail>` thrown for a documented-feasible journey+API binding (thrown from `src/core/portfolio/runtimeBinding.ts:722`) — the guard rejected EVERY admitted binding at the single prepare seam (`tests/manual/phase7-real-campaign.ts:166`), including all journey/API pairs and any API count; only zero-API bindings could ever pass, contradicting mapping v1's documented semantics (D-16C-3 / RUNTIME_BINDING_HANDOFF.md: "at most TWO linked APIs fit") | `assertPortfolioBudgetFeasible` used the reserve-INCLUSIVE derived caps as "needed" amounts: derived v1 caps already embed `PROMOTED_RESERVE_V1` once per dimension, so `needed + reserve > cap` was trivially true whenever any API was bound; the browser/actions branches compared reserve-inclusive caps against themselves plus reserve and could never fire; caps were also never clamped by the initial approved profile before comparison | Repaired in `src/core/portfolio/runtimeBinding.ts`: strip the embedded reserve from each derived cap to obtain needed amounts, clamp every cap by elementwise min against the initial approved profile (mirroring the mapped runtime values), then apply the reservation once — exactly the `analyzeCampaignBudgetFeasibility` arithmetic it documents | Permanent regressions: probe folded into `tests/unit/phase16chBudgetBindingHardening.test.ts` — one-API and two-API shapes must pass the guard, three-API shape MUST STILL throw `BUDGET_OVERSUBSCRIBED`, browser/actions branches now provably reachable (oversized-journey shape), and mapped-cap clamping is asserted | Probe rerun 2/2 green after fix; Phase-16C suites 33/0 green | Affected compatibility + canonical/isolated full regressions 2232/4/0 exact parity | FIXED_BROAD_GREEN |

Status vocabulary: OPEN, FIXED_FOCUSED, FIXED_BROAD_GREEN, BLOCKED_LOCAL, REFUTED_NOT_A_DEFECT.

## Initial hypotheses — test, do not pre-confirm

- HYP-01: field-by-field `portfolioBinding` tamper may expose a non-load-bearing resume field.
- HYP-02: launcher CRLF/no-final-newline/hostile path errors may leak raw detail or parse inconsistently across environments.
- HYP-03: mixed journey/API plans near reserve limits may expose budget-mapping incoherence despite elementwise monotonicity.
- HYP-04: canonical runtime linkage may become ambiguous under duplicate/cross-kind synthetic registry construction.
- HYP-05: schema-optional compatibility may regress historical campaignId/manifestFingerprint byte identity.
- HYP-06: resume reauthorization may be correctly checked in the adapter but bypassable through an alternate local call path.
- HYP-07: Phase-16C source additions may introduce complete-suite import/topology fallout missed by focused tests.
- HYP-08: isolated Node/filesystem/topology behavior may alter runtime-plan byte determinism or external-file rejection.
- HYP-09: static single-executor proof may reveal another runner/import path capable of executing a bound manifest without the portfolio gate.

Every disposition must cite current source/test evidence.

| DEF-02 | W7 launcher/file boundary / sanitized errors | `tests/unit/phase16chLauncherBoundary.test.ts` (hostile-key cases) | The strict document parsers echoed an attacker-controlled unknown-field KEY NAME verbatim into error output (`assertExactKeys` in `src/core/campaign/runtimeValidation.ts`: `${code}:UNKNOWN_FIELD:${key}`), so a hostile runtime-plan file could smuggle secret-shaped material (e.g. an `Authorization: Bearer <jwt>` JSON key) into stderr/durable errors — violating the bounded/sanitized-error contract. Field VALUES were never echoed (verified) | Unbounded key interpolation in the diagnostic path of the external-file boundary validator | Repaired in `src/core/campaign/runtimeValidation.ts`: key names are echoed only when they match a conservative safe-token shape (`/^[A-Za-z0-9_.:-]{1,64}$/`); anything else becomes `[UNSAFE_FIELD_NAME]`. Safe-shaped names keep their previous diagnostics (no internal-test drift) | Permanent regression: hostile-key matrix in `tests/unit/phase16chLauncherBoundary.test.ts` asserts unsafe names are masked and values never appear for safe-named fields | Launcher suite green after fix; corpus PHO/PPL/DOC parser matrices green (171/171) | Affected compatibility 172/0; canonical/isolated full regressions 2232/4/0 exact parity | FIXED_BROAD_GREEN |

Hypothesis dispositions (each cites current evidence):

- HYP-01 (non-load-bearing resume field): REFUTED_NOT_A_DEFECT — fingerprint matrix FP-001..FP-031: every mutation is either REFUSED by validation or changes campaignId/manifestFingerprint; zero UNCHANGED outcomes (`resumeFingerprintEscapeCount=0`). Notable: `budgetCaps` drift is refused structurally (`CAMPAIGN_PORTFOLIO_BUDGET_CAPS_MISMATCH`, selection.ts input boundary) and kind-crossing is refused by feasibility accounting.
- HYP-02 (launcher EOL/hostile leaks): CONFIRMED as DEF-02 (unsafe key-name echo); LF/CRLF/no-final-newline/extra-newline variants parse identically; BOM/empty/long-junk fail as SYNTAX class; hostile filenames never reach output raw.
- HYP-03 (budget-mapping incoherence near reserve limits): CONFIRMED as DEF-01 — the seam guard rejected every API-bearing binding; repaired while preserving the three-API fail-closed semantic.
- HYP-04 (linkage ambiguity under synthetic registry construction): REFUTED_NOT_A_DEFECT — duplicate rows/cross-lineage collisions fail closed at the builder (UNI-007/UNI-008) and admission (ADM-050).
- HYP-05 (legacy byte/digest regression from schema-optional binding): REFUTED_NOT_A_DEFECT — LEGACY_STABLE proven (binding-absent inputs recompute identical campaign ids; conditional-spread contract intact).
- HYP-06 (resume reauthorization bypassable via alternate local call path): REFUTED_NOT_A_DEFECT — static proof: exactly one production consumer chain (`bin/phase7-real.mjs -> playwright.phase7.config.ts -> tests/manual/phase7-real-campaign.ts`) and `verifyFrozenPortfolioOnResume` precedes executor construction; adapter-level gates mirrored by unit composition tests.
- HYP-07 (complete-suite import/topology fallout): REFUTED_NOT_A_DEFECT — clean canonical completed 2232/4/0 and the topology-correct isolated run completed the exact same 2232/4/0 with the same skip inventory.
- HYP-08 (isolated environment altering determinism/file rejection): REFUTED_NOT_A_DEFECT — fresh clone plus `npm ci`, read-only sibling symlinks and distinct proxy port matched canonical counts and skip identities exactly.
- HYP-09 (another runner/import path executing a bound manifest without the portfolio gate): REFUTED_NOT_A_DEFECT — repo-wide scan finds no second phase7 config consumer; no raw browser launch / CDP connect in the adapter outside Playwright fixtures.

Environment note (not a defect): two `selfDevAdoptionCli` cases fail closed with `SELFDEV_AUTHORITATIVE_SOURCE_DIRTY` whenever the working tree carries uncommitted changes (`src/core/provenance/localGit.ts`). They require the committed validated tree to pass and are expected green in the post-commit canonical/isolated regressions.
