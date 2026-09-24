# Shard temp isolation v1

## Task purpose

Eliminate cross-shard interference through the ambient operating-system temporary directory while preserving the existing explicit child-process environment, shard execution receipts, and validation semantics.

## Established starting state

- Parent task: `nightwatch-successor-campaign-engine-v1`.
- Starting SHA: `f41c6cc3c9e9e6a50f271acbd58ddb19b5afd6aa`.
- Session: `sess-e6985828f7b7`.
- `gate:dev` reproduced one additional failure beyond the twelve live-source drift failures: `reviewStore.test.ts` observed an unrelated file in `/tmp` only during parallel shard execution and passed in isolation.
- Existing child-environment allowlist, proxy lease stripping, shard receipts, coverage proof, and serial/exclusive classes are authoritative and retained.

## Required deliverables

- One run-unique scratch root with a private absolute temp directory per shard.
- `TMPDIR`, `TEMP`, and `TMP` overrides on every shard child process.
- Closed shard identity and run-root validation before child launch.
- Process-level adversarial tests proving actual `os.tmpdir()` isolation and malformed-input refusal.
- Bounded cleanup of only the invocation-owned scratch root.
- Focused, gate, OpenSpec, and continuity evidence.

## Explicit non-goals

No product proxy policy, listener, route, browser, source-intelligence,
network, credential, database, cloud, sibling-repository, or external-
publication change. The only proxy-module change is an explicit validation-run
lease directory that preserves cross-shard port coordination. No repair of the
twelve independent live-source drift failures. No broad temporary-directory
cleanup.

## Safety constraints

Local validation infrastructure only. Synthetic process observations and repository-local ignored scratch state. No real credentials, customer values, or external targets.

## Declared Deletions

None.

## Acceptance criteria

- Two shard environments produce two distinct actual Node `os.tmpdir()` paths under one run root.
- Inherited private temp values and proxy port/token/path/owner values do not survive; shards share only the newly computed validation lease directory.
- Malformed shard identity fails before child launch.
- Normal serial, concurrent, and exclusive shard execution remains green.
- The review-store shared-temp failure no longer appears in parallel gate evidence.
- No unauthorized effect or stale scratch cleanup outside the invocation-owned root.
