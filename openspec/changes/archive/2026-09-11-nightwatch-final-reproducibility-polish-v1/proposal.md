## Why

Post-acceptance hardening proved truth reconciliation and single-run reliability, but `gate:clean` and isolated parity were deferred. Without them, clean-machine reproducibility and topology parity remain unproven at the hardened HEAD.

## What Changes

- `gate:clean` Node20 via `bin/quality-gate-clean.mjs` (fresh checkout, `npm ci --ignore-scripts`, `gate:ci`)
- Isolated parity: canonical `gate:local` vs isolated `gate:local` (symlink siblings, `NIGHTWATCH_PROXY_PORT`)
- `ONBOARDING.md` sufficiency check and fix if needed
- Final DEV requalification (phase2c/phase5/campaign) or truthful blocker

## Capabilities

### New Capabilities

- `final-reproducibility-polish`: Clean-machine and isolated reproducibility at hardened HEAD

### Modified Capabilities

- `continuous-deep-hardening`: Prior deferred items now implemented
