# reproducibility Specification

## Purpose
TBD - created by archiving change nightwatch-final-reproducibility-polish-v1. Update Purpose after archive.
## Requirements
### Requirement: clean-machine reproducibility

`gate:clean` SHALL pass on a fresh Node20 checkout at the hardened HEAD with `clean-receipt:sha256:` and `receipt:sha256:` at same HEAD and `ONBOARDING.md` steps sufficient.

#### Scenario: clean checkout

- **WHEN** `bin/quality-gate-clean.mjs` does `mktemp`, `git clone --shared`, `npm ci --ignore-scripts`, `npm run gate:ci`
- **THEN** `clean-receipt:sha256:` and `receipt:sha256:` both at `e0c0c33`, `HEAD` unchanged, no `node_modules` reuse

### Requirement: isolated parity

Canonical `gate:local` vs isolated `gate:local` SHALL have exact enumeration, pass/fail/skip counts and skip identities.

#### Scenario: parity

- **WHEN** isolated topology with `read-only sibling symlinks` runs `gate:local`
- **THEN** `canonical 73+12+...` vs `isolated` exact match or truthfully explained divergence

