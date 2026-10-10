# Spec — CLI-to-implementation contract

Closes F-15. Measured at `36bd493`: 62 `bin/*.mjs` entry points reach the
TypeScript implementation through `bin/lib/typescript-runtime-loader.mjs` via
**198 distinct `src/**/*.ts` string-literal paths**, across 69
`loadTypeScriptModule(` and 13 `loadTypeScriptModules(` call sites. All 198
resolve today. `tsconfig.json` `include` excludes `bin/**` entirely; the
`BIN_SYNTAX` lane is `node --check`; 3 of 62 bins have a `.d.mts`; 12 bins are
mentioned in no test.

This capability is distinct from `operator-cli-contract`, which governs how a
command talks to its *user*. This one governs how a command binds to its
*implementation*.

## ADDED Requirements

### Requirement: Every dynamic module path and every symbol read from it SHALL be statically verified

The loader takes a path and a caller destructures named exports from the
result. Neither is checked until the bin runs. A renamed export, a changed
signature, a reordered parameter or a moved module is invisible to
`npm run typecheck` (which excludes `bin/**`) and to `node --check` (which
parses). For the twelve untested bins, nothing executes them at all, so the
first observer of such a break is an operator mid-task.

A verification lane SHALL, without executing any bin's behaviour:

1. resolve every string-literal module path passed to `loadTypeScriptModule` /
   `loadTypeScriptModules` and fail on any path that does not exist;
2. extract the symbol names the call site destructures or reads from the
   returned module, and fail on any symbol the target module does not export;
3. fail on a path assembled at runtime from a non-literal, because such a path
   cannot be verified — the loader SHALL require a literal, so an
   unverifiable call site is a build error rather than a silent gap.

The lane SHALL assert a non-zero count of resolved call sites before reporting
success, so an extractor that stops matching fails loudly.

#### Scenario: a renamed export fails before execution
- **WHEN** a `src` module renames an export a bin destructures
- **THEN** the verification lane fails naming the bin, the module and the
  symbol
- **AND** it fails without executing the bin

#### Scenario: a moved module fails
- **WHEN** a referenced `src` path no longer exists
- **THEN** the lane fails naming the bin and the path

#### Scenario: a computed path is refused at the call site
- **WHEN** a loader call receives a non-literal path
- **THEN** the structural rule fails naming the call site

#### Scenario: the lane is non-vacuous
- **WHEN** zero loader call sites are extracted
- **THEN** the lane fails before reporting success

### Requirement: `bin/**` SHALL be type-checked

Fourteen thousand lines of the surface an operator actually touches receive no
type checking. `bin/hardening-check.mjs` already carries `// @ts-check` and
JSDoc annotations, which shows the intent exists and is simply not enforced.

`bin/**` SHALL be checked under `checkJs` with the same `strict` and
`noUncheckedIndexedAccess` settings as the root project, as a declared lane
that fails the gate. Because the bins are ESM JavaScript consuming CommonJS
transpiled at runtime, a separate `tsconfig.bin.json` with its own module
settings is expected rather than extending the root `include`; whichever shape
is used, the requirement is that a type error in a bin fails a required group.

The loader SHALL expose a typed surface so a caller's destructuring is checked
rather than typed `any`: a declaration for the loaded module shape, derived
from the target module rather than hand-written, so the declaration cannot
drift from the module it describes.

Migration SHALL be incremental and measured: the lane starts in reporting mode
with a conformance count, bins are annotated in batches, and the lane becomes
blocking when every tracked bin passes. A bin SHALL NOT be exempted by an
inline suppression; an exemption SHALL be a declared list entry with a reason
and SHALL fail when the bin later passes.

#### Scenario: a type error in a bin fails the gate
- **WHEN** a bin passes a wrongly shaped argument to a loaded module
- **THEN** the bin type lane fails naming the file and line

#### Scenario: the loader's returned shape is typed, not `any`
- **WHEN** a bin destructures a symbol from a loaded module
- **THEN** the symbol carries the target module's type
- **AND** a misuse of that symbol is a type error

#### Scenario: exemptions are declared and expire
- **WHEN** a bin is exempted
- **THEN** the exemption is a list entry with a reason
- **AND** it fails once the bin passes

### Requirement: Every entry point SHALL be executed by at least one test

Twelve bins — `efficacy-corpus`, `frontier-determinism`, `phase22-dev`,
`phase22-real`, `phase23-ci`, `phase23-dev`, `phase23-predev`, `phase2b-real`,
`phase9b-real`, `review-mutation-campaign`, `selfdev-provenance`,
`semantic-compat` — appear in no test. Several of them are authorization-gated
launchers whose full behaviour cannot be exercised offline; that bounds what
the test must do, not whether one must exist.

Each tracked bin SHALL have at least one test that executes it as a process and
asserts an observable outcome. For an authorization-gated launcher the
asserted outcome SHALL be the **fail-closed refusal**: invoked without
authorization, credentials or a required capability, it exits with the refusal
code and creates no browser context, subprocess, network connection or file.
That is the most safety-relevant path in those bins and it is currently
unexecuted.

A structural rule SHALL enumerate tracked bins from the filesystem and fail
when one has no executing test, so a newly added bin cannot arrive untested.

#### Scenario: a gated launcher's refusal path is executed
- **WHEN** an authorization-gated bin is run with no authorization present
- **THEN** the test asserts the refusal code and a non-zero exit
- **AND** asserts no browser, subprocess, socket or file was created

#### Scenario: a new bin without a test fails the rule
- **WHEN** a new `bin/*.mjs` is tracked with no executing test
- **THEN** `hardening:check` fails naming it

#### Scenario: the enumeration is non-vacuous
- **WHEN** the rule discovers zero bins
- **THEN** it fails before asserting coverage
