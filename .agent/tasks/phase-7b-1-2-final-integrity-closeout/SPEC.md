# Nightwatch Phase 7B.1.2 — Final Integrity Closeout

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Task purpose

Close the two remaining integrity defects identified after Phase 7B.1.1 and
add the missing remote continuity regression gate:

1. make `providerCalls` mean exactly the number of attempts to enter a
   registered provider handler by moving its reservation into one synchronous,
   final runtime/budget admission boundary immediately before handler entry;
2. make a newly advanced implementation/substantive SHA prove that the
   claimed commit itself is implementation-bearing, so a documentation-only
   commit cannot occupy both implementation roles; and
3. execute the synthetic agent-state continuity matrix independently in the
   private hardening workflow.

This is local/static/synthetic/loopback hardening only. It adds no AI
capability, owner-review CLI, campaign hook, real model, Phase 8 behavior, or
external authority.

## Established starting state

- Task ID: `phase-7b-1-2-final-integrity-closeout`.
- Canonical root is
  `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Branch is `main`; bootstrap verified a clean worktree and
  `HEAD == origin/main == 1819dbfcdf023044208bfa6a65eb8e823733804a`.
- `STARTING_SHA` is the live Git-derived `1819dbfcdf023044208bfa6a65eb8e823733804a`.
- Prior stable implementation/substantive anchor is
  `198f26ca79803c1bedac9aa08a71ecbd542ee804`; the starting commit is an
  approved documentation descendant.
- Phase 7B.1.1 is a complete historical predecessor. Phase 6 remains
  `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`; Phase 8 is
  `NOT_STARTED`.
- Current inspection confirms the provider reservation happens before a
  later `callProvider()` deadline check, and continuity role validation only
  performs the documentation-descendant check when validated and substantive
  values differ. The current CI invokes `npm run agent:check` but not the
  synthetic `tests/unit/agent-state.test.ts` matrix.
- Existing monotonic budgeting, active cancellation, loopback containment,
  synthetic pending cleanup, immutable AI artifacts, digest-bound owner
  provenance, owner scope, and raw-provider-bypass hardening are accepted
  predecessor behavior and must remain intact.

## Required deliverables

- A single private final provider-admission helper or equivalent session
  method that performs locality/registration trust, final monotonic remaining
  runtime, shared-cap check, effective timeout, cancellation-context setup,
  synchronous `providerCalls` increment, and immediate registered-handler
  invocation with no await/task boundary between increment and entry.
- Deterministic provider regressions for final-deadline expiry before handler
  entry, positive final admission, synchronous handler throw, timeout,
  malformed output, storage failure, three-call concurrency, fourth-call
  rejection, cancellation, timer cleanup, and provider registration failure.
- A read-only Git helper that classifies the paths changed by the claimed
  commit itself, with conservative merge/root/unknown handling, and role and
  lineage diagnostics including `INVALID_IMPLEMENTATION_ROLE` and
  `INVALID_IMPLEMENTATION_LINEAGE` where applicable.
- Synthetic Git-history tests for same-value documentation forgery at HEAD
  and later documentation, valid source-B/docs-C state, forged C state,
  carried-forward implementation, new implementation lineage, unrelated
  lineage, documentation ancestry/path errors, untracked source, COMPLETE
  drift, and live-head authority.
- A private CI step that runs
  `npx playwright test tests/unit/agent-state.test.ts --project=nightwatch --workers=1`
  (or the repository-equivalent command) with `fetch-depth: 0` and
  `contents: read` unchanged.
- Complete local validation, isolated clean-checkout validation, privacy and
  safety review, stable-anchor documentation, pushed substantive and
  documentation checkpoints, and exact final GitHub Actions verification.

## Frozen accounting decisions

- `candidateReviewAttempts` and `oracleSuggestionAttempts` remain owner
  request-attempt counters.
- `providerCalls` is the shared count of actual attempts to enter the
  registered provider handler. It increments exactly once at the final
  boundary and is never refunded after handler entry.
- A registered handler that throws synchronously at entry has been entered and
  therefore consumes one provider call. Timeout, cancellation, unavailable or
  malformed output, schema rejection, and storage failure after entry also
  consume one call.
- A non-local or unregistered provider fails before the final boundary and
  leaves `providerCalls` at zero.

## Frozen continuity decisions

- Live local and remote HEAD are discovered from Git; no persisted current
  HEAD or self-referential final SHA is introduced.
- A validated implementation anchor older than or equal to `STARTING_SHA` is
  a carried-forward historical anchor and is not reclassified merely because
  the task makes documentation-only progress.
- If `STARTING_SHA` is an ancestor of a different claimed validated anchor,
  the task is making a new implementation claim. The claimed commit itself
  must change at least one path outside the narrow approved checkpoint
  allowlist. A documentation-only claimed commit is
  `INVALID_IMPLEMENTATION_ROLE`, even when validated and substantive fields
  are equal and even when it is live HEAD.
- Validated and substantive remain equal for new implementation state.
  Documentation is a separate descendant role and is checked by ancestry and
  changed-path allowlist.
- Merge commit role cannot be proven by guessing. If its direct changed paths
  or parent/range attribution is ambiguous, the validator rejects the claim
  with a precise invalid-role/lineage error.

## Safety constraints

- Run only local tests, synthetic Git fixtures, and loopback fixture traffic.
- Never run `campaign:real`, auth capture, real browser journeys, a local
  model, model downloads, cloud AI, DEV/NEXT/production traffic, databases,
  infrastructure commands, or publication.
- Nightwatch is the only writable repository. Sibling Alphaus repositories
  remain untouched and read-only.
- No credentials, tokens, cookies, storage state, customer/account/billing
  values, raw authenticated evidence, real prompts/responses, or findings may
  enter source, artifacts, or `.agent` files. Synthetic sentinels only.
- `bin/agent-state.mjs` remains detection-only: no fetch, rewrite, staging,
  commit, reset, checkout, or push.
- Push only validated Nightwatch checkpoints to private `origin/main`; never
  force-push and stop if remote history advances or a push is rejected.

## Acceptance criteria

- Final runtime expiration before handler entry produces
  `AI_REVIEW_RUNTIME_BUDGET_EXHAUSTED`, one owner attempt, zero provider
  calls, zero provider invocations, and zero pending work.
- Positive final admission produces exactly one provider call and one handler
  invocation with an effective timeout equal to the admitted remaining
  runtime when that is the limiting input.
- Synchronous handler throw, timeout, malformed/schema-invalid output, and
  storage failure each consume one provider call; no call is refunded.
- The shared cap remains three under concurrent pressure and a fourth valid
  request cannot enter a handler.
- Monotonic runtime budgeting, active `AbortSignal` cancellation, loopback
  request destruction, synthetic pending cleanup, immutable review artifacts,
  owner provenance, loopback containment, and raw-provider-bypass checks stay
  green.
- A same-value docs-only `validated=C/substantive=C/HEAD=C` state fails with
  `INVALID_IMPLEMENTATION_ROLE`; a later docs descendant fails similarly.
- A real source implementation `B` followed by docs `C` passes as
  `CHECKPOINT_ADVANCE` when validated/substantive remain `B` and documentation
  is `C`.
- A carried-forward implementation ancestor of `STARTING_SHA` remains valid;
  an unrelated implementation lineage fails; documentation ancestry and path
  checks remain fail-closed; COMPLETE source drift remains blocked; live HEAD
  remains Git-derived.
- The agent-state synthetic matrix executes and passes in the exact final
  `Nightwatch hardening` workflow run for the exact final pushed SHA.
- Typecheck, hardening, focused AI/loopback/continuity tests, full Playwright,
  synthetic campaign, `agent:check`, diff check, privacy scan, and isolated
  clean-checkout validation pass with the required zero safety/privacy vectors.
- Phase 7B.1.1 remains historical COMPLETE, Phase 8 remains NOT_STARTED, the
  task closes with stable anchors, and the worktree is clean.
