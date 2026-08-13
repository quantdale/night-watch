# Private CI boundary

Nightwatch's private GitHub workflow is a read-only source and fixture check.
It has `contents: read`, uses no repository secrets, does not upload artifacts,
and does not publish findings or messages.

The workflow runs dependency installation with lifecycle scripts disabled,
TypeScript checking, the offline `hardening:check`, the repository agent-state
protocol, the synthetic campaign fixture, and whitespace validation.

It intentionally does not prove authenticated browser behavior, storage-state
validity, real DEV or NEXT target behavior, production behavior, infrastructure
or datastore behavior, private finding retention, or owner-only local
filesystem permissions. Those remain local synthetic/static checks and owner
controlled operations.
