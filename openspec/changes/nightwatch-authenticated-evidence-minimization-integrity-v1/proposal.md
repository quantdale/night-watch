## Why

Authenticated evidence claims that concrete path identifiers and arbitrary private values cannot persist. The current URL reducer treats ordinary lowercase alphanumeric segments such as acme1234 as safe route words, so real customer/account/resource identifiers can pass unchanged. The recorder also writes constructor manifest fields, repository snapshots, and final summary notes through paths that do not use its authenticated-data sanitizer. The durable guarantee therefore depends on current caller discipline and a heuristic denylist rather than one total allowlisted boundary.

## What Changes

- Replace heuristic path-segment classification with source/provenance-bound route templates or a conservative structural placeholder when no exact template is proven.
- Introduce closed authenticated-evidence DTOs and one mandatory final persistence firewall for every manifest, event, proxy, repository, summary, screenshot/trace, and auxiliary writer.
- Make authenticated mode effective before the first directory/file publication and preserve owner-only, symlink-safe, bounded, crash-consistent storage throughout mode transitions.
- Discover and classify every recorder writer and direct write under authenticated run directories; unknown or bypass writers fail hardening.
- Add ordinary-looking identifier, arbitrary note/snapshot, nested key, path, race, mutation, and sentinel tests.

## Capabilities

### New Capabilities

- authenticated-evidence-minimization-integrity: Defines route-template URL identity, closed DTOs, total writer enforcement, safe publication, and adversarial privacy proof for authenticated evidence.

### Modified Capabilities

None.

## Impact

- Affects src/core/safety/redaction.ts, src/core/evidence/runRecorder.ts, browser observers, authenticated/manual campaign writers, Control Center evidence readers, and privacy tests.
- Reuses source-reviewed endpoint registries and production route-vocabulary principles without changing production authorization.
- No authenticated run, external target, customer data, publication, or product implementation is performed by this planning change.
