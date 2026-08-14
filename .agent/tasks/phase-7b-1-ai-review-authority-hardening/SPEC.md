# Nightwatch Phase 7B.1 — AI Review Authority Hardening

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Objective

Harden the completed Phase 7B private AI review boundary without broadening AI
capability. There is one supported owner invocation authority (`AiReviewSession`)
for all provider exposure, with bounded candidate/oracle attempts, a shared
provider-call budget, synchronous reservations, accurate accounting, and no
automatic session recreation. AI remains synthetic/loopback-local review
material with zero authority over deterministic Nightwatch truth, execution,
scope, safety, privacy, publication, source, catalogs, or Phase 6.

AI-generated bug drafts and oracle suggestions are immutable model artifacts.
Their stored status is always `AI_GENERATED_UNREVIEWED`; effective owner review
state is a deterministic projection of the artifact, a separate exact-key
owner-only human-review record, the record/artifact digest match, and current
input freshness. A status field alone is never approval authority.

## Confirmed starting defects

At starting `a4f9ba7a761af233f1143d89d95ffa335d15fed7`:

- `src/core/aiReview/pipeline.ts:187-250` publicly exports low-level
  `reviewBugCandidate` and `suggestOracle`, and `index.ts` re-exports them;
  direct callers can avoid the session budget.
- `pipeline.ts:267-277` increments attempt counters and `providerCalls` before
  input validation, provider locality validation, or provider invocation.
- `types.ts`, `validation.ts:320/361`, and `storage.ts:18-35` permit and persist
  owner-looking final status values independently of a matching review record.
- `review.ts:57-68` rewrites the model artifact status to represent a human
  decision, so approval is not immutable companion provenance.

## Frozen budget semantics

One `AiReviewSession` is one explicit owner invocation boundary. Constructing a
new session is an intentional new invocation; no process-global lifetime
counter or automatic session factory is added.

- `candidateReviewAttempts`: synchronously reserved owner requests for bug
  candidate review, including invalid, privacy-blocked, disabled, and
  non-local-provider attempts; maximum 3 per session.
- `oracleSuggestionAttempts`: synchronously reserved owner requests for oracle
  suggestion, with the same failed-input semantics; maximum 3 per session.
- `providerCalls`: synchronously reserved transitions across the actual
  provider method boundary, shared by both products; maximum 3 per session.
  Validation failures, null providers, and non-local providers do not count.
  Once provider invocation starts, timeout, unavailable, malformed, oversized,
  schema-invalid, reference-invalid, privacy-rejected output, and storage
  failure do count and are never refunded.
- `maxTotalRuntimeMs` starts at session construction. Every attempt checks the
  deadline before validation and immediately before provider invocation;
  concurrent requests share the same deadline and reservations.
- `usage()` reports `candidateReviewAttempts`, `oracleSuggestionAttempts`, and
  actual `providerCalls` (with compatibility aliases only if harmless and
  unambiguous).

## Invocation architecture

The supported graph is:

```text
owner request -> AiReviewSession
  -> synchronous attempt reservation
  -> deadline/input/local-provider validation
  -> synchronous shared provider-call reservation
  -> private provider boundary
  -> bounded provider result
  -> strict output/reference/privacy validation
  -> immutable AI artifact
  -> optional private atomic storage
```

No exported function in `pipeline.ts` or `index.ts` directly invokes a
provider. Provider-invoking implementation is private/internal and static
hardening checks the exact call graph. Production/campaign code has no AI
execution import, and there is no automatic session loop, campaign hook,
daemon, retry, or CLI added here.

## Review provenance architecture

Generated artifact schemas are versioned to v2 because v1's mutable status
semantics no longer mean the same thing:

- `nightwatch.ai-bug-draft.private.v2`
- `nightwatch.ai-oracle-suggestion.private.v2`

Input, prompt, model-output, provider-adapter, and upstream deterministic
package versions remain v1 unless implementation evidence requires otherwise.
The human-review record is an immutable companion with exact runtime keys,
owner reviewer class, decision, review schema version, artifact schema version,
publication prohibition, digest binding, and deterministic record identity.

The effective projection is one of `UNREVIEWED`, `OWNER_APPROVED_DRAFT`,
`OWNER_REJECTED`, `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`, `SUPERSEDED`,
or `STALE`, with a provenance reason. A legacy v1 artifact is read only as
explicit `UNVERIFIED_LEGACY_REVIEW_STATE` unless a matching valid record
authorizes it; its status string is never trusted. One terminal owner decision
per exact artifact is the policy; conflicting decisions fail closed and do not
rewrite historical records. Owner supersede and deterministic input staleness
remain distinguishable reasons.

The original AI artifact identity (`draftId`/`suggestionId`, invocation ID,
input digest, provider/model/prompt/schema, response digest) never changes.
Storage writes the immutable generated artifact and the human-review record as
separate owner-only files. Rewrites, forged status edits, digest mismatches,
modified artifacts, mismatched records, stale inputs, unsafe model authority
fields, and private-storage corruption fail closed or project untrusted state.

Renderers consume the validated projection, never `artifact.status` alone.
Oracle approval remains manual implementation review only; no catalog,
registry, source, campaign, browser/API, publication, or execution path exists.

## Safety and exclusions

This task is local/static/synthetic/loopback-fixture-only. It runs no real
model, cloud AI, real campaign, auth capture, browser journey, DEV/NEXT/product
traffic, database, infrastructure, Alphaus-repository write, publication, or
Phase 8 functionality. Providers remain `SYNTHETIC_LOCAL` or explicit
localhost/127.0.0.1/::1 HTTP at `/v1/chat/completions`, with bounded bytes,
timeout, no credentials, redirects, proxy, tools, or fallback.

Phase 6 remains `FROZEN_BY_OWNER /
INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`; Phase 7 and Hardening I/I.1 and
historical Phase 7B remain complete; Phase 8 remains unstarted.

## Acceptance contract

Focused and adversarial tests prove attempt/provider accounting, shared and
concurrent budgets, provider failures, storage failures, disabled/non-local
providers, direct bypass absence, forged bug/oracle approval, exact review
records, digest mismatch, modified artifacts, stale inputs, conflicting
decisions, private corruption, model self-approval rejection, oracle/catalog
isolation, and zero AI execution authority. Required typecheck, hardening,
synthetic campaign, full Playwright, agent-state, diff/privacy, clean-checkout,
architecture, adversarial, commit/push, synchronized-origin, and readable-CI
checks must pass before closure.
