## Why

The child-process hardening rule says every launcher must have a bounded timeout/output, no inherited environment, and no shell, but it checks a hand-written list of 18 files while 53 `bin` modules currently import `node:child_process` and the repository contains over 100 invocation sites. Unlisted examples violate the claimed boundary: `gate-topology` spreads the full parent environment into network-sharing Bubblewrap test lanes; `review-mutation-campaign` spreads it into `npx playwright` despite claiming offline execution; and `phase22-dev` starts the authenticated Phase 22 launcher with inherited environment/stdout and no explicit timeout/buffer. Ambient credentials can therefore reach children, offline tools can acquire packages/network, and future launchers can evade the structural rule entirely.

## What Changes

- Replace the hand-written launcher list with syntax-aware total discovery of every production child-process import, alias, wrapper, and invocation; fail on every unclassified call site and on stale classifications.
- Require each call to declare a closed execution class with explicit executable identity, argv, cwd, environment projection, shell policy, deadline, output budget/stdio mode, termination behavior, and credential/network authority.
- Default every child environment to the shared allowlisted builder; credential-bearing exceptions are scoped to exact executables/calls and never inherited wholesale.
- Make offline-class commands use repository-installed exact binaries and prove no package acquisition, DNS/network authority, or ambient credential propagation.
- Bound authenticated/DEV launchers before spawn and forward output through capped channels rather than unbounded inherited stdio.
- Add cross-process secret sentinels, fake executable/path tests, hung/noisy descendants, dynamic-wrapper/alias probes, network denial, and mutation coverage with a machine-readable call-site census.

## Capabilities

### New Capabilities

- `child-process-boundary-totality`: Defines total subprocess discovery/classification, minimal environment and credential authority, offline executable integrity, resource/termination bounds, and non-vacuous enforcement.

### Modified Capabilities

None.

## Impact

- Affects `bin/lib/hardening/rules/process-and-network.mjs`, child-process wrappers/builders, unclassified `bin/*.mjs` call sites, validation-universe/hardening probes, and subprocess tests.
- Does not run authenticated DEV commands, contact GitHub/registries, install dependencies, broaden credentials, or change owner authorization.
- Complements the configuration-layer proposal: that change governs admitted values; this change governs every process boundary that could receive them.
