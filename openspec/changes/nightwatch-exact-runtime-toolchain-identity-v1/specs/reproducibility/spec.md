## MODIFIED Requirements

### Requirement: clean-machine reproducibility

`gate:clean` SHALL execute on a fresh checkout at the hardened HEAD only after
admitting the exact platform-specific Node/npm toolchain identity declared by
the versioned runtime-toolchain manifest. It SHALL NOT resolve or install a
moving runtime when the admitted toolchain is absent. The resulting
`clean-receipt:sha256:` and inner `receipt:sha256:` SHALL bind the same source
HEAD and the same canonical toolchain identity; a major-only Node label,
missing identity, or inner/outer disagreement SHALL be non-evidence.
`ONBOARDING.md` SHALL document explicit provisioning and verification steps
sufficient to obtain the admitted toolchain without turning the certification
command into an installer.

#### Scenario: clean checkout

- **WHEN** `bin/quality-gate-clean.mjs` creates a disposable local clone, verifies an already provisioned exact toolchain, runs `npm ci --ignore-scripts`, and invokes the authoritative clean gate
- **THEN** the outer clean receipt and inner gate receipt SHALL bind the same current HEAD and exact canonical toolchain ID
- **AND** the checkout SHALL remain clean, prior `node_modules` SHALL not be reused, and no moving runtime resolver SHALL execute

#### Scenario: admitted runtime is unavailable

- **WHEN** the exact manifest-bound toolchain is absent or cannot be proven before installation
- **THEN** `gate:clean` SHALL fail closed with installation and gate results not run
- **AND** it SHALL provide a bounded explicit provisioning action without downloading a runtime
