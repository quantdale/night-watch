## ADDED Requirements

### Requirement: Change-shadow compilation is offline and lockfile-bound

The `change:shadow` command SHALL execute only a repository-local TypeScript
compiler whose exact installed package version matches the committed
`node_modules/typescript` lockfile entry. It MUST resolve that compiler from a
Nightwatch-root-anchored module resolver and MUST NOT invoke `npx`, `npm exec`,
a PATH-selected `tsc`, a package registry, an installer, or another automatic
package resolver. Missing, ambiguous, unsafe, or version-divergent compiler
state SHALL be an environment refusal, not a reason to acquire a substitute.

#### Scenario: local locked compiler is admitted

- **WHEN** the repository-local TypeScript package and its declared compiler
  program are safely confined and its exact installed version equals the
  committed lockfile entry
- **THEN** `change:shadow` SHALL invoke that compiler program through the
  current admitted Node executable with an argument vector
- **AND** no package runner, installer, registry, or PATH compiler lookup SHALL
  occur

#### Scenario: local compiler is unavailable

- **WHEN** the repository-local TypeScript package or compiler program is
  absent
- **THEN** the command SHALL fail with a bounded environment-unavailable class
- **AND** it SHALL neither contact a package source nor execute a substitute

#### Scenario: installed and locked identities disagree

- **WHEN** the installed TypeScript version differs from the exact lockfile
  entry, the entry is ambiguous or malformed, or resolution escapes the
  admitted local package
- **THEN** the command SHALL fail closed with a categorical mismatch or unsafe
  result
- **AND** no compiler, derivative-workspace, sibling-read, or report callback
  SHALL be reached

### Requirement: Compiler admission precedes derivative mutation

The command SHALL validate the local compiler, source entrypoints, compiler
profile, and derivative-root policy before it creates, deletes, or replaces any
compiler derivative. A refusal during preflight MUST leave the derivative and
report surfaces byte-identical.

#### Scenario: preflight refuses before mutation

- **WHEN** any compiler or source preflight check fails
- **THEN** no compile directory SHALL be created or removed
- **AND** no prior derivative or shadow report SHALL be modified

#### Scenario: admitted preflight advances to compilation

- **WHEN** every preflight input is admitted
- **THEN** the immutable compiler identity, compiler profile, source
  entrypoints, and derivative policy SHALL be fixed for that invocation before
  the first output path is created

### Requirement: Compiler derivatives are isolated, bounded, and non-authoritative

Each `change:shadow` invocation SHALL own a unique bounded derivative directory
under a validated ignored temporary root. It SHALL load only the expected
emitted modules from that owned directory and SHALL remove it by proven
identity after success or failure. Derivatives MUST NOT become durable source,
proof, selection, freshness, or report authority, and concurrent invocations
MUST NOT delete, overwrite, or load one another's output.

#### Scenario: successful compilation is cleaned

- **WHEN** both declared TypeScript entries compile and their expected emitted
  modules are loaded
- **THEN** the invocation SHALL remove its derivative directory after use
- **AND** the durable shadow report SHALL derive from the loaded current
  modules rather than from a reusable compiler cache or another invocation

#### Scenario: compilation or later execution fails

- **WHEN** compilation, module loading, sibling Git inspection, selection, or
  report production throws
- **THEN** the invocation SHALL attempt bounded identity-safe cleanup in a
  `finally` path
- **AND** it SHALL NOT recursively delete an unproven replacement path or
  present a partial derivative as valid

#### Scenario: concurrent invocations overlap

- **WHEN** two admitted `change:shadow` processes compile concurrently
- **THEN** they SHALL use distinct derivative identities
- **AND** neither process SHALL remove, overwrite, or import the other's
  derivative files

### Requirement: Offline shadow runtime integrity is executable and mutation-proven

Repository validation SHALL exercise the real non-help `change:shadow`
entrypoint against bounded synthetic local Git repositories while package
runner traps are active. It SHALL also test malformed compiler admission and
register non-vacuous mutations for every load-bearing offline and derivative
control. Test success MUST NOT depend on real sibling repositories, a package
registry, or outbound network access.

#### Scenario: full synthetic shadow execution stays offline

- **WHEN** the real entrypoint runs with the required synthetic local Git
  repositories and trap executables for `npx`, npm package execution, and PATH
  `tsc`
- **THEN** it SHALL produce the expected sanitized shadow-report class using
  the admitted local compiler
- **AND** every package-runner/compiler trap sentinel SHALL remain absent

#### Scenario: compiler admission failures are side-effect-free

- **WHEN** focused tests present missing, mismatched, malformed, ambiguous,
  symlinked, escaped, or irregular compiler/package inputs
- **THEN** every case SHALL return its bounded refusal category
- **AND** derivative, sibling-read, report, and network/package-runner spies
  SHALL prove zero reachability

#### Scenario: mutation matrix detects control loss

- **WHEN** independent mutations reintroduce `npx` or `npm exec`, allow PATH
  `tsc`, move admission after derivative mutation, bypass exact version
  comparison, restore a shared compile root, or omit failure cleanup
- **THEN** the declared validator, focused test, or hardening rule SHALL detect
  every mutation
- **AND** the harness SHALL restore all changed bytes exactly

### Requirement: Change-shadow semantic authority is preserved

Offline compiler hardening SHALL preserve the established full-program
compiler profile, emitted module layout, source-admission boundary, local Git
freshness semantics, pinned-source visibility, deterministic journey
selection, sanitized report schema, and `execution.invoked: false` shadow
boundary. A different TypeScript loading mechanism SHALL be accepted only if
its diagnostics, exit status, emitted module graph, and public report are
proven equivalent for success and failure fixtures.

#### Scenario: hardened and reference paths use identical valid inputs

- **WHEN** the existing and hardened compile paths are compared over the same
  deterministic successful fixture
- **THEN** their loaded exports and sanitized change-intelligence report SHALL
  be semantically identical
- **AND** source/currentness/selection identities and ordering SHALL not change

#### Scenario: compiler or source failure is compared

- **WHEN** a deterministic invalid TypeScript or unavailable-source fixture is
  processed
- **THEN** failure timing, categorical outcome, exit status, and absence of a
  valid report SHALL remain at least as fail-closed as the reference path
- **AND** hardening SHALL NOT convert a compiler diagnostic into executable
  transpiled output
