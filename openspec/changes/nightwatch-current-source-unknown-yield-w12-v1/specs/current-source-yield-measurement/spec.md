## ADDED Requirements

### Requirement: W12 SHALL preserve W11 as a frozen predecessor

W12 SHALL use a distinct task identity, OpenSpec change, evaluation freeze,
and evidence namespace. It SHALL reference W11's measured historical and
provider-blocked outcomes without changing, re-scoring, or re-running the W11
historical arm.

#### Scenario: W12 starts from the live predecessor

- **WHEN** W12 activation is validated
- **THEN** the live Git base, W11 task state, W11 freeze fingerprints, and W11
  evidence remain readable and unchanged
- **AND** W12 records the predecessor reference separately from its own result

### Requirement: Provider selection SHALL be declared before probing

W12 SHALL record an ordered provider/model preference list, ordering criteria,
CLI compatibility, structured-response requirement, probe latency, retry
policy, probe ceiling, ABSENT and UNAVAILABLE meanings, first-pass rule, and
all-candidates-fail behavior before any provider probe. The first candidate
that returns a valid structured response through the existing CLI SHALL be
frozen; later candidates SHALL NOT be probed after that pass.

#### Scenario: First candidate is absent

- **WHEN** the first preference is absent or incompatible
- **THEN** W12 records `PROVIDER_ABSENT` or the declared incompatibility
- **AND** it probes the next predeclared candidate without comparing quality

#### Scenario: A candidate passes

- **WHEN** a candidate exits successfully within the frozen timeout and returns
  a valid `nightwatch.reasoner-turn-response.v1` response
- **THEN** that candidate becomes the frozen W12 provider
- **AND** remaining candidates are not probed

#### Scenario: All candidates fail

- **WHEN** every predeclared candidate is absent, times out, exits non-zero, or
  returns an invalid response
- **THEN** W12 is blocked before investigation
- **AND** it does not report zero current-source yield

### Requirement: The current-source universe SHALL be rebaselined without mutation

Before investigation, W12 SHALL enumerate exactly the eight admitted
repositories, record expected and live SHAs, currentness, eligible files,
language distribution, source surfaces, executable files/targets, reproduction
classes, and refusal reasons. It SHALL take before-run sibling identity
snapshots and SHALL refuse silent SHA rebinding or missing repositories.

#### Scenario: Repository identity drifts

- **WHEN** an admitted repository is missing or its live SHA differs from the
  frozen expected SHA
- **THEN** W12 refuses or records an external currentness blocker before
  provider investigation
- **AND** it does not update the expected SHA implicitly

#### Scenario: Census is valid

- **WHEN** all eight repositories are present and current
- **THEN** the census is non-vacuous and records investigation breadth as 8
- **AND** it records the deterministic reproduction ceiling independently

### Requirement: The W12 evaluation freeze SHALL bind all experiment dimensions

Before the first W12 investigative model call, a committed machine-readable
freeze SHALL bind the schema/version, starting SHA, eight repository IDs and
SHAs, provider/toolchain identity, source universe, broad and eight scoped run
IDs/order, budgets, turn/call/action/byte ceilings, investigation limits,
permitted reproduction classes, admission rule, scope and proof definitions,
leakage constraints, novelty rules, stopping/abort/retry rules, allocation,
metric denominators, and the fact that zero admissions is valid. Its canonical
fingerprint SHALL be recorded with the first run.

#### Scenario: Freeze mutation is attempted

- **WHEN** provider, scope, budget, stopping, admission, or repository inputs
  are changed after the freeze
- **THEN** the fingerprint changes or resume fails closed before a provider call

#### Scenario: Widened repository scope is resumed

- **WHEN** a resume includes a repository outside the frozen eight-repository
  set or changes run order
- **THEN** the resume fails closed with a categorical scope/fingerprint error

#### Scenario: Freeze is non-vacuous

- **WHEN** negative probes mutate provider, scope, budget, stopping, or
  admission fields
- **THEN** each mutation is detected by a focused integrity test
- **AND** the unmutated freeze is proven to contain at least one run and one
  admitted current source universe

### Requirement: The campaign SHALL execute the fixed broad and scoped matrix

W12 SHALL attempt one all-eight-repository broad run followed by one run per
admitted repository in stable registry order. The same frozen provider and
investigation policy SHALL apply to every run. The Ouchan scoped run MAY use
60 minutes and every other scoped run SHALL use 30 minutes; this exception
MUST be declared before execution and justified by measured reproduction
coverage rather than suspected defect likelihood.

#### Scenario: A run ends early under an existing stop condition

- **WHEN** a run reaches its declared budget, no-progress, provider, or safety
  stop condition
- **THEN** W12 records the exact termination class and moves to the next frozen
  run when the freeze permits

#### Scenario: A candidate is found early

- **WHEN** a run proposes a candidate before the matrix ends
- **THEN** the candidate is preserved and the remaining frozen runs continue
- **AND** scope, provider, budget, and model are not tuned from the result

### Requirement: Investigation breadth and reproduction breadth SHALL remain distinct

Every current repository SHALL receive non-zero source investigation opportunity
unless mechanically unavailable. W12 SHALL report per repository source paths,
symbols, hypotheses, grounded/verification-ready hypotheses, reproduction
requests/executions, unavailable results, candidates, admissions, refusals,
and termination. It SHALL NOT require reproduction coverage where the frozen
executor census proves no authorized reproduction class exists.

#### Scenario: Unsupported repository reproduction is requested

- **WHEN** a candidate targets a repository with no admitted executor
- **THEN** the existing `NOT_AVAILABLE`/missing-reproduction path is recorded
- **AND** the candidate is not promoted to a finding

### Requirement: Mechanical reproduction and admission SHALL remain unchanged

Hypotheses, source suspicions, and model candidates SHALL NOT count as
findings. Candidates SHALL pass through the existing bounded reproduction and
dossier/admission path, with sibling read-only checks, fixed toolchains,
contained execution, deterministic repeated-failure proof where required, and
the current `MISSING_REPRODUCTION` refusal. W12 SHALL NOT add a weaker proof
class or synthesize evidence references/counts.

#### Scenario: Candidate lacks qualifying reproduction

- **WHEN** an investigation proposes a candidate with no qualifying receipt
- **THEN** mechanical admission returns the existing refusal
- **AND** the aggregate counts it as a candidate/refusal, not an admission

#### Scenario: Candidate has a qualifying current-source failure

- **WHEN** the existing reproduction and dossier gates pass
- **THEN** W12 records a mechanical admission with its exact proof identity
- **AND** no model text alone changes the admission result

### Requirement: Provider failures SHALL be first-class measurement outcomes

W12 SHALL classify absent, probe timeout, runtime timeout, non-zero exit,
invalid response, quota/namespace unavailability, and valid provider runs.
Failed runs SHALL remain preserved and SHALL NOT be converted to zero actions,
zero candidates, or zero yield. A valid zero-yield run requires positive
provider response bytes and positive source activity before it can count as a
valid executed zero.

#### Scenario: Provider times out before a valid response

- **WHEN** the frozen provider fails during a W12 run
- **THEN** the run is provider-blocked with sanitized failure evidence
- **AND** it contributes no false progress and no zero-yield denominator

### Requirement: Metrics SHALL be mechanically derived with explicit denominators

The aggregate SHALL derive planned, attempted, valid, provider-blocked runs,
investigations, calls, failures, retries, tool actions, unique repositories,
paths and targets, hypotheses, reproduction outcomes, candidates, refusals,
admissions, novelty classes, leakage, provider/tool-payload bytes, wall time,
and termination reasons from preserved machine evidence. It SHALL state every
rate denominator and use `NOT_CAPTURED` for absent evidence.

#### Scenario: Candidate/admission aggregation is checked

- **WHEN** a candidate has no dossier or proof identity
- **THEN** it appears only in `candidatesProposed` and the appropriate refusal
  distribution
- **AND** `mechanicalAdmissions` remains unchanged

#### Scenario: Valid zero yield is measured

- **WHEN** the fixed matrix completes with valid runs and no qualifying
  admissions
- **THEN** W12 reports zero admissions with the valid-run denominator
- **AND** it does not claim that the repositories contain no defects

### Requirement: Leakage and safety checks SHALL gate publication

W12 SHALL prove that reasoner-visible requests contain no W11 hidden truth,
known failing tests, historical fix material, credentials, cookies, customer
values, or secret-bearing response data. It SHALL run positive leakage canaries,
check sibling identities before and after, and report zero DEV/NEXT/production,
database, sibling-write, dependency-install, publication, credential,
force-push, history-rewrite, and hidden-ground-truth events. Any leakage or
unsafe event SHALL block yield publication.

#### Scenario: Hidden truth is detected

- **WHEN** a reasoner-visible request contains a forbidden W11 field
- **THEN** the run is marked `LEAKAGE_DETECTED`
- **AND** W12 does not publish a yield beside it

#### Scenario: Sibling identity changes

- **WHEN** a before/after identity snapshot differs without an owner-approved
  external change
- **THEN** W12 records a sibling-write/currentness safety failure
- **AND** it does not certify the wave

### Requirement: Novelty SHALL be adjudicated only after mechanical admission

For each admitted candidate, W12 SHALL perform a separate read-only comparison
against the frozen Nightwatch corpus, local known-defect records, current local
findings, and relevant local history. The result SHALL be one of
`MATCHES_KNOWN_DEFECT`, `NEW_TO_FROZEN_NIGHTWATCH_CORPUS`, or
`NOVELTY_AMBIGUOUS`, with checked sources, confidence, matches, and unresolved
ambiguity. A local absence SHALL NOT become an Alphaus organizational novelty
claim.

#### Scenario: Novelty is unresolved

- **WHEN** authorized local evidence cannot settle whether the same defect is
  already known
- **THEN** W12 records `NOVELTY_AMBIGUOUS`
- **AND** it does not emit `ALPHAUS_CONFIRMED_PREVIOUSLY_UNKNOWN`

### Requirement: W12 SHALL produce a truthful closure report

The final report SHALL contain baseline, freeze/fingerprint, coverage, per-run
and per-repository yield metrics with denominators, findings and refusals,
zero-yield interpretation, Nightwatch defects/repairs, provider health,
safety, validation, C-00 integration/release, Group 12 reconciliation, and
exactly one wave verdict. A provider block before sufficient execution SHALL be
`PARTIAL — BLOCKED`; a completed valid matrix with zero admissions SHALL be a
complete zero-admission verdict.

#### Scenario: Matrix completes with zero admissions

- **WHEN** all frozen runs are validly attempted and no candidate is admitted
- **THEN** the report states `COMPLETE — CURRENT-SOURCE YIELD MEASURED, ZERO
  MECHANICAL ADMISSIONS`
- **AND** it preserves all limits and does not imply absence of defects

#### Scenario: Provider blocks the matrix

- **WHEN** provider failure prevents sufficient valid execution
- **THEN** the report states `PARTIAL — BLOCKED`
- **AND** it preserves the invalid run and names the exact unblock condition
