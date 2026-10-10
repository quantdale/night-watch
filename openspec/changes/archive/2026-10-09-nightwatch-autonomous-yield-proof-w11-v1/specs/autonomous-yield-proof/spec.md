# Spec — W11 autonomous yield proof

Measured at `158a97b8`. The eight admitted repositories are all CURRENT with
live checkout SHAs equal to their `expectedSourceSha`. The reproduction
capability census over them yields 4,124 eligible source files, 1,120
executable and 152 distinct executable targets, all in `mobingilabs/ouchan`;
refusals are `NO_SUPPORTED_EXECUTOR` 1620, `PACKAGE_TEST_FILES_ABSENT` 1327 and
`VENDOR_DIRECTORY_ABSENT` 57. The historical fixture corpus holds 9 cases of
which `bench-negative-quiet-000` is a negative control. The mined corpus holds
255 records and 234 definable cases, of which 5 carry both a non-empty
`knownFailingTest` and a `minedReplay`. `opencode-go/omen-alpha`, the W9/W10
provider, is absent from the current model list.

## ADDED Requirements

### Requirement: The primary provider SHALL be selected by a rule fixed before any probe runs

Choosing a provider after observing how several of them score turns the
evaluation into a search for the flattering number. The wave exists to measure,
so the choice SHALL be made before any evidence of quality exists.

An ordered preference list SHALL be recorded before the first probe. Each
candidate SHALL be probed in order with one minimal structured request through
the production reasoner path, and the FIRST candidate that returns exit 0 and a
valid `nightwatch.reasoner-turn-response.v1` document SHALL become the primary
provider. Remaining candidates SHALL NOT be probed.

The recorded prerequisite SHALL name the provider, the model, the CLI
executable identity and version, the invocation mode, the probe result, the
exit code and the latency. Provider or account configuration SHALL NOT be
modified to force a candidate's availability.

#### Scenario: The historical provider has been retired

- **WHEN** the first preference is absent from the current model list
- **THEN** its absence SHALL be recorded as measured evidence
- **AND** selection SHALL fall to the next preference rather than to whichever
  available model performs best

#### Scenario: A later preference is never consulted

- **WHEN** an earlier preference passes its structured probe
- **THEN** later preferences SHALL NOT be probed
- **AND** no provider comparison SHALL exist that could be resolved after the
  fact

### Requirement: The wave SHALL refuse to execute below a threshold fixed before execution

A threshold chosen after seeing the yield is not a threshold. The reachability
threshold SHALL be frozen before the first evaluation and SHALL NOT be lowered
afterwards.

It SHALL require at minimum: a passing provider structured probe; a non-zero
repository census; more than one repository visible to investigation; at least
one deterministic reproduction-capable target; an available historical corpus;
an available mechanical admission path; a green leakage guard; and a green
current hardening and gate baseline. If preflight does not meet it, the campaign
SHALL NOT execute and the wave SHALL report PARTIAL — BLOCKED with evidence.

#### Scenario: Preflight falls short of the frozen threshold

- **WHEN** any threshold condition is unmet at preflight
- **THEN** the campaign SHALL NOT execute
- **AND** the wave SHALL report PARTIAL — BLOCKED with the failing condition as
  evidence, rather than lowering the threshold to proceed

### Requirement: Each arm's evaluation definition SHALL be committed before that arm executes

An evaluation that can still be edited while it runs measures nothing.

Before the first provider evaluation of an arm, its definition SHALL be
committed: provider and model, corpus membership, negative controls, current
repository set and SHAs, duration, turn/investigation/call/action caps, byte
budgets, stopping condition, the EXACT scoring definition, the near-match
distance definition, the reproduction requirement, the leakage rule, the
admission rule and the `ENVIRONMENT_BLOCKED` denominator rule. The campaign
fingerprint SHALL bind all of them.

Corpus membership, scoring, repository set, provider, budget and hidden truth
SHALL NOT be tuned after the first results are seen.

#### Scenario: A resume widens a frozen dimension

- **WHEN** a resume presents a wider repository set, a larger budget, a
  different provider identity or a different corpus fingerprint
- **THEN** the resume SHALL fail closed rather than continue under the new scope

#### Scenario: An execution bug invalidates a run

- **WHEN** a defect in the harness requires repair mid-arm
- **THEN** the failed run SHALL be recorded rather than overwritten
- **AND** a new frozen fingerprint SHALL be created
- **AND** the WHOLE affected arm SHALL rerun

### Requirement: Strict `EXACT_REDISCOVERY` SHALL NOT be weakened, and a near match SHALL NOT promote

EXACT SHALL continue to require the candidate to name the hidden failing test
AND to reach the existing file-recall and keyword-recall thresholds. A result
that satisfies some but not all of these is a near match: it SHALL record its
distance to the hidden target and SHALL NOT be reinterpreted as a success.

Each case SHALL record its outcome, exact-match verdict, root-cause tier, named
files, named symbols, named tests, hidden-target distance, reproduction verdict,
candidate, admission, reason for non-EXACT, environment disposition and leakage.

#### Scenario: Zero exact rediscoveries

- **WHEN** a valid, honestly measured run produces `EXACT_REDISCOVERY` = 0
- **THEN** the arm SHALL be complete
- **AND** the model or prompt SHALL NOT be changed repeatedly until EXACT
  becomes non-zero

### Requirement: `ENVIRONMENT_BLOCKED` cases SHALL leave both sides of a yield rate

A case whose required contained reproduction cannot execute because the local
environment lacks the required already-admitted substrate SHALL be classified
`ENVIRONMENT_BLOCKED` and SHALL be excluded from BOTH the numerator and the
denominator of any reproduction or yield rate. Its count SHALL still be reported
separately and SHALL NOT be erased.

#### Scenario: Every case is environment blocked

- **WHEN** all cases in a rate's population are `ENVIRONMENT_BLOCKED`
- **THEN** the rate SHALL be reported as undefined over an empty denominator
- **AND** the blocked count SHALL still be reported separately

### Requirement: Hidden ground truth SHALL NOT reach the reasoner, and leakage SHALL block publication

Every reasoner-visible request blob of a historical run SHALL be inspected for
hidden bug labels, hidden filenames, failing test names, hidden expected
symbols, fix commit messages, fix diffs, ticket or PR text and scoring labels.

The leakage checker SHALL be proven live with canaries, so a checker that
silently matches nothing cannot pass as evidence of cleanliness.

#### Scenario: Hidden truth reaches the reasoner

- **WHEN** any hidden truth is found in a reasoner-visible request
- **THEN** the run SHALL be classified `LEAKAGE_DETECTED`
- **AND** yield publication SHALL be aborted rather than a percentage published
  beside the leaked runs
- **AND** the arm SHALL rerun from a clean frozen fingerprint after repair

### Requirement: Admission SHALL remain the existing mechanical path

A model proposal is not a finding; a hypothesis is not a finding; a
plausible-looking source defect is not a finding.

Admission SHALL continue through the existing mechanical path only. Where a
reproduction is required and absent, admission SHALL be refused
`MISSING_REPRODUCTION`. `reproductionCount` requirements SHALL NOT be reduced,
evidence refs SHALL NOT be synthesized, dossiers SHALL NOT be inserted by hand,
and no new "looks buggy" proof class SHALL be introduced. Where a current test
failure qualifies, the existing `CURRENT_SOURCE_REPEATED_TEST_FAILURE`
mechanism SHALL be applied exactly.

#### Scenario: A candidate carries no reproduction

- **WHEN** a candidate reaches admission with no mechanical reproduction
- **THEN** admission SHALL be refused `MISSING_REPRODUCTION`
- **AND** the refusal SHALL be counted rather than resolved by lowering the
  reproduction requirement

### Requirement: A previously-unknown claim SHALL be bounded by the evidence that supports it

A mechanically admitted finding proves that Nightwatch admitted it. It does not
prove the defect was previously unknown.

Each admitted current-source finding SHALL be independently classified, using
only authorized local evidence, as `NEW_TO_NIGHTWATCH`,
`ALREADY_IN_HISTORICAL_CORPUS` or `CANNOT_DETERMINE`.
`PREVIOUSLY_UNKNOWN_ALPHAUS_BUG` SHALL NOT be claimed unless the evidence
actually supports that stronger statement; `NEW_TO_NIGHTWATCH` is a valid,
narrower result.

#### Scenario: A finding's prior status cannot be established

- **WHEN** available local evidence does not settle whether the historical
  corpus already contained the same defect identity
- **THEN** the finding SHALL be classified `CANNOT_DETERMINE`
- **AND** it SHALL NOT be reported as previously unknown

### Requirement: Yield SHALL be derived mechanically and every denominator SHALL be stated

Metrics SHALL be produced by the measurement machinery rather than hand-counted
from logs where machinery can derive them, and provider transport bytes SHALL
remain accounted separately from tool-payload bytes.

Every reported rate SHALL state its denominator explicitly, and the denominator
SHALL NOT be chosen for producing the most favourable percentage.

#### Scenario: The measured yield is zero

- **WHEN** exact rediscoveries, current-source reproductions or admitted
  findings are zero
- **THEN** zero SHALL be reported as the result
- **AND** the campaign SHALL NOT be prolonged in search of a better number

### Requirement: The wave SHALL state its limits explicitly

The report SHALL state that an unfound defect is not an absent one, that an
admission is a Nightwatch admission and not an Alphaus-confirmed bug, and that
deterministic reproduction capability exists in only one of the eight admitted
repositories, so investigation breadth and execution breadth are different
numbers.

#### Scenario: Investigation breadth is reported as execution breadth

- **WHEN** the wave reports how many repositories it covered
- **THEN** the count of repositories investigated and the count in which
  reproduction could execute SHALL be reported as separate numbers
- **AND** the broader number SHALL NOT be presented as the reproduction reach
