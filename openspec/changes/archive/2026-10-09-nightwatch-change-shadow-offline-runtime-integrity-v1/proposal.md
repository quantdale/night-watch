## Why

`npm run change:shadow` describes itself as offline but invokes `npx tsc`
twice before producing its report. When the repository-local TypeScript
installation is absent or unresolved, `npx` is permitted to resolve a remote
package, so an operator command can cross the network and execute moving code
before Nightwatch has admitted a lockfile-bound compiler.

## What Changes

- Replace `change:shadow`'s `npx` compiler bootstrap with an explicitly local,
  repository-owned TypeScript loading/compilation path whose installed package
  identity is consistent with the committed lockfile.
- Fail closed before creating or deleting compiler derivatives when the local
  compiler is missing, mismatched, ambiguous, or unsafe; never download or
  resolve a substitute.
- Bound the derivative compile workspace, clean it after success and failure,
  and preserve the current source-layout and module-semantics contract.
- Add full-process tests and mutation probes that prove the normal command
  cannot reach `npx`, a package manager, a registry, or an ungoverned compiler,
  and that a missing local toolchain produces a categorical refusal.
- Preserve the existing shadow-report semantics, source admission, local-Git
  freshness rules, sanitized payload, and no-product-execution boundary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `source-analysis-runtime-hardening`: extend the runtime-loader contract to
  cover the intentionally separate disk-emitting `change:shadow` compiler
  path, requiring offline lockfile-bound resolution, fail-before-mutation
  admission, bounded derivatives, and executable regression proof.

## Impact

Affected surfaces include `bin/change-intelligence.mjs`, the existing
TypeScript runtime/compiler support under `bin/lib/`, focused CLI fixtures and
tests, hardening rules and mutation probes, and operator documentation for
`change:shadow`. The change does not contact Alphaus, add authenticated or
product execution, change source-evidence semantics, or authorize external
publication. General CLI argument/output normalization remains owned by
`nightwatch-production-completion-programme-v1` and is not duplicated here.
