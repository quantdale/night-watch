# Nightwatch Phase 9B-R1 — Auth-Refreshed Contained DEV Semantic Acceptance Retry

## Purpose

After the owner's human-led DEV auth refresh, execute the ONE authorized
retry of the contained DEV semantic acceptance using the already-validated
Phase 9B harness (cdfdf31 / exact CI 31934803846) with NO reimplementation:
fresh remote source truth, fresh derivation of
`ripple.common-exchange.read.real-source-shape`, structural auth
validation, one `npm run phase9b:real` invocation (FIRST + one fresh-
context REPLAY), safe receipts, and a truthful terminal token — closing
Phase 9 on success or stopping with an exact blocker on failure.

## Starting State

- Task ID: `phase-9b-r1-auth-refreshed-dev-semantic-acceptance`; Starting
  SHA `05def7abf92818c7de48fba658579397b236def7` (CASE D, clean).
- Validated harness: `cdfdf314839fd782a962e4096b68b32641a93db2` (exact CI
  31934803846, success); harness source verified byte-identical between
  cdfdf31 and HEAD. Original Phase 9B task BLOCKED (D-56), spent, not
  reopened; its launcher ran once but created no browser context (zero DEV
  contact).
- Historical remote values (must be re-discovered, not reused): ripple-api
  master `169df39d…`, ripple-ui dev `818ce2da…`; selected digest
  `ev:sha256:608265368c9a086f43c94e5c`.
- External auth `$HOME/.nightwatch/auth/ripple-dev-state.json` human-
  refreshed; structural/boolean validation only.
- Harness behavior (from the original task): optional semanticOracle wiring
  into createNetworkObserver; pure Phase 9B freshness/preflight/safe-summary
  core; dedicated gated launcher; fixed common-exchange journey; no journey
  selector; no URL selector; no new endpoint authority; exact-head CI
  precondition; semantic receipt/replay summaries; privacy audit; one-pair
  execution bound.

## Scope

- New docs: R1 strict-v2 task records; ACTIVE_TASK transition; minimal
  truthful current-state wording; R1 pre-run docs checkpoint (§6) — NO
  source/harness changes.
- Execution: fresh remote freshness (gh api); disposable /tmp snapshot if
  needed; fresh derivation at the approved snapshot; resolver restricted to
  `ripple.common-exchange.read`; structural auth precheck; exact-head CI
  gate; ONE launcher invocation; safe summaries; post-run privacy audit +
  safety vector + sibling integrity.
- Closure: safe tracked docs (D-57), final exact CI, 96-item report, STOP.

## Non-Goals

No harness reimplementation/patching; no second journey; no fallback; no
R2; no auth:capture in-session; no credentials; no new endpoint authority;
no NEXT/production; no mutation; no DB/infra; no deployment binding; no
screenshots/traces/DOM; no raw persistence; no AI; no Alphaus writes; no
selfDev/promotion/catalog; no variant-B adoption; no publication; no Phase 9
next-phase implementation; no reopening of the original Phase 9B task.

## Safety Constraints

- Read-only toward Alphaus; canonical siblings never mutated; disposable
  /tmp mirrors only.
- Containment unchanged (L0-L5, traces/screenshots/raw-body persistence/
  customer DOM OFF, mutation registry ON, canonical DEV target exact).
- Raw response text transient in-memory only.
- Pre-browser hard gates: freshness, derivation+RESOLVED, exact-head CI,
  auth structural+expiry, proxy, canonical target, traces/screenshots.
- Zero hard semantic outcomes on the selected target in both passes; zero
  hard safety counters; no retry after the one invocation; no post-run
  implementation patching.

## Architecture / Approach

1. Bootstrap (git state wins) -> CASE D.
2. Verify harness integrity (cdfdf31..HEAD source diff empty).
3. Create R1 strict-v2 task records + ACTIVE_TASK (IN_PROGRESS).
4. R1 docs checkpoint: commit + push fast-forward; wait exact CI (incl.
   Phase 9 / 9A.1 / 9B harness matrices, project/agent/catalog/hardening/
   campaign). NO new implementation checkpoint.
5. Fresh remote source check (gh api) + freshness classification
   (re-derive at the exact current snapshot; drift -> exact BLOCK tokens).
6. Re-derive `ripple.common-exchange.read.real-source-shape`; resolver
   restricted to the selected target; require RESOLVED + exact SHA +
   evidence digest.
7. Auth structural precheck (safe absolute external path, regular file, no
   symlink, shape, DEV semantics, token present, cookie not expired,
   domain/path semantics). Fail -> PHASE_9B_R1_BLOCKED_AUTH_REFRESH_INVALID.
8. Pre-DEV readiness summary (13 checks) + exact-head CI gate; the runner
   repeats these immediately before each context.
9. ONE `npm run phase9b:real -- --env=dev
   --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json` invocation
   (FIRST + one fresh-context REPLAY), then STOP invoking.
10. Post-run: safe summaries comparison, zero-count verification, privacy
    audit, safety vector, sibling integrity, product-contact accounting.
11. Terminal branch (PASS / PASS_WITH_REPRODUCIBLE_SEMANTIC_MISMATCH /
    BLOCKED + exact blocker); docs closure (D-57); final exact CI; report.

## Milestones

- M0 — Bootstrap + harness integrity + R1 task records + ACTIVE_TASK.
  Acceptance: agent:check PASS for the new task. Status: COMPLETE.
- M1 — R1 docs checkpoint commit + push + exact CI green (incl. Phase 9B
  harness matrix). Status: COMPLETE (f88b6f1; exact CI 31938800275,
  29/29 green).
- M2 — Fresh remote source check + freshness decision + re-derivation +
  resolver RESOLVED. Status: COMPLETE (remotes unchanged; runner re-derived
  at 169df39d; resolver RESOLVED pre-browser).
- M3 — Auth structural precheck (refreshed state) + pre-DEV readiness +
  exact-head CI gate. Status: COMPLETE (auth PASS, expired=false; all
  gates green).
- M4 — ONE launcher invocation: FIRST + one fresh-context REPLAY; safe
  receipts; zero-counts; replay determinism. Status: COMPLETE (launcher
  exit 0; FIRST and REPLAY decisive PASS; deterministic).
- M5 — Post-run privacy audit + safety vector + sibling integrity +
  product-contact accounting. Status: COMPLETE (audit PASS; vector zero;
  siblings unchanged; 1 launcher / 2 contexts / 2 passes / 1 pair).
- M6 — Docs closure (D-57) + final exact CI + 96-item report + STOP.
  Status: COMPLETE (this closure; final CI pending at close time).

## Validation Strategy

- Pre-run: agent:check/audit, project:check, catalog integrity,
  hardening:check, typecheck (unchanged harness), exact CI for the R1
  checkpoint SHA (incl. the Phase 9B harness matrix step).
- Freshness: read-only gh api remote heads; exact-range diffs vs the
  reviewed contract; fresh derivation at the approved snapshot; resolver
  RESOLVED immediately before launch.
- Auth: structural/boolean validation only (no secret output); the runner
  re-validates before every context.
- Post-run: normalized FIRST/REPLAY summaries comparison (same
  expectationId/targetId/source SHA/evidence digest/outcome/invariant
  counts/fingerprints); required zero counts; structural privacy audit;
  sibling git status unchanged; explicit launcher/context/pass/pair
  accounting.
- Final: exact CI green at the closure SHA.

## Decision Log

- (expected) D-57: Phase 9B-R1 result record — filled at closure with the
  real verdict tokens and evidence summary.

## Discoveries

- Harness source is byte-identical between cdfdf31 and HEAD (docs-only
  closure); no re-derivation of harness semantics needed.

## Deferred Work

- Any reproducible product semantic mismatch -> separate fresh read-only
  anomaly investigation (no root-cause inside this task).
- Source-to-deployment identity proof (Phase 6 boundary; not this task).
- Any Phase 9B-R2 requires a fresh owner authorization.

## Completion Criteria

Terminal record under continuity v2 with one of the exact tokens,
truthful evidence in STATE/REPORT, safe docs closure committed (D-57),
exact final CI green, 96-item report delivered, NEXT ACTION STOP, no second
launcher invocation.
