# Shard certification integrity v1

## Task purpose

Eliminate the reproduced misleading-green shard receipt in
`bin/run-shards.mjs`. A selected all-skipped Playwright file currently exits
zero and is reported as `PASS`, while missing parsed counts are silently
coerced to numeric zero. The fix must make execution accounting explicit,
machine-readable, bounded, and fail-closed without treating legitimate mixed
pass/skip runs as failures.

## Established starting state

- Task ID: `nightwatch-shard-certification-integrity-v1`
- Parent task: `nightwatch-successor-campaign-engine-v1`
- Starting SHA: `78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1`
- Starting branch/session: `session/nightwatch-successor-campaign-en-628d8bb9` /
  `sess-e6985828f7b7`
- Reproduction evidence:
  `.agent/tasks/nightwatch-successor-campaign-engine-v1/evidence/shard-false-certification.json`
- Current source defect: `bin/run-shards.mjs:121-169,254-273` parses human
  text, returns nullable counts, sums null as zero, and classifies PASS from
  exit status plus did-not-run only.
- The exact zero-test-to-PASS claim was disproven: current Playwright exits 1
  for a file with no test declarations. The all-skipped-to-PASS and unknown-
  count defects remain reproduced.

## Required deliverables

- A bounded machine-readable per-shard execution receipt with explicit
  `executed`, `known`, `passed`, `failed`, `skipped`, and `didNotRun` fields.
- A strict parser/classifier that refuses missing, malformed, unknown, zero-
  executed, all-skipped, and internally inconsistent receipts.
- `run-shards.mjs` integration that uses the receipt as the execution authority;
  human text remains diagnostic only.
- Focused positive/negative/adversarial tests and mutation protection.
- Honest OpenSpec/task/validation receipts and no false certification claim.

## Explicit non-goals

No removal or suppression of legitimate skipped tests; no change to test
assertions or Playwright retry policy; no product/runtime/network authority;
no full `npm test`/release certification unless separately justified.

## Safety constraints

Local, offline, synthetic Playwright fixtures only. Preserve test coverage and
zero-retry/exclusive-shard behavior. No credentials, customer data, external
services, or sibling writes.

## Declared Deletions

None.

## Acceptance criteria

- All-skipped and zero-executed shards cannot produce a successful result.
- Missing/malformed/unknown receipt data fails closed with a categorical code.
- A run with at least one executed passing test and legitimate skips remains
  green and reports accurate counts.
- Existing shard membership, coverage, exclusivity, and normal end-to-end
  behavior remain intact.
- Focused tests, `gate:dev`, and `gate:milestone` pass; any full certification
  claim is backed by its exact receipt.
