# Nightwatch Phase 7B.1.1 — Runtime Deadline and Continuity Semantics Closeout

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Objective

Close two narrow hardening gaps in the completed Phase 7B.1 architecture:

1. make the aggregate AI session runtime deadline monotonic, absolute from
   construction, and actively cancelling at the private provider boundary;
2. make durable Git continuity record stable implementation/documentation
   anchors while Git supplies live local and remote HEAD values.

This task adds no AI capability. AI remains synthetic or explicitly loopback
fixture-local, unreviewed model material with no authority over Nightwatch
truth, execution, safety, privacy, owner scope, source, or publication.

## Established starting state

- Canonical repository is `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Branch is `main`; `origin/main` and local HEAD are synchronized at
  `102f40763da45e8866b4150869f45b152168f2bc`.
- Historical Phase 7B.1 substantive implementation remains
  `40e59ecf6209dac7ef88ac2af0bcef781562a837`; later descendants are
  documentation/status/handoff checkpoints and are not implementation truth.
- Phase 6 remains `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 7, Hardening I/I.1, Phase 7B, and Phase 7B.1 remain historical
  `COMPLETE`; Phase 8 remains `NOT_STARTED`.
- Current runtime evidence is authoritative: `AiReviewSession` uses
  `Date.now()` by default, outer timeout rejection does not abort a provider
  handler, Loopback lacks a propagated signal, and synthetic PENDING resolvers
  are not removed on cancellation.
- Current continuity evidence is authoritative: `bin/agent-state.mjs`
  requires `LAST_VALIDATED_IMPLEMENTATION_SHA == Current SHA` and compares
  persisted current local/remote fields instead of treating Git as the live
  authority.

## Scope

- `AiReviewSession` monotonic millisecond budget authority using Node's
  `performance.now()` by default, with injectable clocks retained for tests.
- One canonical remaining-runtime calculation and effective provider timeout
  capped by requested timeout, per-call policy, and remaining session time.
- Abort-signal propagation through the private provider handler boundary,
  exact-once timeout/settlement, timer cleanup, and accurate provider-call
  accounting.
- Loopback HTTP transport cancellation and synthetic PENDING cancellation,
  including shared-deadline concurrency regressions.
- `agent-state` stable SHA-role validation, live Git HEAD discovery, precise
  `SYNCED`/`CHECKPOINT_ADVANCE`/`STALE_IMPLEMENTATION_BASELINE` and semantic
  invalid-role/ancestry diagnostics, and COMPLETE-task closure strictness.
- Focused tests, canonical continuity templates/protocol guidance, and
  `docs/CURRENT_STATE.md` terminology reconciliation.

## Explicit non-goals

- No real model, cloud AI, model download, API key, external AI call, product
  traffic, authenticated browser journey, real campaign, database,
  infrastructure, deployment archaeology, Alphaus-repository modification,
  publication, owner-review CLI, automatic session factory, campaign hook, or
  Phase 8 functionality.
- No Git history rewrite and no automatic state self-healing.
- No relaxation of loopback endpoint containment, immutable v2 review
  provenance, owner policy, provider-call cap, or privacy scans.

## Runtime invariants

- The default budget authority is monotonic milliseconds, not wall-clock time.
- `elapsedMs = max(0, monotonicClock() - startedAt)` and
  `remainingRuntimeMs = max(0, maxTotalRuntimeMs - elapsedMs)` are centralized.
- No provider handler is exposed when remaining runtime is non-positive.
- Each actual provider call receives an `AbortSignal` and an effective timeout
  `min(requestedTimeoutMs, perCallTimeoutMs, remainingRuntimeMs)`.
- The aggregate deadline is absolute from session construction. Concurrent
  calls share it; none receives a new per-call extension.
- A provider-call reservation occurs once at handler entry and is never
  refunded, including timeout/cancellation.

## Continuity invariants

- `LAST_VALIDATED_IMPLEMENTATION_SHA` is a stable, valid, historical
  substantive ancestor of live HEAD; it does not need to equal live HEAD.
- `LAST_SUBSTANTIVE_CHECKPOINT_SHA` is required for new task state and equals
  the validated implementation anchor for this task.
- `LAST_DOCUMENTATION_CHECKPOINT_SHA`, when present, is a valid descendant of
  the substantive checkpoint and an ancestor of live HEAD, with only approved
  continuity/documentation paths in that range.
- `Current SHA`, `CURRENT_LOCAL_HEAD`, `CURRENT_REMOTE_HEAD`, and
  `LAST_PUSHED_SHA` are deprecated historical compatibility fields only; they
  are never live-head authority and are not required for new tasks.
- Git `rev-parse HEAD` (and, when available, `rev-parse origin/main`) supplies
  live state. A validator never requires a file to contain the SHA of its own
  containing commit.
- A documentation-only descendant is `CHECKPOINT_ADVANCE` and cannot become
  the validated implementation anchor. A `COMPLETE` task fails closure when
  source/test/config or another unapproved path changed after its anchor.

## Acceptance criteria

- Monotonic/default-clock, expired, near-expiry, concurrent, active-abort,
  loopback, synthetic cleanup, timeout-accounting, timer-cleanup, and existing
  7B.1 provenance/budget regressions pass.
- Continuity fixtures prove stable substantive anchors, documentation-only
  advances, mislabelled documentation SHAs, source drift, invalid ancestry,
  unrelated SHAs, untracked changes, legacy compatibility, and live-head
  discovery without persisted current-head equality.
- TypeScript, hardening, synthetic campaign, full Playwright, agent check,
  privacy/secret scan, diff check, isolated clean checkout, architecture and
  adversarial review all pass with zero forbidden safety vectors.
- Validated checkpoints are pushed to private `origin/main`; final live local
  HEAD equals live `origin/main` without a recursive self-reference commit.
