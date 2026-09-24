# Child-process census indirection v1

## Task purpose

Close the reproduced syntax-discovery gap in the total child-process census.
A namespace assigned from `require('node:child_process')` and a method alias
assigned from that namespace are currently imported-but-undiscovered, allowing
the hardening rule to report zero unclassified invocations while a real launch
exists.

## Established starting state

- Task ID: `nightwatch-child-process-census-indirection-v1`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Starting SHA: `5619aeaf77e22862cc87c6da6ad6e022fa60b774`
- Session branch: `session/nightwatch-successor-campaign-en-628d8bb9`
- Reproduction: `parseChildProcessImports` reports
  `importsChildProcess=true`, empty `bindings/namespaces`, and
  `findInvocationSites` returns no sites for
  `const cp = require('node:child_process'); cp.spawn(...)` and
  `const launch = cp.spawn; launch(...)`.
- Previous priority audit remediation remains COMPLETE; this is a new successor
  child, not a reopening.

## Required deliverables

- Syntax-aware discovery for namespace `require` bindings, destructuring
  aliases, and direct method aliases.
- Explicit unknown/indeterminate import reporting so unsupported indirection
  cannot pass as a clean census.
- Hardening integration that fails closed on unresolved child-process imports.
- Focused positive, negative, and mutation tests with no process/network
  execution.

## Explicit non-goals

No arbitrary JavaScript evaluation, dynamic runtime tracing, changes to child
execution policy, real subprocess launches, sibling repository writes, or
external/network access.

## Safety constraints

Pure source-string analysis and synthetic fixtures only. Preserve the existing
closed profile vocabulary and zero-retry/local-only boundaries.

## Declared Deletions

None.

## Acceptance criteria

- Namespace `require`, namespace import, destructuring alias, and method-alias
  launch forms are discovered and classified or explicitly unclassified.
- A child-process import with no recognized invocation binding cannot produce
  a green totality result.
- Existing production census remains non-zero, classified, and digest-stable
  except for intentional discovered additions.
- Mutation/negative tests prove removing alias discovery or unknown refusal
  fails.
- Focused tests, typecheck, hardening, and milestone validation are recorded;
  unrelated source-intelligence gate drift remains separately classified.
