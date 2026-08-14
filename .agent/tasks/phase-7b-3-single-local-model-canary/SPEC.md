# Nightwatch Phase 7B.3 — Single Bounded Local-Model Canary

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Purpose

Prove one narrow protocol boundary: a single already-installed local model may
receive one fixed synthetic L2 `BUG_CANDIDATE` review through the hardened
loopback provider and return only a strictly validated, in-memory `AiBugDraft`
before a sanitized verdict is emitted. This is an integration canary, not a
quality evaluation, product investigation, evidence admission, owner review,
or Phase 8 capability.

## Starting State

- Task ID: `phase-7b-3-single-local-model-canary`.
- Canonical root:
  `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Starting SHA: `18bc3fa8f64322b8b43c9ccd0b07b182668d1932`, discovered from Git
  after fetch; `main`, clean worktree, and `HEAD == origin/main`.
- Prior validated Phase 7B.2.1 implementation/substantive anchor:
  `3916594f6e947f7f4665b23751c1d3ec03f5928b`.
- Phase 7B.2.1 remains `COMPLETE`.
- Phase 6 remains `FROZEN_BY_OWNER /
  INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 8 remains `NOT_STARTED`.

## Scope

Only Nightwatch source, deterministic tests, the one-shot local-canary CLI,
offline hardening/CI checks, task state, and sanitized project documentation.
The canary input is repository-defined synthetic L2 data with clearly fake
identifiers. The controller creates one fresh `AiReviewSession` without an
artifact store and calls only `reviewBugCandidate()` once. The fixed
`LoopbackAiReviewProvider` remains the sole HTTP client and its strict
loopback `/v1/chat/completions` contract is unchanged.

## Non-Goals

No model or runtime installation/download, cloud AI, API credentials, model
comparison/benchmarking, arbitrary prompt or input text, oracle suggestion,
retry/repair/self-critique, artifact persistence, owner review, private
findings enumeration, browser/campaign/auth/product execution, DEV/NEXT/
production traffic, database/infrastructure work, publication, Git runtime
authority, sibling-repository changes, or Phase 8 behavior.

## Safety Constraints

- The CLI accepts only `--endpoint`, `--model`, optional bounded `--timeout-ms`,
  and `--help`; it rejects prompt/file/input/artifact/finding/customer,
  provider-feature, output, publication, Git, browser, and product options.
- Endpoint validation is delegated to the canonical loopback validator before
  any request. No LAN scan, port scan, `/v1/models` request, redirect, HTTPS,
  credentials, query, fragment, proxy, cloud fallback, or arbitrary HTTP
  client is introduced.
- The model identifier uses the existing strict grammar and is never shell
  text or a filename. The operator must establish exact local model presence
  and an exact allowed endpoint before the real call.
- The real controller uses one fixed synthetic input, one `BUG_CANDIDATE`
  session operation, no `AiReviewArtifactStore`, no oracle operation, and no
  retry path. Fresh counters must be zero before entry and exactly
  `candidateReviewAttempts=1`, `oracleSuggestionAttempts=0`, and
  `providerCalls=1` after a provider call; pre-entry rejection may use zero
  provider calls.
- Raw model content remains in memory only inside the existing validation
  pipeline and is never printed or persisted. Results expose metadata, safe
  digests, schemas, IDs, counters, and validation classes only.
- Deterministic CI uses only a repository-owned loopback HTTP fixture and
  synthetic output. CI never starts or contacts a real model.
- If no already-compatible local runtime/model can be proven without
  installation or download, the final result is
  `HARNESS: PASS` and `REAL LOCAL-MODEL CANARY: NOT_RUN` with a sanitized
  reason and zero provider/loopback requests.

## Acceptance Criteria

1. A fixed versioned synthetic L2 fixture validates and contains no real
   identity, credential, financial, product, or URL values.
2. The controller and CLI cannot accept arbitrary prompt/input text and
   structurally permit only one bug-candidate provider operation.
3. Deterministic tests cover parser rejection, strict endpoint/model checks,
   request privacy/envelope, one request/no retry, malformed/invalid output,
   timeout/unavailable classification, reference/privacy validation, null
   artifact path, and no owner/persistence boundary.
4. `hardening:check` rejects canary authority expansion, generic HTTP,
   cloud/install/download strings, oracle/store/owner-review paths, and
   product/campaign/browser/auth imports.
5. TypeScript, focused AI/canary/provenance/agent-state tests, synthetic
   campaign, full deterministic validation, isolated clean checkout, and
   GitHub deterministic CI pass before any real call.
6. At most one real local loopback request is made. A runtime/model absence is
   recorded as `NOT_RUN`; a one-call integration failure is recorded as a
   sanitized `FAIL` with retry count zero; only a fully validated one-call
   in-memory draft qualifies as `PASS`.
7. Phase 8 remains explicitly `NOT_STARTED`, and no canary result changes
   deterministic evidence, owner decisions, safety scope, campaign state, or
   publication authority.
