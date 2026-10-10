## Why

The NW-AUD-014 census recognizes named, default, namespace, and destructured
`require` imports, but a namespace assigned from `require('node:child_process')`
is only marked as an import. Direct `cp.spawn(...)` and method aliases then
escape discovery, allowing a false `unclassifiedCount === 0` totality result.

## What Changes

- Discover namespace `require` bindings and direct method aliases.
- Parse destructured require aliases consistently.
- Emit explicit unresolved-import evidence and make hardening fail closed.
- Add synthetic positive/negative/mutation tests without executing children.

## Capabilities

### New Capabilities

- `child-process-census-indirection-integrity`: Defines total supported
  JavaScript child-process import/alias discovery and unknown refusal.

### Modified Capabilities

None.

## Impact

- Affected code: `bin/lib/childProcessCensus.mjs`, process/network hardening,
  focused census tests, and probe/quantifier declarations if required.
- No runtime, network, credential, or external authority changes.
