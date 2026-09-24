## ADDED Requirements

### Requirement: Supported child-process indirection is totally discovered

The census SHALL recognize namespace assignments from
`require('node:child_process')`, destructured require aliases, and direct
method aliases over the closed invocation vocabulary.

#### Scenario: Namespace require launches a child
- **WHEN** source contains `const cp = require('node:child_process'); cp.spawn(...)`
- **THEN** the invocation is discovered, classified, and included in the census

#### Scenario: Method alias launches a child
- **WHEN** source assigns `const launch = cp.spawn` and later calls `launch(...)`
- **THEN** the aliased invocation is discovered with the original arguments

### Requirement: Unresolved imports fail closed

The census SHALL emit an explicit unresolved-import record when a file imports
child_process but exposes no supported binding/namespace or uses unresolved
dynamic indirection. Hardening SHALL refuse that result.

#### Scenario: Empty binding is not a green census
- **WHEN** an import is detected with zero recognized bindings and zero sites
- **THEN** the census is non-clean and the hardening rule fails

### Requirement: Discovery remains pure and bounded

Analysis SHALL consume source strings only, use the closed vocabulary, avoid
evaluation/process/network/environment authority, and emit categorical safe
records.

#### Scenario: Synthetic hostile source
- **WHEN** comments, strings, or dynamic indexing could confuse discovery
- **THEN** the parser does not execute input and reports an explicit unknown
  when it cannot prove the call shape
