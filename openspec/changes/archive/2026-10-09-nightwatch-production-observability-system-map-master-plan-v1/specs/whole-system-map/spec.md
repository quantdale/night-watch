# Requirements — Whole-system model and System Map V2

Planning-only requirement delta. Nothing below is authorized for
implementation.

## ADDED Requirements

### Requirement: Every modelled fact carries exactly one category and its provenance
Each node and edge MUST be classified `SOURCE_FACT`, `DEPLOYMENT_FACT`,
`RUNTIME_FACT`, `OBSERVATION` or `INFERENCE`, and MUST carry either
`(repoId, sha, path, extractorVersion, evidenceDigest)` or
`(environment, observedAt, runId)`. A join of facts of different categories
SHALL yield `INFERENCE`. No authority SHALL be granted by an `INFERENCE`.
Absence of evidence SHALL be `UNKNOWN`, and `UNKNOWN` SHALL never be treated as
safe.

#### Scenario: A join cannot launder a weak fact into a strong one
- **WHEN** a `SOURCE_FACT` route is joined to an `INFERENCE` runtime host
- **THEN** the resulting endpoint fact SHALL be `INFERENCE`
- **AND** it SHALL NOT satisfy any production admission gate

#### Scenario: A category is never upgraded in place
- **WHEN** stronger evidence for an existing fact is derived
- **THEN** a new fact with its own provenance SHALL be recorded
- **AND** the weaker fact SHALL remain visible in the model

### Requirement: Discovery never loses rows silently
Any projection, scan, analysis or view that drops rows because of a bound MUST
report the dropped count and the bound that caused it. A dimension with
`truncated > 0` SHALL NOT support any completeness claim.

#### Scenario: Route truncation is visible
- **WHEN** a repository declares more routes than the discovery bound admits
- **THEN** the truncated count SHALL appear in the CLI projection, the Control Center contract, and the coverage ledger

#### Scenario: File-cap truncation is visible
- **WHEN** a repository scan hits its file-count or byte budget
- **THEN** the affected repository SHALL be reported as truncated rather than as fully inspected

### Requirement: The source universe is discovered and separately admitted
Repository discovery MUST enumerate the sibling workspace and classify every
repository. Admission to the analysis universe MUST be a single explicit
owner-approved list. Discovery SHALL grant no analysis authority. Mutable Git
state (dirty, ahead, behind) SHALL NOT be persisted in source.

#### Scenario: A discovered but unapproved repository is never read
- **WHEN** discovery finds a repository absent from the approved list
- **THEN** no file in it SHALL be opened by any analyzer

### Requirement: Route, handler, contract and consumer facts are extracted per language
The system MUST extract, as `SOURCE_FACT` where mechanically provable:
protobuf service/RPC/HTTP-verb/path/message; Go gRPC service registration and
handler sets; PHP route/handler/validation; and frontend consumer call edges
with literal or template paths. Non-literal or dynamically composed paths SHALL
be `INFERENCE` or `UNKNOWN`, never `SOURCE_FACT`.

#### Scenario: A commented-out annotation grants nothing
- **WHEN** a protobuf HTTP option appears inside a comment
- **THEN** no operation SHALL be derived from it

#### Scenario: A dynamically composed frontend path is not a source fact
- **WHEN** a frontend API path is assembled across function boundaries
- **THEN** the edge SHALL be classified `UNKNOWN` and SHALL NOT join to a route

### Requirement: The Control Center presents evidence status as the primary visual variable
The System Map MUST render, per node and edge, one of: `MECHANICALLY_PROVEN`,
`RUNTIME_OBSERVED`, `PRODUCTION_OBSERVED`, `SOURCE_ONLY`, `PARTIAL`,
`INFERRED`, `STALE`, `UNAVAILABLE`, `MUTATION_CAPABLE`, `READ_ONLY_PROVEN`,
`REPLAY_PROVEN`, `FINDING_PRESENT`, `TRUNCATED`. Layout MUST be deterministic
so that two renders of the same snapshot are byte-identical.

#### Scenario: The same snapshot renders identically twice
- **WHEN** the same source snapshot is rendered in two separate sessions
- **THEN** the produced layout SHALL be byte-identical

#### Scenario: The operator can ask why a surface is unproven
- **WHEN** an operator selects an excluded surface
- **THEN** the ordered blocking-stage chain and its reason codes SHALL be shown

### Requirement: The Control Center remains observational
The Control Center MUST accept only `GET` and `HEAD`, MUST advertise
`executionAuthority: NONE` and `mutationAuthority: NONE`, MUST expose no
mutating route, and MUST NOT accept input on the event stream. No UI affordance
SHALL create execution authority.

#### Scenario: A mutating request is refused
- **WHEN** any request other than `GET` or `HEAD` reaches the Control Center
- **THEN** it SHALL be refused with `405` and no handler SHALL execute
