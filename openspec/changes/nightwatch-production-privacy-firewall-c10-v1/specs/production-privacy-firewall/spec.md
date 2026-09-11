# Requirements — Production Privacy Firewall

## ADDED Requirements

### Requirement: Raw production bytes never cross into persistent evidence

Raw production bytes MUST NOT be capable of crossing into persistent
evidence. The primary boundary MUST be an allowlisted structural projection
whose persistence API cannot accept a raw value. Redaction MAY remain as
defence in depth but MUST NOT be the primary production privacy boundary.

#### Scenario: persistence accepts only safe structural projections
- **WHEN** production evidence is persisted
- **THEN** raw production bytes MUST NOT be capable of crossing into persistent evidence, and the primary boundary MUST be an allowlisted structural projection whose persistence API cannot accept a raw value

### Requirement: An UNKNOWN privacy classification denies persistence

An `UNKNOWN` privacy classification MUST deny persistence. A classification
that cannot be established MUST fail closed, never default to permitted.

#### Scenario: an unestablished classification fails closed
- **WHEN** a privacy classification cannot be established
- **THEN** it MUST be `UNKNOWN`, MUST deny persistence and MUST fail closed, never default to permitted

### Requirement: Object key literals are DATA

An object key literal is DATA. A key literal MAY cross the production
projection boundary only when it is mechanically established as a member of
a source-proven finite key vocabulary carrying an explicit provenance class
and provenance digest. A syntactically normal field name MUST NOT be treated
as safe, and a regular expression over key names MUST NOT be accepted as
proof.

#### Scenario: an unproven key literal cannot cross the projection boundary
- **WHEN** a key literal is not mechanically established as a member of a source-proven finite key vocabulary carrying an explicit provenance class and provenance digest
- **THEN** it MUST NOT cross the production projection boundary, and a regular expression over key names MUST NOT be accepted as proof

### Requirement: Unproven or dynamic keys are not persisted

For an unproven or dynamic key the projection MUST NOT persist the literal
and MUST NOT persist a digest derived from it. Only approved structural
information — bounded cardinality and category — may be preserved. Where the
required structural representation cannot be produced safely the projection
MUST fail closed.

#### Scenario: only approved structural information is preserved
- **WHEN** a key is unproven or dynamic
- **THEN** the projection MUST NOT persist the literal or a digest derived from it and MUST preserve only approved structural information — bounded cardinality and category
- **AND** where the required structural representation cannot be produced safely the projection MUST fail closed

### Requirement: The projection distinguishes key provenance

The projection MUST distinguish source-proven static fields, dynamic or
untrusted keys, bounded dynamic-key collections, and unresolved key
provenance. Unknown keys MUST NOT re-enter through a serializer, diagnostic,
receipt or downstream dossier conversion.

#### Scenario: unknown keys cannot re-enter downstream
- **WHEN** the projection distinguishes source-proven static fields, dynamic or untrusted keys, bounded dynamic-key collections, and unresolved key provenance
- **THEN** unknown keys MUST NOT re-enter through a serializer, diagnostic, receipt or downstream dossier conversion

### Requirement: Structural identity is type-distinct from value-sensitive identity

Structural identity and value-sensitive identity MUST be type-distinct and
MUST NOT be interchangeable. The STRUCTURAL digest MUST be computed only from
privacy-approved structural information, MUST NOT ingest a customer scalar
value, MUST NOT ingest an unproven dynamic key literal, MUST be unsalted,
deterministic and stable across equivalent runs and environments, and MAY be
persisted. Its name and version MUST prevent confusion with any
value-sensitive fingerprint.

#### Scenario: the STRUCTURAL digest ingests only approved structural information
- **WHEN** the STRUCTURAL digest is computed
- **THEN** it MUST be computed only from privacy-approved structural information, MUST NOT ingest a customer scalar value or an unproven dynamic key literal, and MUST be unsalted, deterministic and stable across equivalent runs and environments
- **AND** its name and version MUST prevent confusion with any value-sensitive fingerprint

### Requirement: No durable value-derived digest exists

No durable value-derived digest MAY exist in the production persistence
contract. Where correlation is required within one in-memory analysis it MUST
use an ephemeral opaque encounter token that is campaign-scoped, never
persisted and never digested. No secret or salt MAY be persisted, and no
digest MAY be computed over an enumerable low-entropy domain such as an
account identifier, an invoice period or a billing-group identifier.

#### Scenario: in-memory correlation uses an ephemeral encounter token
- **WHEN** correlation is required within one in-memory analysis
- **THEN** it MUST use an ephemeral opaque encounter token that is campaign-scoped, never persisted and never digested
- **AND** no secret or salt MAY be persisted and no digest MAY be computed over an enumerable low-entropy domain

### Requirement: Projection and persistence hold distinct authorities

The production projection module MUST NOT hold persistence authority, and
the persistence module MUST NOT accept a raw response object. The boundary
MUST be expressed as distinct types — raw-ephemeral, safe structural
projection, and safe production evidence — rather than `unknown` passed
through loosely typed helpers.

#### Scenario: the boundary is expressed as distinct types
- **WHEN** the production projection module and the persistence module are defined
- **THEN** the production projection module MUST NOT hold persistence authority, the persistence module MUST NOT accept a raw response object, and the boundary MUST be expressed as distinct types — raw-ephemeral, safe structural projection, and safe production evidence

### Requirement: The safe evidence DTO exposes a closed vocabulary

The safe evidence DTO MUST expose a closed vocabulary only, and MUST reject
unknown fields, arbitrary free text, prototype-hostile input, bound overflow
and ambiguous provenance. Every error MUST be categorical, and no raw input
MAY be interpolated into an exception.

#### Scenario: unsafe DTO input is rejected categorically
- **WHEN** the safe evidence DTO receives unknown fields, arbitrary free text, prototype-hostile input, bound overflow or ambiguous provenance
- **THEN** it MUST reject them with categorical errors and no raw input may be interpolated into an exception

### Requirement: The raw-to-safe projection cone has no ambient capability

The raw-to-safe projection cone MUST NOT possess filesystem, networking,
process or publication capability. Absence of `node:fs`, filesystem write
APIs, `node:http`, `node:https`, `node:net`, `node:dgram`, network fetch
clients, `child_process`, environment-derived output destinations and
publication connectors MUST be enforced mechanically, not by developer
convention. Raw bytes MUST enter through one bounded call-scoped interface.

#### Scenario: capability absence is enforced mechanically
- **WHEN** the raw-to-safe projection cone is built
- **THEN** absence of `node:fs`, filesystem write APIs, `node:http`, `node:https`, `node:net`, `node:dgram`, network fetch clients, `child_process`, environment-derived output destinations and publication connectors MUST be enforced mechanically, not by developer convention
- **AND** raw bytes MUST enter through one bounded call-scoped interface

### Requirement: The durable-write boundary independently re-validates

The durable-write boundary MUST independently re-validate, accepting only
approved DTOs and rejecting raw values, response bodies, dynamic key
literals, URLs carrying concrete parameters, headers, cookies, auth tokens,
storage state, free text, authenticated DOM, screenshots, traces, arbitrary
nested objects outside the contract, and unknown schema versions. This
redundancy with projection is intentional.

#### Scenario: raw and unapproved values are rejected at the durable-write boundary
- **WHEN** a durable write is attempted
- **THEN** only approved DTOs MUST be accepted and raw values, response bodies, dynamic key literals, URLs carrying concrete parameters, headers, cookies, auth tokens, storage state, free text, authenticated DOM, screenshots, traces, arbitrary nested objects outside the contract, and unknown schema versions MUST be rejected

### Requirement: The production artifact root is a separate hardened namespace

The production artifact root MUST be a separate namespace from the DEV
findings root, MUST use mode 0700 directories and mode 0600 files, MUST
refuse symlink traversal, MUST lie outside the repository and workspace,
MUST write atomically, MUST bound file counts, MUST carry an explicit schema
and a separate policy identity, and MUST contain no raw source or customer
content. It MUST NOT be populated from a real environment.

#### Scenario: the artifact root enforces its storage contract
- **WHEN** the production artifact root is used
- **THEN** it MUST be a separate namespace from the DEV findings root with mode 0700 directories and mode 0600 files, MUST refuse symlink traversal, MUST lie outside the repository and workspace, MUST write atomically, MUST bound file counts, MUST carry an explicit schema and a separate policy identity, and MUST contain no raw source or customer content

### Requirement: The Control Center cannot read the production findings store

The Control Center findings authority MUST be structurally incapable of
reading the production findings store. Rejection MUST hold for a future
caller that passes the production root, MUST survive symlink and
path-equivalence tricks, and MUST apply to test-only seams so that a seam
cannot become production authority. It MUST NOT depend merely on the
current default path, caller convention, localhost binding, `Host`
validation or `Origin` validation. Normal DEV findings MUST continue to work.

#### Scenario: production-root rejection survives caller and path tricks
- **WHEN** a future caller passes the production root to the Control Center findings authority, including through symlink and path-equivalence tricks or test-only seams
- **THEN** rejection MUST hold and MUST NOT depend merely on the current default path, caller convention, localhost binding, `Host` validation or `Origin` validation
- **AND** normal DEV findings MUST continue to work

### Requirement: Production console text and media never persist

Production page console text MUST NOT persist. The production cone MUST
either exclude the console observer or emit categorical events carrying zero
page-provided text. Production screenshots and Playwright traces MUST be
impossible: enabling either in the production privacy cone MUST be a
configuration or contract failure.

#### Scenario: console, screenshots and traces are excluded or fail the contract
- **WHEN** the production privacy cone is configured
- **THEN** production page console text MUST NOT persist and screenshots and Playwright traces MUST be impossible
- **AND** enabling either screenshots or traces in the production privacy cone MUST be a configuration or contract failure

### Requirement: A production browser leaves no authenticated profile residue

A future production browser MUST NOT leave authenticated profile residue. A
private ephemeral profile path, restrictive permissions, disabled disk cache
where feasible, disabled crash dumps, cleanup on normal exit, cleanup on an
interrupted or crashed run, and stale production-profile residue in the
persistence audit MUST all be provided. No real production browser is
launched by this campaign.

#### Scenario: profile residue is prevented and audited
- **WHEN** a future production browser runs
- **THEN** a private ephemeral profile path, restrictive permissions, disabled disk cache where feasible, disabled crash dumps, cleanup on normal exit, cleanup on an interrupted or crashed run, and stale production-profile residue in the persistence audit MUST all be provided

### Requirement: Request-parameter values use an opaque-handle privacy model

Future request-parameter values MUST have an opaque-handle privacy model:
owner-supplied, stored external-only, referenced inside Nightwatch state by
opaque handle only, with the concrete value resolved at the narrow future
request-construction boundary. No value MAY enter a log, a budget key, a
replay fingerprint, a checkpoint, an error, a receipt or a persisted URL.
Retained URL identity MUST use route templates, never concrete identifiers.

#### Scenario: concrete request values stay at the request-construction boundary
- **WHEN** a future request-parameter value is handled
- **THEN** it MUST be owner-supplied, stored external-only, referenced inside Nightwatch state by opaque handle only, with the concrete value resolved at the narrow future request-construction boundary
- **AND** no value MAY enter a log, a budget key, a replay fingerprint, a checkpoint, an error, a receipt or a persisted URL, and retained URL identity MUST use route templates, never concrete identifiers

### Requirement: SSE and Control Center channels are not a side channel

SSE and Control Center channels MUST NOT become a side channel around the
production persistence boundary. Only already-safe projected metadata MAY
enter them.

#### Scenario: only safe projected metadata enters SSE and Control Center
- **WHEN** SSE or Control Center channels carry production data
- **THEN** only already-safe projected metadata MAY enter them

### Requirement: Production policy differences are versioned and fail closed

Production policy differences MUST be encoded in a versioned capability or
policy object with fail-closed construction, NOT as environment checks
scattered through the code. Existing DEV and local workflows MUST NOT be
broken merely because production policy is stricter.

#### Scenario: production policy is encoded in a versioned capability
- **WHEN** production policy differs from DEV
- **THEN** it MUST be encoded in a versioned capability or policy object with fail-closed construction, not as environment checks scattered through the code, and existing DEV and local workflows MUST NOT be broken

### Requirement: C-10 converges with the existing privacy stack

C-10 MUST NOT create a second independent privacy stack diverging from the
existing system. Existing machinery MUST be reused and converged with where
architecturally sound; where an unsafe abstraction must change, a versioned
replacement or shared lower-level primitive MUST be implemented cleanly and
its callers migrated with tests.

#### Scenario: unsafe abstractions are replaced and callers migrated
- **WHEN** an unsafe abstraction must change
- **THEN** a versioned replacement or shared lower-level primitive MUST be implemented cleanly and its callers migrated with tests, reusing existing machinery where architecturally sound

### Requirement: C-10 adds no production connectivity or authority

C-10 MUST NOT weaken C-06, MUST NOT create production connectivity, MUST
NOT add production to `SUPPORTED_ENVIRONMENTS`, MUST NOT make
`config/environments/production.json` loadable, and MUST NOT implement C-11.

#### Scenario: production remains unsupported and C-11 unimplemented
- **WHEN** C-10 is complete
- **THEN** it MUST NOT weaken C-06, MUST NOT create production connectivity, MUST NOT add production to `SUPPORTED_ENVIRONMENTS`, MUST NOT make `config/environments/production.json` loadable, and MUST NOT implement C-11
