# source-analysis-runtime-hardening Specification

## Purpose
TBD - created by archiving change nightwatch-source-analysis-runtime-hardening-v1. Update Purpose after archive.
## Requirements
### Requirement: Exhaustive tracked-file audit coverage

The campaign SHALL establish an authoritative tracked-file manifest from the live checkout and SHALL include every tracked file in the execution audit before terminal acceptance.

#### Scenario: Every tracked path is accounted for

- **WHEN** the executor generates the live `git ls-files` manifest
- **THEN** every returned path SHALL receive an audit classification and review disposition
- **AND** no subsystem SHALL be declared reviewed solely because a repository search returned no matches
- **AND** generated/historical files SHALL be reviewed for role, authority and coupling even when line-by-line business logic analysis is not applicable.

### Requirement: One authoritative TypeScript runtime-loader mechanism where semantics match

The campaign SHALL replace duplicated bin TypeScript transpile-hook mechanics with one repository-owned bounded loader for callers whose behavior is proven equivalent.

#### Scenario: Equivalent callers migrate safely

- **GIVEN** two bin entrypoints use the same TypeScript compiler semantics
- **WHEN** they are migrated to the shared loader
- **THEN** cold and warm stdout, stderr, exit status, module exports and error behavior SHALL remain equivalent
- **AND** the previous `.ts` hook SHALL always be restored
- **AND** no loader hook SHALL leak after bounded loading completes.

#### Scenario: A caller has different semantics

- **GIVEN** a bin entrypoint differs in a load-bearing compiler option or module-loading contract
- **WHEN** consolidation is evaluated
- **THEN** the difference SHALL be represented explicitly or the caller SHALL remain separate
- **AND** the implementation SHALL NOT silently normalize the caller to the common profile.

### Requirement: Transpile reuse is content-addressed and non-authoritative

Any transpile cache SHALL store only compiler-derivative output and SHALL never become an authority for test verdicts, semantic proofs, source surfaces or eligibility decisions.

#### Scenario: Source or compiler identity changes

- **WHEN** exact TypeScript source bytes, TypeScript version, load-bearing compiler options or other proven compiler inputs change
- **THEN** the previous transpile entry SHALL NOT be reused.

#### Scenario: Compilation fails or is interrupted

- **WHEN** compilation throws, is interrupted or produces no complete valid output
- **THEN** no valid cache entry SHALL be committed
- **AND** later loads SHALL execute the authoritative compile path or fail normally.

### Requirement: Source-read reuse is call-scoped and snapshot-bound

Repeated sibling-source reads MAY be reused only inside a bounded source-discovery/integration call and only when exact source identity is established. Reuse outside such a bounded call or without established exact source identity MUST NOT occur.

#### Scenario: Same exact source is requested repeatedly

- **GIVEN** the same repository, source SHA, relative path and authoritative content/currentness identity are requested multiple times in one immutable discovery scope
- **WHEN** the source reader serves the requests
- **THEN** the implementation MAY reuse the already-read source bytes
- **AND** all downstream source/proof outputs SHALL remain identical to uncached execution.

#### Scenario: Source identity differs

- **WHEN** repository, source SHA, path, content identity or another load-bearing currentness input differs
- **THEN** source bytes or parsed state from the other identity SHALL NOT be reused.

### Requirement: Raw source remains ephemeral

Optimization SHALL NOT create a new durable source cache or persistence authority.

#### Scenario: Discovery completes

- **WHEN** a source discovery/integration call ends
- **THEN** call-scoped raw source reuse SHALL become unreachable for normal collection
- **AND** raw sibling source SHALL NOT be written to Git artifacts, task files, public DTOs, owner finding stores through this feature, or new disk-backed source-surface caches.

### Requirement: Shared parse work preserves per-symbol analysis

If shared parsing/tokenization is introduced, file-level immutable parse state SHALL remain separate from symbol/hint/surface-specific proof evaluation.

#### Scenario: Two operations share a file but use different symbols

- **GIVEN** two operations reference the same exact source file but different handler symbols
- **WHEN** file-level parse state is reused
- **THEN** each symbol SHALL still be analyzed independently under its own hints and observation surfaces
- **AND** one symbol's proven/rejected observations SHALL NOT be reused as the other's verdict.

### Requirement: Same-input proof identity is invariant

For an optimization-only change, identical inputs SHALL yield the same proof and deterministic identities before and after the change.

#### Scenario: Baseline and optimized source census use the same snapshot

- **WHEN** the reference and optimized paths run against the exact same deterministic source snapshot
- **THEN** operation/surface ordering, proof states, analyzer IDs/versions/statuses, rejection codes/families, every analyzer evidence digest, response-flow identities, response contract IDs, response evidence digests, semantic contract IDs, gap taxonomy, census digests, Phase 24 eligibility/reasons and review projections SHALL be equal
- **AND** deterministic CLI JSON SHALL be byte-equal wherever byte stability is already part of the contract.

#### Scenario: Identity drift appears

- **WHEN** any unexplained same-input `ev:sha256`, contract ID, deterministic digest, ordering or verdict differs
- **THEN** the candidate optimization SHALL be rejected or rolled back
- **UNLESS** a pre-existing correctness defect is separately reproduced and repaired under all required versioning/authorization rules.

### Requirement: Reuse cannot manufacture proof

A cache hit, parser reuse or loader optimization SHALL NOT convert stale, unavailable, ambiguous, malformed, privacy-unsafe, unsupported or otherwise unproven input into proof.

#### Scenario: Rejected source state is repeated

- **GIVEN** the authoritative uncached path rejects or cannot prove an input
- **WHEN** the same or related input encounters any optimization cache/reuse layer
- **THEN** the result SHALL remain rejected/unproven with equivalent fail-closed classification
- **AND** Phase 24 eligibility SHALL NOT increase because of reuse.

### Requirement: Performance gains are measured without weakening verification

The campaign SHALL report before/after wall time and peak RSS using comparable methodology and SHALL preserve the full acceptance cone.

#### Scenario: Optimization is accepted

- **WHEN** the campaign claims a performance improvement
- **THEN** the report SHALL include comparable baseline/post-change measurements and variance notes
- **AND** required focused, semantic-compatibility, synthetic, provenance, local gate and clean-checkout validations SHALL pass
- **AND** no test deletion, skip addition, assertion weakening or verdict caching SHALL be used to obtain the result.

### Requirement: External zero-step CI remains non-evidence

A GitHub Actions run that fails before executing job steps SHALL NOT be treated as repository validation evidence.

#### Scenario: Exact-head Actions job has zero or null steps

- **WHEN** the final exact-head job completes without executing steps because of the known billing/spending-limit/platform condition
- **THEN** the campaign SHALL record an external CI block classification
- **AND** SHALL NOT call CI green
- **AND** SHALL NOT alter repository workflow logic solely to mask the external condition
- **AND** SHALL NOT repeatedly retry the same externally blocked job as a substitute for local validation.

