## Why

Nightwatch advertises an optional repository `.env` layer as local defaults, validates a merged process/file view, and reports unknown `NIGHTWATCH_*` names. The current launchers then continue reading and forwarding `process.env`, so values supplied only by `.env` are displayed and validated but not used. Unknown `.env` names are dropped before reporting, malformed lines and duplicate keys are silently ignored/overwritten, and the declaration parser accepts unknown object keys despite claiming strict parsing. Configuration evidence can therefore disagree with execution and a typo can silently select a default.

## What Changes

- Create one immutable admitted configuration snapshot with explicit precedence and provenance before any browser, subprocess, socket, or mutable owner-local action.
- Strictly parse the environment declaration and `.env` layer, rejecting unknown keys, duplicates, malformed declarations/lines, undeclared `NIGHTWATCH_*` names, and invalid values with privacy-safe diagnostics.
- Make every launcher consume the same admitted snapshot it validates and renders; prohibit later reads from ambient `process.env` for declared variables.
- Require child-environment explicit `NIGHTWATCH_*` values to be declared and sourced from the admitted snapshot or fixed launcher literals.
- Add cross-process tests proving `.env`-only values reach the intended child, process values override file values, CLI values override both where supported, unknown/malformed file entries refuse, and rendered provenance matches observed execution.
- Add total structural/mutation enforcement so the validated-but-not-consumed and dropped-unknown regressions cannot recur.

## Capabilities

### New Capabilities

- `configuration-layer-authority-integrity`: Defines strict declaration/file admission, one provenance-bound effective snapshot, exact precedence, execution/rendering coherence, and non-vacuous enforcement.

### Modified Capabilities

None.

## Impact

- Affects `src/core/config/environmentSurface.ts`, `config/environment-surface.v1.json`, `.env.example`, `bin/nightwatch.mjs`, `bin/nightwatch-agent.mjs`, `bin/nightwatch-control-center.mjs`, `bin/child-environment.mjs`, and configuration/child-process tests and hardening.
- Does not add credentials, broaden inherited child environments, authorize DEV/production, or make `.env` a publication/persistence surface.
- Values remain secret-redacted; the admitted snapshot is in-memory and bounded.
