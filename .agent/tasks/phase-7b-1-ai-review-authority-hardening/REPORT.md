# NIGHTWATCH PHASE 7B.1 — AI REVIEW AUTHORITY HARDENING REPORT

Status: `COMPLETE`

This is the narrow hardening descendant of historical Phase 7B. The historical
Phase 7B report is unchanged. No Phase 8 capability was started.

## Checkpoints

- Starting SHA: `a4f9ba7a761af233f1143d89d95ffa335d15fed7`.
- Validated implementation SHA: `40e59ecf6209dac7ef88ac2af0bcef781562a837`.
- Substantive checkpoint: `40e59ecf6209dac7ef88ac2af0bcef781562a837`.
- Documentation checkpoint: `8ca71c7ce2849b1187f6e6989453ae397c2c4ce8`.
- Continuity checkpoint: `595985affd86328b417a2c84b89fcf402158a63a`.
- Final status-only handoff before this wording correction:
  `c86cdbb2ae6031c58c15d5b63a354fda9496510c`, with workflow
  `31768163245` successful. The final wording correction is state-only and
  is reported as the terminal clean head in the task response.

## Findings and fixes

1. Confirmed invocation bypass: the starting `pipeline.ts` exported
   `reviewBugCandidate` and `suggestOracle`, and `index.ts` re-exported them.
   A caller could avoid `AiReviewSession` and its advertised budgets. The raw
   functions and provider methods are removed from the supported and direct
   runtime surfaces. `AiReviewSession` is the only provider-execution API.
2. Confirmed accounting defect: the starting session incremented
   `providerCalls` before input/provider validation. Attempt counters and the
   actual provider-call counter are now separate and precise.
3. Confirmed provenance defect: the starting validators/storage accepted
   owner-looking status without a review record, and `applyHumanDecision`
   rewrote artifact status. Generated artifacts are now v2, unreviewed-only,
   and owner decisions are immutable companion records projected into effective
   state.

## Invocation authority and call graph

```text
explicit owner request
  -> AiReviewSession
  -> synchronous attempt reservation and deadline check
  -> strict input / size / local-provider validation
  -> synchronous shared provider-call reservation
  -> private registered handler boundary
  -> bounded provider response
  -> strict output/reference/privacy validation
  -> immutable v2 AI artifact
  -> optional owner-only atomic storage
```

There is one `invokeRegisteredProvider` definition and one call site. Static
hardening rejects exported raw functions, direct provider-operation calls,
imports of the internal invoker, non-AI runtime session creation, campaign AI
references, and additional provider paths.

### Public export audit

| Export | Purpose | Can invoke provider? | Can write private artifact? | Can change owner review state? | Budget authority required? | Surface |
|---|---|---:|---:|---:|---:|---|
| `AiReviewSession` | Explicit owner candidate/oracle invocation | Yes, only through its session reservations | Optional via its store option | No | Yes | Public |
| `AiReviewArtifactStore` | Write/read owner-only generated artifacts and records | No | Yes | No; records are separate and validated | No | Public |
| `createHumanReviewRecord` | Build an owner decision from a validated v2 artifact | No | No | Creates a record value only; does not rewrite an artifact | No | Public |
| `projectEffective*Review` / `validateReviewedArtifact` | Validate digest, record, freshness, and effective state | No | No | No | No | Public |
| `renderBugDraft` | Render deterministic facts, AI prose, and projected review state | No | No | No | No | Public |
| `SyntheticAiReviewProvider` / `LoopbackAiReviewProvider` | Local provider metadata and private handler registration | No direct operation method | No | No | Session required for exposure | Public metadata adapters |
| `registerAiReviewProvider` / handler type | Adapter registration hook | No; registration is not execution | No | No | Session required for exposure | Internal pipeline module; not index-exported |
| `invokeRegisteredProvider` | Single internal provider boundary | Yes | No | No | Private session call only | Module-private |

## Budget and accounting evidence

- Candidate attempts: `candidateReviewAttempts` is a synchronous owner-request
  reservation, maximum 3 per session. Invalid, privacy-blocked, disabled, and
  non-local requests consume an attempt but do not expose a provider.
- Oracle attempts: `oracleSuggestionAttempts` has the same semantics and
  maximum 3 per session.
- Provider calls: `providerCalls` is a synchronous reservation immediately
  before handler entry, maximum 3 shared across bug and oracle operations.
  Provider timeout, unavailable, malformed, oversized, schema-invalid,
  reference-invalid, privacy-rejected, and post-provider storage failures
  consume the call and are never refunded.
- Mixed budget: two bug calls plus one oracle call reaches `providerCalls=3`;
  the fourth valid request fails with `AI_REVIEW_PROVIDER_BUDGET_EXHAUSTED`
  before provider invocation.
- Concurrency: four concurrent pending requests produce exactly three actual
  synthetic invocations; the fourth is rejected before handler entry.
- Invalid-input accounting: one L1/privacy-blocked candidate gives attempts 1,
  provider calls 0, and provider invocation count 0; a following valid request
  gives attempts 2, provider calls 1, and invocation count 1.
- Null/non-local provider: the owner attempt is consumed, but provider calls
  and provider invocation count remain 0.
- Runtime: the 15-second session wall-clock budget begins at construction and
  is checked before validation and again before provider reservation.

## Review provenance evidence

- Before: v1 artifacts could carry owner-looking statuses independently of a
  matching human record; human decisions rewrote the artifact.
- After: generated artifacts use
  `nightwatch.ai-bug-draft.private.v2` and
  `nightwatch.ai-oracle-suggestion.private.v2`, with only
  `AI_GENERATED_UNREVIEWED` stored status. The original IDs, invocation/model
  identity, input digest, prompt/schema identity, response digest, and bytes
  remain model provenance.
- Human records use `nightwatch.ai-human-review.private.v2` and exact runtime
  keys: review ID, artifact ID/kind/schema, decision, reviewed time, owner
  reviewer class, notes, full artifact digest, review schema, and prohibited
  publication. The deterministic review ID binds the record fields without
  self-reference.
- Effective approval is derived only from artifact + validated record + exact
  digest match + current deterministic input. The renderer uses this projection
  and never trusts `artifact.status` as owner authority.
- v1 read compatibility is explicit. Historical flat v1 review envelopes are
  readable only after removing the private-store wrapper status and passing
  exact v1 validation; a v1 owner-looking artifact without that record projects
  `UNVERIFIED_LEGACY_REVIEW_STATE`, never approval.
- One terminal decision per exact artifact is the policy. Conflicting records
  fail closed. Owner `SUPERSEDE` projects `SUPERSEDED`; changed deterministic
  input projects `STALE`, preserving the historical record and reason.

## Adversarial regressions

- Public raw-function import and direct pipeline import: absent.
- Forged bug `OWNER_APPROVED_DRAFT`: v2 validation, storage, rendering, and
  reviewed-artifact validation fail closed; no current approval appears.
- Forged oracle `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`: validation and
  reviewed-artifact validation fail closed; the unreviewed projection remains
  unreviewed without a record.
- Review record A with artifact B, and artifact A modified after review: both
  fail `AI_REVIEW_ARTIFACT_DIGEST_MISMATCH`.
- Approval followed by changed evidence level/source snapshot/input digest:
  effective state becomes `STALE`; the historical record is retained.
- Provider output containing `ownerApproved`, approval status, decision,
  reviewer class, artifact digest, or execution fields: exact-key output
  validation rejects it; no human record can be created by model output.
- Private storage corruption, attempted artifact rewrite, and conflicting
  record writes fail closed while owner-only atomic storage remains in use.
- Prompt injection, publication/tool/Phase 6/Git/source-write requests,
  unknown fields, invented references, privacy sentinels, and unsafe oracle
  proposals remain inert/rejected synthetic data.

## Validation ledger

- Focused AI/loopback tests: **54/54 PASS**.
- Synthetic campaign: **27/27 PASS**.
- Full Playwright suite: **453/453 PASS**.
- `npm run typecheck`: **PASS**.
- `npm run hardening:check`: **PASS**.
- `npm run agent:check`: **PASS**; pre-closure runs emitted only the expected
  checkpoint-advance warning while implementation was uncommitted or docs
  were being reconciled.
- `git diff --check`: **PASS**.
- Isolated clean checkout from the pushed implementation: `npm ci
  --ignore-scripts`, typecheck, hardening, focused 54/54, campaign 27/27, and
  agent-state all **PASS**. npm reported only the repository's existing Vue EOL
  notice and audit summary; no installation or model download was performed.
- Exact remote workflow verification: run `31767901883`, conclusion
  **success**, head `595985affd86328b417a2c84b89fcf402158a63a`.
- CI workflow retains `permissions: contents: read`, no secrets, no artifact
  upload, no external AI, and explicitly runs the 7B/7B.1 synthetic matrix.

## Authority/safety review

- AI can change deterministic evidence level, candidate admission, campaign
  result/budget, safety/privacy vectors, owner scope, action/oracle catalogs,
  browser/API execution, Phase 6, Git, source, or publication: **No**.
- AI can create a human-review record or self-approve: **No**.
- AI approval changes the oracle catalog, executes an oracle, or publishes:
  **No**.
- Phase 7 automatically invokes AI: **No**.
- Phase 8 functionality is reachable: **No**.
- Owner scope remains `FROZEN_BY_OWNER /
  INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`; allowed AI classes remain only
  `AI_REVIEW_LOCAL` and `AI_ORACLE_SUGGESTION_LOCAL`.
- Provider policy remains synthetic local or explicitly contained HTTP
  loopback only. No cloud provider, credential, real model, or fallback exists.

## Safety and privacy vectors

DEV contacts 0; NEXT contacts 0; production attempts 0; product mutations 0;
database queries 0; infrastructure queries 0; external publication attempts 0;
external AI calls 0; AI tool executions 0; AI source modifications 0.

Persisted real credentials 0; customer-data leaks 0; financial values 0; raw
bodies/DOM/screenshots/authenticated traces 0; real AI output in Git 0. Existing
tests use synthetic sentinel values only. No Alphaus repository was modified.

## Remaining debt and verdict

The optional owner review CLI and local-model canary remain deferred. No cloud
provider, real model, campaign hook, oracle registration, or Phase 8 work was
started. Acceptance is **PASS** for Phase 7B.1. The terminal status-only
handoff does not change source or workflow behavior. Do not start a next task
from this report; any future work requires a separate explicit owner request.
