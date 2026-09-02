# C-10.5 Provenance and Project-Truth Closure

## Purpose

C-10 landed a real privacy boundary, but the authority at its root was a
LABEL. `createProvenRouteVocabulary` and `createProvenKeyVocabulary` were
public functions that accepted a caller-chosen provenance class, any
shape-valid `ev:sha256:<24hex>` digest, and arbitrary caller-selected members.
Nothing computed or verified the digest against a source artifact, and no
non-test producer existed at all — so the `SOURCE_PROVEN_*` claim was never
mechanically established.

After this campaign a production-safe vocabulary can be obtained ONLY by
presenting a validated source-evidence capability to a trusted adapter, which
computes the provenance identity itself. C-11 can then treat C-10 as a real
prerequisite.

## Starting State

- Task ID: `nightwatch-c10-provenance-truth-closure-v1`
- Starting SHA: `cb631cc4af3c3572f4cbf78da04a8265075fbfa5` (verified
  `origin/main` and local HEAD at campaign start; clean tree, single worktree).
- Verified predecessor truth: C-10 substantive implementation
  `23523cc743c77b2250738caa980c218dab8671bb`; final exact-head CI run
  `33601265465` / job `100155266632` at `cb631cc`, Node 20, all eleven
  required groups PASS, `SYNTHETIC_CAMPAIGN` 221/221, receipt
  `receipt:sha256:f38b272bec3a37464257e194`. All three values were confirmed
  read-only through the GitHub API before any file was modified; the prompt's
  §0 expectations matched reality exactly.
- Established facts that must not be rediscovered: `node:crypto` is the ONE
  node builtin the C-10 cone may import (`bin/hardening-check.mjs`
  `checkC10ProductionPrivacyBoundary`), so the cone can compute a canonical
  digest without breaking import isolation. C-02a already supplies
  `SourceOperationDescriptor` (operationId, repository, sourceSha, method,
  path), `SourceOperationProjectionCompleteness`, and
  `SourceEvidenceProvenance` (qualifier, `GenerationCurrency`,
  `ProductionAdmissionEvidenceDecision`) — the adapter has real inputs.

## Scope

A1 records → A2 reproduction → A3 authority model → A4 route derivation →
A5 key derivation → A6 forgery resistance → A7 content binding → A8 isolation
→ A9 `CURRENT_STATE` reconciliation → A10 validator repair → A11 certification
reconciliation → A12 digest-semantics reconciliation → A13 persisted-position
sentinel rule → A14 validation → A15 gate.

## Non-Goals

As SPEC. No C-11, no C-06 change, no real-environment contact.

## Safety Constraints

Owned session worktree only. Synthetic sentinels only. No sibling write. No
weakening of any gate, no `test.skip`, no test deletion, no retry or timeout
inflation, no `skip-worktree`/`assume-unchanged`, no force push, no
destructive reset.

## Architecture / Approach

Authority is relocated, not renamed.

1. **Runtime brand, not a type brand.** A module-private `WeakSet` inside the
   cone holds every capability the trusted mint produced. Consumption requires
   membership. Object identity cannot survive `JSON.parse`, so a
   shape-matching revival is refused — the A6 requirement that TypeScript
   branding alone cannot satisfy.
2. **Computed identity, not a supplied digest.** The mint takes a validated
   evidence record and computes `ev:sha256:*` over a canonical encoding of
   source identity, evidence class, source checkpoint, completeness,
   currentness, vocabulary version and sorted members. There is no digest
   parameter, so no caller can choose a provenance identity.
3. **Fail-closed evidence invariants.** The mint rejects a non-COMPLETE
   inventory, a non-CURRENT generated artifact where currency is required, a
   malformed source SHA, an unknown repository, a missing operationId where
   C-02a requires one, and an evidence-class/vocabulary-class mismatch.
4. **Derivation outside the cone.** The filesystem-facing adapter lives
   outside `src/core/prodPrivacy/**` and produces the validated evidence
   record; the cone stays `node:crypto`-only.
5. **Mechanical restriction of the mint's importers.** A `hardening:check`
   rule bounds which modules may import the mint, so "arbitrary application
   code calls the mint directly" is prevented statically, in the style the
   repository already uses for its other cone invariants.
6. **Test seam that cannot reach production authority.** A clearly branded
   TEST-ONLY mint produces capabilities carrying a non-production authority
   marker, which the production authority path refuses.

## Milestones

- **M0 — records and activation.** Task SPEC/PLAN/STATE/REPORT plus the
  OpenSpec change (`audit.md`, `proposal.md`, `design.md`, `tasks.md`,
  `specs/production-provenance-authority/spec.md`); rewritten
  `.agent/EXECUTION_PROMPT.md` with `Planned-From: cb631cc`; `ACTIVE_TASK.md`
  and the `CURRENT_STATE` live-state block routed to this task.
  Acceptance: `npm run handoff:check` PASS, `npm run agent:check` PASS.
  Status: IN_PROGRESS
- **M1 — A2 reproduction recorded.** Executable synthetic negative test
  demonstrating label-only minting and shape-only JSON revival, with captured
  output in `audit.md`.
  Acceptance: the test fails against repaired code and is retained as the
  forgery-resistance assertion rather than deleted.
  Status: NOT_STARTED
- **M2 — A3/A7 authority core.** Validated source-evidence capability types,
  the canonical binding encoder, the computed-digest mint and the runtime
  brand registry.
  Status: NOT_STARTED
- **M3 — A4 route derivation.** Trusted OpenAPI-operation and PHP-route
  adapters; fail-closed where PHP cannot yet establish admissibility, with the
  reason documented rather than completeness invented.
  Status: NOT_STARTED
- **M4 — A5 key derivation.** OpenAPI-definition, PHP row-key and
  fixed-contract adapters; raw constructors withdrawn from the public surface.
  Status: NOT_STARTED
- **M5 — A6 forgery-resistance suite.** The eleven adversarial classes the
  brief enumerates.
  Status: NOT_STARTED
- **M6 — A8 isolation proof.** Cone import isolation retained and the mint's
  importer set mechanically bounded.
  Status: NOT_STARTED
- **M7 — A9 project-state reconciliation.** Each live anchor set to the
  checkpoint it actually claims, with per-field semantics stated.
  Status: NOT_STARTED
- **M8 — A10 validator repair.** Cross-authority invariant plus the eight
  adversarial cases.
  Status: NOT_STARTED
- **M9 — A11/A12 documentation reconciliation.** Final C-10 counts and
  unambiguous production digest semantics, history preserved.
  Status: NOT_STARTED
- **M10 — A13 persisted-position sentinel rule.** Field inventory that fails
  when a new free-form persisted field lacks coverage.
  Status: NOT_STARTED
- **M11 — A14 validation and integration.** Full validation set, `gate:local`,
  `gate:clean`, integration through C-00, exact-head CI.
  Status: NOT_STARTED
- **M12 — A15 gate and closeout.** Every Stage-A gate item confirmed or the
  campaign reported incomplete.
  Status: NOT_STARTED

## Validation Strategy

`npm run typecheck`, `hardening:check`, `project:check`, `handoff:check`,
`agent:check`, `agent:audit`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, all C-10 suites, the new provenance suites, affected
source-intelligence suites, the project-state validator suites, the full
canonical Playwright regression, then `gate:local` and `gate:clean`, then
integration and an exact-head GitHub Actions result with all eleven required
groups PASS.

## Decision Log

- 2026-09-02 — **Verify §0 before trusting it.** The prompt's CI expectations
  disagreed with both `ACTIVE_TASK.md` (run `33600603779` at `1234daf`) and
  the `CURRENT_STATE` narrative (run `33590645175` at `b99ce4e`). Resolved
  read-only through the GitHub API: run `33601265465` / job `100155266632` at
  `cb631cc` with receipt `receipt:sha256:f38b272bec3a37464257e194` is real and
  green, so the prompt is correct and both repository documents are behind.
  Consequence: A9 and A11 transcribe verified values, and the two stale
  documents are the defect rather than the prompt.
- 2026-09-02 — **Runtime brand over type brand.** A6 requires that serialized
  JSON cannot become a trusted capability by matching shape.
  `Object.freeze` + shape validation — all C-10 had — cannot express that, and
  a TypeScript brand is erased at runtime. A module-private `WeakSet` keyed on
  object identity is pure (no fs/net/process), so it is cone-legal, and it
  fails closed across any serialization boundary.
- 2026-09-02 — **No digest parameter at all.** Rather than validate a supplied
  digest against a recomputation, the mint exposes no digest parameter. A
  caller therefore cannot express the forgery, which is stronger than
  detecting it.

## Discoveries

- The A2 weakness is real and worse than the brief assumed: there was no
  non-test producer of either vocabulary anywhere in `src/` or `bin/`, so
  every `SOURCE_PROVEN_*` claim in the shipped system originated from a test
  fixture. Recorded output is in the OpenSpec `audit.md`.
- `routeVocabulary.ts`'s own header comment asserted that "the provenance
  digest binds this set to that source". No code performed that binding; the
  comment described an intent the implementation never had.
- The `CURRENT_STATE` drift is broader than the five fields A9 names: the
  "Exact-head CI is green" narrative section also still described run
  `33590645175` at `b99ce4e`.

## Deferred Work

C-11 `PROD_OBSERVE` (Stage B) is deliberately not started here and requires
the Stage-A gate to pass first.

## Completion Criteria

As SPEC — the A15 gate in full. If any item fails, Stage A is reported
incomplete and C-11 is not started.
