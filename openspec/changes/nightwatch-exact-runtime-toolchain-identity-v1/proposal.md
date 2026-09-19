## Why

Nightwatch certifies CI and clean-checkout results under a generic Node 20
label even though both lanes may resolve different patch releases, and the
clean lane executes `npm exec --yes --package=node@20` outside the lockfile
before repository-owned validation. A moving executable dependency can
therefore change the certification environment while receipts continue to
look equivalent and record only `nodeMajor: 20`.

## What Changes

- Introduce a governed, platform-specific runtime-toolchain manifest that
  binds an exact Node version and immutable distribution integrity identity.
- Require CI setup and clean-checkout certification to consume the same exact
  admitted toolchain identity, while allowing an already installed runtime
  only after it proves an exact match.
- Remove the clean gate's automatic moving `node@20` resolution; an absent or
  mismatched admitted runtime fails closed without executing an unpinned
  package.
- Extend clean and CI receipts with safe exact runtime provenance and digest
  fields, and reject missing, malformed, unsupported, or conflicting identity.
- Add focused negative tests and mutation probes for wildcard/major-only
  selectors, missing or changed integrity, ungoverned fallback downloads,
  receipt identity omission, and cross-lane disagreement.
- Define a manual, owner-reviewed toolchain-update lifecycle that advances the
  manifest, validation evidence, clean receipt, and exact-head CI evidence
  together.

## Capabilities

### New Capabilities

- `runtime-toolchain-integrity`: govern exact Node runtime admission,
  provenance, integrity verification, cross-lane parity, receipts, and manual
  updates for certification-bearing execution.

### Modified Capabilities

- `reproducibility`: strengthen "fresh Node 20" from a major-version class to
  one exact admitted runtime identity shared by clean-checkout and CI evidence.

## Impact

Affected surfaces include `.github/workflows/hardening.yml`,
`bin/quality-gate-clean.mjs`, a new versioned toolchain manifest and validator,
quality-gate receipt schemas, hardening/probe rules, focused tests, and
release/onboarding documentation. This change depends on
`nightwatch-ci-action-supply-chain-integrity-v1` for immutable setup-action
code identity, but separately governs the Node executable selected by that
action. It adds no product, Alphaus, authenticated, database, cloud, or
publication authority.
