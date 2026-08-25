# Response-Flow Proof-Binding Hardening Specification

Task ID: `response-flow-proof-binding-hardening`
Phase: `RESPONSE-FLOW-PROOF-BINDING-HARDENING`
Title: Nightwatch — Exact Response-Flow Declaration Binding Hardening
Status: COMPLETE
Authorization class: `RESPONSE_FLOW_PROOF_BINDING_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY`
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Objective

Remove concrete false-positive admissions in the existing Phase 27 exact PHP
response-flow resolver without adding a new source-intelligence family. Exact
helper proofs must bind to the originating declaration, compatible declaration
kind/modifiers, approved source identity, and existing fail-closed policy.

## Fresh evidence

The live repository is clean and synchronized at starting SHA
`27fe332644d5065942223fc11576e8ee97777258`. A fresh confined census of all
six approved repositories reproduced the Phase 28 source snapshot
`srcsnapshot:sha256:04ff583971865f335902f5ad`, the six configured repository
SHAs, 1,732 files considered, 1,092 read, 1,078 admitted, 654 rejected,
12,449,877 bytes, 128 operations, 127 route proofs, 127 request contracts,
83 response contracts, 175 semantic observations, 118 proven joins, 10
rejected joins, 13 response-flow attempts, 0 response-flow proofs, 0 resolved
calls, lifecycle 45/80/3, and Phase 24 3 eligible / 125 excluded. The gap
taxonomy digest remains `source-gap-taxonomy:sha256:7adf9ef4eee0788461b34494`.

The existing focused source suites pass, but two deterministic synthetic
probes exposed unsound admissions in the current resolver:

1. `$this->payload()` in one `Reader` declaration was resolved to a
   same-named `Reader::payload()` declaration in another file and returned
   `PROVEN`.
2. `Helper::payload()` was resolved and returned `PROVEN` although the target
   method was not declared `static`.

These are correctness/safety defects in an existing proof path, not evidence
for a new producer or dispatch family.

## Scope

- exact response-flow declaration indexing and target binding;
- same-class and `self` file confinement;
- static-call declaration modifier and class-policy checks;
- root/target source-SHA consistency and versioned cache identity;
- sanitized proof lineage, graph/review compatibility, and deterministic
  regression coverage;
- current source census and before/after proof metrics.

## Non-goals

No dynamic dispatch, variable callable, namespace/import, inheritance, trait,
interface, magic-method, factory, resource, DTO, property/service chain,
generic PHP data-flow, framework/container inference, PHP execution, runtime
or deployment inference, read-only inference, Phase 24 authority change, DEV/
NEXT/production contact, database/cloud/infrastructure work, Alphaus write,
publication, self-development promotion, or AI runtime authority.

## Authority boundary

This task grants only local Nightwatch implementation, synthetic fixture, and
confined read-only approved-source analysis authority. `SiblingSourceAccess`
remains the only sibling filesystem boundary. Phase 24 remains the sole
candidate/eligibility authority. Response proof never proves mutation safety.

## Explicit admission criteria

An exact flow may remain `PROVEN` only when:

- the root declaration matches the operation repository, path, symbol, and
  source SHA;
- `$this` and `self` targets resolve in the originating file and exact class;
- named static targets are one unambiguous approved, non-namespaced,
  non-unsupported, publicly static declaration;
- every dependency has the same current source identity and inspected-content
  digest already established by the inventory;
- branch, cycle, depth, declaration, source, and lexical bounds remain intact;
- unknown, ambiguous, malformed, stale, unsupported, or incompatible cases
  remain rejected with safe categorical reasons;
- proof and cache identities change when the binding contract changes; and
- no raw source, literal value, credential, token, or runtime value crosses a
  persisted boundary.

## Safety constraints

All source reads are local, read-only, path-confined, bounded, and ephemeral.
No PHP is executed. Diagnostics and task records contain only safe identities,
paths already allowed by source descriptors, categories, counts, and digests.
Existing owner-scope blocks and all external-operation prohibitions remain
unchanged.

## Milestones

- M0 — bootstrap, live census, dependency-cone audit, and defect reproduction.
- M1 — exact binding design, version/currentness contract, and regression
  matrix.
- M2 — resolver implementation with focused positive/negative controls.
- M3 — cache, graph, review, Phase 24, taxonomy, and operator compatibility.
- M4 — full adversarial/privacy/determinism validation and source re-census.
- M5 — complete qualification, documentation, continuity closure, and Git
  synchronization.

## Validation strategy

Run focused response-flow tests after each implementation slice, then typecheck
and hardening. Exercise positive same-class/static/self flows plus cross-file,
non-static, non-public, namespaced, inheritance/trait, source-SHA mismatch,
stale-content, duplicate, cycle, depth, budget, malformed, privacy, cache,
reordered-input, and unrelated-change controls. Finish with the repository's
authoritative quality-gate, semantic compatibility, synthetic campaign,
owner-provenance, continuity/audit, project-state, local/clean, canonical
Playwright, topology-correct isolated Playwright, and diff checks.

## Stopping conditions

Stop and repair before advancing if any focused assertion, privacy check,
currentness check, hardening check, or deterministic identity check fails. Stop
the campaign with a truthful blocked record if a required external state is
needed; never broaden the owner scope or weaken proof assertions. A changed
rejection count is not coverage unless a mechanically proven current-source
case is admitted.
