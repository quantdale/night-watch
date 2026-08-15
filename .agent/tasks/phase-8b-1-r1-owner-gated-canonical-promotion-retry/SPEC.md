# Nightwatch Phase 8B.1-R1 — Owner-Gated Canonical Promotion Retry

## Task purpose

Execute exactly ONE fresh, owner-authorized canonical promotion retry after
first replacing the repository-wide "real catalog must stay empty" CI
assumption with a promotion-compatible catalog-integrity invariant, proving
the complete durable lifecycle from an EMPTY canonical catalog through one
verified one-entry canonical adoption committed on private `main` with exact
green CI, then closing the retry task under continuity protocol v2 with the
portfolio still offering candidate B — NOT exhausted.

## Established starting state

- Task ID: `phase-8b-1-r1-owner-gated-canonical-promotion-retry`
- Starting SHA: `a12431522d8545ba94c71ee7f4e6189837342961`
  (HEAD == origin/main == expected authorization SHA; worktree clean)
- Historical Phase 8B.1 attempt: BLOCKED / CLOSED; old approval
  `canonical-promotion-approval:sha256:17c970356d9d2691c3f371ecda2c2acbcd9d367585db766aec41b23097f34c47`
  consumed = true, permanently spent (re-verified read-only at task start).
- Phase statuses: 8 = IN_PROGRESS, 8B = COMPLETE_SANDBOX_ONLY, 8B.0.1 =
  COMPLETE, 8B.1.0/8B.1.0.1/8B.1.0.2 = COMPLETE.
- Canonical catalog: EMPTY, digest
  `ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334`,
  count 0. Portfolio semantics (verified from source): EMPTY -> EXPAND_SUMMARY
  (A); A adopted -> EXPAND_THEN_COLLAPSE (B); A+B -> EXHAUSTED.
- Empty-only operational gates (must be replaced, NOT optional):
  1. `.github/workflows/hardening.yml` step "Phase 8B.1.0 checkout cleanliness
     (real catalog must stay empty)" — `grep -qF 'SELFDEV_ADOPTED_CASES = [];'`
  2. `bin/hardening-check.mjs` `checkPhase8B10PortfolioIntegrity` — rejects
     any non-empty real catalog.
- Pre-task digests: sourceBundleDigest
  `sha256:34673592b455f4c08c642f68429b1f5f90f4d4fbcca594d56e19aa8d0f0fa688`,
  contractDigest `sha256:0336723f4b11129e1ffbd75b9212a88b7c50e023bfbc51a050235fecd2ec6bba`.

## Required deliverables

1. v2 retry task records (`SPEC/PLAN/STATE/REPORT.md`) +
   `.agent/ACTIVE_TASK.md` under `nightwatch.agent-continuity.v2`.
2. Repository-wide empty-only assumption audit (classified A–E).
3. Catalog-integrity invariant replacing the empty-only gates (valid for
   EMPTY, one-entry, and future two-entry/exhausted states), reusing
   `validateAdoptedCatalog` / `renderAdoptedCatalogSource`.
4. Focused catalog-integrity tests (empty/one/two-entry valid; malformed,
   duplicate ID/fingerprint, noncanonical bytes, source-injection, overflow
   rejected) without weakening existing Phase 8B tests.
5. Pre-promotion readiness commit + push + exact green CI (catalog still
   EMPTY); that HEAD becomes the frozen promotion base.
6. Fresh v2 synthetic selfDev session (replay PASS, candidate A eligible).
7. Fresh sandbox inspect/plan/run (SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED,
   all five probes PASS, sandboxSourceWrites 1, zero canonical/Git/external).
8. Disposable exact one-entry future-state rehearsal: full suite 0 failed,
   CI-equivalent gates PASS, portfolio selects B normally.
9. Exactly one fresh promotion prepare, exactly one fresh one-shot approval
   (`CANONICAL_ONE_FILE_ONLY`), exactly one canonical APPLY writing only
   `src/core/selfDev/adoptedCaseCatalog.generated.ts`, fresh-process verify
   PASS, post-apply full regression 0 failed.
10. Exactly one canonical adoption commit (that one file) + push + exact green
    CI with the new catalog-integrity step accepting count=1; committed
    currentness `CANONICAL_PROMOTION_COMMITTED_EXACT`.
11. Fresh post-commit session selects B (replay PASS, passCandidateCount 1),
    read-only B eligibility proof, post-commit isolated full-history
    regression 0 failed.
12. Continuity v2 closure (COMPLETE, no placeholders), docs-only finalization
    commit + push + exact green CI, final `agent:check`/`agent:audit` zero
    strict errors.

## Explicit non-goals

- No second approval, no second APPLY, no automatic retry on any failure.
- No promotion of B; portfolio must remain A-adopted/B-available.
- No change to promotion semantics to make the attempt pass.
- No Phase 6 (GCP/GKE/K8s/AWS/DynamoDB/BigQuery/Spanner) usage; no
  campaign:real / observe:authenticated / journey:real / auth:capture / DEV
  browser flows; no external AI/model invocation (synthetic AI tests only).
- No publication, no product access, no database/infrastructure queries, no
  Alphaus repo writes, no runtime Git mutation from the promotion engine.
- No rewrite of the historical 8B.1 task record (stays BLOCKED).

## Safety constraints

- Promotion runtime: canonical source writes <= 1, runtime Git writes 0,
  external calls 0; approval consumption is atomic no-replace before the
  write; the one write is confined to the single fixed target.
- Development-session Git commits/pushes to the private Nightwatch remote are
  the allowed checkpoint pattern; rollback (if the one APPLY succeeds but a
  later acceptance gate fails) restores the EXACT preimage bytes only, as a
  development-session action, and then the task STOPS classified.
- All rehearsal checkouts are disposable, isolated, full-history clones;
  never push rehearsal commits; never alter the canonical checkout.
- Private artifact contents are never exposed; only IDs/digests/counts.

## Acceptance criteria

- Bootstrap CASE D verified; v2 task created; historical approval rechecked
  consumed with exactly 1+1 records.
- Audit classifies every occurrence; only D-class gates changed.
- Readiness commit (workflow + hardening + tests + continuity records only;
  catalog UNCHANGED empty) exact CI green; catalog digest unchanged.
- Fresh session: replay PASS, eligible, exactly one candidate A
  (EXPAND_SUMMARY), passCandidateCount 1.
- Fresh sandbox result verified with all five probes PASS and side-effect
  counters exactly (1,0,0,0).
- Disposable one-entry rehearsal: full Playwright 0 failed, local CI-equivalent
  gates PASS, portfolio selects B (replay PASS, passCandidateCount 1).
- One promotion intent, one approval (consumed exactly once), one APPLY
  (APPLIED, exactly one changed file, postimage digest exact), fresh-process
  verify `CANONICAL_APPLIED_VERIFIED_UNCOMMITTED`, approval consumed.
- Real one-entry full local regression 0 failed; canonical commit contains
  exactly one source file; exact canonical-commit CI green incl. catalog
  integrity at count 1.
- Committed currentness `CANONICAL_PROMOTION_COMMITTED_EXACT`; post-commit
  session selects B; B eligibility demonstrated read-only; post-commit
  isolated regression 0 failed.
- Retry task COMPLETE under v2 with final exact docs CI green and
  `agent:check`/`agent:audit` zero strict errors; final catalog count 1;
  final HEAD == origin/main; overall Phase 8B.1 = COMPLETE VIA RETRY R1.
- Final verdict `PHASE_8B_1_R1_COMPLETE_CANONICAL_ADOPTION_VERIFIED`; next
  action STOP.
