# Nightwatch Phase 7B — Bounded Private AI Review Assistance

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Objective

Add a private, offline-first review-assistance boundary over Nightwatch's
existing `nightwatch.ai-ready-evidence.private.v1` deterministic package.
The first products are an owner-reviewable bug draft for L2/L3 evidence and
a non-executable oracle suggestion derived from sanitized Phase 3 structural
change evidence. Every model result is unreviewed until an explicit owner
decision; no result can affect Nightwatch truth, execution, scope, privacy,
safety, publication, or source.

## Authority contract

Deterministic Nightwatch evidence, oracles, campaign state, safety/privacy
vectors, owner policy, and action/oracle catalogs remain authoritative. The
model receives one strict sanitized DTO and returns opaque text/bytes. Runtime
validators parse hostile output, enforce exact schemas and reference
integrity, and copy immutable facts from deterministic input. Nothing in this
task imports campaign admission, browser/API execution, Phase 6 adapters,
oracle registration, safe-action catalogs, Git writers, or publication code.

The architecture is one-way:

```text
deterministic evidence -> sanitized input -> optional local/synthetic model
-> strict validator -> AI_GENERATED_UNREVIEWED private companion artifact
-> explicit OWNER review record
```

## Threat model

This task primarily defends against hallucinated facts and references, prompt
injection in evidence text, unsupported causal language, fake source
attribution, evidence-level promotion, malformed/unknown/oversized output,
secret/private-data leakage, provider/configuration drift, stale artifacts,
tool/action/publication requests, oracle auto-adoption, and automatic source
modification. Malicious root, a compromised OS/kernel, and physical
compromise are out of scope; no stronger guarantee is claimed.

## Frozen scope and exclusions

- Reuse the existing deterministic AI-ready package and private artifact store.
- Add strict versioned input, model-output, bug-draft, oracle-suggestion, and
  owner-review DTO validators with exact-key and bounded runtime checks.
- Enforce L2/L3-only bug-draft eligibility; L0/L1/transient candidates are
  rejected before provider invocation.
- Provide a deterministic synthetic provider for all acceptance/adversarial
  cases and an optional loopback-only OpenAI-compatible adapter.
- Provide no cloud provider, credentials, model download, proxy fallback,
  tools/functions, browser/API/database/infrastructure access, shell, Git
  writes, publication, campaign hook, source patch, generated code, or Phase 8
  loop.
- Real AI artifacts remain owner-only outside Git under the existing private
  store. Synthetic fixtures and schemas/tests are the only committed outputs.

## Versioned contracts

- Input: `nightwatch.ai-review-input.private.v1`.
- Bug draft: `nightwatch.ai-bug-draft.private.v1`.
- Oracle suggestion: `nightwatch.ai-oracle-suggestion.private.v1`.
- Human review: `nightwatch.ai-human-review.private.v1`.
- Prompt: `nightwatch.ai-review-prompt.private.v1`.
- Provider adapter: `nightwatch.ai-provider-adapter.private.v1`.

The upstream deterministic package remains
`nightwatch.ai-ready-evidence.private.v1`; this task does not replace it.

## Privacy and eligibility gates

Before invocation, validate input schema, owner scope, `privacy.result=PASS`,
zero safety counters, bounded structural fields, no secret/raw-data markers,
valid candidate references, and a local or synthetic provider class. Bug
drafting accepts only evidence level `L2` or `L3`. Inputs containing raw
credentials, cookies, storage state, customer/account identifiers, costs,
raw bodies, DOM, screenshots, or authenticated traces return a sanitized
privacy error without calling the provider.

## Bug draft semantics

The persisted draft always has status `AI_GENERATED_UNREVIEWED`, visible AI
provenance, deterministic input package ID/digest, immutable evidence level,
evidence/source references, explicit uncertainties, `humanReviewRequired=true`,
`externalPublication=PROHIBITED`, zero safety vector, and PASS privacy vector.
The model cannot set owner approval, root-cause verification, deployment
verification, campaign result, evidence level, severity, priority, or any
operational field. Hypotheses are structurally labeled
`UNVERIFIED_HYPOTHESIS`; `whatWouldDiscriminate` is descriptive only.

## Oracle suggestion semantics

The model receives changed paths/types, dependency/lineage relations, journey
and API-family links, source snapshot references, current deterministic oracle
coverage, and missing coverage classes—not whole source files or diffs. A
valid suggestion is conceptual deterministic documentation-like data only.
It contains `executable=false`, requires human review, and owner approval can
only produce `APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`. No registry,
manifest, action catalog, source file, request, selector, URL, datastore,
infrastructure, or publication callback exists in this flow.

## Budgets and failure classes

The explicit owner invocation budget is small and bounded: at most 3 candidate
reviews, 3 oracle suggestions, 64 KiB input per call, 32 KiB output per call,
3 provider calls total, 5 seconds per call, and 15 seconds total runtime.
There are no automatic retries. Provider and validator failures use the
sanitized classes `AI_PROVIDER_DISABLED`, `AI_PROVIDER_UNAVAILABLE`,
`AI_PROVIDER_NOT_LOCAL`, `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_OUTPUT_TOO_LARGE`,
`AI_PROVIDER_MALFORMED_OUTPUT`, `AI_OUTPUT_SCHEMA_INVALID`,
`AI_OUTPUT_REFERENCE_INVALID`, `AI_OUTPUT_PRIVACY_BLOCKED`,
`AI_INPUT_NOT_ELIGIBLE`, and `AI_INPUT_PRIVACY_BLOCKED`.

## Acceptance boundary

Phase 7B may close only after synthetic DTO/provider/privacy/reference/
immutable-fact/prompt-injection/hallucination/staleness/owner-review tests,
loopback containment tests, campaign/oracle isolation tests, hardening and CI
checks, TypeScript, synthetic campaign, full existing Playwright, agent state,
diff/privacy review, clean-checkout validation, and final private checkpoint
push pass. No real finding or real target is required or permitted. Phase 6
stays frozen, Phase 7 stays complete, and Phase 8 remains unstarted.
