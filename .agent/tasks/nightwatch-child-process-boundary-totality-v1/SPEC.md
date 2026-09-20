# Child process boundary totality proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-014
without starting a subprocess beyond planning validation.

## Established starting state

- Parent audit starts at `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- 53 `bin` modules import child-process authority; the boundary rule manually
  enumerates 18 launcher files rather than invocation sites.
- Unlisted callers spread/inherit ambient environment, use acquiring `npx`, or
  omit explicit resource/stdio bounds, including authority-bearing paths.

## Required deliverables

- Proposal, design, capability spec, and implementation checklist.
- Total AST census, closed profiles, minimal environments/credentials, exact
  offline tools, process-tree bounds, privacy, and executing mutation proof.

## Non-goals

No DEV/authenticated execution, network call, package install, implementation,
or broadened child authority.

## Safety constraints

Planning and read-only evidence only; validation may parse artifacts locally.

## Declared Deletions

None.

## Acceptance criteria

- Four artifact classes strict-valid; implementation tasks out of scope; no
  production/runtime/external mutation.
