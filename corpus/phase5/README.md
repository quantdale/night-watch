# Phase 5 generated API corpus

This directory is Nightwatch-owned. The six scenario files are deterministic
JSON-subset YAML accepted by the restricted `nightwatch.oops-profile.phase5.v1`
dialect and by the current source-pinned OOPS binary. They contain only a
loopback relay operation ID; the relay resolves the destination and hydrates
period/vendor values in memory.

The files deliberately do not contain:

- credentials, browser state, or tokens;
- company, account, billing-group, payer, user, or resource identifiers;
- request or response bodies;
- direct Alphaus destinations;
- mutation or UNKNOWN operation IDs.

The `:0` port is a logical placeholder. The adapter materializes an ephemeral
loopback port immediately before local execution and validates the resulting
document again. These are templates, not existing Alphaus OOPS scenarios, and
are never copied into another repository.

The frozen DEV set completed six first executions and six fresh replays through
the native Nightwatch relay fallback on 2026-08-12. The sanitized run ledger is
kept under the ignored local `artifacts/` evidence directory; the corpus index
records its run ID, status, safety, and privacy summary without customer data.
