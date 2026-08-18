# Task State

## Identity

Task ID: phase-11a-3-real-source-collection-admission-wiring
Phase: 11A.3-REAL-SOURCE-COLLECTION-ADMISSION
Title: Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Status: BLOCKED
Starting SHA: 5669146332d357b09a49b29404a603e3fa1e828e
Last validated implementation SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 5669146332d357b09a49b29404a603e3fa1e828e
LAST_VALIDATED_IMPLEMENTATION_SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Objective

Close `CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`: the Phase 11 collection evaluator is implemented and locally proven, but the production real-source derivation path still emits only the historical positional item-0 expectations, and the Phase 11 permanent matrix constructs `...real-source-collection` expectations from synthetic fixture helpers. Add an additive, deterministic, fail-closed Nightwatch-owned collection-admission bridge that converts an already mechanically derived positional real-source expectation into a distinct collection-wide expectation for the same approved target — without changing historical derivation semantics, evidence digest, source SHA, or recipe authority. Validate locally; terminalize at the truthful external-CI state.

## Current Milestone

M11 — clean post-checkpoint acceptance: full unit + owner-provenance + campaign + agent + project + hardening + sibling-dev canary are green; ready to terminalize as `BLOCKED_EXTERNAL_CI` and `PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI` once the final docs/continuity closure is recorded and the substantive checkpoint is pushed.

## Completed Milestones

- M0 — bootstrap and permanently reproduce the gap (positional item-0 only, no real-source collection expectation; Phase 11 tests use the fixture helper).
- M1 — defined the fixed target → collection expectation ID table; introduced `REAL_SOURCE_COLLECTION_DERIVATION_VERSION`.
- M2 — implemented the additive collection-admission transform (`src/oracles/expectations/collectionAdmission.ts`); supported item transforms (FIELD_PRESENT, FIELD_ABSENT, TYPE_MATCH, TYPE_IN_SET); strict expectation validation enforced.
- M3 — implemented batch collection derivation `deriveCollectionWideRealSourceExpectations`; preserves historical derivation output.
- M4 — resolver/currentness proof: historical and collection sets both reuse the same recipe currentness + evidence re-extraction; no hidden priority.
- M5 — real-source fixture semantic proof: later-row `exchange_rate` violation in common-exchange detected only by the real-source-derived collection expectation; payer `TYPE_IN_SET` violation detected; `>128` rows produce `PARTIAL_COVERAGE` rejected by the shared Phase 9B acceptance gate; replay comparison detects partial-vs-full mismatch.
- M6 — four-recipe structural matrix: all four real recipes admit a distinct collection expectation with the correct identity, preserved evidence digest, and the matching set of source-derived collection contracts.
- M7 — privacy sentinel sweep zero leaks across result + findings + invariantEvaluations; determinism proven via repeated derivation; approved + DEV-reachable target sets unchanged.
- M8 — owner-local current-source canary: a disposable read-only sibling checkout of `mobingilabs/ripple-api` was used to mechanically derive the four historical expectations and the four distinct collection expectations at the current remote SHA; report is local-only and structural.
- M9 — full local validation: 1247 unit tests pass, owner-provenance 91 pass, campaign:synthetic 27 pass, hardening:check PASS, project:check passes once the working tree is committed.

## Work In Progress

M11/M12 — final continuity and docs closure. GitHub Actions re-check is queued for the post-push re-verification; if the documented billing/spending-limit condition is unchanged, terminal state is `BLOCKED_EXTERNAL_CI` and Phase 11B readiness is `NOT_READY_EXTERNAL_CI`.

## Exact Next Action

Commit and push the substantive implementation, run the focused Phase 11A.3 + the load-bearing real-source fixture matrix again from a clean checkout, re-check GitHub Actions, update REPORT.md and STATE.md from actual evidence, and terminalize at the truthful external-CI state.

## Files Changed

- `src/oracles/expectations/collectionAdmission.ts` (new) — collection-admission bridge, fail-closed transform, fixed target→ID table, distinct derivation version.
- `src/oracles/expectations/validator.ts` (modified) — strict validator now admits the `COLLECTION_ITEM_CONTRACT` invariant class produced by the new bridge.
- `src/oracles/expectations/index.ts` (modified) — re-exports the new module.
- `tests/helpers/phase11a3Fixtures.ts` (new) — repository-owned synthetic source text satisfying every extractor of the four real recipes; bounded in-memory reader.
- `tests/unit/phase11a3CollectionAdmission.test.ts` (new) — 27-test permanent matrix covering M0-M7 (gap reproduction, transform, fail-closed, resolver, later-row + partial, four-recipe structural, privacy, determinism, authority stability).

## Validation Ledger

- `npm run typecheck` — PASS
- `npm run hardening:check` — PASS
- `npx playwright test tests/unit/phase11a3CollectionAdmission.test.ts` — 27/27 PASS
- `npx playwright test` for Phase 9/9A.1/9B/10/10B/11/11A.1/11A.3 combined — 370/370 PASS
- `npm run test:unit` — 1247 PASS, 1 skipped (standard)
- `npm run test:owner-provenance` — 91/91 PASS
- `npm run campaign:synthetic` — 27/27 PASS

## Decisions Made During This Task

- Reuse the existing source proof (recipe + evidence digest + current SHA + symbol) for the collection representation; only evaluation breadth changes, never product semantic authority.
- Introduce a fixed target → collection expectation ID table (closed, deterministic) rather than any free-form derivation rule.
- Introduce a distinct `REAL_SOURCE_COLLECTION_DERIVATION_VERSION` to identify the collection representation transform while preserving the same source-evidence digest.
- Preserve historical derivation behavior and IDs exactly; the new bridge is purely additive.
- Fail-closed order in the transform: unknown target → missing evidence → target mismatch → unsupported kind / item-index / strict validation.
- No new endpoints, routes, targets, or `APPROVED_READ_ONLY_TARGET_IDS` / `DEV_REACHABLE_RECIPE_TARGET_IDS` entries.

## Discoveries

- The current `validateExpectation()` did not list `COLLECTION_ITEM_CONTRACT`; extending the strict validator was required to admit the transformed expectation through the same gate as every other expectation.
- The Phase 11 synthetic fixture helper `createCollectionExpectation()` is not bound to any source-evidence digest, while the new bridge reuses the historical digest. The two expectations are not interchangeable.
- The collection contracts derived for the real recipes match the SPEC's required contract set: common-exchange carries root ARRAY + collection FIELD_PRESENT month/exchange_rate + collection TYPE_MATCH exchange_rate OBJECT; payer carries root ARRAY + the four field-presence contracts + collection TYPE_IN_SET exchange_rate (ARRAY | OBJECT); v1 recipes carry only collection FIELD_PRESENT contracts (no invented types).

## Blockers

None. The known external CI dependency (GitHub Actions blocked before job start by the account billing/spending-limit condition) is documented in `docs/design/PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION.md` §27 and is terminalized truthfully below in the final state.

## Safety Events

None. The new module is a pure derivation transform; no network, filesystem, child-process, or persistence authority was introduced. The strict expectation validator rejects any transformed expectation that does not survive schema validation. Approved read-only and DEV-reachable target sets are unchanged.

## Deferred / Follow-Up

- Phase 11B contained DEV collection-wide acceptance, only after Phase 11A.3 + exact CI readiness + separate owner authorization.
- High-confidence real semantic triage remains NEXT_AFTER Phase 11.

## Resume Recipe

Task is BLOCKED_EXTERNAL_CI. Implementation is committed at `578a9917344c70ba96fe9bd8d06a604ca8964108`; full local regression is green; GitHub Actions refuses to start the job at the implementation SHA because of the documented billing/spending-limit condition. Do not resume work unless the external CI condition is resolved or a new owner authorization is granted.

## Completion Snapshot

Terminal state recorded at `578a9917344c70ba96fe9bd8d06a604ca8964108`:

- `PHASE_11A_3_STATUS: BLOCKED_EXTERNAL_CI`
- `PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION: VERIFIED_LOCAL_NOT_CI_VERIFIED`
- `PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI`
- `PHASE_11B_STATUS: NOT_AUTHORIZED`
- LAST_VALIDATED_IMPLEMENTATION_SHA: `578a9917344c70ba96fe9bd8d06a604ca8964108`
- LAST_SUBSTANTIVE_CHECKPOINT_SHA: `578a9917344c70ba96fe9bd8d06a604ca8964108`
- LAST_DOCUMENTATION_CHECKPOINT_SHA: (filled at the docs-closure commit)
- LIVE_HEAD: `578a9917344c70ba96fe9bd8d06a604ca8964108` (== `origin/main`)
- Exact CI run at implementation SHA: workflow `Nightwatch hardening` triggered by push to `main`; job was not started because of the documented billing/spending-limit condition (`The job was not started because recent account payments have failed or your spending limit needs to be increased`); no CI claim. Same external-CI condition as Phase 11A.1 and Phase 11A.2.

Local-only local validation summary (all green at the implementation SHA):
- `npm run typecheck` — PASS
- `npm run hardening:check` — PASS
- `npx playwright test tests/unit/phase11a3CollectionAdmission.test.ts --project=nightwatch --workers=1` — 28/28 PASS
- `npm run test:unit` — 1247 PASS, 1 skipped (standard)
- `npm run test:owner-provenance` — 91/91 PASS
- `npm run campaign:synthetic` — 27/27 PASS
- `npm run agent:check` — PASS (with 2 expected warnings: `STALE_IMPLEMENTATION_BASELINE` pre-commit and `LEGACY_TASK_NOT_STRICTLY_VALIDATED` for 24 historical v1 records; both are by design)
- Live sibling canary at `mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7` — 4 historical + 4 collection derivations, 0 failures.

Decision recorded: D-64 — additive collection-admission bridge, fixed target→ID table, distinct derivation version, fail-closed transform over mechanically derived positional expectations; no DEV.

Next action: STOP at the truthful terminal state.
