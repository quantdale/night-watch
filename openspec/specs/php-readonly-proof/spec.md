# php-readonly-proof Specification

## Purpose
TBD - created by archiving change nightwatch-php-readonly-proof-c06-v1. Update Purpose after archive.
## Requirements
### Requirement: Catalog membership is not a read-only witness

Membership in a hand-authored operation catalog MUST NOT be a read-only
witness. No `semanticClass` value of `PHASE5_API_CATALOG` may produce
`PROVEN_READ_ONLY`, and both historical D-79 admissions MUST be refused.
The catalog MAY continue to supply a runtime binding, which is a different
fact.

#### Scenario: catalog membership cannot produce PROVEN_READ_ONLY
- **WHEN** a route is classified from `PHASE5_API_CATALOG` membership alone
- **THEN** no `PROVEN_READ_ONLY` may be produced and both historical D-79 admissions MUST be refused

### Requirement: Read-only classification follows the resolved pipeline

Read-only classification MUST be decided after the route → handler join,
from the route's FULLY RESOLVED middleware pipeline PLUS its handler. A
handler-only fallback MUST NOT exist. A route whose pipeline cannot be
resolved mechanically MUST fail closed.

#### Scenario: classification is decided after the route → handler join
- **WHEN** a route is classified read-only
- **THEN** it MUST be decided after the route → handler join, from the route's FULLY RESOLVED middleware pipeline PLUS its handler
- **AND** a route whose pipeline cannot be resolved mechanically MUST fail closed

### Requirement: The effect vocabulary is data-only, versioned and digest-bound

The effect vocabulary MUST be data-only, versioned and digest-bound, and
MUST classify into exactly the kinds `PURE_READ`, `DATA_WRITE`,
`AUDIT_WRITE`, `CACHE_WRITE`, `SESSION_WRITE`, `MESSAGE_PUBLISH`,
`EXTERNAL_CALL` and `UNCLASSIFIED`, each with an explicit owner-approved
admission recorded on every proof. An identifier the vocabulary does not
name MUST be `UNCLASSIFIED` and MUST NOT be assumed to be a read.

#### Scenario: an identifier the vocabulary does not name is UNCLASSIFIED
- **WHEN** an identifier is not named by the effect vocabulary
- **THEN** it MUST be `UNCLASSIFIED` and MUST NOT be assumed to be a read

### Requirement: An outbound network call disqualifies read-only proof

Any outbound network call anywhere in the resolved closure MUST be
disqualifying. The measured `MarketplaceSubscriptionMiddleware`
counterexample MUST fail read-only proof even when the handler itself is a
provable pure read.

#### Scenario: an external call in the resolved closure fails read-only proof
- **WHEN** a route's resolved closure performs an outbound network call
- **THEN** it MUST be disqualifying, even when the handler itself is a provable pure read

### Requirement: Dynamic dispatch fails closed

Dynamic dispatch MUST fail closed. This includes a member access whose name
is a value, a variable function, any callback-taking library function, any
`__call`/`__callStatic`/`__get`/`__set`/`__isset`/`__unset` declaration in a
walked file, and `include`/`require`.

#### Scenario: dynamic dispatch forms fail closed
- **WHEN** a member access whose name is a value, a variable function, a callback-taking library function, an `__call`/`__callStatic`/`__get`/`__set`/`__isset`/`__unset` declaration in a walked file, or `include`/`require` is encountered
- **THEN** dynamic dispatch MUST fail closed

### Requirement: Unresolved callees and bound overflows fail closed

An unresolved callee, a symbol that is absent or declared more than once,
and any depth, declaration, callsite, file or token bound overflow MUST
each fail closed with its own categorical reason code.

#### Scenario: each failure mode carries its own categorical reason code
- **WHEN** an unresolved callee, an absent or multiply declared symbol, or any depth, declaration, callsite, file or token bound overflow is encountered
- **THEN** each MUST fail closed with its own categorical reason code

### Requirement: Closure recursion MUST NOT cross a file boundary

Closure recursion MUST NOT cross a file boundary. A same-named declaration
in another file MUST NOT be bound to; that is the D-79 defect.

#### Scenario: a same-named declaration in another file is not bound to
- **WHEN** closure recursion encounters a same-named declaration in another file
- **THEN** it MUST NOT be bound to

### Requirement: READ_ONLY_PROVEN requires both witness classes

`READ_ONLY_PROVEN` MUST require at least one DECLARATION witness AND at
least one EFFECT witness. Two witnesses of the same class MUST yield
`READ_ONLY_SINGLE_WITNESS`, which is DEV-executable only. `W-SPEC` MUST be
barred from production admission.

#### Scenario: two witnesses of the same class yield READ_ONLY_SINGLE_WITNESS
- **WHEN** a proof holds two witnesses of the same class
- **THEN** the result MUST be `READ_ONLY_SINGLE_WITNESS`, which is DEV-executable only, and `W-SPEC` MUST be barred from production admission

### Requirement: A witness with no implemented analyzer reports UNSUPPORTED

A witness with no implemented analyzer MUST report `UNSUPPORTED` — an
absence — and MUST NOT be treated as held or as refuted.

#### Scenario: a witness with no implemented analyzer is an absence
- **WHEN** a witness has no implemented analyzer
- **THEN** it MUST report `UNSUPPORTED` and MUST NOT be treated as held or as refuted

### Requirement: Every proof carries its preconditions and ledgers

Every proof MUST carry its route → handler join precondition, its
repository inventory-completeness assertion, its resolved-pipeline
precondition, its vocabulary digest, its per-kind effect ledger, its
per-kind admission policy and its unclassified-callee count. Each
precondition MUST be able only to DENY.

#### Scenario: each precondition can only deny
- **WHEN** a proof is produced
- **THEN** it MUST carry its route → handler join precondition, its repository inventory-completeness assertion, its resolved-pipeline precondition, its vocabulary digest, its per-kind effect ledger, its per-kind admission policy and its unclassified-callee count
- **AND** each precondition MUST be able only to DENY

### Requirement: Unclassified callees block production admission

`UNCLASSIFIED > 0` in an admitted closure MUST block production admission,
and callee-classification coverage MUST be measured and reported.

#### Scenario: unclassified callees block production admission
- **WHEN** `UNCLASSIFIED > 0` in an admitted closure
- **THEN** production admission MUST be blocked and callee-classification coverage MUST be measured and reported

### Requirement: Generated-artifact route evidence is not a read-only proof

`SOURCE_FACT (GENERATED_ARTIFACT)` route evidence from C-02a MUST NOT
independently grant a read-only effect proof.

#### Scenario: generated-artifact route evidence cannot independently grant a proof
- **WHEN** read-only effect evidence comes only from `SOURCE_FACT (GENERATED_ARTIFACT)` route evidence from C-02a
- **THEN** it MUST NOT independently grant a read-only effect proof

### Requirement: The achieved READ_ONLY_PROVEN count is an observation

The achieved `READ_ONLY_PROVEN` count MUST be reported as an observation,
per repository and per effect kind. It MUST NOT be a pass/fail threshold,
and no mechanism that reduces it may be weakened to raise it.

#### Scenario: the achieved count is an observation, not a threshold
- **WHEN** the achieved `READ_ONLY_PROVEN` count is reported
- **THEN** it MUST be reported as an observation per repository and per effect kind and MUST NOT be a pass/fail threshold

### Requirement: The negative corpus yields zero admitted operations

The negative corpus MUST contain at least the two historical D-79
admissions, a GET whose resolved closure reaches a write, a GET whose
middleware performs an external call, an unclassified callee, a
depth-bound overflow, a dynamic-dispatch callee and an ambiguous join, and
MUST yield zero admitted operations. The positive corpus MUST prove that a
genuinely provable route IS admitted.

#### Scenario: the negative corpus yields zero admitted operations
- **WHEN** the negative corpus is exercised
- **THEN** it MUST contain at least the two historical D-79 admissions, a GET whose resolved closure reaches a write, a GET whose middleware performs an external call, an unclassified callee, a depth-bound overflow, a dynamic-dispatch callee and an ambiguous join, and MUST yield zero admitted operations
- **AND** the positive corpus MUST prove that a genuinely provable route IS admitted

### Requirement: No source values enter descriptors or diagnostics

No source text, literal value, URL, token or customer value may enter a
descriptor, proof, digest input, diagnostic or error message. The analyzer
MUST NOT execute application source, and MUST read only through the
existing confined sibling-source boundary.

#### Scenario: the analyzer stays value-free, non-executing and confined
- **WHEN** the analyzer produces a descriptor, proof, digest input, diagnostic or error message
- **THEN** no source text, literal value, URL, token or customer value may enter it
- **AND** the analyzer MUST NOT execute application source and MUST read only through the existing confined sibling-source boundary

