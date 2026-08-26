# Nightwatch Source-to-Campaign Proof Chain Expansion — Frozen Specification

Task ID: nightwatch-source-to-campaign-proof-chain-expansion-v1
Phase: SOURCE-TO-CAMPAIGN-PROOF-CHAIN-EXPANSION-V1
Title: Source-to-Campaign Proof Chain Expansion
Status: IN_PROGRESS
Authorization class: NIGHTWATCH_SOURCE_TO_CAMPAIGN_PROOF_CHAIN_EXPANSION_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Intent

Substantially increase Nightwatch's mechanically justified bug-hunting
surface by closing the strongest current proof gaps in the chain

`SOURCE_DISCOVERED -> ROUTE_PROVEN -> REQUEST_CONTRACT -> RESPONSE_CONTRACT ->
SEMANTIC_CONTRACT -> MUTABILITY_CLASSIFICATION -> READ_ONLY_PROOF ->
JOIN_GRAPH_REQUIREMENTS -> RUNTIME_BINDING -> REPLAY_REQUIREMENTS ->
DOSSIER_REQUIREMENTS -> PHASE24_ELIGIBILITY`.

The campaign starts from a fresh live Git and approved-source census. It may
produce a zero-unlock result. Coverage counts are measurements, never goals.

## Required outcome

Build a deterministic, privacy-safe proof-chain census for every current
surface; identify the highest-leverage mechanically solvable gap; investigate
response, semantic, runtime-binding, join-graph, and Phase-24 bridge families;
and implement only a bounded proof authority that current approved source
actually supports. Any new fact must flow through the existing authorities and
must remain distinct from mutability, replay, dossier, owner-policy, and
campaign eligibility authority.

If no proof family clears the admission bar, preserve all exclusions and
deliver measured rejection taxonomy, deterministic regression coverage,
currentness evidence, and a truthful no-unlock result.

## Permanent boundaries

- LOCAL / approved read-only source / synthetic only.
- No DEV, NEXT, production, authenticated product observation, auth-state read,
  product mutation, database/datastore/SQL/cloud/infrastructure operation,
  Alphaus sibling write, external publication, external coordination, runtime
  AI/model call, or canonical self-development promotion.
- Approved sibling repositories are read only through the existing confined
  source boundary. No application/PHP/runtime execution, framework emulation,
  autoloading, child process, shell, arbitrary filesystem root, or network
  authority may enter a proof core.
- Raw source, source snippets, request/response bodies, customer values,
  credentials, cookies, traces, arbitrary private paths, and owner-only
  findings remain ephemeral and must not enter Git, task state, DTOs,
  diagnostics, caches, dossiers, operator views, or Control Center data.
- Existing source inventory, response/semantic contracts, mutation/read-only
  authority, source graph, currentness/cache, replay, dossier, owner policy,
  Control Center, and Phase-24 selector remain authoritative. No second
  selector, mutability registry, eligibility engine, persistence authority,
  or semantic truth model may be created.
- HTTP verbs, endpoint names, comments, UI wording, route conventions,
  absence of an obvious write, guessed datastore behavior, fuzzy matching,
  partial AST cones, one successful synthetic execution, and model/LLM output
  are never proof.
- Unknown, dynamic, ambiguous, stale, unsupported, truncated, over-budget, or
  partially resolved behavior is NOT PROVEN and fails closed before executor
  construction or eligibility.

## Proof admission bar

An admitted proof authority must be versioned, deterministic, source-bound,
SHA/currentness-bound, content-identity-bound, fail-closed, budget-bounded,
invalidated on relevant source changes, structurally testable, privacy-safe,
and explainable with sanitized reason codes. It requires current positive
examples plus adversarial nearby negatives, exact declaration/dependency
identity, complete branch/reachable behavior within a fixed vocabulary, and
integration through existing source descriptors and Phase 24 inputs.

## Required investigation and validation

The census must measure operations, route/request/response/semantic contracts,
mutability, read-only proofs, joins, runtime bindings, replay, dossier
compatibility, eligibility, first and secondary blockers, distributions,
currentness, unsupported constructs, and bounded resource costs. At least
three deterministic repetitions are required for new census/proof outputs,
including fresh-process and topology-correct isolated checks where applicable.

Adversarial fixtures must cover dynamic dispatch, aliases, same-name and
ambiguous declarations, incomplete branches, helper indirection, unresolved
imports/includes, unsupported syntax, stale SHA/content, moved/duplicate trees,
portfolio mismatch, truncation, budget exhaustion, circular dependencies,
ambiguous adapters, mismatched contracts, semantically incompatible shapes,
read/write mixtures, misleading GET routes/names/comments, and privacy
sentinels. Budget exhaustion is an explicit rejection, never partial proof.

## Completion boundary

Success is either coverage unlocked through the full authoritative chain,
reusable proof infrastructure with no current unlock, or evidence that the
remaining blockers require runtime evidence, authorization, source changes,
or unsafe heuristics. Completion requires focused and adversarial tests,
privacy/currentness/determinism/boundedness evidence, local and clean Node20
gates, canonical and topology-correct isolated regression parity, continuity
and project-state checks, documentation truth, a clean pushed `main`, and
verified local `HEAD == origin/main`. External CI is reported only if it
actually executes; local green never becomes a CI claim.
