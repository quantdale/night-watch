# Design — C-10 Production Privacy Firewall

## 1. Capability split

Two module trees, separated by capability rather than by convention:

```
src/core/prodPrivacy/**      PURE   no fs · no net · no process · no publication
  policy.ts                  versioned capability/policy object, fail-closed
  keyVocabulary.ts           ProvenKeyVocabulary (frozen value object)
  types.ts                   production projection DTO + categorical errors
  projector.ts               RAW_EPHEMERAL -> SAFE_STRUCTURAL_PROJECTION
  serializer.ts              canonical bytes + prodstruct:sha256: digest
  evidence.ts                SAFE_PRODUCTION_EVIDENCE builder
  parameterProvenance.ts     opaque-handle model + validators

src/core/prodEvidence/**     PERSISTENCE   accepts SAFE_PRODUCTION_EVIDENCE only
  firewall.ts                INDEPENDENT re-validation at the durable write
  productionFindingsStore.ts $HOME/.nightwatch/prod-findings/ root isolation
  persistenceAudit.ts        deterministic post-campaign sweep
  browserProfile.ts          ephemeral profile + crash-path residue policy
```

`hardening:check` enforces the split mechanically: no file under
`src/core/prodPrivacy/` may import or reference `node:fs`, `node:http`,
`node:https`, `node:net`, `node:dgram`, `child_process`, a fetch client, a
publication connector, or an environment-derived output destination.

## 2. The three types

| Type | Lifetime | May contain |
|---|---|---|
| `RAW_EPHEMERAL` | one call scope | raw bytes, delivered through a single bounded reader; never stored, never returned |
| `SAFE_STRUCTURAL_PROJECTION` | in-memory analysis | allowlisted structural nodes; MAY carry an ephemeral encounter token for correlation |
| `SAFE_PRODUCTION_EVIDENCE` | durable | structure only; NO encounter token, NO numeric ref, NO unproven key literal |

The projection module exports no persistence function. The persistence module
accepts no raw value. The transition `SAFE_STRUCTURAL_PROJECTION` →
`SAFE_PRODUCTION_EVIDENCE` is the only narrowing, and it strips every ephemeral
correlation field; the firewall then independently rejects any evidence that
still carries one.

## 3. Key provenance (F-14)

A key literal is data unless proven otherwise. Proof is membership in a
**source-proven finite key vocabulary**:

```
ProvenKeyVocabulary {
  version:          'nightwatch.proven-key-vocabulary.v1'
  provenanceClass:  SOURCE_PROVEN_OPENAPI_DEFINITION
                  | SOURCE_PROVEN_PHP_ROW_KEYS
                  | SOURCE_PROVEN_FIXED_CONTRACT
  provenanceDigest: string          // binds the vocabulary to its source
  keys:             ReadonlySet<string>   // finite, bounded, non-empty
}
```

The vocabulary is constructed OUTSIDE the pure cone (its proof sources —
C-02a's generated OpenAPI `definitions`, the mechanically derived
`PHP_FUNCTION_LIST_ROW_KEYS` contracts — live behind filesystem loaders) and
passed call-scoped. This keeps import isolation intact.

Every projected object carries a key-provenance classification:

| Classification | Meaning | Persistence |
|---|---|---|
| `ALL_SOURCE_PROVEN` | every key proven | key literals may be persisted |
| `BOUNDED_DYNAMIC_KEY_COLLECTION` | no key proven, cardinality bounded | cardinality + value structure only |
| `MIXED` | some proven, some not | proven literals only; dynamic part as cardinality |
| `UNRESOLVED` | provenance cannot be established safely | **denied** — fail closed |

A dynamic key contributes its *count* and its *value's structure*. It never
contributes its literal, and never a digest derived from its literal — a digest
over an enumerable domain (a 12-digit AWS account id, a `YYYYMM` period) is
invertible and is therefore not anonymization.

Ambiguous provenance is rejected: the caller must pass either a
`ProvenKeyVocabulary` or the explicit `NO_PROVEN_VOCABULARY` sentinel. Omission
is a type error, not a default.

## 4. Digest families (F-15)

**Structural digest — `prodstruct:sha256:<24>`.** Computed only over
privacy-approved structural information: node types, shape, cardinality,
key-provenance classification, and source-proven key literals. Unsalted,
deterministic, stable across equivalent runs and environments, comparable across
campaigns, persistable. It MUST NOT ingest a customer scalar, an unproven
dynamic key literal, an encounter token or a numeric ref.

**Value-sensitive correlation — deliberately absent from the durable
contract.** Nothing in C-10 requires durable value correlation, so per the
campaign brief the concept is REMOVED from the production persistence contract
rather than invented. Where correlation is needed inside one in-memory analysis,
an ephemeral opaque **encounter token** (encounter-order label, not a hash) is
used; it is campaign-scoped, never persisted, and never digested. There is
therefore no salt to persist and no low-entropy value hash to invert.

The two concepts cannot be interchanged: they are distinct types with distinct
prefixes, the evidence DTO has no field that could hold a value digest, and the
firewall rejects any evidence carrying an encounter token.

## 5. Persistence firewall (Workstream F)

Deliberately redundant with projection. Projection prevents sensitive data from
being *emitted*; the firewall prevents an upstream defect from *bypassing* the
projection contract. It is an independent implementation — a closed-vocabulary
walk, not a re-call of the projection's own validator — and it rejects raw
values, response bodies, dynamic key literals, URLs with concrete parameters,
headers, cookies, auth tokens, storage state, free text, authenticated DOM,
screenshots, traces, out-of-contract nesting, and unknown schema versions.

Every rejection is a categorical reason code. No raw input is interpolated into
any error.

## 6. Production artifact root (Workstream G)

`$HOME/.nightwatch/prod-findings/`, distinct from `$HOME/.nightwatch/findings/`:
separate namespace, separate policy identity, 0700 directories, 0600 files, no
symlink traversal on any path component, outside the repository and workspace,
atomic writes, bounded file counts, explicit schema, and no raw source or
customer content by construction.

C-10 builds and synthetically tests this boundary against an INJECTED
disposable root. It never populates the store from a real environment, and the
suite asserts that the DEFAULT root *resolves* correctly without creating it.

## 7. Control Center exclusion (F-18, Workstream H)

The Control Center findings authority must be structurally incapable of reading
the production store. Rejection is by **resolved-path equivalence** — realpath,
then containment tested in both directions — not string comparison, and not the
current default path, caller convention, localhost binding, `Host` validation or
`Origin` validation, none of which is an authorization boundary against local
software. The rule applies to `createFindingsAuthority()` AND to the test-only
seam, so a test seam cannot accidentally become production authority. A
hardening invariant prevents reintroduction.

## 8. Console, screenshots, traces, profile (Workstream I)

Production console text cannot persist: the production cone emits categorical
console events with zero page-provided text, or no console observer at all.
Authenticated-mode suppression remains a useful foundation but is a caller
toggled mode, not the production invariant.

Production screenshots and Playwright traces are contract failures: enabling
either in the production privacy cone fails policy construction.

Browser profile: private ephemeral path, restrictive permissions, disk cache
disabled where feasible, crash dumps disabled, cleanup on normal exit, cleanup
on the simulated interrupted/crash recovery path, and stale production-profile
residue included in the persistence audit. No real production browser is
launched.

## 9. Parameter provenance (F-16, Workstream J)

Privacy model only — C-10 creates no production request execution path. Values
are owner-supplied and stored external-only, like storage state. Nightwatch
state holds **opaque handles**; the concrete value is resolved only at the
narrow future request-construction boundary. No value may enter a log, a budget
key, a replay fingerprint, a checkpoint, an error, a receipt or a persisted URL.
Retained URL identity is a route template, never a concrete identifier.

## 10. Policy object (brief §18)

Environment differences are not scattered `if (production)` checks. A single
versioned capability/policy object with fail-closed construction encodes them:
DEV redacted screenshots may remain permitted where existing policy allows;
production screenshots remain impossible; DEV projection compatibility remains;
production projection requires stronger key provenance.
